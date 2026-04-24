/**
 * Presets for the step-tag editor (unit/location autocomplete).
 *
 * Tags answer "where should my <unit> be at this step?" — e.g. King at
 * Food (Sheep), Khan at Scouting (Map). Both fields accept free text;
 * these lists drive the autocomplete suggestions only.
 */

export const COMMON_UNITS = ["Scout", "Villager"] as const;

/** Civ-specific signature units, keyed by civ id from `src/data/civs.ts`. */
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
  const civSpecific = UNIT_PRESETS[civId] ?? [];
  return Array.from(new Set([...COMMON_UNITS, ...civSpecific]));
};
