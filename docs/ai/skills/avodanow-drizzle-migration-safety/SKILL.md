---
name: avodanow-drizzle-migration-safety
description: Use when working inside AvodaNow on Drizzle, PostgreSQL, PostGIS, schema changes, migrations, or test database setup. Apply this skill for tasks touching `drizzle/`, `drizzle.config.ts`, `drizzle.test.config.ts`, `.env.test`, or DB helpers so changes stay safe, environment-aware, and easy to verify.
---

# AvodaNow Drizzle Migration Safety

## Overview

This skill keeps AvodaNow database work safe by making env targeting, migration shape, and verification explicit before editing anything.

## Use this skill when

- A task touches `drizzle/schema.ts`, migration files, snapshots, or relation files.
- A change needs `drizzle-kit generate`, `drizzle-kit migrate`, or test DB setup.
- A feature requires DB shape changes before backend or frontend work.
- There is any risk of mixing production and test database settings.

## Read first

- `Architecture.md`
- `drizzle.config.ts`
- `drizzle.test.config.ts`
- `.env.test`
- The relevant files under `drizzle/`

## Workflow

1. Identify which environment the task targets: production config, test config, or both.
2. Read the existing schema and the latest related migrations before proposing changes.
3. Decide whether the task is:
   - schema-only
   - migration-only
   - query/helper change without schema changes
   - test-database setup or repair
4. Make the smallest schema change that supports the requested behavior.
5. Keep migration intent obvious. Avoid unrelated churn in generated files.
6. Verify with the smallest relevant command.

## Safety rules

- Never run test DB commands against production credentials.
- Prefer `.env.test` with `TEST_DATABASE_URL` for isolated test work.
- Production Drizzle work should rely on `POSTGRES_URL` or `DATABASE_URL`.
- Do not change both prod and test config blindly. Confirm whether both are really needed.
- If a generated migration contains unrelated diff noise, stop and inspect before accepting it.
- Preserve PostGIS assumptions already used by the app.

## Implementation guidance

- Keep schema naming and enum usage consistent with the existing `drizzle/` files.
- When a DB change affects API behavior, note the backend follow-up explicitly.
- When a DB change affects forms or pages, note the frontend follow-up explicitly.
- Prefer additive changes when possible unless the task clearly requires destructive schema work.

## Verification

- For schema and migration work, prefer the smallest relevant check:
  - `pnpm db:push`
  - `pnpm db:push:test`
  - `pnpm test:integration`
- If you skip a migration or test step, say exactly why.
