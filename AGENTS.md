# AvodaNow
This repository uses `pnpm`.
## Setup & initialization

- Always consult the notebook before answering strategy questions.
- Notebook: **YallaAvoda** (ID: `9f1e4257-b7a7-4622-af3c-7b52b8142fd8`)
- CLI location: `C:\Users\User\.agents\skills\notebooklm`
- Save important session notes with:
  ```
  cd C:\Users\User\.agents\skills\notebooklm
  python -m notebooklm note create -n 9f1e4257 -t "Session YYYY-MM-DD: <title>" "<content>"
  ```
- UnicodeEncodeError at end of command is a display glitch only — the note is saved successfully.

## Project shape

- Frontend: React 19 + Vite in `client/`
- Backend: Node.js + Express + tRPC in `server/`
- Database: PostgreSQL + Drizzle ORM + PostGIS in `drizzle/`
- Shared code: `shared/`
- Key design patterns: `docs/arch/patterns.md` (concise, read this first)
- Full architecture reference: `Architecture.md` (read on demand)

## Common commands

- `pnpm dev` - run the local dev server
- `pnpm build` - build client and server bundles
- `pnpm start` - run the production bundle from `dist/`
- `pnpm check` - TypeScript typecheck
- `pnpm test` - unit/integration test suite
- `pnpm test:integration` - integration tests with `.env.test`
- `pnpm db:push` - generate and apply database migrations
- `pnpm db:push:test` - apply migrations to the isolated test database
- `pnpm db:seed:test` - seed the test database

## Backend rules

- Treat `server/_core/env.ts` as the single source of truth for environment variables.
- Keep database query logic in `server/db.ts` and `server/adminDb.ts` when possible.
- tRPC procedures should compose query helpers instead of embedding raw SQL directly.
- If router code grows large, split it into feature files under `server/routers/`.
- Preserve existing security, sanitization, logging, and notification abstractions instead of bypassing them.

## Frontend rules

- Prefer existing patterns in `client/src/components`, `client/src/components/ui`, and `client/src/hooks` before introducing new abstractions.
- Keep route-level code in `client/src/pages/`.
- Preserve Hebrew and mobile-friendly UX patterns already present in the app.
- Reuse existing SEO, structured-data, and map helpers when touching related pages.

## Database and test safety

- Production Drizzle commands require `POSTGRES_URL` or `DATABASE_URL`.
- Test work should use `.env.test` and `TEST_DATABASE_URL`.
- Never point test commands at production data.
- Treat external services in tests as mocked unless the task explicitly requires otherwise.

## Working preferences

- Make focused, minimal changes that match the current architecture.
- Prefer updating existing files over adding new layers unless the change clearly benefits maintainability.
- Run the smallest relevant verification step after changes when feasible.
- If behavior is already documented in `docs/arch/patterns.md` or `Architecture.md`, follow that document unless the code clearly differs.

## Orchestration preferences

- Use `docs/ai/orchestrator.md` as the canonical orchestration reference, but keep the operative Codex rules in this file.
- For multi-layer work, think in responsibilities first: `db`, `backend`, `frontend`, `ui`, then `review`.
- Keep ownership boundaries clear:
  - `db`: schema, migrations, relational data shape
  - `backend`: API, validation, business logic
  - `frontend`: state, forms, API integration
  - `ui`: layout, styling, UX clarity
  - `review`: cross-layer validation, regressions, missing tests
- Prefer local execution by default. Do not force delegation for every task.
- Use sub-agents only when the user explicitly asks for delegation or when the environment/client supports that workflow and the work can be split into disjoint ownership safely.
- Before finalizing a substantial change, do a review pass for gaps, inconsistent layer ownership, and missing verification.
- For product decisions, preserve the current app priorities from the orchestrator notes: mobile-first UX, clear primary CTA, critical info first, and low-friction employer/worker flows.
- Communication preference for this repo: user-facing explanations in Hebrew, code in English, comments only when they add real value.
