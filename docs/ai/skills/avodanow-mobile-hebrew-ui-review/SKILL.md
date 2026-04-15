---
name: avodanow-mobile-hebrew-ui-review
description: Use when reviewing or building AvodaNow UI for Hebrew, mobile-first flows, CTA clarity, empty/loading/error states, and employer or worker conversion paths. Apply this skill to `client/src/pages` and `client/src/components` to catch high-friction UX issues without drifting into generic redesign work.
---

# AvodaNow Mobile Hebrew UI Review

## Overview

This skill applies AvodaNow's UX priorities to page and component work: mobile-first flow, Hebrew readability, low friction, and clear action hierarchy.

## Use this skill when

- Reviewing a page or component for UX quality before shipping.
- Editing job cards, forms, dashboards, onboarding, or search flows.
- A screen feels crowded, unclear, or too generic.
- You need a fast UI review without loading a full design system guide.

## Read first

- `docs/ai/orchestrator.md`
- The relevant files in `client/src/pages` and `client/src/components`
- Any existing loading, empty, and error state components already used nearby

## Review lens

- Mobile-first first, desktop second.
- One clear primary action per screen.
- Critical information first: price, location, availability.
- Prefer clear hierarchy over decorative flourishes.
- Keep visible actions limited to the most important few.

## Check for Hebrew and mobile issues

- Is the text readable and naturally grouped for Hebrew users?
- Does the layout survive narrow mobile widths without awkward wrapping?
- Are buttons and touch targets easy to hit?
- Is the main CTA obvious without scrolling too far?
- Are form errors and loading states visible inline?

## AvodaNow-specific heuristics

- Worker and employer flows should feel fast and low-friction.
- Card-based browsing should surface the important facts immediately.
- Empty states should tell the user what to do next.
- Loading states should reassure rather than shift the layout aggressively.
- Avoid adding visual complexity that does not help the job-to-action flow.

## Output expectations

- Call out the top friction points first.
- Suggest the smallest change that improves clarity.
- Prefer fixes that preserve existing architecture and components.
- If there are no serious issues, say that explicitly and mention residual risks.
