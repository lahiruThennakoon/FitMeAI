---
name: start-demo-environment
description: Starts the FitMe AI local demo stack (Postgres, migrations, seeded demo user with meals, water, exercise, weight, fasting, and glucose history). Use when the user asks to start a demo, demo environment, demo login, test all modules, or seed sample data for presentations.
---

# Start Demo Environment

## Quick start

From repo root, run the app directory:

```bash
cd fitme-ai
node scripts/seed-demo-environment.mjs
npm run dev
```

Open http://localhost:3000/login with the printed credentials.

## What the seed script does

1. Starts Docker Postgres (`fitme-pg`) if available
2. Runs `npx prisma migrate deploy`
3. Creates/resets **demo@fitme.ai** (verified, known password)
4. Upserts profile + goals (Asia/Colombo timezone)
5. Replaces demo user's sample data:
   - **Meals** — 10 entries with sugar/fibre macros, favorites, multi-day history
   - **Water** — 14 logs across several days
   - **Exercise** — 4 workouts
   - **Weight** — 7 weigh-ins (progress charts)
   - **Fasting** — 1 active fast + 4 completed sessions
   - **Glucose** — 10 readings (fasting, after-meal, bedtime, etc.)

## Demo credentials (local only)

| Field | Value |
|-------|-------|
| URL | http://localhost:3000/login |
| Email | `demo@fitme.ai` |
| Password | `DemoFitMe2026!` |

Constants live in `fitme-ai/scripts/demo/constants.mjs`.

## Flags

```bash
node scripts/seed-demo-environment.mjs --skip-docker    # DB already running
node scripts/seed-demo-environment.mjs --skip-migrate   # schema up to date
```

Or via npm: `npm run demo:seed`

## Demo walkthrough (after login)

| Module | Path | What to show |
|--------|------|--------------|
| Home | `/dashboard` | Energy, macros, sugar, water; calendar for past days |
| Log food | `/log` | Parse meal (needs AI key + TLS — see below) |
| Exercise | `/exercise` | Log workout |
| Fasting | `/fasting` | Active timer + history |
| Glucose | `/glucose` | Readings list + log form |
| Progress | `/progress` | Weight/time charts |
| Profile | `/goals` | Targets + weight check-in pacing |

## Prerequisites checklist

Run through before declaring demo ready:

```
- [ ] docker start fitme-pg  (or Postgres on DATABASE_URL port)
- [ ] node scripts/seed-demo-environment.mjs  → prints credentials
- [ ] npm run dev  → http://localhost:3000
- [ ] Login as demo@fitme.ai succeeds
- [ ] /dashboard shows meals, water, energy (not empty)
- [ ] /progress shows weight series
- [ ] /glucose and /fasting show history
```

## AI meal parse (optional)

Food **logging** works without AI. **Parse meal** on `/log` needs:

- `AI_PROVIDER` + matching API key in `.env`
- Corporate proxy: `NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env` (dev only)

Diagnose: `node scripts/check-ai.mjs`

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Can't reach database` | `docker start fitme-pg` |
| Login fails | Re-run `node scripts/seed-demo-environment.mjs` |
| Empty dashboard | Same — seed resets demo data |
| Parse meal fails | Check AI keys / TLS (see above) |
| Port 3000 in use | Stop other `next dev` or use the port shown in terminal |

## Reset demo data only

Re-running the full seed script is idempotent — it clears and re-seeds demo user data.

Password-only reset (no sample data):

```bash
node scripts/seed-demo-user.mjs
```
