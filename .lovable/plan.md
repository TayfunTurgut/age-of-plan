
## AoE4 Build Order Planner — Initial Setup (final)

### Visual theme: Dark Medieval
- Dark slate background, parchment cream foreground, brass/gold primary
- Fonts via Google Fonts in `index.html`:
  - **Cinzel** (400, 700) — display headings, mapped to `font-display`
  - **Cormorant Garamond** (400, 500, 600, 700) — secondary serif, mapped to `font-serif`
- Dark theme applied by default; HSL tokens in `src/index.css`

### Files to create / update

**`src/data/civs.ts`** — 22 civs (12 base + 10 variants)
```ts
export type Civ = { id: string; name: string; variantOf?: string };
```
- 12 base: English, French, Holy Roman Empire, Mongols, Rus, Chinese, Delhi Sultanate, Abbasid Dynasty, Ottomans, Malians, Byzantines, Japanese
- 10 variants:
  - **Ayyubids → `abbasid`** (corrected — Sultans Ascend variant)
  - Zhu Xi's Legacy → `chinese`
  - Jeanne d'Arc → `french`
  - Order of the Dragon → `hre`
  - Knights Templar → `french`
  - House of Lancaster → `english`
  - Golden Horde → `mongols`
  - Macedonian Dynasty → `byzantines`
  - Sengoku Daimyo → `japanese`
  - Tughluqid Dynasty → `delhi`

Total: 12 + 10 = 22 ✓

**`src/types/buildOrder.ts`** — Internal canonical schema
```ts
export type Resources = {
  food: number;
  wood: number;
  gold: number;
  stone: number;
  builder: number;
  oliveOil?: number;   // Byzantines, Ayyubids
  silver?: number;     // Macedonian Dynasty
};

export type BuildStep = {
  id: string;
  age: 1 | 2 | 3 | 4;
  villagerCount: number;
  populationCount?: number;
  resources: Resources;
  timeSeconds?: number;
  notes: string[];
};

export type BuildOrder = {
  id: string;
  name: string;
  civilization: string;   // civ id
  matchup?: string;
  author?: string;
  source?: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  steps: BuildStep[];
};
```
Top-of-file comment documents:
- `timeSeconds` is canonical seconds — RTS_Overlay converter parses `"m:ss"` → seconds; aoe4guides passes through.
- `notes` is an array so each note becomes a discrete draggable item later.
- `builder` always present (default 0); 5th-resource fields only set for relevant civs.

**`src/index.css`** — Replace tokens with dark medieval HSL palette (background, foreground, primary, accent, border, muted, card, popover). Dark by default.

**`tailwind.config.ts`** — Extend `fontFamily` with `display: ["Cinzel", "serif"]` and `serif: ["'Cormorant Garamond'", "serif"]`.

**`index.html`** — Add Google Fonts `<link>` (Cinzel 400/700, Cormorant Garamond 400/500/600/700); update `<title>` to "AoE4 Build Order Planner".

**`src/pages/Index.tsx`** — Truly blank shell: full-screen dark slate, centered "AoE4 Build Order Planner" in Cinzel gold. No nav, cards, or CTAs.

### Out of scope for this step
- localStorage persistence
- Build order list / create / edit / runner UI
- Step timer
- RTS_Overlay & aoe4guides import converters (schema is ready)
- Civ icons, landmarks, unique units
