# spec-ledger

> Inventory-first, single-ticket specs for existing codebases. A Claude Code plugin. *(Working name — may change before 1.0.)*

Most spec-driven development tools assume a green field: describe the system, generate the plan, build. **spec-ledger** starts from the opposite — and far more common — reality: the codebase already exists, work arrives one ticket at a time, and the expensive failures are the AI rebuilding what is already there, or silently making decisions that were yours to make.

Four mechanisms:

1. **Inventory first** — before a spec is written, the codebase is searched and an "already exists — do not rebuild" list with `file:line` evidence goes into the spec.
2. **Itemized decision sign-off** — open technical choices become a decision table; the owner approves each item individually. No document-level rubber stamp.
3. **Closeout with real runs** — a spec is only *done* after its acceptance commands actually ran and passed; deviations between plan and reality are recorded with rationale.
4. **Auditable status** — every spec carries lifecycle frontmatter (`draft → pending-decisions → in-progress → done / superseded`); a zero-dependency script reports stale, unclosed, or decision-pending specs and can gate CI.

## Skills

| Skill | What it does |
|---|---|
| `/spec <ticket>` | Inventory → itemized decision sign-off → write the spec |
| `/spec-close <ticket>` | Run acceptance for real → record deviations → stamp `done` |

## Install

Zero-install (personal, loads in all your projects):

```bash
git clone https://github.com/zsyayo112/spec-ledger ~/spec-ledger
ln -s ~/spec-ledger ~/.claude/skills/spec-ledger
```

New Claude Code sessions pick it up automatically. Marketplace packaging is planned.

## Per-project setup

None up front. The first `/spec` run in a project bootstraps:

- `.specledger.json` — specs directory, ticket-ID pattern, optional devlog path;
- `<specsDir>/TEMPLATE.md` — a spec template **you own and edit**, generated in your project's documentation language.

The skill carries the mechanisms; your project owns its conventions.

## Audit

```bash
node ~/spec-ledger/skills/spec/scripts/spec-status.mjs docs/specs          # report
node ~/spec-ledger/skills/spec/scripts/spec-status.mjs docs/specs --ci    # exit 1 on violations
```

Flags: stale `in-progress` specs (default threshold 14 days, `--stale-days N`), `done` without a Closeout section, work started before decisions were signed off, missing frontmatter or filename slug, inconsistent supersession.

## Status

`0.x` — extracted from a real production project (40+ specs written this way); cross-project validation in progress. Interfaces may change.

Roadmap: cross-project validation → `/plan` (epic → tickets) → marketplace submission → bilingual docs.

## License

MIT
