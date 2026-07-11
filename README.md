# spec-ledger

> Inventory-first, single-ticket specs for existing codebases. A Claude Code plugin. *(Working name — may change before 1.0.)*

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

## Install

**Claude Code** (personal — loads in all your projects):

```bash
git clone https://github.com/zsyayo112/spec-ledger ~/spec-ledger
ln -s ~/spec-ledger ~/.claude/skills/spec-ledger
```

New sessions discover the skills through the plugin manifest (`.claude-plugin/plugin.json`); they show up as `spec-ledger:spec` and `spec-ledger:spec-close`.

**Other agents** that follow the [Agent Skills](https://agentskills.io) layout strictly (one directory with `SKILL.md` at its root) won't find skills nested under a repo root — link each skill directory into your agent's skills dir instead:

```bash
ln -s ~/spec-ledger/skills/spec       <skills-dir>/spec
ln -s ~/spec-ledger/skills/spec-close <skills-dir>/spec-close
```

The skills reference the `AskUserQuestion` tool by its Claude Code name; other agents should read it as "ask the owner interactively". Marketplace packaging is planned.

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

The script's own smoke tests: `node skills/spec/scripts/test/run.mjs` (from the repo root).

## Status

`0.x` — extracted from a real production project (40+ specs written this way); cross-project validation in progress. Interfaces may change.

Roadmap: cross-project validation → `/plan` (epic → tickets) → marketplace submission → bilingual docs.

## License

MIT
