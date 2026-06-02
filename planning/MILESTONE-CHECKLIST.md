# Milestone Checklist — COMPLETE

All milestones shipped as green vertical slices (each: milestone tests pass AND
`bun run build` + `bun run lint` + relevant `bun run test`/`test:e2e` clean).
Final suite: **111 unit tests + 28 e2e** green (+ a non-gating live aoe4guides smoke).

- [x] **Pre-M1** — Planning artifacts.
- [x] **M1** — Foundation & app shell (strict TS, trimmed deps, providers, lazy routes).
- [x] **M2** — Data model, time, build helpers, civ data (22) + assets.
- [x] **M3** — Storage + migration + theme/font primitives (realistic round-trip test).
- [x] **M4** — Theme/font hooks + nav controls.
- [x] **M5** — Note tokens, renderer, icon catalog.
- [x] **M6** — Export + import parsing libraries.
- [x] **M7** — Home + SEO surface + a11y (axe) baseline.
- [x] **M8** — Library + civ detail + build cards.
- [x] **M9** — Create flow + import modal (react-query).
- [x] **M10** — Editor core (autosave, step editing).
- [x] **M11** — Editor drag-and-drop + notes/tags/icon autocomplete.
- [x] **M12** — Overlay runner (keyboard, auto-advance, live theme/font sync).
- [x] **M13** — Data sync script + coverage audit + live smoke test.
- [x] **M14** — Polish, a11y/reduced-motion sweep, verification, docs reconciliation.

## Mid-flight changes (outside the milestone sequence)

- **UUID fix** — `crypto.randomUUID` is secure-context-only; added `lib/id.ts`
  fallback so create/import works over `http://<lan-ip>` (mobile, SPEC §10).
- **Toolchain modernization** — Vite 5→7 (Cloudflare needs ≥6) + Vitest 4,
  ESLint 10, zod 4, react-router 7, lucide 1, sonner 2, tailwind-merge 3,
  @hookform 5, TS 5.9, jsdom 29. React 18 + Tailwind 3 deliberately kept.
- **Cloudflare deploy** — `wrangler.jsonc` static-assets SPA config
  (`not_found_handling: "single-page-application"`); `_redirects` removed
  (invalid for Workers).

## Final verification (M14)

- TODO/FIXME/HACK sweep: none outstanding.
- 22-civ count verified end-to-end: `data/generated/civData.ts`, `CIVS`,
  `public/sitemap.xml`, `public/llms.txt` all = 22.
- Reduced-motion: all keyframe animations gated by
  `@media (prefers-reduced-motion: no-preference)`.
- Bundle: editor + runner route-split via `React.lazy`; main chunk ~202 kB
  gzip — acceptable for a client SPA (chunk-size warning lifted; a vendor
  manualChunks split introduced circular chunks and was reverted).
