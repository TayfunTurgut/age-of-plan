import { z } from "zod";
import type { BuildOrder, BuildStep } from "@/types/buildOrder";
import { parseTime } from "@/lib/time";
import { computeVillagerCount } from "@/lib/buildOrder";

/**
 * RTS_Overlay JSON import + canonical civ name round-trip support.
 *
 * The display-name map and `civIdToDisplayName` are also used by
 * `exportBuildOrder.ts` so RTS_Overlay can recognize the civilization on
 * re-import at rts-overlay.github.io.
 */

/** Internal civ id → canonical RTS_Overlay display name. */
export const CIV_DISPLAY_NAMES: Record<string, string> = {
  english: "English",
  french: "French",
  hre: "Holy Roman Empire",
  mongols: "Mongols",
  rus: "Rus",
  chinese: "Chinese",
  delhi: "Delhi Sultanate",
  abbasid: "Abbasid Dynasty",
  ottomans: "Ottomans",
  malians: "Malians",
  byzantines: "Byzantines",
  japanese: "Japanese",
  ayyubids: "Ayyubids",
  "zhu-xi": "Zhu Xi's Legacy",
  "jeanne-darc": "Jeanne d'Arc",
  "order-of-the-dragon": "Order of the Dragon",
  "knights-templar": "Knights Templar",
  "house-of-lancaster": "House of Lancaster",
  "golden-horde": "Golden Horde",
  macedonian: "Macedonian Dynasty",
  "sengoku-daimyo": "Sengoku Daimyo",
  tughluqid: "Tughluqid Dynasty",
};

export const civIdToDisplayName = (id: string): string => CIV_DISPLAY_NAMES[id] ?? id;

