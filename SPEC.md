# Age of Plan — Specification

A web-based build-order editor and overlay runner for **Age of Empires IV**.
Create, edit, import, export, and follow build orders step by step — including a
chrome-less overlay window for second-monitor and mobile use.

This document is the design contract for building Age of Plan in this repository.
It is reconstructed from a read-only reference implementation
(`../age-of-plan-reference`) and the product requirements. The implementing agent
should treat this as the source of truth and validate exact tool/library versions
against the reference during implementation.

---

## 1. Overview

Age of Plan helps players **learn and follow** AoE4 build orders. A user picks a
civilization, creates or imports a build, and then *runs* it in a distraction-free
overlay they can keep on a second monitor or a phone while they play.

There is **no backend**. Everything is persisted in `localStorage`. Moving a build
between devices is done by **exporting to JSON** on one device and **re-importing**
it on another.

### Goals

- Author build orders with a fast, drag-and-drop step editor.
- Import builds from existing community sources and export them losslessly.
- Follow a build hands-free in an overlay window with keyboard control and
  optional auto-advance.
- Work well on mobile — for users without a second monitor, the phone is the
  primary follow-along surface.
- Be discoverable via search engines (SEO is a first-class requirement).
- Be usable by people with different visual needs: light/dark themes and a global
  font-size control.

### Non-goals

- No server, accounts, authentication, or cloud sync. The only cross-device path
  is manual JSON export/import.
- No programmatic YouTube/video integration. "Using a YouTube guide" means the
  user *watches* a guide video and **manually** authors the build steps and their
  timestamps themselves; the app does not embed, scrape, or parse video.
- No multiplayer, comments, ratings, or social features.

---

## 2. Tech stack & tooling

The implementing agent must validate exact versions against the reference, but the
stack is:

- **Build/dev:** Vite 5, TypeScript 5 (strict; no `any` escape hatches).
- **UI:** React 18, Tailwind CSS 3, shadcn/ui (Radix primitives),
  `lucide-react` icons, `class-variance-authority`, `tailwind-merge`,
  `tailwindcss-animate`.
- **Routing:** `react-router-dom` v6.
- **Drag & drop:** `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`.
- **Forms/validation:** `react-hook-form` + `zod` (+ `@hookform/resolvers`).
- **Head/SEO:** `react-helmet-async`.
- **Toasts:** `sonner`.
- **Data fetching:** `@tanstack/react-query` (used by importers).
- **Package manager:** Bun primary (`bun.lockb` committed); Node ≥ 18 + npm
  fallback.
- **Testing:** Vitest (+ Testing Library, jsdom) for unit; Playwright for e2e.
- **Lint:** ESLint (flat config) with React Hooks + Refresh plugins.

### Quality gates (per vertical slice)

Every milestone ends on a green commit. "Green" means: the milestone's tests
pass **and** typecheck/build **and** lint are clean. Never commit on red; never
bypass a gate with `--no-verify`, `--force`, or by deleting the blocker.

- `bun run build` — production build / typecheck clean.
- `bun run lint` — ESLint clean.
- `bun run test` — Vitest passing.
- `bun run test:e2e` — Playwright passing (excludes the live aoe4guides smoke
  test; see §11).

---

## 3. Routes

Routes render inside a shared `AppLayout` (nav + outlet + footer), **except** the
runner, which renders standalone so the overlay window has no nav chrome.

| Path | Page | Purpose |
| --- | --- | --- |
| `/` | Index | Home — civilization picker. |
| `/library` | Library | Browse / search / filter / sort all saved builds. |
| `/civ/:id` | CivDetail | Builds for a single civilization. |
| `/build/new` | NewBuildOrder | Create flow (pick civ + name). |
| `/build/:id` | BuildOrderPlaceholder | Build landing / actions (edit, run, export). |
| `/build/:id/edit` | BuildOrderEditor | Main drag-and-drop editor with autosave. |
| `/build/:id/run` | BuildOrderRunner | Overlay step-runner (outside `AppLayout`). |
| `*` | NotFound | 404. |

App-level providers: `ErrorBoundary` → `QueryClientProvider` →
`TooltipProvider` → `Sonner` toaster → `BrowserRouter`.

---

## 4. Data model

The canonical schema lives in `src/types/buildOrder.ts`. Data is plain
serializable data only — never embed view markup in the data layer.

