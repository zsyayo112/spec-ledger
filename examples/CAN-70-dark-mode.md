---
ticket: CAN-70
status: done
created: 2026-06-28
updated: 2026-07-03
superseded_by: null
decisions_resolved: true
---

# CAN-70 · Dark mode

> Illustrative example shipped with spec-ledger — one complete lifecycle (spec → failed verification → fix → closeout) in a single file. The app and its paths are fictional; the mechanics are exactly what the skills produce.

## Links

- Ticket: CAN-70
- Depends on: —
- Related: `docs/specs/CAN-55-design-tokens.md` (introduced the CSS variable system this builds on)

## Goal

Users can switch the app to a dark theme, manually or following the OS preference, and the choice persists.

## Scope

**In scope**

- Dark values for every existing color token
- Manual toggle in the top bar
- "Follow system" as the default
- Persistence via the existing settings store

**Out of scope**

- Chart color adaptation — deferred to CAN-83
- Per-page theme overrides — owner decided not to build; no ticket

## Inventory — already exists, do not rebuild

| What | Where | Notes |
|------|-------|-------|
| Color tokens as CSS variables | `src/styles/tokens.css` | Every color already reads from a variable — dark mode is a second value set, not a rewrite |
| Settings store with persistence | `src/stores/settings.ts:12` | `usePersistedSetting()` handles storage and hydration; theme belongs here |
| OS preference hook | `src/hooks/useMediaQuery.ts:8` | Generic matchMedia hook, works for `prefers-color-scheme` |

**Gaps this ticket fills**

- No dark values defined for any token
- No `data-theme` wiring on the document root
- No toggle UI

## Decisions

| # | Decision | Rationale | Status |
|---|----------|-----------|--------|
| D1 | Dark palette as a `[data-theme="dark"]` block in tokens.css — not Tailwind `dark:`, not a second stylesheet | Reuses the token system from CAN-55; zero per-component changes | approved |
| D2 | Three-state setting `light / dark / system`, default `system` | Matches OS conventions; `system` resolves via the existing media-query hook | approved |
| D3 | Toggle lives in the top bar, not the settings page | Amended 2026-07-01 via /spec Resume & amend — owner wanted the entry one click away | approved |

## Technical approach

`settings.theme` holds the three-state value. A `ThemeApplier` effect resolves it (reading the media query when `system`) and stamps `data-theme` on `<html>`. Tokens flip on that attribute; components never know a theme exists.

## Implementation steps

1. Add dark values for all tokens under `[data-theme="dark"]` in `tokens.css`
2. Add `theme` to the settings store (default `system`)
3. `ThemeApplier` effect: resolve setting → set `data-theme`
4. Top-bar toggle cycling light → dark → system
5. Tests: resolution logic + persistence

## Acceptance — runnable

- [ ] `pnpm test theme` → all green
- [ ] `pnpm exec playwright test theme.spec.ts` → toggle click sets `data-theme="dark"` on `<html>` and it survives a reload
- [ ] `grep -c -- '--color-' src/styles/tokens.css` → same count inside and outside the dark block (no token left without a dark value)

## Notes / boundaries

- Token naming convention is binding — `docs/specs/CAN-55-design-tokens.md`, decision D2 there
- Do not read `localStorage` directly; the settings store owns persistence (project CLAUDE.md, "state" section)

## Verification attempt — 2026-07-02 (failed)

- [x] `pnpm test theme` → 9 passed
- [ ] `pnpm exec playwright test theme.spec.ts` → **failed**: `data-theme` not restored after reload — the applier ran before the store hydrated
- (not reached) token count check

## Closeout — 2026-07-03

Commits: `4f2a91c..b8e03d7` (5 commits)

### Acceptance results

- [x] `pnpm test theme` → 11 passed
- [x] `pnpm exec playwright test theme.spec.ts` → 3 passed, including reload persistence
- [x] `grep -c -- '--color-' src/styles/tokens.css` → 42 / 42

### Deviations

| Spec said | Built instead | Why |
|-----------|---------------|-----|
| — | `ThemeApplier` waits for store hydration before stamping | Fix for the race the failed verification run exposed |
| — | Added `color-scheme: dark` alongside the tokens | Native scrollbars/inputs stayed light otherwise; found during manual QA |

### Lessons

- A reload test in acceptance catches hydration races that unit tests structurally can't — keep one for anything persisted.
