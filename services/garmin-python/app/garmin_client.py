"""Thin wrapper over python-garminconnect.

Responsibilities:
  * log in with email/password and hand back a serialized garth session
    (so the caller never has to keep the password),
  * rebuild a client from that session for every subsequent data call,
  * map Garmin Connect's raw dicts onto our stable response schemas.

The service is stateless for data calls; the garth session token travels
in each request.  Login itself is two-step when the account has 2FA:
  1. login_start(email, password) → session_id  (blocks until MFA prompt appears)
  2. login_complete(session_id, mfa_code)        → garth token
"""
from __future__ import annotations

import os
import sys
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import date as Date
from datetime import datetime, timezone
from typing import Any, Callable, TypeVar

from garminconnect import (
    Garmin,
    GarminConnectAuthenticationError,
    GarminConnectConnectionError,
    GarminConnectTooManyRequestsError,
)

from . import schemas


class GarminAuthError(Exception):
    """Raised when login fails or a stored session is no longer valid."""


class GarminMfaRequired(Exception):
    """Account needs a 2FA code — use the two-step flow."""


class GarminUpstreamError(Exception):
    """Garmin Connect was unreachable or rate-limited."""


# --------------------------------------------------------------------------- #
# pending 2FA sessions (in-memory, keyed by session_id)
# --------------------------------------------------------------------------- #

_pending: dict[str, "_PendingLogin"] = {}
_pending_lock = threading.Lock()


class _PendingLogin:
    def __init__(self) -> None:
        self.session_id = str(uuid.uuid4())
        self._code_event = threading.Event()
        self._mfa_code: str | None = None
        self.token: str | None = None
        self.error: Exception | None = None
        self._done = threading.Event()

    def wait_for_mfa(self) -> str:
        """Called from the garth thread — blocks until the caller provides a code."""
        self._code_event.wait(timeout=120)
        if self._mfa_code is None:
            raise GarminAuthError("MFA code was not provided within 120 seconds.")
        return self._mfa_code

    def provide_code(self, code: str) -> None:
        self._mfa_code = code
        self._code_event.set()

    def wait_done(self, timeout: float = 60) -> None:
        self._done.wait(timeout=timeout)

    def mark_done(self) -> None:
        self._done.set()


# --------------------------------------------------------------------------- #
# session
# --------------------------------------------------------------------------- #

def login(email: str, password: str) -> str:
    """Single-step login for accounts without 2FA.

    Raises GarminMfaRequired (with session_id) when 2FA is needed;
    callers should then call login_complete().
    """
    pending = _PendingLogin()
    mfa_triggered = threading.Event()

    def _mfa_prompt() -> str:
        # Register the pending session so the HTTP caller can supply the code.
        with _pending_lock:
            _pending[pending.session_id] = pending
        mfa_triggered.set()
        return pending.wait_for_mfa()

    garmin = Garmin(email=email, password=password, prompt_mfa=_mfa_prompt)

    result_holder: list[str | Exception] = []

    def _do_login() -> None:
        try:
            garmin.login()
            pending.token = garmin.garth.dumps()
        except Exception as exc:  # noqa: BLE001
            pending.error = exc
            result_holder.append(exc)
        finally:
            pending.mark_done()

    t = threading.Thread(target=_do_login, daemon=True)
    t.start()

    # Wait up to 15 s for either the login to finish or MFA to be triggered.
    mfa_triggered.wait(timeout=15)
    if mfa_triggered.is_set():
        raise GarminMfaRequired(pending.session_id)

    # No MFA — wait for the login thread to finish.
    pending.wait_done(timeout=30)

    if pending.token:
        return pending.token
    if pending.error:
        exc = pending.error
        if isinstance(exc, GarminConnectAuthenticationError):
            raise GarminAuthError(str(exc))
        if isinstance(exc, (GarminConnectConnectionError, GarminConnectTooManyRequestsError)):
            raise GarminUpstreamError(str(exc))
        raise GarminAuthError(str(exc))
    raise GarminUpstreamError("Login timed out.")


