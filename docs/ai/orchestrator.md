# AvodaNow Orchestrator

This file is the shared source of truth for orchestration rules across AI tools used in this repository.

## Purpose

- Understand the request before changing code.
- Break work by responsibility, not by vague feature labels.
- Keep ownership boundaries clear across layers.
- Make sure all affected layers are covered.
- Run a review pass before finalizing substantial work.

## Responsibility model

### db

- Scope: schema, migrations, relational data shape, indexes, constraints
- Not responsible for: API contracts, business rules in routers, UI behavior
- Typical output: schema updates, migration files, query-shape changes

### backend

- Scope: API, validation, auth rules, business logic, server-side workflows
- Not responsible for: visual design and layout
- Typical output: tRPC procedures, service logic, server-side validations

### frontend

- Scope: forms, state, page behavior, API integration, client-side flow
- Not responsible for: visual polish that does not affect behavior
- Typical output: page logic, state wiring, form UX, query and mutation integration

### ui

- Scope: layout, styling, hierarchy, clarity, responsiveness, empty/loading/error presentation
- Not responsible for: business logic or data rules
- Typical output: component structure, spacing, CTA placement, visual states

### review

- Scope: cross-layer validation
- Must check: gaps, overlaps, regressions, missing tests, inconsistent ownership
- Typical output: issues found, approval or rejection, follow-up fixes

## Working flow

1. Understand the user request and identify the affected user flow.
2. Determine which responsibilities are involved.
3. Split the work into clear, non-overlapping tasks when the change spans multiple layers.
4. Implement the smallest coherent change per responsibility.
5. Review the full change across layers before final output.

## Product focus

- Speed first: help the user complete the key action in 2 steps or fewer when possible.
- Reduce friction between employer and worker flows.
- Prefer clarity over feature density.

## Design rules

- Mobile-first.
- One primary action per screen.
- Show critical information first: price, location, availability.
- Prefer card-based lists for jobs and workers when browsing.
- Keep strong visual hierarchy: title, key info, actions.
- Use consistent spacing and clean alignment.
- Limit visible actions to the most important 2 or 3 per view.

## Interaction rules

- Give immediate feedback for loading, success, and error states.
- Use inline validation instead of hidden errors when possible.
- Prefer smart defaults over unnecessary input.

## Constraints

- No unnecessary fields.
- No decorative elements without purpose.
- Usability is more important than aesthetics.

## Review checklist

- Were all affected layers considered?
- Is each change owned by the correct responsibility?
- Is there any overlap between db, backend, frontend, and ui responsibilities?
- Does the change preserve the app's mobile-first and low-friction goals?
- Are empty, loading, error, and success states covered where relevant?
- Was the smallest relevant verification step run?

## Adapter guidance

- `CLAUDE.md` should translate this file into Claude-specific memory instructions.
- `AGENTS.md` should translate this file into Codex-specific execution guidance.
- Keep this file tool-agnostic so it can remain the single canonical source.
