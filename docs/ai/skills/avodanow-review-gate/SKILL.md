---
name: avodanow-review-gate
description: Use when reviewing AvodaNow changes for bugs, regressions, missing tests, cross-layer inconsistencies, or incomplete verification. Apply this skill before finalizing substantial work in `server/`, `client/`, `shared/`, or `drizzle/` so the final output catches the highest-risk issues first without loading broad generic review guidance.
---

# AvodaNow Review Gate

## Overview

This skill applies a high-signal review pass to AvodaNow work, prioritizing bugs, behavioral regressions, verification gaps, and layer mismatches over broad commentary.

## Use this skill when

- Reviewing a completed or nearly completed change.
- A task spans more than one layer and needs a final consistency check.
- You want findings-first output instead of a long implementation summary.
- You suspect there may be missing tests, env risk, or schema/API/UI drift.

## Read first

- `AGENTS.md`
- `docs/ai/orchestrator.md`
- The changed files and the nearest related tests

## Review priorities

1. Bugs and behavioral regressions
2. Security or data safety risks
3. Broken assumptions across DB, backend, frontend, and UI
4. Missing or insufficient tests
5. Verification gaps

## Review checklist

- Does the code do what the user asked for, not just something plausible?
- If data shape changed, were backend and frontend consumers updated?
- If API behavior changed, were validation and client usage kept in sync?
- If UI changed, are loading, empty, success, and error states still coherent?
- If env or DB behavior changed, is the target environment explicit and safe?
- Is there a smaller test or typecheck that should have been run but was skipped?

## Output style

- Findings first, ordered by severity.
- Include file references when possible.
- Keep the summary brief and secondary.
- If no findings are discovered, say that explicitly and mention any residual risks.

## AvodaNow-specific heuristics

- Favor low-friction worker and employer flows.
- Watch for accidental mismatch between `server/db.ts`, tRPC procedures, and page-level assumptions.
- Watch for Hebrew/mobile UI regressions when changing layout or card content.
- Be suspicious of changes that bypass existing security, sanitization, logging, or notification abstractions.
