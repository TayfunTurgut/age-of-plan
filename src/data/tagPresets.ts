/**
 * Presets for the step-tag editor (unit/location autocomplete).
 *
 * Tags answer "where should my <unit> be at this step?" — e.g. King at
 * Food (Sheep), Khan at Scouting (Map). Both fields accept free text;
 * these lists drive the autocomplete suggestions only.
 *
 * Unit suggestions come from each civ's unique-unit list in the generated
 * civData (sourced from aoe4world). Common units like Scout / Villager are
 * appended for every civ.
 */

import { CIV_DATA } from "./generated/civData";

export const COMMON_UNITS = ["Scout", "Villager"] as const;

export const LOCATION_PRESETS: string[] = [
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

export const getUnitPresets = (civId: string): string[] => {
  const civ = CIV_DATA.find((c) => c.id === civId);
  const unique = civ?.uniqueUnits ?? [];
  return Array.from(new Set([...COMMON_UNITS, ...unique]));
};
