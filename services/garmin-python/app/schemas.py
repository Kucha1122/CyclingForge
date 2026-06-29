"""Pydantic models — the JSON contract shared with the C# Garmin module.

Field names use camelCase so they map 1:1 onto the C# records
(GarminSleepResponse / GarminWellnessResponse / GarminHrvResponse) without
extra serializer configuration on either side.
"""
from __future__ import annotations

from datetime import date as Date
from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    # Accept and emit camelCase, but still allow snake_case when constructing
    # from Python (populate_by_name).
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ----- requests -----

class LoginRequest(_CamelModel):
    email: str
    password: str


class SleepRequest(_CamelModel):
    token: str
    start_date: Date
    end_date: Date


class RangeRequest(_CamelModel):
    """Date-range request shared by /sleep, /wellness/range and /hrv/range."""
    token: str
    start_date: Date
    end_date: Date


class DateRequest(_CamelModel):
    token: str
    date: Date


class ValidateRequest(_CamelModel):
    token: str


# ----- responses -----

class LoginResponse(_CamelModel):
    # Serialized garth session stored per user on the C# side.
    # Set when login succeeded without 2FA.
    token: str | None = None
    # Set when the account requires a 2FA code. Caller must POST to /login/mfa.
    needs_mfa: bool = False
    session_id: str | None = None


class MfaRequest(_CamelModel):
    session_id: str
    mfa_code: str


class SleepLevel(_CamelModel):
    # "YYYY-MM-DD HH:MM:SS" strings in UTC, passed through as-is so the
    # frontend can compute relative positions without timezone issues.
    start_gmt: str
    end_gmt: str
    # 0=deep, 1=light, 2=rem, 3=awake
    activity_level: float


class SleepResponse(_CamelModel):
    date: Date
    total_sleep_seconds: int
    deep_sleep_seconds: int
    light_sleep_seconds: int
    rem_sleep_seconds: int
    awake_seconds: int
    sleep_score: int | None = None
    average_sp_o2: float | None = None
    average_respiration_rate: float | None = None
    # Naive datetime (no Z suffix) so JS treats it as local wall-clock time.
    sleep_start_time: datetime | None = None
    sleep_end_time: datetime | None = None
    sleep_levels: list[SleepLevel] = []


class WellnessResponse(_CamelModel):
    date: Date
    vo2_max_ml_per_min_per_kg: float | None = None
    training_readiness_score: int | None = None
    training_readiness_level: str | None = None
    body_battery_min: int | None = None
    body_battery_max: int | None = None
    average_stress_level: int | None = None
    steps_count: int | None = None


class HrvResponse(_CamelModel):
    date: Date
    last_night_avg_ms: int | None = None
    last_night_5_min_high_ms: int | None = None
    status: str | None = None


class ValidateResponse(_CamelModel):
    valid: bool
