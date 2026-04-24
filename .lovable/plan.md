
## Iteration 3 — Build Order Editor with Drag-and-Drop (final)

### Dependencies
Install: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

### New utilities

**`src/lib/time.ts`**
- `formatTime(seconds?: number): string` → `"m:ss"` or `"—"`.
- `parseTime(input: string): number | null` → seconds, or `null` if invalid.

**`src/lib/buildOrder.ts`** — single source of truth for construction
- `createEmptyStep(previousStep?: BuildStep): BuildStep` — fresh `crypto.randomUUID()`, age inherited from `previousStep?.age ?? 1`, vils/pop = 0/undefined, all resources = 0, empty notes.
- `createEmptyBuildOrder(civId: string): BuildOrder` — fresh UUID, `name: "Untitled build"`, `civilization: civId`, empty `steps`, `createdAt`/`updatedAt = Date.now()`.
- **Both `NewBuildOrder.tsx` and `BuildOrderEditor.tsx` MUST import these factories — do not inline UUID/timestamp/step construction in the pages.**

### Routing (`src/App.tsx`)
Above the catch-all:
```
<Route path="/build/new" element={<NewBuildOrder />} />
<Route path="/build/:id" element={<BuildOrderPlaceholder />} />
<Route path="/build/:id/edit" element={<BuildOrderEditor />} />
```

### `src/pages/NewBuildOrder.tsx` — rewritten as create-and-redirect
- On mount: read `civ` query param. If missing/unknown → `navigate("/", { replace: true })`.
- Otherwise: `const bo = createEmptyBuildOrder(civId)` → `saveBuildOrder(bo)` → `navigate(\`/build/${bo.id}/edit\`, { replace: true })`.
- Renders nothing (or a brief skeleton). Never persistent.

### `src/pages/BuildOrderEditor.tsx` (new) — `/build/:id/edit`

**State & autosave**
- `useState<BuildOrder | null>` loaded once via `getBuildOrder(id)` in `useEffect`. Unknown id → "Build not found" + back link to `/`.
- `useEffect` watching the build state calls `saveBuildOrder()` debounced 500ms (skip first run after load).
- `saveStatus: "idle" | "saving" | "saved"` drives a small muted indicator near the top bar.

**Top bar**
- Back link `← Back to <Civ Name>` → `/civ/<civId>`.
- Inline-editable Cinzel heading bound to `name` (click → input, blur/Enter commit, Escape revert).
- Save indicator (small muted text).
- Compact always-visible inputs row: `author`, `matchup` (placeholder `"e.g. vs French"`), `description`.

**Step list (drag-and-drop)**
- Single `DndContext` + `SortableContext` (vertical strategy), items keyed by `step.id`.
- `useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 }}), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 }}))`.
- `DragOverlay` renders a semi-transparent clone of the dragged card.
- Items animate via `CSS.Transform.toString(transform)` from `@dnd-kit/utilities`.
- Between each card: thin "+ Insert Step" hit target, `opacity-0 hover:opacity-100`, brass accent. Click inserts a new step at that index (using `createEmptyStep(previousStep)`).
- Empty state: centered "Add your first step to get started" + "+ Add Step".
- Bottom: full-width "+ Add Step" button (dashed muted border, brass on hover).

**Step card (`src/components/editor/StepCard.tsx`)**
- Left edge: lucide `GripVertical` bound to `useSortable`'s `listeners` + `attributes` — only the handle initiates drag.
- 1-based step index next to/above the grip (muted).
- Top row of inline-editable fields (commit on blur/Enter, revert on Escape):
  - **Age**: shadcn `Select` showing `I/II/III/IV` with tooltip → `Dark/Feudal/Castle/Imperial`.
  - **Vils**: small number input.
  - **Pop**: small number input, optional (dash when unset).
  - **Time**: display `m:ss`, edit as `m:ss` text — parsed via `parseTime`; invalid input reverts. Blank → "—".
- **Resource pills** (`src/components/editor/ResourcePill.tsx`): horizontal `flex flex-wrap` row — colored dot + 1-letter label + number input (default 0).
  - Always: food (red, F), wood (green, W), gold (yellow, G), stone (gray, S), builder (blue, B).
  - If `civ.id === "byzantines" || civ.id === "ayyubids"` → also olive oil (purple, O).
  - If `civ.id === "macedonian"` → also silver (silver/white, Sv).
- **Notes area**: vertical list. Each row = single-line auto-resizing `textarea` (rows=1, expands on wrap) + `X` delete button. Bottom: small "+ Add Note" — appended note auto-focuses with empty string. No DnD on notes.
- **Top-right overflow menu** (`MoreHorizontal` → shadcn `DropdownMenu`):
  - Duplicate Step — clones with fresh `id`, inserts after current.
  - Delete Step — `window.confirm` only if step has notes or any non-zero resource/vils; otherwise immediate.

**Shared primitive (`src/components/editor/InlineText.tsx`)**
- Click-to-edit text/number cell: renders styled text by default, swaps to `input` on click/focus, commits on blur/Enter, reverts on Escape. Used for build name, vils, pop, time, and notes.

### Mobile
- Resource pills wrap to 2 rows (`flex-wrap`).
- `TouchSensor` 150ms delay prevents input taps from triggering drag.
- Grip handle ≥ `h-10 w-6` for touch.

### Out of scope
- Note drag-and-drop, runner/timer, import/export, icon-token rendering in notes.
- No edits to `civs.ts`, `storage.ts`, civ picker, civ detail page.
- No Supabase / server.

### File summary
- **New**: `src/pages/BuildOrderEditor.tsx`, `src/components/editor/StepCard.tsx`, `src/components/editor/ResourcePill.tsx`, `src/components/editor/InlineText.tsx`, `src/lib/time.ts`, `src/lib/buildOrder.ts`.
- **Rewritten**: `src/pages/NewBuildOrder.tsx` (uses `createEmptyBuildOrder`).
- **Edited**: `src/App.tsx` (add `/build/:id/edit` route), `package.json` (3 dnd-kit deps).
