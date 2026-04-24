# Iteration 9 — Quality polish pass

No new features. Refinement only across accessibility, mobile touch, performance, error states, and visual polish. No changes to data models, DnD behavior, timer logic, importers, or exporters.

---

## 1. Keyboard accessibility

**`src/index.css`** — add a reusable utility:
```css
@layer utilities {
  .focus-ring {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background;
  }
}
```

**`src/components/editor/StepCard.tsx`**
- Confirm logical Tab order: age select → vils badge/lock toggle → pop input → time input → resource pills L→R → each note (text → delete) → each tag (unit → location → delete) → overflow menu.
- Grip handle stays unfocusable (drag-only).
- Add `.focus-ring` to the lock toggle, delete-note button, delete-tag button, and overflow trigger if missing.
- Ensure "+ Add Step" / "+ Insert Step" / "+ Add Note" buttons render as proper `<button>` and are reachable.

**`src/components/ImportModal.tsx`**
- Tab order: tab triggers → input/textarea → Import button (already correct via DOM order).
- Add `onKeyDown` on the aoe4guides URL `Input`: if `e.key === "Enter" && !loading && urlInput.trim()`, call `handleAoe4GuidesImport()`.
- Escape closes the dialog (already provided by Radix `Dialog`).

**`src/pages/BuildOrderRunner.tsx`**
- Add `.focus-ring` (or inline `focus-visible:ring-2 focus-visible:ring-primary/50`) to prev/next, play/pause, reset, and close buttons so keyboard focus is visible.

**`src/components/library/BuildCard.tsx`**
- Make the card root `tabIndex={0}` with `role="button"`, add `onKeyDown` for Enter/Space → activate primary action (open editor).
- Apply `.focus-ring` to the card and to each action icon (edit/play/delete) so they are individually reachable via Tab.

**`src/pages/Library.tsx`**
- Apply `.focus-ring` to the search input and filter dropdowns (shadcn already includes most of this, only fill in gaps).

**`src/components/NavBar.tsx`**
- Apply `.focus-ring` to the brand link, Library nav link, and theme toggle button.

**Global rule**: any element using `outline-none` without `focus-visible:` replacement gets `.focus-ring` added.

---

## 2. Mobile touch refinement

**`src/components/editor/ResourcePill.tsx`**
- Add `inputMode="numeric"` and `pattern="[0-9]*"` to the numeric input for mobile numeric keyboards.

**`src/components/editor/StepCard.tsx`**
- Note drag handles and step grip: expand hit area to ≥44×44px without altering visible size using a `before:` pseudo-element:
  ```tsx
  className="relative ... before:absolute before:inset-[-12px] before:content-['']"
  ```
- Verify the existing `TouchSensor` 150ms delay still works after these wrappers (no logic change, just confirm visually).

**`src/pages/BuildOrderRunner.tsx`**
- Ensure prev/next/play/pause buttons are `min-h-11 min-w-11` (≥44px).
- Add `touch-action: manipulation` (`className="touch-manipulation"`) on the controls row to prevent double-tap zoom.

**`src/components/ImportModal.tsx`**
- Drop zone copy: change to "Tap to browse or drop a .json file" so it reads correctly on touch (where dragover never fires).

**`src/components/library/BuildCard.tsx`**
- Wrap action icons in a `.action-row` element. CSS:
  ```css
  @media (hover: hover) {
    .group:hover .action-row { opacity: 1; }
    .action-row { opacity: 0; transition: opacity 150ms; }
  }
  @media (hover: none) {
    .action-row { opacity: 1; }
  }
  ```
  Place this in `src/index.css` under a small components layer.

---

## 3. Performance

**`React.memo` wrapping** with custom comparators:
- `src/components/editor/StepCard.tsx` — compare `step.id`, `step` ref, `previousVillagerCount`, `index`.
- `src/components/editor/ResourcePill.tsx` — compare `value`, `iconPath`, error state.
- `NoteRow` (inside `StepCard.tsx`) — compare `note.id`, `note.text`.
- `src/components/editor/StepTags.tsx` — compare `step.tags` by ref, `civId`.

