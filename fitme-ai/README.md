# FitMe AI

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

### Email verification (registration)

Registration requires email verification before sign-in (Story 1.2 / FR-1).

- **Local / no API key:** leave `RESEND_API_KEY` unset. No real email is sent. The console/dev adapter logs a redacted `{ event, userId, path }` only (tokens never printed). Set `RESEND_API_KEY` for a real inbox link, or verify via your mail provider in staging. Registration fails if delivery fails (Resend down, timeout, or production without `RESEND_API_KEY`).
- **Real inbox email:** set `RESEND_API_KEY` (and optionally `EMAIL_FROM`) in `.env`, then restart the server. With Resend’s free `onboarding@resend.dev` sender you can usually only deliver to the email on your Resend account until you verify a domain.

Register at `/register`. After signup you should see a “check your email” success state. Sign in at `/login` — verified users land on `/dashboard`.

### Password reset

Forgot-password flow (Story 1.4 / FR-2) uses the same mail adapter as verification.

- Request a link at `/forgot-password` — the UI always shows the same neutral success message (no email enumeration).
- The email link lands on `/reset-password?token=…`; submitting a new password signs you out of all prior sessions.
- Invalid or expired links show a clear message with a link to request a new one.

### Account deletion

Account deletion (Story 1.5 / FR-3) lives at `/settings` (requires sign-in).

- Re-enter your password and type `DELETE` to confirm — explicit consent before any data is removed.
- Better Auth hard-deletes the user row; sessions and credential accounts cascade via Prisma.
- Orphaned verification tokens are purged in a `beforeDelete` hook; an audit event is logged without health payloads.

### Profile & targets

After sign-in, open **Profile & targets** at `/goals` (Story 1.6 / FR-4).

- Enter profile details; suggested targets use Mifflin–St Jeor BMR × activity multiplier.
- Formula, inputs, and “estimates, not medical advice” are shown on the page.
- Values store in canonical units (g, cm, kcal, ml); metric/imperial toggle converts at the edges.
- Safety ladder (Story 1.7 / FR-5): green / yellow (“not recommended”) / red (consent required). Thresholds and sources are shown on `/goals`. Dangerous saves record consent; safer edits clear it.

### Nutrition catalog (Story 2.1 / FR-7 data layer)

Curated Food / Ingredient / FoodServing / RecipeIngredient tables with canonical grams/kcal.

```bash
npx prisma migrate deploy
npm run db:seed
```

Seed covers Sri Lankan staples (rice, pol sambol, dhal curry, kottu, string hoppers, …) with hybrid provenance (USDA-style open data approximations + hand-curated dish proportions). Lookups return `dataSource: "database"`. Missing macros stay `null`.

### Rate limiting & logging (Story 1.8 / FR-30–31)

Auth abuse protection uses an in-memory sliding window (fine for single-instance / one Edge isolate; not shared across multiple replicas — swap the store later for Redis if you scale out). AI endpoint limits land in Epic 2.

| Surface | Limit | Window |
| --- | --- | --- |
| `/api/auth/*` other paths (middleware) | 60 | 1 minute |
| Login (Server Action + `/api/auth/sign-in/*`) | 10 | 15 minutes |
| Register (Server Action + `/api/auth/sign-up/*`) | 5 | 1 hour |
| Password-reset request (Action + forget-password HTTP) | 5 | 1 hour |
| Password-reset submit (Action + reset-password HTTP) | 10 | 1 hour |
| Account delete (Server Action; password-gated) | 10 | 15 minutes (login bucket) |

Over-limit responses use the safe copy *“Too many attempts. Please try again later.”* (HTTP `429` + `Retry-After` on the API). Client keys prefer platform IP headers (`x-vercel-forwarded-for`, `cf-connecting-ip`, `x-real-ip`) over raw `x-forwarded-for`. Logs go through `lib/logging` redaction — no email/password/health keys or raw `Error.message` values.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest unit tests |
| `npm run db:migrate` | Prisma dev migration |
| `npm run db:deploy` | Apply migrations |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:seed` | Seed Sri Lankan nutrition catalog |
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
  rate-limit/   # auth rate-limit buckets + in-memory store (FR-30)
  auth.ts       # Better Auth server config
  db.ts         # Prisma singleton
  env.ts        # env validation (fail fast)
  result.ts     # typed result envelope
middleware.ts   # /api/auth rate limit (defense in depth)
prisma/         # schema + migrations + seed
tests/          # unit tests
```

## Conventions

- All mutations are Zod-validated Server Actions that go through the `lib/dal` choke point (auth → ownership → effect).
- Components never import Prisma directly; the DAL returns DTOs.
- No health/PII data in logs or error messages.
- Times stored in UTC; the "day" is computed in the user's profile timezone.

FitMe AI helps you track, not diagnose. Consult a professional for medical concerns.
