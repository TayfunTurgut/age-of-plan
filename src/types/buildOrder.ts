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

export type ResourceKey = keyof Resources;

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
  /**
   * When true, the editor and overlay render `?` for both this step's
   * builders count and total villagers count. The underlying numbers in
   * `resources.builder` and `villagerCount` are preserved across toggles.
   */
  buildersUnknown?: boolean;
  resources: Resources;
  /** Canonical seconds from the start of the game. */
  timeSeconds?: number;
  /**
   * Optional prerequisite — what the player needs at this point to be
   * able to act on this step (e.g. "400 food, 200 gold to age up").
   * Supports the same `{{path/to/icon.webp}}` inline icon tokens as
   * notes. Renders at the top of the step's notes/tags block.
   */
  prerequisite?: string;
  notes: { id: string; text: string }[];
  /**
   * Optional unit-position tags answering "where should my <unit> be?".
   * Both `unit` and `location` accept free text; the editor offers
   * civ-aware autocomplete from `src/data/tagPresets.ts`.
   */
  tags?: { id: string; unit: string; location: string }[];
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
