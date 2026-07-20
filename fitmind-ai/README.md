# FitMind AI

Accuracy-first personal calorie & nutrition tracker (PWA) with Sri Lankan food support. AI parses natural-language meals and matches them to a curated nutrition database (the source of truth); estimates are clearly labelled.

This is the runnable application. Planning artifacts (brief, PRD, architecture spine, epics/stories) live in `../_bmad-output/planning-artifacts/`.

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript** · **Tailwind CSS 4**
- **PostgreSQL** + **Prisma 6**
- **Better Auth** (email/password, DB-backed sessions)
- Provider-agnostic AI layer (Google Gemini adapter, added in Epic 2)
- PWA (installable, offline instant-path in Epic 4)

Architecture invariants: see `../_bmad-output/planning-artifacts/architecture/architecture-FitMe_AI-2026-07-20/ARCHITECTURE-SPINE.md` (AD-1…AD-13).

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Configure environment — copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

You need a PostgreSQL database (`DATABASE_URL`) and a `BETTER_AUTH_SECRET` (e.g. `openssl rand -base64 32`).

3. Create the database schema:

```bash
npm run db:migrate
```

4. Run the dev server:

```bash
npm run dev
```

Open http://localhost:3000. Health check: http://localhost:3000/api/health.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest unit tests |
| `npm run db:migrate` | Prisma dev migration |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:studio` | Prisma Studio |

## Project structure

```
app/            # App Router: pages, server actions, api routes
  api/auth/     # Better Auth handler
  api/health/   # Health probe
lib/
  dal/          # server-only Data Access Layer (auth + ownership choke point)
  domain/       # pure business logic (nutrition, targets, safety) — added per story
  ai/           # provider-agnostic AI port + adapters — added in Epic 2
  schemas/      # shared Zod schemas
  logging/      # redaction logger (no PII/health in logs)
  auth.ts       # Better Auth server config
  db.ts         # Prisma singleton
  env.ts        # env validation (fail fast)
  result.ts     # typed result envelope
prisma/         # schema + migrations + seed
tests/          # unit tests
```

## Conventions

- All mutations are Zod-validated Server Actions that go through the `lib/dal` choke point (auth → ownership → effect).
- Components never import Prisma directly; the DAL returns DTOs.
- No health/PII data in logs or error messages.
- Times stored in UTC; the "day" is computed in the user's profile timezone.

Not a medical device. Estimates are not medical advice.