def login_complete(session_id: str, mfa_code: str) -> str:
    """Provide the 2FA code for a pending login and return the garth token."""
    with _pending_lock:
        pending = _pending.pop(session_id, None)
    if pending is None:
        raise GarminAuthError("No pending login found for this session_id (expired or already used).")

    pending.provide_code(mfa_code)
    pending.wait_done(timeout=30)

    if pending.token:
        return pending.token
    if pending.error:
        raise GarminAuthError(str(pending.error))

    # The login thread finished — retrieve from the garth dumps stored via _do_login.
    # (token is set by _do_login inside the thread via pending.token)
    raise GarminAuthError("Login did not complete after MFA code was provided.")


def _client_from_token(token: str) -> Garmin:
    garmin = Garmin()
    try:
        garmin.garth.loads(token)
        # garminconnect's wellness endpoints address the user by display name,
        # which lives in the restored garth profile.
        profile = garmin.garth.profile or {}
        garmin.display_name = profile.get("displayName")
        garmin.full_name = profile.get("fullName")
    except Exception as exc:  # noqa: BLE001 - any deserialization failure == bad token
        raise GarminAuthError("Stored Garmin session is invalid or expired.") from exc
    return garmin


def validate(token: str) -> bool:
    try:
        garmin = _client_from_token(token)
        garmin.get_user_profile()
        return True
    except (GarminAuthError, GarminConnectAuthenticationError):
        return False
    except Exception:  # noqa: BLE001
        return False


# --------------------------------------------------------------------------- #
# data
# --------------------------------------------------------------------------- #

def _call(fn, *args) -> Any:
    """Run a garminconnect call, normalizing auth/upstream failures."""
    try:
        return fn(*args)
    except GarminConnectAuthenticationError as exc:
        raise GarminAuthError(str(exc)) from exc
    except (GarminConnectConnectionError, GarminConnectTooManyRequestsError) as exc:
        raise GarminUpstreamError(str(exc)) from exc


# How many days to fetch in parallel. Kept low to avoid Garmin rate-limiting (429).
_SYNC_CONCURRENCY = max(1, int(os.getenv("GARMIN_SYNC_CONCURRENCY", "5")))

_T = TypeVar("_T")


def _date_range(start: Date, end: Date) -> list[Date]:
    days: list[Date] = []
    current = start
    while current <= end:
        days.append(current)
        current = current.fromordinal(current.toordinal() + 1)
    return days


def _fetch_days_parallel(days: list[Date], per_day: Callable[[Date], _T | None]) -> list[_T]:
    """Run `per_day` for each date concurrently (bounded), preserving date order.

    Auth/upstream errors propagate (so the caller maps them to 401/502). Any other
    per-day failure is logged and skipped so one bad day doesn't sink the whole range.
    """
    if not days:
        return []

    def _safe(day: Date) -> _T | None:
        try:
            return per_day(day)
        except (GarminAuthError, GarminUpstreamError):
            raise
        except Exception as exc:  # noqa: BLE001 - never let one day break the batch
            print(f"[garmin] skipping {day.isoformat()}: {exc!r}", file=sys.stderr, flush=True)
            return None

    workers = min(_SYNC_CONCURRENCY, len(days))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        results = list(pool.map(_safe, days))  # map preserves input order

    return [r for r in results if r is not None]


def _ms_to_datetime(value: Any) -> datetime | None:
    """UTC-aware datetime (for internal use only)."""
    if value is None:
        return None
    return datetime.fromtimestamp(int(value) / 1000, tz=timezone.utc)


def _ms_to_local_naive(value: Any) -> datetime | None:
    """Naive datetime representing the user's LOCAL wall-clock time.

    Garmin's *Local timestamp fields encode local time as a plain epoch
    offset (no DST adjustment).  Using utcfromtimestamp() on that value
    therefore yields the correct local clock reading as a naive datetime.
    We intentionally keep it naive so that Pydantic serialises it WITHOUT
    a 'Z' suffix; JS then interprets it as local time on the client side.
    """
    if value is None:
        return None
    return datetime.utcfromtimestamp(int(value) / 1000)


def _dig(data: Any, *path: str) -> Any:
    for key in path:
        if not isinstance(data, dict):
            return None
        data = data.get(key)
    return data