**`src/pages/BuildOrderEditor.tsx`**
- Wrap handlers passed to memoized children with `useCallback` (`setStep`, `deleteStep`, `duplicateStep`, `insertStepAfter`, `addStep`).
- Verify 500ms debounce; if it feels laggy, reduce to 300ms (decision deferred to test).

**`src/lib/noteRenderer.tsx`**
- Add a bounded cache keyed by `text`:
  ```ts
  const cache = new Map<string, ReactNode[]>();
  // inside renderNote: if cache.has(text) return cache.get(text)!;
  // before set: if (cache.size >= 200) cache.delete(cache.keys().next().value as string);
  cache.set(text, out);
  ```

**`src/lib/storage.ts`**
- Add a `// TODO` comment noting future in-memory cache opportunity for `getAllBuildOrders()`. No functional change.

---

## 4. Empty state and error polish

**`src/pages/BuildOrderEditor.tsx`**
- If the build order fails to load, render a card: heading "Build order not found", body "It may have been deleted from another tab or the link is wrong.", primary button → `/`.

**`src/pages/BuildOrderRunner.tsx`**
- Same treatment: "Build not found" with a hint "You can close this window."

**`src/pages/BuildOrderPlaceholder.tsx`**
- When `bo` is null, render the same error card instead of a disabled UI.

**`src/components/ImportModal.tsx`**
- After successful import (inside `applyImport`, before `navigate`), call `toast.success("Build imported successfully")`.

---

## 5. Visual micro-polish

**`src/components/editor/StepCard.tsx`**
- Add `transition-colors duration-200` to the age-colored left border so age changes animate.

**`src/pages/BuildOrderRunner.tsx`**
- Add `transition-all duration-300` to the progress bar fill.

**`src/components/NavBar.tsx`**
- Wrap the sun/moon icon in a span with `transition-transform duration-200` and toggle `rotate-180` based on theme so the swap rotates instead of popping.

**`src/components/CivFlag.tsx`**
- Add `opacity-0` default on the `<img>`; on `onLoad`, set state to add `opacity-100 transition-opacity duration-300`. Falls back gracefully on the gradient placeholder.

**`src/index.css`** — scrollbars:
```css
@layer base {
  * {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted-foreground) / 0.4) transparent;
  }
  *::-webkit-scrollbar { width: 8px; height: 8px; }
  *::-webkit-scrollbar-track { background: transparent; }
  *::-webkit-scrollbar-thumb {
    background-color: hsl(var(--muted-foreground) / 0.4);
    border-radius: 4px;
  }
  *::-webkit-scrollbar-thumb:hover {
    background-color: hsl(var(--primary) / 0.6);
  }
}
```

---

## Files

**Edited**:
- `src/index.css` — `.focus-ring` utility, `.action-row` hover/touch rules, scrollbar styling.
- `src/components/editor/StepCard.tsx` — `React.memo`, tab order, expanded grip hit area, age border transition, useCallback-friendly props.
- `src/components/editor/ResourcePill.tsx` — `React.memo`, `inputMode="numeric"`.
- `src/components/editor/StepTags.tsx` — `React.memo`.
- `src/pages/BuildOrderEditor.tsx` — `useCallback` stabilization, error state.
- `src/pages/BuildOrderRunner.tsx` — focus rings, error state, ≥44px touch targets, `touch-manipulation`, progress transition.
- `src/pages/Library.tsx` — focus rings on search/filters.
- `src/components/library/BuildCard.tsx` — `tabIndex`/Enter activation, `.action-row` wrapper, `React.memo`.
- `src/components/NavBar.tsx` — focus rings, theme icon rotation.
- `src/components/CivFlag.tsx` — image fade-in.
- `src/components/ImportModal.tsx` — Enter-to-submit, success toast, mobile-friendly drop zone copy.
- `src/pages/BuildOrderPlaceholder.tsx` — error state for null `bo`.
- `src/lib/noteRenderer.tsx` — bounded 200-entry cache.
- `src/lib/storage.ts` — `// TODO` cache note only.

**New**: none.

**Untouched**: data models, DnD logic, timer, importers/exporters, civs.ts, theme palette values.
