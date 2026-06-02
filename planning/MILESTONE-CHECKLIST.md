# Milestone Checklist

Each milestone is a vertical slice ending on a green commit (milestone tests pass AND
`bun run build` AND `bun run lint` AND relevant `bun run test`/`test:e2e` clean).
Cadence: stop after each milestone, hand-off report, wait for go-ahead.

- [ ] **Pre-M1** — Planning artifacts (`planning/REFERENCE-ANALYSIS.md`, `planning/SPEC.md`, this file).
- [ ] **M1** — Foundation & app shell. Configs (strict TS, trimmed deps), `index.html`
      pre-hydration theme/font scripts, providers, lazy runner/editor routes, layout
      shells, placeholder pages. Test: unit smoke + Playwright home/404.
- [ ] **M2** — Data model, time, build helpers, civ data + assets. Test: time, villager calc, civ lookup.
- [ ] **M3** — Storage + theme/font primitives. Test: migration cases + realistic full-`BuildOrder` round-trip + private-mode no-throw.
- [ ] **M4** — Theme/font hooks + nav controls. Test: hook sync. Manual: no flash.
- [ ] **M5** — Note tokens, renderer, icon catalog. Test: parse + icon map fallbacks.
- [ ] **M6** — Export + import parsing libraries (pure). Test: round-trips + fixture parses.
- [ ] **M7** — Home + SEO surface. Test: e2e home + tags; axe baseline.
- [ ] **M8** — Library + civ detail + build cards. Test: e2e list/sort; axe.
- [ ] **M9** — Create flow + import modal (adds react-query). Test: e2e create + import.
- [ ] **M10** — Editor core (no DnD). Test: e2e create→edit→reload persists.
- [ ] **M11** — Editor drag-and-drop + notes/tags/icon picker. Test: drag.spec. Manual: drag in browser.
- [ ] **M12** — Overlay runner. Test: e2e run. Manual: popup launch/resize/sync.
- [ ] **M13** — Data sync script + coverage audit. Test: pure helpers vs fixtures.
- [ ] **M14** — Polish, a11y sweep, verification, wrap-up. Test: full suite green.

See `/home/dev/.claude/plans/spec-md-you-are-rebuilding-nifty-bubble.md` for full
per-milestone detail (build/study/tests/manual/commit message).