```ts
type Resources = {
  food: number;
  wood: number;
  gold: number;
  stone: number;
  builder: number;     // always present, default 0
  oliveOil?: number;   // Byzantines, Ayyubids only
  silver?: number;     // Macedonian Dynasty only
};

type BuildStep = {
  id: string;
  age: 1 | 2 | 3 | 4;
  villagerCount: number;
  villagerCountManual?: boolean;  // true = user-edited, not auto-summed from resources
  buildersUnknown?: boolean;      // true = render `?` for builders + total villagers
  resources: Resources;
  timeSeconds?: number;           // canonical seconds from game start ("snapshot" timestamp)
  prerequisite?: string;          // e.g. "400 food, 200 gold to age up"; supports icon tokens
  notes: { id: string; text: string }[];
  tags?: { id: string; unit: string; location: string }[];  // "where should my <unit> be?"
};

type BuildOrder = {
  id: string;
  name: string;
  civilization: string;   // civ id from src/data/civs.ts
  matchup?: string;       // e.g. "vs French", "Open map"
  author?: string;
  source?: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  steps: BuildStep[];
};
```

Key rules:

- **`timeSeconds` is canonical seconds.** The UI parses/formats `"m:ss"` (see
  `lib/time.ts`). A build step at a given time is the "snapshot at a timestamp"
  the user follows.
- **Villager count** mirrors the sum of resource assignments unless
  `villagerCountManual` is set.
- **`notes` is an array** so each note is an independently draggable item.
- **Inline icon tokens:** notes and `prerequisite` support `{{path/to/icon.webp}}`
  tokens rendered by a dedicated note renderer (mentions, icons, links). The data
  stores tokens as text; rendering happens in the view layer.

---

## 5. Persistence (localStorage)

- One key per build order: `aoe4bo:bo:<id>`. No separate index — the library
  enumerates keys by prefix.
- A single storage module (`src/lib/storage.ts`) is the **only** code that touches
  `localStorage` directly. It owns:
  - CRUD: get one, get all, get by civ, save, delete.
  - **Silent legacy-schema migration** (e.g. old note shapes) and villager-count
    recomputation on read.
  - Lossless **export** (native JSON) and import entry points.
- **Saving** is debounced from the editor via `saveBuildOrder`; pages/components
  hold local React state.
- **Cross-tab sync:** the library listens to the `storage` event so changes in one
  tab reflect in others.
- All storage access is wrapped to tolerate private-mode / sandboxed failures
  (never throw to the UI).

### Other persisted keys

| Key | Purpose |
| --- | --- |
| `aoe4bo:bo:<id>` | One build order. |
| `aoe4bo:theme` | `"light"` / `"dark"` (read by zero-flash inline script). |
| `aoe4bo:fontSize` | Global font size in px (see §9). |
| `aoe4bo:runner:collapsed` | Runner collapsed state (sessionStorage). |

---

## 6. Civilizations

12 base civilizations + 10 variants = **22 total**. Civ metadata
(`src/data/civs.ts`) holds id, display name, `variantOf`, a tagline (2–3 signature
units/landmarks), flag icon path, and which extra resources the civ uses.

Base + variants (ids used in routes/sitemap):
`english`, `french`, `hre`, `mongols`, `rus`, `chinese`, `delhi`, `abbasid`,
`ottomans`, `malians`, `byzantines`, `japanese`, `ayyubids`, `zhu-xi`,
`jeanne-darc`, `order-of-the-dragon`, `knights-templar`, `house-of-lancaster`,
`golden-horde`, `macedonian`, `sengoku-daimyo`, `tughluqid`.

Per-civ data, the icon catalog, and aoe4guides path migration are generated from
aoe4world data (`src/data/generated/*`) by a sync script and should not be
hand-edited. Civ-specific extra resources: olive oil (Byzantines, Ayyubids),
silver (Macedonian Dynasty).

---

## 7. Import & export

Age of Plan is a **sibling tool** to aoe4guides.com — format-compatible, not a
fork or competitor. It imports from community sources so users can practice builds
locally.

### Importers (via `ImportModal` — URL / JSON paste / file drop)

1. **aoe4guides.com URL** — paste any build URL. Fetches the site's public JSON
   API (`GET /api/builds/<id>`), normalizes ages, times, resources, and notes.
   Image tags in descriptions are mapped to internal icon tokens with alias /
   path-migration / `.png`↔`.webp` fallbacks; unmapped images degrade to readable
   text labels. Civ codes are mapped to internal ids (codes drift upstream — keep
   legacy 2-letter fallbacks; `ANY` → user picks manually). Schemas are loose:
   use `.nullish()` for nullable optional fields.
