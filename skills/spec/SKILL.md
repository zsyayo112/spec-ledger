---
name: spec
description: Draft an implementation spec for a single ticket in an existing (brownfield) codebase. Use when the user asks to write a spec, spec out a ticket, "出 spec", or names a ticket ID to plan before coding. Inventories existing code first (file:line evidence), surfaces technical decisions for itemized owner sign-off, then writes a spec with runnable acceptance criteria.
license: MIT
---

# /spec — inventory-first ticket specs

Write an implementation spec for ONE ticket in an existing codebase. The spec is a contract between the owner (human) and the executor (AI or human): what already exists, what was decided and why, what to build, and how completion is proven.

Four principles, in order:

1. **Inventory before writing.** Never spec against an imagined codebase.
2. **Decisions are the owner's.** Surface choices; never make them silently.
3. **Acceptance = runnable commands.** Prose is not acceptance.
4. **Specs have a lifecycle.** Status lives in frontmatter and is auditable.

## Step 0 — Resolve project config

Look for `.specledger.json` at the project root.

**If present**, read it and continue. Schema:

```json
{
  "specsDir": "docs/specs",
  "ticketPattern": "[A-Z]+-\\d+",
  "devlogPath": null,
  "language": "auto"
}
```

**If absent, bootstrap** (first run in this project):

1. Infer the specs directory: prefer an existing `docs/specs/`, `specs/`, or `docs/rfcs/`; otherwise propose `docs/specs/`.
2. Infer the ticket pattern from git log and existing docs (Jira-style `ABC-123`, GitHub `#123`, or none).
3. Confirm both with the user via AskUserQuestion, plus — only if a devlog/changelog file exists — whether closeout summaries should also be appended there.
4. Write `.specledger.json`.
5. If `<specsDir>/TEMPLATE.md` does not exist, create it from this skill's `references/spec-template.md`, translated into the project's documentation language (detect from README / existing docs). Tell the user the template is now theirs to edit — it takes precedence over the bundled one from here on.

If the project has no ticket system, use a short kebab slug as the ticket ID (e.g. `dark-mode`) and set `ticketPattern` to `null`.

## Step 1 — Resolve the ticket

Establish two things: the ticket ID and a one-sentence goal.

- Take them from the invocation if given; otherwise look in the project's backlog or issue-export files.
- If the goal is still unclear, ask before proceeding.
- One spec = one ticket = one deliverable. If the ticket actually bundles several deliverables, say so and suggest splitting instead of writing a bloated spec.

## Step 2 — Inventory (the load-bearing step)

Search the codebase for everything this ticket touches, then produce two lists.

**"Already exists — do not rebuild"**: every capability, module, config, or convention the executor might otherwise re-implement. Rules:

- Every row cites `file:line` (or `file` for whole-file relevance).
- You must have actually opened the file at that location this session. Never cite from memory or guess paths.
- One line per row: what it does and why it matters to this ticket.

**"Gaps"**: the delta between the goal and the inventory — what this ticket must actually add.

Also read the project's agent instructions (CLAUDE.md or equivalent), devlog, and neighboring specs for constraints and prior decisions that bind this ticket; they go into the spec's Notes section with a source reference.

If the inventory reveals the ticket is already substantially done, or conflicts with an existing spec, stop and report that instead of writing a redundant spec.

## Step 3 — Decision table

Identify the open technical choices this spec must not make unilaterally: anything with real trade-offs (library vs hand-rolled, where data lives, migration strategy, scope cuts). For each:

- Frame it as D1, D2, … with 2–4 concrete options, the trade-offs, and your recommendation first.
- Present them to the owner with AskUserQuestion (batch up to 4 per call).
- Record each verdict in the spec's Decisions table: decision, rationale, `approved`.

The owner may defer a decision: record it as `pending`, set frontmatter `decisions_resolved: false` and `status: pending-decisions`. **Never fill in a decision the owner didn't make** — a guess recorded as "approved" is this skill's one unforgivable failure.

Trivial choices with an obvious conventional answer are not decisions — follow the codebase's existing convention and note it in the spec.

## Step 4 — Write the spec

Path: `<specsDir>/<TICKET>-<slug>.md`. The slug is mandatory (kebab-case, 2–5 words).

Template: `<specsDir>/TEMPLATE.md` if present, else `references/spec-template.md`. Write in the language of the project's existing documentation.

Frontmatter:

```yaml
---
ticket: CAN-70
status: draft            # draft | pending-decisions | in-progress | done | superseded
created: 2026-07-10
updated: 2026-07-10
superseded_by: null      # slug of the replacing spec, if any
decisions_resolved: true
---
```

Content rules:

- **Scope**: explicit In and Out lists; each Out item says where it is deferred to.
- **Acceptance**: every item is a runnable command with its expected outcome (`pnpm test x` → green; `curl …` → 200 with field y). Manual-only checks get exact steps and expected observation — and are treated as a smell to minimize.
- **Implementation steps**: ordered, each independently checkable.
- Link related specs, docs, and memory so a future reader can reconstruct context.

Finish by reporting the file path, status, and any pending decisions. Set `status: in-progress` only when the owner says implementation is starting.

## Lifecycle

```
draft → pending-decisions → in-progress → done
   (any state) → superseded   [must set superseded_by]
```

`/spec-close` owns the transition to `done`. Audit anytime:

```
node <this-skill>/scripts/spec-status.mjs <specsDir>
```

## Red lines

- No inventory row without opening the file. No invented paths.
- No decision recorded as approved without the owner's explicit answer.
- No acceptance criterion that isn't executable or precisely observable.
- Never edit existing specs outside this skill's own flows (`/spec-close` appends Closeout; supersession updates frontmatter).
