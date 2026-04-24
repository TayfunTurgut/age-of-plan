# Age of Plan

A web-based build-order editor and overlay runner for **Age of Empires IV**. Create, edit, import, export, and follow build orders step by step — including a chrome-less overlay window designed for streaming and second-monitor use.

## Features

- **Editor** — drag-and-drop build steps with per-step resources (food/wood/gold/stone/builder, plus olive oil for Byzantines/Ayyubids and silver for Macedonians), age tracking, villager counts (auto or manual), population, timing, notes, and unit/location tags
- **Library** — search, filter, and sort saved builds; cross-tab sync via the `storage` event
- **Importers** — pull builds from [aoe4guides.com](https://aoe4guides.com) by URL, or paste / drop an [RTS_Overlay](https://github.com/CraftySalamander/RTS_Overlay) JSON
- **Exporters** — native JSON (lossless) or RTS_Overlay-compatible JSON
- **Overlay runner** — distraction-free step-by-step mode with keyboard shortcuts (arrow keys, space, R reset, M mode toggle) and optional auto-advance
- **Civilizations** — all 12 base civs plus 10 variants (22 total)
- **Persistence** — localStorage with silent legacy-schema migration; no backend required

## Requirements

- [Bun](https://bun.sh) (primary package manager; `bun.lockb` is committed) or Node ≥ 18 with npm
- A Chromium- or Firefox-based browser for the dev server

## Install

```bash
bun install
# or
npm install
```

## Development

```bash
bun run dev        # start Vite dev server on http://localhost:8080
bun run test       # run Vitest once
bun run test:watch # run Vitest in watch mode
bun run lint       # run ESLint
bun run build      # production build
bun run preview    # serve the production build locally
```

## Architecture

```
src/
├── App.tsx                  router + providers (React Query, TooltipProvider, Toasters)
├── main.tsx                 entry
├── pages/                   route-level components
│   ├── Index.tsx            home (civ picker)
│   ├── Library.tsx          browse / search / filter builds
│   ├── CivDetail.tsx        builds for a single civilization
│   ├── NewBuildOrder.tsx    create flow
│   ├── BuildOrderEditor.tsx main editor (drag-and-drop, autosave)
│   ├── BuildOrderRunner.tsx overlay step-runner
│   └── BuildOrderPlaceholder.tsx
├── components/
│   ├── editor/              StepCard, InlineText, ResourcePill, StepTags
│   ├── library/             BuildCard
│   ├── ui/                  shadcn/ui primitives
│   ├── AppLayout.tsx        nav + outlet + footer
│   ├── CivFlag.tsx          gradient civ badge
│   └── ImportModal.tsx      URL / JSON / file-drop import dialog
├── hooks/                   useOverlayTimer, useTheme, use-mobile, use-toast
├── lib/
│   ├── buildOrder.ts        createEmptyBuildOrder, createEmptyStep, computeVillagerCount
│   ├── storage.ts           localStorage CRUD + schema migration
│   ├── importAoe4Guides.ts  aoe4guides.com REST importer
│   ├── importRtsOverlay.ts  RTS_Overlay JSON importer
│   ├── exportBuildOrder.ts  native + RTS_Overlay exporters
│   ├── time.ts              "m:ss" parse/format
│   ├── noteRenderer.tsx     note text renderer (mentions, icons, links)
│   ├── assets.ts            asset URL helpers
│   ├── theme.ts             theme helpers
│   └── utils.ts             cn() etc.
├── data/civs.ts             civ metadata (name, tagline, flag colors, variants)
├── types/buildOrder.ts      BuildOrder / BuildStep / Resources
└── test/                    vitest test harness
```

**State model.** Build orders live in `localStorage` under the prefix `aoe4bo:bo:`. `src/lib/storage.ts` is the only module that touches storage directly; it owns migration of legacy note shapes and villager-count recomputation. Pages and components hold local React state and debounce-save via `saveBuildOrder`.

**Drag & drop.** `@dnd-kit` powers step reordering and cross-step note moves. Drag payload types are declared on each sortable item's `data` and read in `BuildOrderEditor.tsx` handlers.

**Theming.** Dark mode is applied pre-hydration by an inline script in `index.html` (reading `aoe4bo:theme`) to avoid a flash.

## Importing builds

- **aoe4guides.com URL** — paste any build URL; the importer fetches via the site's JSON API and normalizes ages, times, resources, and notes.
- **RTS_Overlay JSON** — paste or drop a `.json` file exported from RTS_Overlay. Civ display names are mapped back to internal IDs (diacritics-insensitive; common aliases recognized).
- **Native JSON** — round-trips losslessly with the native exporter.

## Contributing

Issues and PRs welcome. Run `bun run lint` and `bun run test` before opening a PR. The editor is drag-heavy, so verify step reordering and note moves manually in the dev server when touching `BuildOrderEditor.tsx` or `@dnd-kit` wiring.

## License

Asset URLs reference community resources (flags, unit icons) hosted at `https://rts-overlay.github.io/assets/aoe4/`. Code: see the repository's license file if present.