2. **RTS_Overlay JSON** — paste or drop a `.json` exported from RTS_Overlay. Parses
   `"m:ss"` times to seconds; maps civ display names back to internal ids
   (diacritics-insensitive, common aliases recognized).
3. **Native JSON** — round-trips losslessly with the native exporter (also the
   cross-device transfer path).

### Exporters

- **Native JSON** — lossless; the canonical export/transfer format.
- **RTS_Overlay-compatible JSON** — for interop with RTS_Overlay.

### Cross-device workflow

Export a build to JSON on device A → transfer the file → import on device B. This
is the **only** supported way to move builds between devices.

---

## 8. Overlay runner

A distraction-free, chrome-less window for following a build while playing.

- **Launch:** `openOverlayFor(id)` opens `/build/:id/run` via `window.open` with
  popup features (`width=380,height=240`, no menubar/toolbar/location/status,
  resizable). Shared by the editor, build landing, and library card so all use the
  same dimensions and fallback.
- **Popup-blocked fallback:** if `window.open` returns null, open in a new tab and
  toast an explanation. On mobile (where popups are unavailable), the runner works
  as a full in-page/tab view.
- **Step navigation:** keyboard shortcuts — next: `→` / `D` / `Enter`; previous:
  `←` / `A` / `Backspace`; `Space` toggle play/pause; `R` reset to step 0; `M`
  toggle manual ↔ auto-advance.
- **Auto-advance:** optional timed advancement driven by an overlay timer hook;
  manual mode otherwise.
- **Collapse:** a collapsed compact state, persisted in `sessionStorage`.
- **Auto-resize:** the popup resizes its outer dimensions to wrap the content
  panel (best-effort; `resizeTo` may be blocked after user resize / on non-popup
  windows).
- **Live preference sync:** the runner subscribes to font-size and theme changes
  from the main window via the `storage` event (plus a same-window custom event)
  so it follows the main window live.

---

## 9. Accessibility & preferences

### Theme (light/dark)

- Stored under `aoe4bo:theme`. Applied **pre-hydration** by a blocking inline
  script in `index.html` (defaults to dark; switches to light only if the stored
  value is `"light"`) to avoid a flash of wrong theme.
- A `useTheme` hook manages runtime toggling and syncs across windows via the
  `storage` event so the runner popup follows the main window.

### Global font size

- A global text-size picker (`FontSizeToggle` in the nav) lets users scale the
  whole UI for readability.
- Allowed values: **14, 15, 16, 17, 18, 20** px; default **17**. Single source of
  truth in `src/lib/fontSize.ts` (key `aoe4bo:fontSize`, custom event
  `aoe4bo:fontsize-change`).
- Applied pre-hydration by a second blocking inline script in `index.html`
  (mirrors the allowed values by string) to avoid a flash, then set on
  `document.documentElement.style.fontSize`.
- Changes broadcast both via the native cross-window `storage` event and a
  same-window custom event so sibling components and the runner popup update live.

### General

- Reduced-motion respected for animations.
- Keyboard operability for the editor and runner.
- All storage/clipboard/popup access degrades gracefully (no thrown errors to the
  user) under private mode or blocked permissions.

---

## 10. Mobile

Mobile compatibility is a **primary** requirement: for users without a second
monitor, a phone is the main way to follow a build.

- Responsive layouts across all routes (a `use-mobile` hook gates
  mobile-specific behavior).
- The runner works as a full-screen in-page view when chrome-less popups are
  unavailable (mobile browsers).
- Touch-friendly drag-and-drop in the editor and touch-sized controls in the
  runner.
- The global font-size control directly serves small-screen readability.

---

## 11. SEO

SEO is a tracked, first-class requirement so the app is discoverable on search
engines. Production domain: **`ageofplan.com`**.

- **Per-route head tags** via a shared `<Seo>` component (`react-helmet-async`):
  `<title>` (auto-suffixed with the brand, kept under ~60 chars), meta
  description (50–160 chars), canonical link, and Open Graph + Twitter card tags.
  `HelmetProvider` wraps the app at the entry point.
- **Base meta** in `index.html`: title, description, Open Graph / Twitter image,
  favicon, font preconnect.
- **`public/robots.txt`** — explicitly allows Googlebot, Bingbot, Twitterbot,
  facebookexternalhit, and `*`; references the sitemap.
- **`public/sitemap.xml`** — home (priority 1.0), library (0.8), and all 22 civ
  pages (0.6).
