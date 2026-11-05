# VytalAI Frontend (React + Vite + Tailwind 4)

```bash
npm install
cp .env.example .env     # set VITE_API_BASE_URL and VITE_ELEVENLABS_AGENT_ID
npm run dev              # http://localhost:5173
npm run build            # production bundle in dist/
```

| Route | Access |
|---|---|
| `/` | Landing page |
| `/login` | All roles (role tabs are just hints) |
| `/signup` | Doctor sign-up |
| `/register` | Public patient registration — voice tab + manual tab |
| `/change-password` | Forced on a patient's first login |
| `/admin`, `/doctor`, `/patient-portal` | Role-protected dashboards |

`VITE_*` variables are baked in at **build time** — after changing them in Vercel/Netlify, redeploy.
`public/_redirects` (Netlify) and `vercel.json` make deep links such as `/login` work on refresh.