def get_sleep_range(token: str, start: Date, end: Date) -> list[schemas.SleepResponse]:
    garmin = _client_from_token(token)

    def _one(day: Date) -> schemas.SleepResponse | None:
        raw = _call(garmin.get_sleep_data, day.isoformat())
        return _map_sleep(day, raw)

    return _fetch_days_parallel(_date_range(start, end), _one)


def _parse_gmt_str(s: str) -> int:
    """Parse a Garmin GMT string to epoch ms.

    Handles both formats Garmin uses:
      • '2024-01-15 22:30:00'   (space separator, no fractional seconds)
      • '2024-01-15T22:30:00.0' (ISO-T separator, with fractional seconds)
    """
    from datetime import datetime
    # Normalize to 'YYYY-MM-DD HH:MM:SS' regardless of input format
    normalized = s.replace("T", " ").split(".")[0]
    return int(
        datetime.strptime(normalized, "%Y-%m-%d %H:%M:%S")
        .replace(tzinfo=timezone.utc)
        .timestamp()
        * 1000
    )


def _build_sleep_levels(raw: Any, sleep_start_ms: int | None, sleep_end_ms: int | None) -> list[schemas.SleepLevel]:
    """Extract and classify sleep stage segments.

    Garmin stores sleep stages across two fields:
      • sleepLevels — consolidated blocks: 0=deep, 1=light, 3=awake (NO REM)
      • remSleepData.remSleepWindowsList — explicit REM windows to overlay

    Steps:
      1. Load base segments from sleepLevels (fall back to sleepMovement).
      2. Filter to the confirmed sleep window.
      3. Overlay REM windows: any "light" (1.0) segment whose midpoint falls
         inside a REM window is reclassified to REM (2.0).

    activityLevel output: 0=deep, 1=light, 2=rem, 3=awake
    """
    import sys

    # ── 1. Load base segments ────────────────────────────────
    source_name = "sleepLevels" if raw.get("sleepLevels") else "sleepMovement"
    source: list[Any] = raw.get("sleepLevels") or raw.get("sleepMovement") or []
    print(
        f"[garmin] using '{source_name}', {len(source)} segments, "
        f"sample={source[:3]}",
        file=sys.stderr, flush=True,
    )

    out: list[schemas.SleepLevel] = []
    for lv in source:
        if not isinstance(lv, dict):
            continue
        start_str = lv.get("startGMT")
        end_str   = lv.get("endGMT")
        if not start_str or not end_str:
            continue
        try:
            seg_start = _parse_gmt_str(start_str)
            seg_end   = _parse_gmt_str(end_str)
        except ValueError:
            continue

        # ── 2. Filter to confirmed sleep window ──────────────
        if sleep_end_ms is not None and seg_start >= sleep_end_ms:
            continue
        if sleep_start_ms is not None and seg_end <= sleep_start_ms:
            continue

        out.append(schemas.SleepLevel(
            start_gmt=start_str,
            end_gmt=end_str,
            activity_level=float(lv.get("activityLevel", 0)),
        ))

    # ── 3. Overlay REM windows ───────────────────────────────
    # Garmin stores REM periods separately in remSleepData.
    rem_windows: list[tuple[int, int]] = []
    rem_data = raw.get("remSleepData")
    if isinstance(rem_data, dict):
        for rw in rem_data.get("remSleepWindowsList") or []:
            if not isinstance(rw, dict):
                continue
            try:
                rem_windows.append((_parse_gmt_str(rw["startGMT"]), _parse_gmt_str(rw["endGMT"])))
            except (ValueError, KeyError):
                pass
    print(f"[garmin] REM windows: {len(rem_windows)}", file=sys.stderr, flush=True)

    if not rem_windows:
        return out

    final: list[schemas.SleepLevel] = []
    for seg in out:
        level = seg.activity_level
        # Only reclassify "light" segments as REM
        if level == 1.0:
            try:
                seg_mid = (_parse_gmt_str(seg.start_gmt) + _parse_gmt_str(seg.end_gmt)) // 2
                for rem_start, rem_end in rem_windows:
                    if rem_start <= seg_mid <= rem_end:
                        level = 2.0  # REM
                        break
            except ValueError:
                pass
        final.append(schemas.SleepLevel(
            start_gmt=seg.start_gmt,
            end_gmt=seg.end_gmt,
            activity_level=level,
        ))

    return final


