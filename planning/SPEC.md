# SPEC (reconciliation note)

The authoritative design contract is the repository-root **`SPEC.md`**. This file
records how the rebuild reconciles that contract with the reference implementation and
the execution decisions agreed before implementation. Where this note and root
`SPEC.md` agree, root `SPEC.md` wins; where the reference disagrees with root `SPEC.md`,
root `SPEC.md` wins.

## Decisions that supersede the reference

- **TypeScript: strict.** `strict`, `noImplicitAny`, `strictNullChecks` all true; no
  `any` escape hatches. (Reference shipped strict mode off; root SPEC §2 requires strict.)
- **Dependencies: trimmed.** No `lovable-tagger`/`componentTagger`; package renamed to
  `age-of-plan`; only the shadcn primitives/deps actually used are included. Unused
  reference deps (recharts, embla-carousel, vaul, input-otp, react-day-picker,
  react-resizable-panels, cmdk, next-themes, date-fns) are excluded unless a slice needs one.
- **Content provenance.** ~1010 `public/aoe4/**` binaries + `manifest.json` copied
  verbatim (media/data); the 3 generated data files transcribed as data; the sync
  *script* rewritten as fresh source. No live network sync during the build.
- **`@tanstack/react-query`** is introduced at the create/import milestone (its only
  consumer), not in the app shell.
- **Provider order** mirrors root SPEC: `ErrorBoundary → QueryClientProvider →
  TooltipProvider → Sonner → BrowserRouter`, `HelmetProvider` at entry. `QueryClientProvider`
  is added when react-query lands; until then the chain omits it.
- **Code-splitting:** route-based `React.lazy` for the standalone runner and the editor.
- **Accessibility:** `@axe-core/playwright` asserts zero critical violations from the
  first rendered page onward.

## Open reconciliation to verify during implementation

- **Civ count:** root SPEC §6 lists **22** ids (12 base + 10 variants). The reference's
  generated `civData.ts` reported 23 entries and its sitemap 23 civ pages. The rebuild
  follows root SPEC's 22 ids and fixes the generated data + sitemap + llms.txt to match;
  the discrepancy is called out in the milestone hand-off when reached.

For all other requirements (routes, data model, persistence keys, importers/exporters,
overlay behavior, SEO surfaces, mobile), defer to root `SPEC.md`.

## Final reconciliation (what actually shipped)

The build is complete. Decisions that superseded the original plan/reference:

- **Toolchain modernized post-build** to unblock Cloudflare and stay current:
  Vite 7, Vitest 4, ESLint 10, TypeScript 5.9, zod 4, react-router 7,
  lucide-react 1, sonner 2, tailwind-merge 3, @hookform/resolvers 5, jsdom 29.
  React 18 and Tailwind 3 were **deliberately kept** (React 19 would force
  dropping react-helmet-async; Tailwind 4 is a full config migration) — both are
  candidate follow-up upgrades.
- **IDs** use `lib/id.ts` (`newId`), not `crypto.randomUUID` directly, so
  create/import work outside secure contexts (LAN/mobile over plain http).
- **NewBuildOrder** is a pick-civ + name form (SPEC §3) rather than the
  reference's auto-redirect.
- **Overlay runner follows the main window's theme** live (SPEC §8–9) instead of
  hardcoding dark as the reference did.
- **Deployment:** Cloudflare Workers static assets via `wrangler.jsonc`
  (`assets.not_found_handling: "single-page-application"`).
- **Code-splitting:** route-based `React.lazy` for the editor + runner; remaining
  vendor bundle ships as one chunk (~202 kB gzip) — a manualChunks vendor split
  caused circular chunks and was reverted.
- ESLint `react-hooks/set-state-in-effect` is disabled (conflicts with the
  route-keyed load-persisted-data-on-mount idiom); all other strict rules on.
