import { z } from "zod";
import type { BuildOrder, BuildStep } from "@/types/buildOrder";
import { parseTime } from "@/lib/time";
import { inferVillagerCountFields } from "@/lib/buildOrder";
import {
  aoe4GuidesAtTokenPathToToken,
  capitalizeAoe4GuidesBasename,
  substituteAoe4GuidesBuildKeyword,
} from "./aoe4GuidesIconMap";

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

const parseNum = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : undefined;
};

const numOr = (v: unknown, fallback: number): number => parseNum(v) ?? fallback;

const positiveOrUndefined = (v: unknown): number | undefined => {
  const n = parseNum(v);
  return n !== undefined && n > 0 ? n : undefined;
};

type RawNote = string | { text?: string; note?: string };

/** Top-level dirs we ship under `public/aoe4/`. Used to detect tokens that
 *  are already in our canonical namespace and should round-trip verbatim
 *  (i.e. our own exports re-imported back). */
const INTERNAL_TOKEN_PREFIX = /^(?:images|general|flags|resources|ages)\//;

/**
 * `@path.ext@` icon token converter, shared by RTS_Overlay and aoe4guides
 * clipboard / `.bo` JSON imports. Branches by token shape:
 *   - Bare basename (RTS_Overlay's historical form like `villager.webp`)
 *     → wrap verbatim.
 *   - Path already in our internal namespace (`images/...`, `general/...`,
 *     `flags/...`, `resources/...`, `ages/...`) → wrap verbatim. Lets our
 *     own RTS_Overlay-shaped exports round-trip without canonicalization.
 *   - Other path with `/` (aoe4guides clipboard form like
 *     `unit_worker/villager-japanese.webp`, or legacy aoe4world form like
 *     `unit-french/royal-knight-2.webp`) → translate through the
 *     aoe4guides icon mapper. On a hit, emit our internal `{{...}}` token;
 *     on a miss (e.g. `resource/sheep.webp` — we don't ship that asset),
 *     fall back to a capitalized text label so the meaning isn't lost.
 *     Mirrors the URL importer's `htmlToText` fallback chain.
 *   - Tokens with whitespace inside (`@bad path.png@`) don't match the
 *     regex and pass through unchanged.
 */
const convertIconTokens = (text: string): string =>
  text.includes("@")
    ? text.replace(/@([^@\s]+\.(?:png|webp))@/g, (_whole, path: string) => {
        if (!path.includes("/") || INTERNAL_TOKEN_PREFIX.test(path)) {
          return `{{${path}}}`;
        }
        const mapped = aoe4GuidesAtTokenPathToToken(path);
        return mapped ?? capitalizeAoe4GuidesBasename(path);
      })
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
  // Three-key precedence (first non-undefined wins): canonical camelCase,
  // RTS_Overlay's snake_case, and the all-lowercase variant aoe4guides
  // clipboard exports occasionally emit.
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
  // Three-key precedence (first non-undefined wins): RTS_Overlay's canonical
  // `villager_count`, aoe4guides clipboard's `villagers`, and the camelCase
  // `villagerCount` we emit ourselves on native re-import.
  const importedCount = numOr(raw.villager_count ?? raw.villagers ?? raw.villagerCount, 0);
  const { villagerCount, villagerCountManual } = inferVillagerCountFields(
    resources,
    importedCount,
  );

  return {
    id: crypto.randomUUID(),
    age: clampAge(raw.age),
    villagerCount,
    villagerCountManual,
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

  // aoe4guides clipboard / `.bo` JSON shares this schema but ships a few
  // text-format quirks RTS_Overlay proper doesn't. Detect via source URL
  // and apply the same post-processing the URL importer does in
  // `htmlToText`. Specifically: aoe4guides writes the bare word "build"
  // expecting it to render as their build-marker icon (rally is always
  // emitted as an `<img>`/`@…@` token, but build often isn't).
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
    id: crypto.randomUUID(),
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
};