- **`public/llms.txt`** — AI-crawler-friendly summary listing pages and all civ
  routes.
- Civ pages and the library are the main indexable surfaces; private user builds
  live only in `localStorage` and are not indexed.

---

## 12. Project structure

Target layout (mirrors the reference; adapt as slices are built):

```
src/
├── App.tsx                  router + providers
├── main.tsx                 entry (HelmetProvider, etc.)
├── pages/
│   ├── Index.tsx            home (civ picker)
│   ├── Library.tsx          browse / search / filter
│   ├── CivDetail.tsx        builds for one civ
│   ├── NewBuildOrder.tsx    create flow
│   ├── BuildOrderPlaceholder.tsx
│   ├── BuildOrderEditor.tsx main editor (drag-and-drop, autosave)
│   ├── BuildOrderRunner.tsx overlay step-runner
│   └── NotFound.tsx
├── components/
│   ├── editor/              StepCard, InlineText, NoteRow, PrerequisiteRow, tags
│   ├── library/             BuildCard
│   ├── ui/                  shadcn/ui primitives
│   ├── AppLayout.tsx        nav + outlet + footer
│   ├── NavBar.tsx / NavLink.tsx / SiteFooter.tsx
│   ├── CivFlag.tsx          gradient civ badge
│   ├── FontSizeToggle.tsx   global text-size picker
│   ├── ImportModal.tsx      URL / JSON / file-drop import dialog
│   ├── Seo.tsx              per-route head tags
│   ├── OverlayStepCard.tsx / OverlayPreview.tsx
│   └── ErrorBoundary.tsx
├── hooks/                   useOverlayTimer, useTheme, useFontSize, useAutoResize,
│                            useIconAutocomplete, use-mobile
├── lib/
│   ├── buildOrder.ts        createEmptyBuildOrder, createEmptyStep, villager calc
│   ├── storage.ts           localStorage CRUD + migration (only storage writer)
│   ├── overlayWindow.ts     openOverlayFor() popup launcher
│   ├── importAoe4Guides.ts  aoe4guides.com importer
│   ├── importRtsOverlay.ts  RTS_Overlay importer
│   ├── exportBuildOrder.ts  native + RTS_Overlay exporters
│   ├── time.ts              "m:ss" parse/format
│   ├── fontSize.ts / theme.ts
│   ├── noteRenderer.tsx / noteToken.ts   inline icon/mention/link rendering
│   ├── aoe4GuidesIconMap.ts  aoe4guides image → icon token mapping
│   ├── assets.ts / relativeTime.ts / env.ts / utils.ts
├── data/
│   ├── civs.ts              civ metadata (22 civs)
│   ├── civExtras.ts / tagPresets.ts
│   └── generated/           icons, civData, pathMigration (script-generated)
├── types/buildOrder.ts      canonical schema
└── test/                    Vitest harness

public/
├── robots.txt, sitemap.xml, llms.txt, favicon.png
└── aoe4/                    flags, ages, resources icons + manifest

scripts/                     sync-aoe4-data.ts (regenerates data/generated/*)
```

**State ownership boundaries:** `storage.ts` is the sole `localStorage` writer for
builds; `fontSize.ts` / `theme.ts` own their respective keys. View components never
read/write storage keys directly.

---

## 13. Testing & verification

- **Unit (Vitest):** storage CRUD + migration, importers/exporters round-trips,
  time parsing, note rendering, icon mapping, build-order helpers.
- **E2E (Playwright):** core flows — create, edit (drag reorder + note moves),
  run, import, export. Default e2e run excludes the live-network smoke test.
- **aoe4guides smoke (Playwright):** hits the real aoe4guides API to catch upstream
  drift (`@aoe4guides-smoke`, run separately). A coverage-audit script reports any
  unmapped image tags after upstream asset renames.
- **Manual checks** the implementer must do that automation can't: the editor is
  drag-heavy — verify step reordering and cross-step note moves in the browser; and
  verify the chrome-less overlay popup launch, resize, and live theme/font sync.

---

## 14. Conventions

- Strong typing throughout; no `any` escape hatches.
- Data layers hold plain serializable data — no view code/markup in data.
- Smallest change that satisfies a slice; no speculative abstraction; prefer
  editing existing files over creating new ones.
- Save Playwright/MCP artifacts to `/tmp`, never the repo tree.
- Stay format-compatible with aoe4guides.com; adapt when their format drifts.
