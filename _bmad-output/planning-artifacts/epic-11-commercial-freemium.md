---
title: Epic 11 — Commercial & Freemium
status: in-progress
updated: 2026-07-31
owner: product + engineering
dependsOn:
  - Epic 2 (AI meal parse — primary cost center)
  - Epic 4 (Offline catalog quick-log — free-tier path)
  - Epic 9 (Progress — future Pro gate)
inputDocuments:
  - _bmad-output/planning-artifacts/briefs/brief-FitMe_AI-2026-07-20/brief.md
  - _bmad-output/planning-artifacts/architecture/architecture-FitMe_AI-2026-07-20/ARCHITECTURE-SPINE.md
  - fitme-ai/docs/FEATURES-AND-AI-INTEGRATION.md
decision: Post-MVP commercial layer — validate retention first; monetize AI margin + depth features
---

# Epic 11: Commercial & Freemium

## Intent

Introduce a freemium model that protects AI API margin, preserves a usable free tier (catalog quick-log + manual entry), and creates natural upgrade moments — without blocking core habit-loop logging.

Business metrics were intentionally deferred in the Product Brief until PMF signals (daily logging, trust in sources) are demonstrated. This epic adds the **technical substrate** for monetization in phased slices.

## Outcome

After full epic delivery:

1. Free users have a daily AI parse quota; Pro users have unlimited parses  
2. Subscription state is persisted and auditable (Stripe + PayHere)  
3. Premium depth features (progress range, fasting/glucose history, favorites cap) are server-gated in the DAL  
4. Upgrade UX is calm and non-shaming (UX-DR2)  

## Story sequence

| ID | Story | Status | Implementation artifact |
|----|--------|--------|-------------------------|
| 11.1 | Freemium entitlements + AI parse daily quota | done | `11-1-freemium-ai-parse-quota.md` |
| 11.2 | Subscription on register + manual Pro flag (beta) | review | `11-2-subscription-on-register-manual-pro.md` |
| 11.3 | Stripe checkout + webhooks | backlog | — |
| 11.4 | PayHere checkout + webhooks (LKR) | backlog | — |
| 11.5 | Premium feature gates (progress, fasting, glucose, favorites) | backlog | — |
| 11.6 | Billing settings UI + upgrade flows | backlog | — |

## Tier model (target)

| Feature | Free | Pro |
|---------|------|-----|
| Catalog quick-log (offline) | ✅ | ✅ |
| Manual food entry | ✅ | ✅ |
| Dashboard, water, exercise | ✅ | ✅ |
| AI meal parse | 5/day (configurable) | Unlimited |
| Progress charts | 7-day (Story 11.5) | Full range |
| Fasting history | Active only (11.5) | Full |
| Glucose history | 7 days (11.5) | Full |
| Favorites | 10 max (11.5) | Unlimited |

Story **11.1** implements only the entitlements foundation + AI parse gate.

## Story 11.1 delivered (2026-07-31)

- `Subscription` Prisma model + migration (no backfill; missing row = free)
- `lib/dal/entitlements.ts` — `getEntitlements`, `assertAiParseAllowed`
- `parseMealAction` quota gate before AI call
- Log UI: quota message + upgrade hint; low-quota remaining hint
- Env: `FREE_AI_PARSES_PER_DAY`, `BILLING_ENABLED`
- Artifact: `11-1-freemium-ai-parse-quota.md` (status: done)

## Story 11.2 delivered (2026-07-31)

- `lib/dal/subscription.ts` — `ensureFreeSubscription`, `grantProSubscription`, register provisioning
- `registerAction` — best-effort free row after signup
- `npm run billing:grant-pro -- <email>` ops script
- Artifact: `11-2-subscription-on-register-manual-pro.md` (status: review)

## Architecture refs

- AD-1: DAL as auth + data choke point — entitlements live in `lib/dal/entitlements.ts`  
- AD-7: User-scoped subscription row (`userId` unique)  
- AD-9: No PII/billing secrets in logs; webhook payloads redacted  
- AD-10: AI parse quota counted in profile timezone day boundary  
- AD-13: Typed `Result` envelope for quota errors  

## Non-goals (Epic 11 overall)

- Coach/nutritionist portal (deferred in PRD)  
- Family/multi-user plans  
- Usage-based billing beyond AI parse metering  
