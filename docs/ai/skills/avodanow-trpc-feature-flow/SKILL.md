---
name: avodanow-trpc-feature-flow
description: Use when adding or changing an AvodaNow feature that crosses tRPC, database helpers, shared types, and the React client. Apply this skill for work touching `server/routers.ts`, `server/db.ts`, `shared/`, `client/src/pages`, or `client/src/components` so the feature stays split cleanly across layers and gets verified end to end.
---

# AvodaNow tRPC Feature Flow

## Overview

This skill keeps multi-layer AvodaNow feature work structured, so DB, backend, frontend, and UI responsibilities do not blur together.

## Use this skill when

- A change spans tRPC procedures and React pages/components.
- A feature needs shared types, validation, or query helper updates.
- A task touches `server/routers.ts`, `server/db.ts`, `shared/`, and `client/src/*`.
- You want an end-to-end implementation plan without loading large general guidance.

## Read first

- `Architecture.md`
- `AGENTS.md`
- The specific page, component, router, and DB helper files involved in the feature

## Flow

1. Map the request to responsibilities:
   - `db`
   - `backend`
   - `frontend`
   - `ui`
   - `review`
2. Read the existing implementation nearest to the feature before creating new files.
3. Prefer this order unless the task clearly suggests another:
   - data shape
   - backend contract
   - client integration
   - UI polish
4. Keep each change local to its layer whenever possible.
5. Run one review pass across the full flow before finalizing.

## Layer rules

- `db`: keep data and relational changes in schema and DB helpers.
- `backend`: keep validation, auth, and business logic near tRPC procedures and server helpers.
- `frontend`: wire queries, mutations, forms, and state in pages/hooks/components.
- `ui`: improve hierarchy, CTA clarity, and states without moving business logic into presentational code.

## AvodaNow-specific guardrails

- Prefer existing helpers and patterns over new abstractions.
- Reuse `server/db.ts` and `server/adminDb.ts` before adding fresh query paths.
- Reuse existing hooks, UI primitives, and page shells before introducing new structure.
- If `Architecture.md` documents an existing pattern, follow it unless the code clearly diverges.

## Verification

- Run the smallest relevant checks:
  - `pnpm check`
  - `pnpm test`
  - `pnpm test:integration`
- If only one layer changed, do not run the full world by default.
- If behavior spans multiple layers, mention what was or was not verified.
