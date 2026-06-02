/**
 * Canonical internal schema for AoE4 build orders. Plain serializable data
 * only — no view markup lives here.
 *
 * - `timeSeconds` is canonical seconds from the start of the game. The UI
 *   parses/formats "m:ss" (see `lib/time.ts`); importers normalize to seconds.
 * - `notes` is an array so each note is an independently draggable item.
 * - `Resources.builder` is always present (default 0). The 5th-resource fields
 *   (`oliveOil`, `silver`) are optional and only set for civs that use them.
 */

export type Resources = {
  food: number;
  wood: number;
  gold: number;
  stone: number;
  builder: number;
  /** Byzantines, Ayyubids. */
  oliveOil?: number;
  /** Macedonian Dynasty. */
  silver?: number;
};

export type ResourceKey = keyof Resources;

export type Age = 1 | 2 | 3 | 4;

export type BuildNote = {
  id: string;
  text: string;
};

export type BuildTag = {
  id: string;
  unit: string;
  location: string;
};

export type BuildStep = {
  id: string;
  age: Age;
  villagerCount: number;
  /**
   * When true, `villagerCount` is user-edited and not auto-synced from the
   * resource breakdown. When false/undefined, it mirrors the resource sum.
   */
  villagerCountManual?: boolean;
  /**
   * When true, the editor and overlay render `?` for this step's builders and
   * total villagers. The underlying numbers are preserved across toggles.
   */
  buildersUnknown?: boolean;
  resources: Resources;
  /** Canonical seconds from the start of the game. */
  timeSeconds?: number;
  /**
   * Optional prerequisite to act on this step (e.g. "400 food, 200 gold to age
   * up"). Supports the same `{{path/to/icon.webp}}` inline icon tokens as notes.
   */
  prerequisite?: string;
  notes: BuildNote[];
  /** Optional unit-position tags answering "where should my <unit> be?". */
  tags?: BuildTag[];
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
