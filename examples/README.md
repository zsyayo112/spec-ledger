# Examples

[`CAN-70-dark-mode.md`](CAN-70-dark-mode.md) is one complete, illustrative spec lifecycle — fictional app, real mechanics. What to look at:

- **Inventory** — three `file:line` rows that stop the executor from rebuilding a token system, a settings store, and a media-query hook that already exist.
- **Decisions** — D1/D2 signed before work started; D3 appended mid-implementation through `/spec`'s Resume & amend flow (note the amendment date in the row).
- **Verification attempt** — the first `/spec-close` run failed on a hydration race and left this record in the file instead of vanishing into a chat; the spec stayed `in-progress`.
- **Closeout** — the second run passed. Deviations record what was built beyond the plan, each with a why, and the commit range links the record to the actual diffs.

In a real project this file would live in your `specsDir` (e.g. `docs/specs/`); it sits here so you can see the target shape before your first `/spec` run. This directory is linted in CI with the same `spec-status.mjs` your projects would use.
