/**
 * Presets for the step-tag editor (unit/location autocomplete). Tags answer
 * "where should my <unit> be at this step?" — e.g. King at Food (Sheep). Both
 * fields accept free text; these lists drive autocomplete suggestions only.
 *
 * Unit suggestions come from each civ's unique-unit list in the generated
 * civData; common units (Scout / Villager) are appended for every civ.
 */
import { CIV_DATA } from "./generated/civData";

export const COMMON_UNITS = ["Scout", "Villager"] as const;

export const LOCATION_PRESETS: readonly string[] = [
  "Food (Sheep)",
  "Food (Berries)",
  "Food (Boar/Deer)",
  "Food (Farm)",
  "Wood",
  "Gold",
  "Stone",
  "Build (Landmark)",
  "Build (House)",
  "Build (Military)",
  "Scouting (Enemy base)",
  "Scouting (Map)",
  "Idle",
  "Garrison",
  "Frontline",
  "Home base",
];

export function getUnitPresets(civId: string): string[] {
  const civ = CIV_DATA.find((c) => c.id === civId);
  const unique = civ?.uniqueUnits ?? [];
  return Array.from(new Set<string>([...COMMON_UNITS, ...unique]));
}
