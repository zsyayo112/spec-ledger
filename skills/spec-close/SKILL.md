---
name: spec-close
description: Close out an implemented spec — run its acceptance commands for real, record implementation-vs-spec deviations, and stamp the status. Use when the user says a ticket is done, asks to close or verify a spec, or "收口". Never marks done on failing acceptance.
license: MIT
---

# /spec-close — closeout with real acceptance runs

Close the loop on ONE implemented spec. A spec is only `done` when its acceptance commands actually ran and passed, and the deviations between plan and reality are on record.

## Step 1 — Locate

Read `.specledger.json` at the project root (if missing, ask where specs live — do not bootstrap here; that is `/spec`'s job). Find the spec by the ticket ID from the invocation, or ask.

If no spec exists for the ticket, say so and offer `/spec` instead — never fabricate a retroactive spec silently. If the owner wants a retroactive record, write one via `/spec` and mark it honestly as written post-implementation.

## Step 2 — Run acceptance, for real

Execute every item in the spec's Acceptance section, one by one:

- Run each command and capture its actual output.
- For manual-verification items: perform the steps yourself if possible, otherwise ask the user to and record their observation.

**Any failure → stop.** Report exactly what failed with its output, leave `status: in-progress`, and do not write a Closeout section. Fix-then-reclose is the loop; closing on red is forbidden.

If the owner explicitly decides a failing criterion no longer applies, that is a decision, not a failure: record it as a deviation ("criterion dropped: <why>") with the owner's rationale.

## Step 3 — Record deviations

Compare what was actually built against the spec — use git history scoped to the ticket key when available. Append a Closeout section to the spec file:

```markdown
## Closeout — <date>

### Acceptance results
- [x] `command` → actual result

### Deviations
| Spec said | Built instead | Why |
|-----------|---------------|-----|

### Lessons
(pitfalls hit, anything the next ticket should know; omit if none)
```

"No deviations" is a legitimate finding — state it explicitly rather than omitting the table.

## Step 4 — Stamp and propagate

- Frontmatter: `status: done`, `updated: <today>`.
- If `devlogPath` is configured, append a 2–4 line summary (ticket, what shipped, key deviation or lesson), matching the devlog's existing entry format.
- Remind the user: commit with the ticket key; move the ticket to Done in their tracker.

## Superseding instead of closing

If the ticket was abandoned or replaced: set `status: superseded` and `superseded_by: <slug or null>`, and add a one-line Closeout noting why. Do not delete the file — dead specs are history, not garbage.

## Red lines

- Never mark `done` with failing or unrun acceptance items.
- Report command outputs faithfully — no summarizing failures into euphemisms.
- Every deviation needs a Why. A deviation without rationale is just drift.
