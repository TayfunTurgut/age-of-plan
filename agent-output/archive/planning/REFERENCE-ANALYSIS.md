# Reference Analysis — `age-of-plan-reference`

Read-only analysis of the reference implementation. The reference is a working
Lovable.dev-generated Vite + React + shadcn/ui app. This document captures **what it
does** (so the rebuild reaches feature parity) and **what to do differently** (so the
rebuild does not inherit its weaknesses). No source code is copied; this is intent.

## Feature inventory

- **Home (`/`)** — civilization picker grid (22 civs, base + variants).
- **Library (`/library`)** — browse/search/filter/sort all saved builds; cross-tab refresh.
- **Civ detail (`/civ/:id`)** — builds for a single civ + civ metadata.
- **Create (`/build/new`)** — pick civ + name → create build.
- **Build landing (`/build/:id`)** — actions: edit, run, export.
- **Editor (`/build/:id/edit`)** — drag-and-drop step editor with debounced autosave:
  steps (age, villager auto/manual, resources, time, prerequisite, notes, tags),
  reorder steps, move notes within/across steps, `{{icon}}` autocomplete.
- **Runner (`/build/:id/run`)** — standalone chrome-less overlay; keyboard nav,
  auto-advance timer, collapse (sessionStorage), window auto-resize, live theme/font sync.
- **Import/Export** — `ImportModal` (aoe4guides URL / JSON paste / file drop); native
  JSON (lossless) + RTS_Overlay-compatible exporters.
- **Preferences** — light/dark theme + global font size (14/15/16/17/18/20 px), both
  applied pre-hydration to avoid flash, both synced cross-window for the runner popup.
- **SEO** — per-route head via `react-helmet-async`; robots/sitemap/llms static files.

## Architecture

Layered: `lib/` (pure logic + the single storage writer) → `hooks/` → `components/` →
`pages/`. `data/` holds civ metadata + script-generated icon/civ/path-migration data.
`types/buildOrder.ts` is the canonical schema. Providers (reference order):
`ErrorBoundary → QueryClientProvider → TooltipProvider → Sonner → BrowserRouter`, with
`HelmetProvider` at the entry. Runner renders **outside** `AppLayout` (no nav chrome).

## Data flow

- All build data lives in `localStorage` under `aoe4bo:bo:<id>` (one key per build; no
  index — the library enumerates by prefix). `lib/storage.ts` is the only writer.
- Editor holds local React state; `saveBuildOrder` is debounced (~500ms) + flushed on
  `beforeunload`. On read, storage silently migrates legacy shapes and recomputes
  villager counts.
- Theme/font-size live in their own keys and broadcast via the `storage` event
  (cross-window) + a custom event (same-window) so the runner popup follows live.
- Import normalizes external payloads → canonical `BuildOrder`; export serializes back.

## Risk register — what to do differently

| Reference weakness | Rebuild decision |
| --- | --- |
| `strict: false`, `noImplicitAny: false`, `strictNullChecks: false` | Enforce full strict TS; no `any`. |
| `lovable-tagger` plugin, `vite_react_shadcn_ts` package name, kitchen-sink unused deps (recharts, embla, vaul, input-otp, day-picker, resizable-panels, cmdk, next-themes, date-fns) | Drop tagger; rename package; include only deps actually used. |
| Dead undo `startSnapshotRef` in the editor (taken, never used) | Omit; do not ship dead scaffolding. |
| View-layer metadata (`civs?: string[]` icon gating) baked into the data layer | Keep data plain/serializable; gate icons at render/selection time. |
| Fragile multi-`replace()` icon-path munging (hard to trace, one typo breaks imports) | Parse once into `{ category, file, ext }`, rebuild, with explicit fallbacks. |
| `as LegacyStep` unchecked casts during migration | Use zod-validated narrowing. |
| Hardcoded popup dimensions can overflow with long notes | Keep best-effort auto-resize as the corrective; cap content width. |
| Silent fuzzy civ-name matching on import (possible silent mis-map) | Keep fuzzy match but surface a warning when a match is a guess. |
| Bundle ships everything eagerly | Route-based `React.lazy` for runner + editor. |
| a11y left to the end | `@axe-core/playwright` baseline from the first page. |

## Tooling observed (to replicate, trimmed)

Vite 5 + `@vitejs/plugin-react-swc`, React 18.3, TS 5.8, Tailwind 3.4 (+ animate,
typography), shadcn/ui, react-router v6, @dnd-kit, react-hook-form + zod,
react-helmet-async, sonner, @tanstack/react-query. Vitest + Testing Library + jsdom;
Playwright (chromium-only, workers:1, baseURL :8080); smoke test isolated by
`@aoe4guides-smoke` grep. ESLint flat config (react-hooks + react-refresh). Bun primary.
~1010 binary assets under `public/aoe4/` + a generated `manifest.json`.
