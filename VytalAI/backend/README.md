# VytalAI Backend (FastAPI)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # edit values
python main.py              # dev server with reload → http://localhost:8000/docs
pytest -q                   # needs requirements-dev.txt
```

All configuration is via environment variables — see `.env.example` (every variable is documented there).
Set `ENVIRONMENT=production` on your host: it hides `/docs`, disables reload and **refuses to boot** if
`JWT_SECRET_KEY` is weak/default, `ADMIN_PASSWORD` is the default, or `MONGO_URI` points at localhost.

## Endpoints

| Method & path | Access | Purpose |
|---|---|---|
| `GET /health`, `GET /` | public | Liveness |
| `POST /auth/login` | public | Login (all roles) → JWT + `first_login` flag |
| `POST /auth/signup/doctor` | public (optional invite code) | Doctor account |
| `POST /auth/signup/patient` | public | Manual patient registration, returns generated credentials |
| `POST /auth/change-password`, `GET /auth/me` | any logged-in | |
| `GET/PATCH /api/my-record` | patient | Own record (whitelisted fields only) |
| `GET /api/patients`, `/api/patients/{conversation_id}` | admin | |
| `GET /admin/patients · /pending-cases · /doctors · /stats` | admin | |
| `PUT /admin/patient/{id}/assign-doctor` | admin | Assign + live-notify the doctor |
| `GET /doctor/patients`, `/doctor/patient/{id}` | doctor | Assigned patients only |
| `POST /doctor/prescription`, `PUT /doctor/report`, `PUT /doctor/patient-status` | doctor | Clinical updates |
| `POST /webhook/elevenlabs` | ElevenLabs (HMAC) | Post-call webhook → saves patient + creates account |
| `WS /ws/updates?token=<jwt>` or `?session=<id>` | admin/doctor or public session | Live updates (scoped, see root README) |

## Patient credentials
Username `name.last4digits@patient.vytalai`, temporary password = contact number; the patient must change it on first login.

## ElevenLabs data-collection field names the webhook reads
`Name`, `Age`, `Gender`, `Contact`, `Address`, `Reason`, `Previous Medical History`, `Emergency Contact`, `Appointment Preference`
(names must match exactly).
