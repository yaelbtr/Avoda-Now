# AvodaNow Claude Memory

Shared orchestration reference: @docs/ai/orchestrator.md

See @Architecture.md for the current architecture reference.
See @package.json for the current project commands.

## Claude Instruction — Plan Mode Response Format
When operating in **plan mode**, follow these rules strictly:
1. Limit the response to **100 words or fewer**.
2. Provide only **numbered steps** (1, 2, 3, ...).
3. **Do not include explanations**, reasoning, or additional context.
4. Each step must be **short, direct, and actionable**.
5. Do not include introductions, summaries, or conclusions.
6. Do not ask questions.Output must be concise, structured, and execution-focused only.

## Claude activation

- Default to orchestrator thinking: analyze, split by responsibility, execute, review, then answer.
- When a task spans layers, split it by ownership: `db`, `backend`, `frontend`, `ui`, then `review`.
- Keep each task scoped to one responsibility when possible.
- Run a review pass before the final answer.
- Communication: Hebrew.
- Code and identifiers: English.
- Comments: Hebrew only when they add real value.
