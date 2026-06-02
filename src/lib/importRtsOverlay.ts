import { z } from "zod";

import { inferVillagerCountFields } from "@/lib/buildOrder";
import { newId } from "@/lib/id";
import { parseTime } from "@/lib/time";
import type { BuildOrder, BuildStep } from "@/types/buildOrder";
import {
  aoe4GuidesAtTokenPathToToken,
  capitalizeAoe4GuidesBasename,
  substituteAoe4GuidesBuildKeyword,
} from "./aoe4GuidesIconMap";

/**
 * RTS_Overlay JSON import + canonical civ-name round-trip support. The
 * display-name map and `civIdToDisplayName` are also used by the exporter so
 * RTS_Overlay recognizes the civilization on re-import.
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

export const civIdToDisplayName = (id: string): string =>
  CIV_DISPLAY_NAMES[id] ?? id;

/** Strip diacritics, apostrophes, and lowercase for resilient matching. */
function normalizeKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['‘’`]/g, "")
    .trim()
    .toLowerCase();
}

/** Common aliases for each civ, plus aoe4world 2-letter codes. Keys are normalized. */
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

  // aoe4world 2-letter civ codes — recognized so imports that smuggle in raw
  // codes (older aoe4guides exports) still resolve.
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

export function normalizeCivId(rawCiv: string): string {
  if (!rawCiv) return "unknown";
  return CIV_ALIASES[normalizeKey(rawCiv)] ?? "unknown";
}

function clampAge(a: unknown): 1 | 2 | 3 | 4 {
  const n = typeof a === "number" ? a : parseInt(String(a ?? ""), 10);
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  return 1;
}

function parseNum(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : undefined;
}

const numOr = (v: unknown, fallback: number): number => parseNum(v) ?? fallback;

function positiveOrUndefined(v: unknown): number | undefined {
  const n = parseNum(v);
  return n !== undefined && n > 0 ? n : undefined;
}

/** Top-level dirs we ship under public/aoe4/, used to detect tokens already in
 *  our canonical namespace (i.e. our own exports re-imported). */
const INTERNAL_TOKEN_PREFIX = /^(?:images|general|flags|resources|ages)\//;

/**
 * `@path.ext@` icon-token converter shared by RTS_Overlay and aoe4guides
 * clipboard/`.bo` JSON. Bare basenames and already-internal paths wrap
 * verbatim; other paths translate through the aoe4guides mapper, falling back
 * to a capitalized text label on a miss; whitespace tokens pass through.
 */
function convertIconTokens(text: string): string {
  if (!text.includes("@")) return text;
  return text.replace(/@([^@\s]+\.(?:png|webp))@/g, (_whole, path: string) => {
    if (!path.includes("/") || INTERNAL_TOKEN_PREFIX.test(path)) {
      return `{{${path}}}`;
    }
    const mapped = aoe4GuidesAtTokenPathToToken(path);
    return mapped ?? capitalizeAoe4GuidesBasename(path);
  });
}

type RawNote = string | { text?: string; note?: string };

function mapNotes(raw: unknown): { id: string; text: string }[] {
  if (!Array.isArray(raw)) return [];
  return (raw as RawNote[])
    .map((n) => {
      if (typeof n === "string") return n;
      if (n && typeof n === "object") return String(n.text ?? n.note ?? "");
      return "";
    })
    .filter((t) => t.length > 0)
    .map((text) => ({ id: newId(), text: convertIconTokens(text) }));
}

function mapResources(raw: Record<string, unknown> | undefined): BuildStep["resources"] {
  const r = raw ?? {};
  const resources: BuildStep["resources"] = {
    food: numOr(r.food, 0),
    wood: numOr(r.wood, 0),
    gold: numOr(r.gold, 0),
    stone: numOr(r.stone, 0),
    builder: numOr(r.builder, 0),
  };
  // First non-undefined wins: canonical camelCase, RTS_Overlay snake_case,
  // aoe4guides all-lowercase.
  const oliveOil = positiveOrUndefined(r.oliveOil ?? r.olive_oil ?? r.oliveoil);
  if (oliveOil !== undefined) resources.oliveOil = oliveOil;
  const silver = positiveOrUndefined(r.silver);
  if (silver !== undefined) resources.silver = silver;
  return resources;
}

/** Loose schema: only the top-level shape is guarded; field parsing stays
 *  forgiving because RTS_Overlay exports mix string/number types and alias keys. */
const RawStepSchema = z
  .object({
    age: z.unknown(),
    villager_count: z.unknown(),
    villagers: z.unknown(),
    villagerCount: z.unknown(),
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
export function mapStep(raw: RawStep): BuildStep {
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
  // First non-undefined wins: RTS_Overlay villager_count, aoe4guides villagers,
  // native re-import villagerCount.
  const importedCount = numOr(
    raw.villager_count ?? raw.villagers ?? raw.villagerCount,
    0,
  );
  const { villagerCount, villagerCountManual } = inferVillagerCountFields(
    resources,
    importedCount,
  );

  return {
    id: newId(),
    age: clampAge(raw.age),
    villagerCount,
    villagerCountManual,
    resources,
    timeSeconds,
    notes: mapNotes(raw.notes),
  };
}

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

export function parseRtsOverlayJson(json: string): BuildOrder {
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
    if (issue && issue.path.join(".") === "build_order") {
      throw new Error("Missing build_order array.");
    }
    throw new Error(
      `Invalid RTS_Overlay JSON: ${issue?.message ?? "unknown validation error"}`,
    );
  }
  const parsed = result.data;

  // aoe4guides clipboard/`.bo` JSON shares this schema but writes the bare word
  // "build" expecting its build-marker icon. Detect via the source URL and
  // apply the same post-processing the URL importer does.
  const sourceStr = parsed.source ? String(parsed.source) : "";
  const isAoe4Guides = sourceStr.includes("aoe4guides.com");

  const now = Date.now();
  const steps = parsed.build_order.map(mapStep);
  if (isAoe4Guides) {
    for (const step of steps) {
      for (const note of step.notes) {
        note.text = substituteAoe4GuidesBuildKeyword(note.text);
      }
    }
  }

  return {
    id: newId(),
    name: String(parsed.name ?? parsed.title ?? "Imported build"),
    civilization: normalizeCivId(String(parsed.civilization ?? parsed.civ ?? "")),
    author: parsed.author ? String(parsed.author) : "",
    source: sourceStr,
    description: parsed.description ? String(parsed.description) : "",
    matchup: parsed.matchup ? String(parsed.matchup) : "",
    createdAt: now,
    updatedAt: now,
    steps,
  };
}
