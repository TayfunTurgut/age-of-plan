
## Iteration 6 — Build Order Runner Overlay (final)

### New files

**`src/lib/noteRenderer.tsx`**
- Export `renderNote(text: string): ReactNode[]`.
- Regex `/@([^@\s]+\.(?:png|webp))@/g` splits text into alternating text + token segments.
- Text segments → `<span>` with original whitespace preserved.
- Token matches → `<img src={getAssetUrl(match)} className="h-4 w-4 inline align-text-bottom mx-0.5" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} alt="" />`.
- Each ReactNode keyed by index.

**`src/hooks/useOverlayTimer.ts`**
- State: `elapsed` (number, seconds with 1 decimal), `isRunning` (boolean), `isAutoAdvance` (boolean, default `false` = manual mode).
- `useRef<number | null>` for the interval id. Tick every 100ms incrementing `elapsed` by 0.1.
- Actions: `play()`, `pause()`, `toggle()`, `reset()` (sets `elapsed=0`, `isRunning=false`), `setAutoAdvance(boolean)`, `toggleMode()`.
- `useEffect` cleanup clears interval on unmount and whenever `isRunning` flips off.
- Returns `{ elapsed, isRunning, isAutoAdvance, toggle, reset, toggleMode }`.

**`src/pages/BuildOrderRunner.tsx`**
- Loads build via `getBuildOrder(id)` from `storage.ts`. If missing → small "Build not found" message with no chrome.
- Local state: `stepIdx` (number, default 0). Timer comes from `useOverlayTimer`.
- Layout (no `.page-enter`, no header/footer):
  - Root: `min-h-screen bg-background text-foreground flex flex-col` with relative positioning for the bottom progress bar.
  - **Title bar** (top, ~px-3 py-2 border-b): build name in `font-display text-xs truncate` + civ name in `text-xs text-muted-foreground`.
  - **Step indicator row**: `Step {stepIdx+1} / {bo.steps.length}` with `ChevronLeft` / `ChevronRight` icon buttons (size sm, ghost variant). Left disabled at 0, right disabled at last.
  - **Timer row**: monospace elapsed `formatTime(Math.floor(elapsed))`, `Play`/`Pause` toggle, `RotateCcw` reset, mode toggle showing `Timer` icon (auto) or `MousePointer` icon (manual). Tooltip-less, compact.
  - **Current step card** (flex-1, scrollable):
    - Age icon (24px via `getAssetUrl(AGE_ICON[step.age])`) + age-colored left border using same `AGE_BORDER` map as `StepCard`.
    - Resource pills row wrapped in `<div className="pointer-events-none flex flex-wrap gap-1.5">`. Reuses `ResourcePill` with a no-op `onChange`. Only renders pills where `step.resources[k] > 0`. Below 350px (`max-[349px]:flex-col`) stack vertically.
    - Vils/Pop line if set: `Vils: {step.villagers} · Pop: {step.population}`.
    - Target time pill if `step.timeSeconds !== undefined`: `Target: {formatTime(step.timeSeconds)}`. Class: `text-primary` when `elapsed >= step.timeSeconds`, else `text-muted-foreground`.
    - Notes list: `step.notes.map(n => <li>{renderNote(n.text)}</li>)`. 14px text.
  - **Progress bar** (absolute bottom, h-1 w-full bg-muted): inner `<div>` with width `${((stepIdx + 1) / bo.steps.length) * 100}%` and `bg-primary` brass fill, transition-all.
- **Auto-advance effect** (refined):
  ```ts
  useEffect(() => {
    if (!isAutoAdvance || !isRunning) return;
    let target = stepIdx;
    while (target + 1 < bo.steps.length) {
      const next = bo.steps[target + 1];
      if (next.timeSeconds === undefined) break;
      if (elapsed < next.timeSeconds) break;
      target += 1;
    }
    if (target !== stepIdx) setStepIdx(target);
  }, [elapsed, isAutoAdvance, isRunning, stepIdx, bo.steps]);
  ```
  Single state update per tick; manual-gate steps (no `timeSeconds`) halt catch-up.
- **Keyboard shortcuts** via `useEffect` window keydown listener:
  - `ArrowRight` / `KeyD` → next step (clamped)
  - `ArrowLeft` / `KeyA` → previous step (clamped)
  - `Space` → `toggle()` + `e.preventDefault()`
  - `KeyR` → `reset()` and reset `stepIdx` to 0
  - `KeyM` → `toggleMode()`
  - Cleanup removes listener on unmount.
- Font sizes: title 12px, resource numbers 13px, notes 14px (Tailwind `text-xs`/`text-[13px]`/`text-sm`).

### Edited files

**`src/App.tsx`**
- Import `BuildOrderRunner` and add `<Route path="/build/:id/run" element={<BuildOrderRunner />} />` above the catch-all.

**`src/pages/BuildOrderPlaceholder.tsx`**
- Add a button row under the header with two `Button` components from `@/components/ui/button`:
  - Primary "Open Overlay" → `onClick={() => window.open(\`/build/${id}/run\`, 'aoe4-overlay', 'width=420,height=520,menubar=no,toolbar=no,location=no,status=no,resizable=yes')}`.
  - Secondary "Edit" → `<Link to={\`/build/${id}/edit\`}>` via `asChild` + `variant="outline"`.
- Buttons disabled when `!bo`.

**`src/pages/BuildOrderEditor.tsx`**
- Add a "Preview Overlay" `Button` (variant `outline`, size `sm`) in the existing top action bar with the same `window.open(...)` call. Placed next to the existing Save/Back actions; no other layout changes.

### Reuse / contracts
- `ResourcePill` import unchanged; wrapper handles read-only via `pointer-events-none`. Icon `onError` fallback still fires (not a pointer event).
- `formatTime` from `src/lib/time.ts`.
- `AGE_ICON` / `AGE_BORDER` / `AGE_LABELS` mirror the editor's values; duplicate the small constant maps inside the runner rather than refactoring `StepCard` to export them (keeps editor untouched per spec).

### Out of scope
- DnD logic, `storage.ts`, `buildOrder.ts`, `civs.ts`, `ResourcePill.tsx` internals, `StepCard.tsx`, civ picker, civ detail.
- No Supabase / server. No bundled assets.

### File summary
- **New**: `src/pages/BuildOrderRunner.tsx`, `src/hooks/useOverlayTimer.ts`, `src/lib/noteRenderer.tsx`.
- **Edited**: `src/App.tsx`, `src/pages/BuildOrderPlaceholder.tsx`, `src/pages/BuildOrderEditor.tsx`.
