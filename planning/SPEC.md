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
