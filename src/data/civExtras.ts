import type { ResourceKey } from "@/types/buildOrder";

/**
 * Civs that use a 5th resource alongside food/wood/gold/stone/builder.
 * Single source of truth for both the editor/overlay (which renders the
 * extra resource pill) and `scripts/sync-aoe4-data.ts` (which gates the
 * corresponding icon-catalog entry to the same civs).
 *
 * Add a new entry here when a future civ ships with a fifth resource.
 */
export const EXTRA_RESOURCES_BY_CIV: Readonly<Record<string, readonly ResourceKey[]>> = {
  byzantines: ["oliveOil"],
  ayyubids: ["oliveOil"],
  macedonian: ["silver"],
};

export const getExtraResources = (civId: string | undefined): readonly ResourceKey[] =>
  (civId && EXTRA_RESOURCES_BY_CIV[civId]) || [];