/** Strip diacritics, apostrophes, and lowercase for resilient matching. */
const normalizeKey = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`]/g, "")
    .trim()
    .toLowerCase();

/** Common aliases for each civ. Keys are normalized via normalizeKey. */
const CIV_ALIASES: Record<string, string> = {
  english: "english",
  french: "french",
  hre: "hre",
  "holy roman empire": "hre",
  mongols: "mongols",
  rus: "rus",
  chinese: "chinese",
  delhi: "delhi",
  "delhi sultanate": "delhi",
  abbasid: "abbasid",
  "abbasid dynasty": "abbasid",
  ottomans: "ottomans",
  malians: "malians",
  byzantines: "byzantines",
  japanese: "japanese",
  ayyubids: "ayyubids",
  "zhu xi": "zhu-xi",
  "zhu xis legacy": "zhu-xi",
  "zhu xi legacy": "zhu-xi",
  zhuxi: "zhu-xi",
  jeanne: "jeanne-darc",
  "jeanne darc": "jeanne-darc",
  "jeanne d arc": "jeanne-darc",
  jeannedarc: "jeanne-darc",
  "order of the dragon": "order-of-the-dragon",
  "knights templar": "knights-templar",
  templar: "knights-templar",
  "house of lancaster": "house-of-lancaster",
  lancaster: "house-of-lancaster",
  "golden horde": "golden-horde",
  macedonian: "macedonian",
  macedonians: "macedonian",
  "macedonian dynasty": "macedonian",
  "sengoku daimyo": "sengoku-daimyo",
  sengoku: "sengoku-daimyo",
  tughluqid: "tughluqid",
  "tughluqid dynasty": "tughluqid",
  tughlaq: "tughluqid",
  "tughlaq dynasty": "tughluqid",

  // aoe4world 2-letter civ codes — recognized so imports that smuggle in
  // raw codes (e.g. older aoe4guides exports) still resolve correctly.
  ab: "abbasid",
  ay: "ayyubids",
  by: "byzantines",
  ch: "chinese",
  de: "delhi",
  en: "english",
  fr: "french",
  gol: "golden-horde",
  hl: "house-of-lancaster",
  hr: "hre",
  ja: "japanese",
  je: "jeanne-darc",
  kt: "knights-templar",
  ma: "malians",
  mac: "macedonian",
  mo: "mongols",
  od: "order-of-the-dragon",
  ot: "ottomans",
  ru: "rus",
  sen: "sengoku-daimyo",
  tug: "tughluqid",
  zx: "zhu-xi",
};

export const normalizeCivId = (rawCiv: string): string => {
  if (!rawCiv) return "unknown";
  const key = normalizeKey(rawCiv);
  return CIV_ALIASES[key] ?? "unknown";
};

const clampAge = (a: unknown): 1 | 2 | 3 | 4 => {
  const n = typeof a === "number" ? a : parseInt(String(a ?? ""), 10);
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  return 1;
};

const numOr = (v: unknown, fallback: number): number => {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
};

const positiveOrUndefined = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

type RawNote = string | { text?: string; note?: string };

/** RTS_Overlay icon token syntax `@path.ext@` → our internal `{{path.ext}}`. */
const convertIconTokens = (text: string): string =>
  text.includes("@")
    ? text.replace(/@([^@\s]+\.(?:png|webp))@/g, "{{$1}}")
    : text;

const mapNotes = (raw: unknown): { id: string; text: string }[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((n: RawNote) => {
      if (typeof n === "string") return n;
      if (n && typeof n === "object") return String(n.text ?? n.note ?? "");
      return "";
    })
    .filter((t) => t.length > 0)
    .map((text) => ({ id: crypto.randomUUID(), text: convertIconTokens(text) }));
};

type RawResources = Record<string, unknown>;

const mapResources = (raw: RawResources | undefined) => {
  const r = raw ?? {};
  const resources: BuildStep["resources"] = {
    food: numOr(r.food, 0),
    wood: numOr(r.wood, 0),
    gold: numOr(r.gold, 0),
    stone: numOr(r.stone, 0),
    builder: numOr(r.builder, 0),
  };
  const oliveOil = positiveOrUndefined(r.oliveOil ?? r.olive_oil ?? r.oliveoil);
  if (oliveOil !== undefined) resources.oliveOil = oliveOil;
  const silver = positiveOrUndefined(r.silver);
  if (silver !== undefined) resources.silver = silver;
  return resources;
};

/**
 * Loose zod schemas. Like the aoe4guides importer we only guard the top-level
 * shape; field-level parsing stays forgiving because RTS_Overlay exports in
 * the wild mix string and numeric types, alias keys, and sometimes omit fields.
 */
const RawStepSchema = z
  .object({
    age: z.unknown(),
    villager_count: z.unknown(),
    villagers: z.unknown(),
    villagerCount: z.unknown(),
    population_count: z.unknown(),
    populationCount: z.unknown(),
    resources: z.record(z.string(), z.unknown()).optional(),
    time: z.unknown(),
    time_seconds: z.unknown(),
    timeSeconds: z.unknown(),
    notes: z.unknown(),
  })
  .partial()
  .passthrough();

type RawStep = z.infer<typeof RawStepSchema>;

/** Step mapper shared by both importers. */
export const mapStep = (raw: RawStep): BuildStep => {
  const populationRaw = raw.population_count ?? raw.populationCount;
  const populationCount =
    populationRaw === undefined || populationRaw === null || populationRaw === -1
      ? undefined
      : numOr(populationRaw, 0);

  let timeSeconds: number | undefined;
  if (typeof raw.time === "string") {
    const parsed = parseTime(raw.time);
    if (parsed !== null) timeSeconds = parsed;
  } else if (typeof raw.time === "number" && Number.isFinite(raw.time)) {
    timeSeconds = raw.time;
  } else if (typeof raw.time_seconds === "number") {
    timeSeconds = raw.time_seconds;
  } else if (typeof raw.timeSeconds === "number") {
    timeSeconds = raw.timeSeconds;
  }

  const resources = mapResources(raw.resources);
  const importedCount = numOr(raw.villager_count ?? raw.villagers ?? raw.villagerCount, 0);
  const computedSum = computeVillagerCount(resources);
  // Preserve source-of-truth when a hand-authored count diverges from the
  // resource breakdown (common for aoe4guides). Otherwise keep auto-mode.
  const villagerCountManual = importedCount > 0 && importedCount !== computedSum;
  const villagerCount = villagerCountManual ? importedCount : computedSum;

  return {
    id: crypto.randomUUID(),
    age: clampAge(raw.age),
    villagerCount,
    villagerCountManual,
    populationCount,
    resources,
    timeSeconds,
    notes: mapNotes(raw.notes),
  };
};

const RawRtsOverlaySchema = z
  .object({
    name: z.string().optional(),
    title: z.string().optional(),
    civilization: z.string().optional(),
    civ: z.string().optional(),
    author: z.string().optional(),
    source: z.string().optional(),
    description: z.string().optional(),
    matchup: z.string().optional(),
    build_order: z.array(RawStepSchema),
  })
  .passthrough();

export type RawRtsOverlay = z.infer<typeof RawRtsOverlaySchema>;

export const parseRtsOverlayJson = (json: string): BuildOrder => {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    throw new Error(`Invalid JSON: ${msg}`);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid JSON: expected an object at the top level.");
  }

  const result = RawRtsOverlaySchema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    // Surface the missing `build_order` case with its original wording so
    // downstream error-handling (and its tests) can key on it.
    if (issue && issue.path.join(".") === "build_order") {
      throw new Error("Missing build_order array.");
    }
    throw new Error(`Invalid RTS_Overlay JSON: ${issue?.message ?? "unknown validation error"}`);
  }
  const parsed = result.data;

  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: String(parsed.name ?? parsed.title ?? "Imported build"),
    civilization: normalizeCivId(String(parsed.civilization ?? parsed.civ ?? "")),
    author: parsed.author ? String(parsed.author) : "",
    source: parsed.source ? String(parsed.source) : "",
    description: parsed.description ? String(parsed.description) : "",
    matchup: parsed.matchup ? String(parsed.matchup) : "",
    createdAt: now,
    updatedAt: now,
    steps: parsed.build_order.map(mapStep),
  };
};
