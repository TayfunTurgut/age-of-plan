# Iteration 8 — Step tags ("Where is my X?")

Add an optional `tags` array to each `BuildStep` that records where key units (King, Scout, Khan, etc.) should be at that point. Editor lets the user add `[Unit] → [Location]` rows with civ-aware autocomplete; runner shows them read-only on the current step.

## 1. Schema — `src/types/buildOrder.ts`
Add to `BuildStep`:
```ts
tags?: { id: string; unit: string; location: string }[];
```
Optional; undefined on legacy steps. No other type changes.

## 2. Presets — `src/data/tagPresets.ts` (new)
```ts
export const COMMON_UNITS = ["Scout", "Villager"] as const;

export const UNIT_PRESETS: Record<string, string[]> = {
  english: ["King"],
  "house-of-lancaster": ["King"],
  hre: ["Prelate"],
  "order-of-the-dragon": ["Prelate", "Gilded Villager"],
  mongols: ["Khan"],
  "golden-horde": ["Khan"],
  chinese: ["Imperial Official"],
  "zhu-xi": ["Imperial Official"],
  rus: ["Warrior Monk"],
  delhi: ["Scholar"],
  tughluqid: ["Scholar"],
  japanese: ["Shinobi"],
  "sengoku-daimyo": ["Shinobi"],
  "jeanne-darc": ["Jeanne d'Arc"],
};

export const LOCATION_PRESETS: string[] = [
  "Food (Sheep)", "Food (Berries)", "Food (Boar/Deer)", "Food (Farm)",
  "Wood", "Gold", "Stone",
  "Build (Landmark)", "Build (House)", "Build (Military)",
  "Scouting (Enemy base)", "Scouting (Map)",
  "Idle", "Garrison", "Frontline", "Home base",
];

export const getUnitPresets = (civId: string): string[] => {
  const civ = UNIT_PRESETS[civId] ?? [];
  return Array.from(new Set([...COMMON_UNITS, ...civ]));
};
```

## 3. Tag editor — `src/components/editor/StepTags.tsx` (new)
Props: `{ step: BuildStep; civId: string; onUpdate: (tags: BuildStep["tags"]) => void }`.

Layout:
- Container with small heading hint (visually subtle, no big label — keeps card compact).
- Rows: each tag is a flex pill `[Unit ⌄] → [Location ⌄] [×]`.
- Pill style: `inline-flex` rounded-full, **muted teal** (`bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30`) — distinct from brass resources and plain notes. The two fields share the pill; `→` separator is a `text-teal-500/70` arrow.
- `+ Add Tag` ghost button below the rows; mirrors `+ Add Note` styling but in the tag color family. Appends `{ id: crypto.randomUUID(), unit: "", location: "" }` and focuses the unit field on the new row.

Each field is an autocomplete combobox built with `@/components/ui/popover` + `@/components/ui/command` (cmdk):
- Trigger renders as an inline-editable text span (mirrors `InlineText` look) showing current value or placeholder ("Unit…" / "Location…").
- Opening shows a `Command` list filtered by the typed value over the preset list (`getUnitPresets(civId)` for unit, `LOCATION_PRESETS` for location).
- `CommandEmpty` shows "Use \"<typed>\"" — pressing Enter or clicking commits the free-text value (custom values allowed).
- Commit on item-select, Enter, or blur. Escape reverts.
- One small reusable internal component `TagCombobox` keeps both fields DRY.

Delete (`×`) removes the tag immediately, no confirm.

`onUpdate` is called with the full new tags array on every commit/add/delete.

## 4. StepCard wiring — `src/components/editor/StepCard.tsx`
- Import `StepTags`.
- Accept new prop `civId: string` (passed through from editor — already have `civ` but `civId` is what `StepTags` needs; pass `civ?.id ?? ""`).
- Render `<StepTags step={step} civId={civ?.id ?? ""} onUpdate={(tags) => update({ tags })} />` directly **below the notes block** (after the `+ Add Note` button, still inside the same right-hand column).
- Update `stepHasContent` to also return `true` when `(s.tags?.length ?? 0) > 0` and any tag has a non-empty unit or location — prevents the "delete with content" prompt from triggering on a row of empty placeholder tags.

## 5. Editor — `src/pages/BuildOrderEditor.tsx`
No structural changes. The existing `setStep` path already flows updates through autosave + auto-compute; tag edits ride along because `StepTags` calls `onUpdate` which `StepCard` translates into `update({ tags })` → `onChange(step)` → `setStep`. Auto-villager-compute is unaffected (it only reads resources).

## 6. Runner — `src/pages/BuildOrderRunner.tsx`
After the notes `<ul>` in the current step card, render a "Positions" block when `(step.tags?.length ?? 0) > 0`:
- Small muted heading "Positions" (`text-[11px] uppercase tracking-wide text-muted-foreground`).
- Below it, a flex-wrap row of read-only badges using the same teal pill style as the editor: `Unit → Location`. Skip tags whose unit AND location are both empty.
- Compact spacing, no interactivity, no edit affordance.

## 7. Storage / import / export
- `src/lib/storage.ts`: no migration. `tags` is optional; existing `safeParse` passes through unknown fields fine if it spreads; if it constructs strict objects, ensure `tags: raw.tags` (or omit) is preserved. **Action item during build:** verify `safeParse` doesn't strip the field, add `tags: Array.isArray(raw.tags) ? raw.tags : undefined` if it does.
- `src/lib/importRtsOverlay.ts` / `src/lib/importAoe4Guides.ts`: no changes — `mapStep` doesn't set `tags`, leaves it `undefined`.
- `src/lib/exportBuildOrder.ts`: no changes. JSON export serializes the full schema as-is; RTS_Overlay export already maps a fixed set of fields and ignores `tags`.

## 8. Untouched
DnD (steps + notes), runner timer, auto-villager-compute, theme, nav, library, civs.ts, populationCount, ResourcePill, exporters. No Supabase, no server.

## Files
- **New**: `src/data/tagPresets.ts`, `src/components/editor/StepTags.tsx`
- **Edited**: `src/types/buildOrder.ts`, `src/components/editor/StepCard.tsx`, `src/pages/BuildOrderRunner.tsx`, possibly `src/lib/storage.ts` (only if `safeParse` strips unknown fields — verify on read)
- **Not edited**: importers, exporters, editor page, DnD, timer
