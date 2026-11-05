# VytalAI — AI-Powered Patient Registration

Patients register by **talking to a voice agent** (ElevenLabs Conversational AI) or via a manual form.
Admins assign each patient to a doctor; doctors manage prescriptions, reports and status; patients get a
portal to view and edit their own record. Updates are pushed live over WebSockets.

```
VytalAI/
├── backend/            FastAPI + MongoDB (Motor) — JWT auth, RBAC, webhook, WebSocket
├── frontend/           React 19 + Vite + Tailwind 4 — landing, login, 3 role dashboards, voice registration
├── render.yaml         One-click backend deploy blueprint (Render)
├── docker-compose.yml  Local Mongo + API
└── DEPLOYMENT.md       ← step-by-step: local run → Atlas → Render → Vercel → ElevenLabs
```

## Roles

| Role    | How they get an account                                   | Can do |
|---------|-----------------------------------------------------------|--------|
| Admin   | Seeded on first backend start from `ADMIN_EMAIL/PASSWORD` | See all patients, assign doctors, export CSV, live feed |
| Doctor  | Self sign-up at `/signup` (optionally gated by invite code) | See **only assigned** patients; prescriptions, reports, status |
| Patient | Auto-created after voice call / manual sign-up            | View + edit own personal details (forced password change on first login) |

## Quick start (local)

```bash
# 1. backend  (needs MongoDB — easiest: `docker compose up -d mongo`)
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python main.py                                         # http://localhost:8000/docs

# 2. frontend (second terminal)
cd frontend
npm install
cp .env.example .env
npm run dev                                            # http://localhost:5173
```

Log in at `/login` as **Admin** with `admin@vytalai.com` / `Admin@VytalAI123` (dev defaults).
Full production steps are in **[DEPLOYMENT.md](DEPLOYMENT.md)**.

## What changed vs. the original VocaCare code

Renamed to VytalAI everywhere (UI, API, emails `…@patient.vytalai`, localStorage keys, CSV names) and hardened:

* **WebSocket no longer leaks patient data.** It was open to anyone and broadcast every full record
  (transcript included). Now admins authenticate with their JWT, doctors only get "patient assigned"
  pings, and the public voice page receives *only its own* registration.
* `/api/get-latest-webhook` (unauthenticated cache of the last patient payload) removed.
* Doctors can no longer list **all** patients through `/api/patients` — only assigned ones via `/doctor/*`.
* ElevenLabs webhook signature (HMAC) verification; failures return 5xx so ElevenLabs retries instead of losing a registration.
* Voice-flow "Confirm & Save" used to silently discard edits — it now actually saves them.
* Fixed an infinite redirect when a doctor opened `/admin`; expired tokens now log the user out cleanly.
* Fixed false "update failed" errors when re-assigning the same doctor / re-saving the same status.
* Emails are case-insensitive; unique index on `users.email`.
* Config via environment: CORS origins, DB name, port; production mode refuses to start with default secrets.
* Removed the hard-coded ElevenLabs agent id (it pointed at the original author's agent), dead legacy dashboard code and debug scripts.
* Added tests, Dockerfile, Render blueprint, SPA rewrites for Vercel/Netlify, favicon.

## Tests

```bash
cd backend && pip install -r requirements-dev.txt && pytest -q
```
