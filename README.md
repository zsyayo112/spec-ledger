# spec-ledger

> Inventory-first, single-ticket specs for existing codebases. A Claude Code plugin. *(Working name — may change before 1.0.)*

![ci](https://github.com/zsyayo112/spec-ledger/actions/workflows/ci.yml/badge.svg)

Most spec-driven development tools assume a green field: describe the system, generate the plan, build. **spec-ledger** starts from the opposite — and far more common — reality: the codebase already exists, work arrives one ticket at a time, and the expensive failures are the AI rebuilding what is already there, or silently making decisions that were yours to make.

Four mechanisms:

1. **Inventory first** — before a spec is written, the codebase is searched and an "already exists — do not rebuild" list with `file:line` evidence goes into the spec.
2. **Itemized decision sign-off** — open technical choices become a decision table; the owner approves each item individually. No document-level rubber stamp.
3. **Closeout with real runs** — a spec is only *done* after its acceptance commands actually ran and passed; deviations between plan and reality are recorded with rationale.
4. **Auditable status** — every spec carries lifecycle frontmatter (`draft → pending-decisions → in-progress → done / superseded / abandoned`); a zero-dependency lint script reports stale, unclosed, or decision-pending specs and can gate CI. It lints recorded state — the proof that acceptance really ran is `/spec-close`'s contract, not the script's.

## Skills

| Skill | What it does |
|---|---|
| `/spec <ticket>` | Inventory → itemized decision sign-off → write the spec; re-run on an existing spec to resolve pending decisions or amend |
| `/spec-close <ticket>` | Run acceptance for real → record deviations → stamp `done` |

## What it looks like

[`examples/CAN-70-dark-mode.md`](examples/CAN-70-dark-mode.md) is one complete lifecycle in a single file — inventory with `file:line` evidence, itemized decisions (one amended mid-flight), a failed verification attempt left on record, and a closeout with deviations and a commit range. [`examples/README.md`](examples/README.md) gives the reading order.

## Requirements

- A coding agent with repository read/write, shell execution, and interactive owner Q&A — Claude Code natively; other Agent-Skills-compatible agents via the per-skill links below.
- Node.js ≥ 18 (audit script and tests).
- Git (closeout uses history for deviation evidence).

## Install

**Claude Code — plugin (recommended).** Inside a session:

```
/plugin marketplace add zsyayo112/spec-ledger
/plugin install spec-ledger@spec-ledger
```

Update/remove via `/plugin` (Manage plugins).

**Claude Code — from a clone** (personal, loads in all your projects):

```bash
git clone https://github.com/zsyayo112/spec-ledger ~/spec-ledger
ln -s ~/spec-ledger ~/.claude/skills/spec-ledger
```

New sessions discover the skills through the plugin manifest (`.claude-plugin/plugin.json`); they show up as `spec-ledger:spec` and `spec-ledger:spec-close`. Update with `git -C ~/spec-ledger pull`; uninstall by removing the symlink.

**Other agents** that follow the [Agent Skills](https://agentskills.io) layout strictly (one directory with `SKILL.md` at its root) won't find skills nested under a repo root — link each skill directory into your agent's skills dir instead:

```bash
ln -s ~/spec-ledger/skills/spec       <skills-dir>/spec
ln -s ~/spec-ledger/skills/spec-close <skills-dir>/spec-close
```

The skills reference the `AskUserQuestion` tool by its Claude Code name; other agents should read it as "ask the owner interactively".

## Per-project setup

None up front. The first `/spec` run in a project bootstraps:

- `.specledger.json` — specs directory, ticket-ID pattern, optional devlog path;
- `<specsDir>/TEMPLATE.md` — a spec template **you own and edit**, generated in your project's documentation language.

The skill carries the mechanisms; your project owns its conventions.

## Audit

```bash
node ~/spec-ledger/skills/spec/scripts/spec-status.mjs         # specs dir from .specledger.json (or pass one)
node ~/spec-ledger/skills/spec/scripts/spec-status.mjs --ci    # exit 1 on violations
```

Flags: stale `in-progress` specs (default threshold 14 days, `--stale-days N`), `done` without a Closeout section, work started before decisions were signed off, missing frontmatter or filename slug, inconsistent or dangling supersession, duplicate live specs for one ticket, ticket IDs that don't match the configured pattern.

Development: `node scripts/validate-repo.mjs` (repo structure) and `node skills/spec/scripts/test/run.mjs` (22-check smoke suite) — both run in CI on Linux and Windows, which also lints `examples/` with the audit script itself.

## Status

`0.x` — extracted from a real production project (40+ specs written this way); cross-project validation in progress. Interfaces may change; changes are tracked in [CHANGELOG.md](CHANGELOG.md).

Roadmap: cross-project validation → `/plan` (epic → tickets) → bilingual docs.

## License

MIT
