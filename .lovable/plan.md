# Iteration 9 — Quality polish pass

No new features. Refinement of existing code: keyboard accessibility, mobile touch UX, render performance, error states, and visual micro-polish. **No new files.**

## 1. Keyboard accessibility

### `src/index.css` — global focus utility
Add inside `@layer components`:
```css
.focus-ring {
  @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background;
}
```

### `src/components/editor/StepCard.tsx`
- Verify Tab order: age select → vils badge → lock toggle → pop input → time input → resource pills (F→W→G→S→B→optional) → notes (text → delete) → tags (unit → location → delete) → overflow menu. Drag grip stays non-focusable (drag-only, has `aria-hidden` or no tabIndex).
- Add `.focus-ring` to: lock toggle button, overflow menu trigger, and any custom inline buttons that don't already use shadcn `Button` (which has built-in focus styles).
- "+ Add Note" and the (existing) "+ Add Step" / "+ Insert Step" buttons: confirm they're real `<button>` elements and add `.focus-ring` if missing.

### `src/components/editor/StepTags.tsx`
- TagCombobox triggers and the `×` delete button get `.focus-ring`.
- "+ Add Tag" button gets `.focus-ring` and verified Tab reachability.

### `src/components/ImportModal.tsx`
- Tab order: tab selector → input/textarea → import button.
- aoe4guides URL `<input>`: add `onKeyDown` handler — `if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleImport(); }`.
- Escape-to-close: shadcn `Dialog` already wires this; confirm no `onKeyDown` swallows it.
- Drop zone: ensure it's a focusable button-like element with `.focus-ring`.

### `src/pages/BuildOrderRunner.tsx`
- Add `.focus-ring` to play/pause, prev/next, reset, and close buttons.

### `src/pages/Library.tsx`
- Search input and filter `Select` triggers: confirm visible focus (shadcn defaults are fine; add `.focus-ring` if anything was overridden).

### `src/components/library/BuildCard.tsx`
- Make the card root focusable: `tabIndex={0}`, `role="link"` (or wrap content in a real `<Link>`), `onKeyDown` for Enter → navigate to editor.
- Action icon buttons (edit/play/delete): ensure each is a real `<button>` with `aria-label` and `.focus-ring`.
- Clicking the card navigates; clicking an action button uses `e.stopPropagation()` so card-level activation doesn't fire.

### `src/components/NavBar.tsx`
- Library `NavLink` and theme toggle `Button`: add `.focus-ring` (Button variant already has focus styles, but explicit ring on NavLink anchor).

## 2. Mobile touch refinement

### `src/components/editor/ResourcePill.tsx`
- Add `inputMode="numeric"` and `pattern="[0-9]*"` to the `<input type="number">` for the iOS numeric keypad.

### `src/components/editor/StepCard.tsx`
- Drag grip handle: expand hit area to ≥44×44 via pseudo-element trick:
  ```tsx
  className="relative ... before:absolute before:inset-[-12px] before:content-['']"
  ```
- Note row drag handle: same treatment.
- Verify `@dnd-kit` `TouchSensor` `activationConstraint: { delay: 150, tolerance: 5 }` is unchanged.

### `src/pages/BuildOrderRunner.tsx`
- Play/pause/prev/next buttons: enforce `min-w-[44px] min-h-[44px]` and add `touch-action: manipulation` on the controls row container to suppress double-tap zoom.

