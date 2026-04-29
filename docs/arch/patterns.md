# AvodaNow — Key Design Patterns

> Full architecture reference: `Architecture.md` (read on demand, not auto-loaded)

## Authentication Flow

```
Client → auth.sendOtp  → Twilio sends SMS OTP to phone
Client → auth.verifyOtp → Server verifies via Twilio Verify API
                        → Creates/updates user row in DB
                        → Sets signed session cookie (JWT_SECRET)
Client → auth.me        → Server reads cookie → returns ctx.user
```

Google OAuth is handled directly by the backend through `/api/auth/google/start` and `/api/auth/google/callback`.

## tRPC Procedure Access Levels

```ts
publicProcedure    // No auth check — anyone can call
protectedProcedure // ctx.user must exist → throws UNAUTHORIZED otherwise
adminProcedure     // ctx.user.role === 'admin' → throws FORBIDDEN otherwise
```

## PostGIS Spatial Queries

Both `jobs` and `worker_availability` store a `geometry(Point, 4326)` column derived from `latitude`/`longitude`.

```sql
ST_DWithin(location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius_meters)
ST_Distance(location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) AS distance_m
```

## Unified Worker ↔ Job Matching

Single shared matcher: `server/jobMatching.ts` — source of truth for all matching flows.

Used for: job discovery, worker alerts on new jobs, employer-facing worker matching (`jobs.matchWorkers`).

Excluded from filtering: `preferenceText` (ignored), `availabilityStatus` (not a hard filter).

Employer ranking order (post-match): category specificity → availabilityStatus → match score → distance → rating → completedJobsCount.

`notificationPrefs` controls delivery channel only (`both` / `sms_only` / `push_only` / `none`).

## Notification Batching

`notificationBatcher.ts` batches applicant alerts → single SMS to employer per job (10-min flush window).

## Regional Activation

Regions: `collecting_workers` → `active` (via `regions.activateAndNotify`). Worker counts via `worker_regions` join table.

## Legal Consent Versioning

`LEGAL_DOCUMENT_VERSIONS` in `shared/const.ts` is the single source of truth. Bumping a version triggers re-consent UX via `ReConsentModal` / `TermsUpdateBanner`.

## CSS Design Tokens (oklch)

| Token | Value | Usage |
|---|---|---|
| `--olive` | `oklch(0.42 0.08 130)` | Primary brand |
| `--citrus` | `oklch(0.82 0.18 95)` | Accent on dark backgrounds |
| `--citrus-on-light` | `oklch(0.68 0.18 95)` | Citrus on light (WCAG AA) |
| `--cream` | `oklch(0.97 0.02 95)` | Light background / text on dark |
| `--sand` | `oklch(0.92 0.04 90)` | Secondary light background |
