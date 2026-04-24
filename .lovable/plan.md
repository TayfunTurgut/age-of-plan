# Iteration 7 — Auto-calculated Villager Counts

Make the resource pill row the source of truth for villager counts. `villagerCount` auto-syncs to the sum of all resource assignments unless the user explicitly locks the step into manual mode.

## Schema
**`src/types/buildOrder.ts`** — Add `villagerCountManual?: boolean` to `BuildStep` (default false / undefined = auto).

## Logic
**`src/lib/buildOrder.ts`** — Add:
```ts
export const computeVillagerCount = (r: Resources): number =>
  r.food + r.wood + r.gold + r.stone + r.builder + (r.oliveOil ?? 0) + (r.silver ?? 0);
```

## Editor wiring
**`src/pages/BuildOrderEditor.tsx`**
- In the step-mutation path, after applying changes: if `villagerCountManual !== true`, overwrite `villagerCount` with `computeVillagerCount(resources)`.
- Pass `previousVillagerCount={steps[index - 1]?.villagerCount}` to each `StepCard` (undefined for the first step).

## StepCard UI
**`src/components/editor/StepCard.tsx`**
- Replace the editable "Vils" input with a badge group:
  - **Users icon** (lucide) + count, styled as a pill with subtle background — visually distinct from resource pills.
  - **Lock/Unlock toggle** (lucide `Lock` / `Unlock`) next to the badge.
    - Unlocked (default, auto): badge is read-only display of computed sum.
    - Locked (manual): badge becomes an `InlineText` number input; lock icon highlighted in brass/primary color.
  - **Delta indicator** below the badge when `previousVillagerCount` is defined and delta ≠ 0: `+N` green, `-N` red, small muted text.
- Toggle behavior:
  - unlocked → locked: keep current computed value as the starting manual value (just flips the flag).
  - locked → unlocked: immediately recompute from resources and overwrite.
- `populationCount` input is untouched — it remains a manual field for non-villager units.

## Storage migration
**`src/lib/storage.ts`** — In `safeParse`, for each step:
- If `villagerCountManual` is missing, set to `false`.
- If `villagerCountManual === false` and `villagerCount !== computeVillagerCount(resources)`, recompute in memory.
- No write-back; matches the existing migration-on-read pattern.

## Importers
**`src/lib/importRtsOverlay.ts`** — In the shared `mapStep` (consumed by both importers):
- Compute `computedSum = computeVillagerCount(resources)`.
- Read raw `villager_count` from the source.
- If raw `> 0` and `raw !== computedSum`: keep raw `villagerCount`, set `villagerCountManual = true` (preserve source data).
- Otherwise: set `villagerCount = computedSum`, `villagerCountManual = false`.

`src/lib/importAoe4Guides.ts` inherits this through `mapStep` — no edits needed.

## Untouched
DnD, runner timer, export logic, theme, nav, library, civs.ts, populationCount input behavior. No Supabase or server calls.

## Files
- **Edited**: `src/types/buildOrder.ts`, `src/lib/buildOrder.ts`, `src/lib/storage.ts`, `src/lib/importRtsOverlay.ts`, `src/components/editor/StepCard.tsx`, `src/pages/BuildOrderEditor.tsx`
- **New**: none
