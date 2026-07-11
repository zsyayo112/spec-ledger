# Changelog

Versioning follows [semver](https://semver.org). The `.specledger.json` schema is additive — new fields get defaults and existing files keep working; a breaking schema change would bump the major version and ship a migration note here.

## 0.2.0 — 2026-07-11

### Added

- `abandoned` lifecycle status for specs dropped without a replacement; `superseded` now always requires `superseded_by`. Resolves a contradiction where a state the skills allowed was flagged by the audit script.
- `/spec` Resume & amend flow: re-running `/spec` on a ticket that already has a live spec resolves its pending decisions or amends scope, instead of writing a second spec (previously `pending-decisions` had no legal exit).
- `/spec-close` trust boundary: acceptance commands are treated as untrusted input — read before running, per-command owner confirmation for anything reaching beyond the repo (network, publish, deploy, migrate, delete, credentials), and a red line against running commands not tied to a criterion.
- `/spec-close` failed verification now leaves a structured `## Verification attempt` record in the spec instead of vanishing into the conversation.
- `spec-status.mjs` reads `.specledger.json` (specsDir default, ticketPattern validation) and gained checks: missing/mismatched ticket, duplicate live specs per ticket, dangling `superseded_by` references, slug-less filenames including numeric-only.
- Smoke test suite: `node skills/spec/scripts/test/run.mjs` (22 checks, zero dependencies).
- Repo CI (Linux + Windows) and a structure validator (`node scripts/validate-repo.mjs`).
- Worked example of a full spec lifecycle in `examples/`.

### Fixed

- CRLF line endings broke frontmatter parsing entirely — every key was missed on Windows-edited spec files.
- A malformed `.specledger.json` was silently ignored (the script would audit the default directory); it now exits 2 loudly.
- A non-numeric `--stale-days` value silently disabled the staleness check; it now exits 2.
- The spec template no longer pre-fills `approved` / `decisions_resolved: true`; safe defaults are `pending` / `false`, flipped only by explicit owner sign-off.

### Changed

- README: the audit script is positioned as a lint on recorded state, not proof of execution; install docs cover both Claude Code plugin discovery and strict Agent-Skills-layout linking for other agents.

## 0.1.0 — 2026-07-10

Initial extraction from a production project: `/spec` (inventory-first ticket specs with itemized decision sign-off), `/spec-close` (closeout with real acceptance runs and recorded deviations), the spec template, and the `spec-status.mjs` audit script.