def _map_sleep(day: Date, raw: Any) -> schemas.SleepResponse | None:
    dto = _dig(raw, "dailySleepDTO")
    if not dto or not dto.get("sleepTimeSeconds"):
        return None

    sleep_start_ms: int | None = dto.get("sleepStartTimestampGMT")
    sleep_end_ms:   int | None = dto.get("sleepEndTimestampGMT")

    sleep_levels = _build_sleep_levels(raw, sleep_start_ms, sleep_end_ms)

    return schemas.SleepResponse(
        date=day,
        total_sleep_seconds=int(dto.get("sleepTimeSeconds") or 0),
        deep_sleep_seconds=int(dto.get("deepSleepSeconds") or 0),
        light_sleep_seconds=int(dto.get("lightSleepSeconds") or 0),
        rem_sleep_seconds=int(dto.get("remSleepSeconds") or 0),
        awake_seconds=int(dto.get("awakeSleepSeconds") or 0),
        sleep_score=_dig(dto, "sleepScores", "overall", "value"),
        average_sp_o2=dto.get("averageSpO2Value"),
        average_respiration_rate=dto.get("averageRespirationValue"),
        sleep_start_time=_ms_to_local_naive(dto.get("sleepStartTimestampLocal")),
        sleep_end_time=_ms_to_local_naive(dto.get("sleepEndTimestampLocal")),
        sleep_levels=sleep_levels,
    )


def get_wellness(token: str, day: Date) -> schemas.WellnessResponse:
    return _wellness_for(_client_from_token(token), day)


def get_wellness_range(token: str, start: Date, end: Date) -> list[schemas.WellnessResponse]:
    garmin = _client_from_token(token)
    return _fetch_days_parallel(_date_range(start, end), lambda day: _wellness_for(garmin, day))


def _wellness_for(garmin: Garmin, day: Date) -> schemas.WellnessResponse:
    cdate = day.isoformat()

    summary = _call(garmin.get_user_summary, cdate) or {}
    readiness_raw = _call(garmin.get_training_readiness, cdate) or []
    readiness = readiness_raw[0] if isinstance(readiness_raw, list) and readiness_raw else {}
    metrics_raw = _call(garmin.get_max_metrics, cdate) or []
    metrics = metrics_raw[0] if isinstance(metrics_raw, list) and metrics_raw else {}

    vo2 = _dig(metrics, "generic", "vo2MaxPreciseValue") or _dig(metrics, "generic", "vo2MaxValue")

    return schemas.WellnessResponse(
        date=day,
        vo2_max_ml_per_min_per_kg=vo2,
        training_readiness_score=readiness.get("score"),
        training_readiness_level=readiness.get("level"),
        body_battery_min=summary.get("bodyBatteryLowestValue"),
        body_battery_max=summary.get("bodyBatteryHighestValue"),
        average_stress_level=summary.get("averageStressLevel"),
        steps_count=summary.get("totalSteps"),
    )


def get_hrv(token: str, day: Date) -> schemas.HrvResponse:
    return _hrv_for(_client_from_token(token), day)


def get_hrv_range(token: str, start: Date, end: Date) -> list[schemas.HrvResponse]:
    garmin = _client_from_token(token)
    return _fetch_days_parallel(_date_range(start, end), lambda day: _hrv_for(garmin, day))


def _hrv_for(garmin: Garmin, day: Date) -> schemas.HrvResponse:
    raw = _call(garmin.get_hrv_data, day.isoformat()) or {}
    summary = _dig(raw, "hrvSummary") or {}
    return schemas.HrvResponse(
        date=day,
        last_night_avg_ms=summary.get("lastNightAvg"),
        last_night_5_min_high_ms=summary.get("lastNight5MinHigh"),
        status=summary.get("status"),
    )