### `src/components/ImportModal.tsx`
- Drop zone copy: change to "Tap to browse or drop a file" so mobile users see a tap affordance (drag events don't fire on touch). Always-visible label, not gated on `isDragging`.

### `src/components/library/BuildCard.tsx`
- Replace hover-only action visibility with media-aware CSS:
  ```css
  /* in index.css */
  .card-actions { opacity: 0; transition: opacity 150ms; }
  @media (hover: hover) { .group:hover .card-actions { opacity: 1; } }
  @media (hover: none) { .card-actions { opacity: 1; } }
  ```
  Apply `.card-actions` to the action row and `.group` to the card root.

## 3. Performance

### `src/components/editor/StepCard.tsx`
- Wrap export with `React.memo` + custom comparator:
  ```ts
  (prev, next) =>
    prev.step === next.step &&
    prev.previousVillagerCount === next.previousVillagerCount &&
    prev.civ === next.civ &&
    prev.index === next.index &&
    prev.onChange === next.onChange &&
    prev.onDelete === next.onDelete &&
    prev.onDuplicate === next.onDuplicate &&
    prev.onInsertAfter === next.onInsertAfter
  ```
- Internal `NoteRow` (if defined inline): also wrap in `React.memo` comparing `note.id`, `note.text`, and handler refs.

### `src/components/editor/ResourcePill.tsx`
- Wrap export in `React.memo` (default shallow comparator — props are primitives + onChange).

### `src/components/editor/StepTags.tsx`
- Wrap export in `React.memo` comparing `step.tags` by ref, `civId`, and `onUpdate` ref.

### `src/pages/BuildOrderEditor.tsx`
- Stabilize handlers with `useCallback`:
  - `setStep`, `deleteStep`, `duplicateStep`, `insertStepAfter`, `addStep`, and any `onChange`/`onUpdate` callbacks passed to `StepCard`.
- Keep current 500ms autosave debounce. If profiling shows lag, drop to 300ms (do **not** drop preemptively).

### `src/lib/noteRenderer.tsx`
- Add bounded cache:
  ```ts
  const renderCache = new Map<string, ReactNode[]>();
  const MAX = 200;
  export const renderNote = (text: string): ReactNode[] => {
    if (!text) return [];
    const cached = renderCache.get(text);
    if (cached) return cached;
    // ... existing parsing logic builds `out`
    if (renderCache.size >= MAX) {
      const firstKey = renderCache.keys().next().value;
      if (firstKey !== undefined) renderCache.delete(firstKey);
    }
    renderCache.set(text, out);
    return out;
  };
  ```

### `src/lib/storage.ts`
- Add a `// TODO: cache getAllBuildOrders results in-memory; invalidate on save/delete` comment above `getAllBuildOrders`. **No implementation now** — defer until measured.

## 4. Empty state and error polish

### `src/pages/BuildOrderEditor.tsx`
- If `getBuildOrder(id)` returns null after mount, render an error card:
  - Heading: "Build order not found"
  - Body: "This build order could not be found. It may have been deleted."
  - Button linking back to `/`.
- Don't render the editor shell.

### `src/pages/BuildOrderRunner.tsx`
- Same treatment when build is missing:
  - Heading: "Build not found"
  - Body: "You can close this window."
  - Button: "Close" (`window.close()`), fallback link to `/`.

### `src/pages/BuildOrderPlaceholder.tsx`
- If `bo` is null, render the same error card pattern instead of a disabled shell.

### `src/components/ImportModal.tsx`
- After successful import, call `toast.success("Build imported successfully")` (sonner) before navigation.

## 5. Visual micro-polish

### `src/components/editor/StepCard.tsx`
- Age-colored left border: add `transition-colors duration-200` to the border element so age changes animate.

### `src/pages/BuildOrderRunner.tsx`
- Progress bar fill: add `transition-all duration-300` for smooth step transitions.

### `src/components/NavBar.tsx`
- Sun/moon icon swap: wrap icon in a span with `transition-transform duration-200`. Toggle a `rotate-180` class on theme change for a subtle rotate animation. Keep current swap logic — just add the transition wrapper.

### `src/components/CivFlag.tsx`
- Image fade-in: add `useState` for `loaded`, set on `onLoad`, apply `opacity-0` initially, `opacity-100` when `loaded`, `transition-opacity duration-300`.

### `src/index.css`
- Add scrollbar styling:
  ```css
  @layer base {
    * { scrollbar-width: thin; scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent; }
    *::-webkit-scrollbar { width: 8px; height: 8px; }
    *::-webkit-scrollbar-track { background: transparent; }
    *::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground) / 0.3); border-radius: 4px; }
    *::-webkit-scrollbar-thumb:hover { background: hsl(var(--primary) / 0.5); }
  }
  ```

## 6. Out of scope
- DnD behavior changes
- Timer logic
- Auto-villager-compute logic
- Theme palette
- Routing / navigation structure
- Library or civs.ts data
- Importer / exporter logic
- Supabase / server work
- New components or files

## File summary

**Edited (14):**
- `src/index.css` — `.focus-ring`, `.card-actions` visibility rules, scrollbar styles
- `src/components/editor/StepCard.tsx` — tab order, focus rings, expanded drag hit area, age border transition, `React.memo`
- `src/components/editor/ResourcePill.tsx` — `inputMode="numeric"`, `React.memo`
- `src/components/editor/StepTags.tsx` — focus rings, `React.memo`
- `src/pages/BuildOrderEditor.tsx` — `useCallback` stabilization, error state for missing build
- `src/pages/BuildOrderRunner.tsx` — focus rings, 44px touch targets, progress bar transition, error state
- `src/pages/Library.tsx` — confirm focus visibility on search/filters
- `src/pages/CivDetail.tsx` — (only if it renders cards directly; otherwise no change — `BuildCard` handles it)
- `src/components/library/BuildCard.tsx` — focusable card, Enter activation, `.card-actions` class for media-aware visibility, `.focus-ring` on actions
- `src/components/NavBar.tsx` — focus rings, theme icon rotate transition
- `src/components/CivFlag.tsx` — image fade-in on load
- `src/components/ImportModal.tsx` — Enter-to-submit on URL input, mobile-friendly drop zone copy, success toast
- `src/pages/BuildOrderPlaceholder.tsx` — error state when bo is null
- `src/lib/noteRenderer.tsx` — bounded 200-entry render cache
- `src/lib/storage.ts` — TODO comment only

**New:** none.
