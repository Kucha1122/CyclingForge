# Garmin microservice (python-garminconnect)

Stateless FastAPI adapter over [python-garminconnect](https://github.com/cyberjunky/python-garminconnect).
Logs into Garmin Connect with a user's email/password, returns a serialized **garth
session token**, and exposes sleep / wellness / HRV data. The token (not the password)
is what the CyclingForge backend stores per user and sends back on every call.

## Run locally

```bash
cd services/garmin-python
python -m venv .venv
.venv\Scripts\activate          # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs for the interactive Swagger UI.

## Endpoints

| Method | Path        | Body                                  | Returns                         |
|--------|-------------|---------------------------------------|---------------------------------|
| GET    | `/health`   | –                                     | `{ "status": "ok" }`            |
| POST   | `/login`    | `{ email, password }`                 | `{ token }` (garth session)     |
| POST   | `/validate` | `{ token }`                           | `{ valid }`                     |
| POST   | `/sleep`    | `{ token, startDate, endDate }`       | list of sleep records           |
| POST   | `/wellness` | `{ token, date }`                     | one wellness record             |
| POST   | `/hrv`      | `{ token, date }`                     | one HRV record                  |

Dates are ISO `YYYY-MM-DD`. Field names are camelCase to match the C# records.

### Status codes
- `401` – bad credentials or expired/invalid session token (C# treats as "disconnected").
- `422` – account requires 2FA (single-step login not yet supported).
- `502` – Garmin Connect unreachable or rate-limited.

## Quick test

```bash
# 1. log in -> grab the token
curl -s -X POST localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"secret"}'

# 2. use the token
curl -s -X POST localhost:8000/wellness \
  -H "Content-Type: application/json" \
  -d '{"token":"<TOKEN>","date":"2026-06-12"}'
```

## Notes
- **Security:** run this service on an internal network only — it accepts a Garmin
  password on `/login`. It never logs or persists credentials; only the caller stores
  the returned token.
- **2FA:** accounts with two-factor auth return `422`. A two-step login can be added later.
