
## Iteration 4 — Drag-and-drop notes (within and between steps)

### 1. Notes data model — `src/types/buildOrder.ts`
Change `BuildStep.notes` from `string[]` to:
```ts
notes: { id: string; text: string }[];
```

### 2. Factory — `src/lib/buildOrder.ts`
`createEmptyStep` already returns `notes: []`; just confirm the type matches the new shape. No logic change.

### 3. Storage migration — `src/lib/storage.ts`
In `safeParse` (the single read path used by both `getBuildOrder` and `getAllBuildOrders`), after the basic shape check, walk `parsed.steps` and for each step:
- If `step.notes` contains any plain strings, map each entry to `{ id: crypto.randomUUID(), text: s }`; leave already-shaped entries alone.

Returned object is migrated in memory only — never written back. Next user edit triggers natural autosave.

### 4. `StepCard.tsx` — note SortableContext + grip handles
- Wrap the notes list in a `SortableContext` keyed by `note.id` (vertical strategy). The container `div` gets a `useDroppable` with id `notes:<step.id>` so empty steps are still valid drop targets.
- Extract a `NoteRow` subcomponent that calls `useSortable({ id: note.id, data: { type: "note", noteId: note.id, sourceStepId: step.id } })`. Layout:
  - Mini `GripVertical` handle (`h-6 w-4 text-muted-foreground/50`) — only this binds drag listeners.
  - Existing inline text input (unchanged behaviour).
  - Existing X delete button (unchanged).
  - When `isDragging`, render a `border-dashed border-primary/40` placeholder in place.
- The step's own `useSortable` call gains `data: { type: "step", stepId: step.id }`.
- Note handlers (`setNote`, `deleteNote`, `addNote`) updated for the new object shape; `addNote` creates `{ id: crypto.randomUUID(), text: "" }` and auto-focuses on empty text.
- `stepHasContent` updated to read `n.text.trim()`.
- Empty-notes drop zone: when `step.notes.length === 0`, render a min-height dashed-border block reading "Drop notes here" (muted). Container gets a faint brass border (`ring-1 ring-primary/30`) when a foreign note is hovering — driven by an `isOverForeignNote` prop passed from the editor.

### 5. `BuildOrderEditor.tsx` — dual-type DndContext
- Single `DndContext` keeps step-level `SortableContext` as today.
- Track `activeType: "step" | "note" | null` and `overContainerId: string | null` in `useState`; `activeContainerRef = useRef<string | null>(null)` to dedupe `onDragOver` updates.
- `onDragStart`: read `active.data.current.type`, set `activeType` and (for notes) `activeContainerRef.current = "notes:" + sourceStepId`.
- `onDragOver`: if `activeType === "note"`, resolve the over container from `over.data.current` (note → its `sourceStepId`) or `over.id` (droppable container id `notes:<stepId>`). If it differs from `activeContainerRef.current`, optimistically move the dragged note out of the source step's `notes` and append to the target step's `notes`, then update the ref + `overContainerId` state (used to drive the brass border on the hovered step).
- `onDragEnd`:
  - `type === "step"`: existing `arrayMove` logic on `bo.steps`.
  - `type === "note"`: locate the note's current step (post-`onDragOver`) and reorder within that step's `notes` array using `arrayMove` based on `over.id`. Clear `activeType`, `overContainerId`, ref.
- `onDragCancel`: reset all drag state. Note: because `onDragOver` mutates state optimistically, cancel should restore from a snapshot taken in `onDragStart` (`startSnapshotRef = useRef<BuildStep[] | null>(null)`).
- `DragOverlay`:
  - `step` → existing semi-transparent `StepCard` clone.
  - `note` → compact pill: muted background, single-line truncated text, mini grip icon. Smaller than a step card.
- Pass `overContainerId` down to each `StepCard` so it can highlight when a foreign note is hovering.

### 6. Visual polish
- Dragging note source: dashed brass placeholder (`border border-dashed border-primary/40 bg-transparent`).
- Foreign-note hover on step: notes container gets `ring-1 ring-primary/40` transition.
- Empty notes drop zone: `min-h-12 rounded-md border border-dashed border-border text-xs text-muted-foreground/70` centered text.

### Out of scope
- Runner/timer, import/export, icon-token rendering, `civs.ts`, civ picker, civ detail. Step drag UX unchanged — only handler internals gain type discrimination. No Supabase/server.

### File summary
- **Edited**: `src/types/buildOrder.ts`, `src/lib/buildOrder.ts`, `src/lib/storage.ts`, `src/pages/BuildOrderEditor.tsx`, `src/components/editor/StepCard.tsx`.
- **No new files.**
