/**
 * Internal canonical schema for AoE4 build orders.
 *
 * Notes:
 * - `timeSeconds` is canonical seconds. The future RTS_Overlay converter must
 *   parse "m:ss" strings into seconds; the aoe4guides converter passes the
 *   integer seconds field straight through.
 * - `notes` is an array so the future drag-and-drop editor can treat each
 *   note as a discrete draggable item (matching the source-of-truth shape
 *   used by aoe4guides and RTS_Overlay).
 * - `Resources.builder` is always present (default 0). The 5th-resource
 *   fields (`oliveOil`, `silver`) are optional and only set for civs that
 *   use them.
 */

export type Resources = {
  food: number;
  wood: number;
  gold: number;
  stone: number;
  builder: number;
  /** Byzantines, Ayyubids */
  oliveOil?: number;
  /** Macedonian Dynasty */
  silver?: number;
};

export type BuildStep = {
  id: string;
  age: 1 | 2 | 3 | 4;
  villagerCount: number;
  /**
   * When true, `villagerCount` is user-edited and not auto-synced from the
   * resource breakdown. When false/undefined, `villagerCount` mirrors the
   * sum of all resource assignments.
   */
  villagerCountManual?: boolean;
  populationCount?: number;
  resources: Resources;
  /** Canonical seconds from the start of the game. */
  timeSeconds?: number;
  notes: { id: string; text: string }[];
};

export type BuildOrder = {
  id: string;
  name: string;
  /** Civ id from `src/data/civs.ts`. */
  civilization: string;
  /** e.g. "vs French", "Open map", "Team game flank". */
  matchup?: string;
  author?: string;
  source?: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  steps: BuildStep[];
};
