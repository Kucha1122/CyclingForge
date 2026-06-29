"""FastAPI entrypoint for the Garmin microservice.

The service is a stateless adapter over python-garminconnect:
  POST /login     -> exchange email/password for a garth session token
  POST /sleep     -> sleep data for a date range
  POST /wellness  -> daily wellness (VO2max, readiness, body battery, stress, steps)
  POST /hrv       -> overnight HRV summary
  POST /validate  -> check whether a stored token still works
  GET  /health    -> liveness probe

All data endpoints take the garth token in the body; nothing is persisted here.
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException

from . import garmin_client, schemas

app = FastAPI(title="CyclingForge Garmin Service", version="1.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/login", response_model=schemas.LoginResponse)
def login(request: schemas.LoginRequest) -> schemas.LoginResponse:
    try:
        token = garmin_client.login(request.email, request.password)
        return schemas.LoginResponse(token=token)
    except garmin_client.GarminMfaRequired as exc:
        # exc.args[0] is the session_id
        return schemas.LoginResponse(needs_mfa=True, session_id=str(exc))
    except garmin_client.GarminAuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except garmin_client.GarminUpstreamError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/login/mfa", response_model=schemas.LoginResponse)
def login_mfa(request: schemas.MfaRequest) -> schemas.LoginResponse:
    try:
        token = garmin_client.login_complete(request.session_id, request.mfa_code)
        return schemas.LoginResponse(token=token)
    except garmin_client.GarminAuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@app.post("/validate", response_model=schemas.ValidateResponse)
def validate(request: schemas.ValidateRequest) -> schemas.ValidateResponse:
    return schemas.ValidateResponse(valid=garmin_client.validate(request.token))


@app.post("/sleep", response_model=list[schemas.SleepResponse])
def sleep(request: schemas.SleepRequest) -> list[schemas.SleepResponse]:
    return _guard(lambda: garmin_client.get_sleep_range(
        request.token, request.start_date, request.end_date))


@app.post("/wellness", response_model=schemas.WellnessResponse)
def wellness(request: schemas.DateRequest) -> schemas.WellnessResponse:
    return _guard(lambda: garmin_client.get_wellness(request.token, request.date))


@app.post("/wellness/range", response_model=list[schemas.WellnessResponse])
def wellness_range(request: schemas.RangeRequest) -> list[schemas.WellnessResponse]:
    return _guard(lambda: garmin_client.get_wellness_range(
        request.token, request.start_date, request.end_date))


@app.post("/hrv", response_model=schemas.HrvResponse)
def hrv(request: schemas.DateRequest) -> schemas.HrvResponse:
    return _guard(lambda: garmin_client.get_hrv(request.token, request.date))


@app.post("/hrv/range", response_model=list[schemas.HrvResponse])
def hrv_range(request: schemas.RangeRequest) -> list[schemas.HrvResponse]:
    return _guard(lambda: garmin_client.get_hrv_range(
        request.token, request.start_date, request.end_date))


def _guard(fn):
    """Translate domain errors into HTTP status codes for data endpoints."""
    try:
        return fn()
    except garmin_client.GarminAuthError as exc:
        # 401 signals the C# side to mark the connection as expired.
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except garmin_client.GarminUpstreamError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
