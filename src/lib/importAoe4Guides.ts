import { z } from "zod";
import type { BuildOrder, BuildStep, Resources } from "@/types/buildOrder";
import { normalizeCivId } from "./importRtsOverlay";
import { parseTime } from "@/lib/time";
import { computeVillagerCount } from "@/lib/buildOrder";
import {
  aoe4GuidesSrcToToken,
  capitalizeAoe4GuidesBasename,
  substituteAoe4GuidesBuildKeyword,
} from "./aoe4GuidesIconMap";

/**
 * aoe4guides.com REST API import.
 *
 * The public API at https://aoe4guides.com/api/builds/{id} returns a
 * structure that's quite different from RTS_Overlay:
 *   - Top-level `steps` is an array of *age groups*, each with its own
 *     nested `steps` array and an `age` (1-4) plus `type` ("age" | "ageUp").
 *   - Each leaf step has resource fields as top-level strings
 *     (`food`, `wood`, `gold`, `stone`, `builders`, `villagers`).
 *   - `description` is a single HTML string containing `<img>` icons and
 *     `<br>`s; we strip tags into plain text.
 *   - `time` is "m:ss" or "mm:ss".
 *   - `civ` is a 3-letter code like "ENG", "FRE", "HRE".
 */

/** Match a 20-char Firestore-style document id. */
const ID_RE = /^[A-Za-z0-9]{20}$/;

export const extractAoe4GuidesId = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.includes("aoe4guides.com")) {
    // Accept both /build/<id> and /builds/<id>.
    const m = trimmed.match(/\/builds?\/([A-Za-z0-9]{20})/);
    return m ? m[1] : null;
  }
  return ID_RE.test(trimmed) ? trimmed : null;
};

/** Map aoe4guides civ codes to our internal ids. The codes the live
 *  aoe4guides site emits today are listed first; the older 2-letter forms
 *  (KT/OOD/GH/SD) are kept as legacy fallbacks so any historical export
 *  still resolves. ANY = civ-agnostic guide → leave unknown so the user
 *  picks one manually after import. */
const CIV_CODE_MAP: Record<string, string> = {
  ENG: "english",
  FRE: "french",
  HRE: "hre",
  MON: "mongols",
  RUS: "rus",
  CHI: "chinese",
  DEL: "delhi",
  ABB: "abbasid",
  OTT: "ottomans",
  MAL: "malians",
  BYZ: "byzantines",
  JAP: "japanese",
  AYY: "ayyubids",
  ZXL: "zhu-xi",
  JDA: "jeanne-darc",
  // Order of the Dragon: live = DRA, legacy = OOD
  DRA: "order-of-the-dragon",
  OOD: "order-of-the-dragon",
  // Knights Templar: live = KTE, legacy = KT
  KTE: "knights-templar",
  KT: "knights-templar",
  HOL: "house-of-lancaster",
  // Golden Horde: live = GOH, legacy = GH
  GOH: "golden-horde",
  GH: "golden-horde",
  MAC: "macedonian",
  // Sengoku Daimyo: live = SEN, legacy = SD
  SEN: "sengoku-daimyo",
  SD: "sengoku-daimyo",
  TUG: "tughluqid",
  ANY: "unknown",
};

const mapCiv = (raw: unknown): string => {
  const s = String(raw ?? "").trim();
  if (!s) return "unknown";
  const upper = s.toUpperCase();
  if (CIV_CODE_MAP[upper]) return CIV_CODE_MAP[upper];
  // Fall back to RTS_Overlay-style name matching.
  return normalizeCivId(s);
};

/** Extract readable plain text from aoe4guides' HTML descriptions.
 *  - `<img src=...>` whose URL maps to a known icon → `{{path.ext}}` token.
 *  - Otherwise pull `title="X"` / `alt="X"` and inline as " X ".
 *  - Replace `<br>` with newlines.
 *  - Strip remaining tags.
 *  - Decode the handful of HTML entities aoe4guides actually emits.
 */
const htmlToText = (html: string): string => {
  if (!html) return "";
  let out = html;
  // Recognized aoe4guides icon → {{path.ext}} token. Unknown srcs fall
  // through to the title/alt extractor below.
  out = out.replace(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/gi, (whole, src: string) => {
    const token = aoe4GuidesSrcToToken(src);
    return token ? ` ${token} ` : whole;
  });
  // Pull title/alt off any remaining <img> tags so icon meaning isn't lost.
  out = out.replace(/<img\b[^>]*\b(?:title|alt)="([^"]+)"[^>]*>/gi, " $1 ");
  // For any remaining aoe4guides <img> tags (no mapping, no title/alt),
  // derive a capitalized text label from the basename so the information
  // isn't dropped silently. Civ-specific assets we don't ship (e.g.
  // `tughluqabad-fort.webp`, `bhakkar.webp`) come through as readable text.
  // Shared with the clipboard / `.bo` JSON path's text fallback so both
  // importers agree on what unmapped icons look like as plain text.
  out = out.replace(
    /<img\b[^>]*\bsrc="(?:https?:\/\/aoe4guides\.com)?\/assets\/pictures\/[^"]*\/([^/"]+?)\.(?:png|webp)"[^>]*>/gi,
    (_match, basename: string) => ` ${capitalizeAoe4GuidesBasename(basename)} `,
  );
  // Drop any remaining <img> tags (non-aoe4guides hosts with no title/alt).
  out = out.replace(/<img\b[^>]*>/gi, "");
  // <br>, <br/>, <br /> → newline.
  out = out.replace(/<br\s*\/?>/gi, "\n");
  // Strip any other tags.
  out = out.replace(/<\/?[a-z][^>]*>/gi, "");
  // aoe4guides writes "to build <img farmhouse>" with `build` as plain text.
  // The shared helper replaces it but skips `build` inside `{{…}}` tokens
  // already inserted above, so the substitution is idempotent on icons.
  out = substituteAoe4GuidesBuildKeyword(out);
  // Decode common entities.
  out = out
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Collapse whitespace but keep newlines.
  return out
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
};

/** Parse a possibly-string, possibly-empty number. Returns 0 for falsy/NaN. */
const toInt = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return 0;
    const n = parseInt(trimmed, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

/**
 * Loose zod schemas for the aoe4guides.com response. We validate the overall
 * shape (is it an object? is `steps`/`build_order` an array?) but keep field
 * parsing forgiving — upstream data mixes strings and numbers, and field-level
 * normalization happens below in `toInt`, `mapStep`, etc.
 */
const StringOrNumber = z.union([z.string(), z.number()]).nullish();

// aoe4guides freely emits `null` (not just missing) for empty optional
// strings/numbers, so every optional here is `nullish` rather than
// just `optional`. Without this, a single `"author": null` at top level
// throws the whole import.
const RawAoe4StepSchema = z
  .object({
    age: z.number().nullish(),
    time: z.string().nullish(),
    description: z.string().nullish(),
    food: StringOrNumber,
    wood: StringOrNumber,
    gold: StringOrNumber,
    stone: StringOrNumber,
    builders: StringOrNumber,
    villagers: StringOrNumber,
    oliveOil: StringOrNumber,
    olive_oil: StringOrNumber,
    silver: StringOrNumber,
  })
  .passthrough();

const RawAoe4AgeGroupSchema = z
  .object({
    age: z.number().nullish(),
    type: z.string().nullish(),
    steps: z.array(RawAoe4StepSchema).nullish(),
  })
  .passthrough();

type RawAoe4Step = z.infer<typeof RawAoe4StepSchema>;
type RawAoe4AgeGroup = z.infer<typeof RawAoe4AgeGroupSchema>;

const mapStep = (raw: RawAoe4Step, fallbackAge: 1 | 2 | 3 | 4): BuildStep => {
  const ageNum = typeof raw.age === "number" ? raw.age : fallbackAge;
  const age: 1 | 2 | 3 | 4 =
    ageNum === 1 || ageNum === 2 || ageNum === 3 || ageNum === 4 ? ageNum : fallbackAge;

  const resources: Resources = {
    food: toInt(raw.food),
    wood: toInt(raw.wood),
    gold: toInt(raw.gold),
    stone: toInt(raw.stone),
    builder: toInt(raw.builders),
  };
  const oliveOil = toInt(raw.oliveOil ?? raw.olive_oil);
  if (oliveOil > 0) resources.oliveOil = oliveOil;
  const silver = toInt(raw.silver);
  if (silver > 0) resources.silver = silver;

  let timeSeconds: number | undefined;
  if (typeof raw.time === "string" && raw.time.trim()) {
    const parsed = parseTime(raw.time.trim());
    if (parsed !== null) timeSeconds = parsed;
  }

  const importedVillagers = toInt(raw.villagers);
  const computedSum = computeVillagerCount(resources);
  const villagerCountManual = importedVillagers > 0 && importedVillagers !== computedSum;
  const villagerCount = villagerCountManual ? importedVillagers : computedSum;

  const text = htmlToText(String(raw.description ?? ""));
  const notes = text ? [{ id: crypto.randomUUID(), text }] : [];

  return {
    id: crypto.randomUUID(),
    age,
    villagerCount,
    villagerCountManual,
    resources,
    timeSeconds,
    notes,
  };
};

/** Flatten aoe4guides' age-grouped structure into our flat step list. */
const flattenSteps = (groups: RawAoe4AgeGroup[]): BuildStep[] => {
  const out: BuildStep[] = [];
  for (const group of groups) {
    const groupAge = typeof group.age === "number" ? group.age : 1;
    const fallback: 1 | 2 | 3 | 4 =
      groupAge === 1 || groupAge === 2 || groupAge === 3 || groupAge === 4 ? groupAge : 1;
    if (!Array.isArray(group.steps)) continue;
    for (const s of group.steps) {
      const mapped = mapStep(s, fallback);
      // Skip completely empty steps (no time, no resources, no notes).
      const hasResources = Object.values(mapped.resources).some((n) => typeof n === "number" && n > 0);
      if (!mapped.notes.length && !hasResources && mapped.timeSeconds === undefined) continue;
      out.push(mapped);
    }
  }
  return out;
};

const RawAoe4GuidesSchema = z
  .object({
    title: z.string().nullish(),
    name: z.string().nullish(),
    civilization: z.string().nullish(),
    civ: z.string().nullish(),
    author: z.string().nullish(),
    user: z.object({ name: z.string().nullish() }).passthrough().nullish(),
    description: z.string().nullish(),
    steps: z.array(RawAoe4AgeGroupSchema).nullish(),
    build_order: z.array(RawAoe4AgeGroupSchema).nullish(),
  })
  .passthrough();

export type RawAoe4Guides = z.infer<typeof RawAoe4GuidesSchema>;

/**
 * Parse and normalize an aoe4guides.com payload into a BuildOrder.
 * Exported separately from `fetchAoe4GuidesBuild` so tests can cover
 * validation without mocking `fetch`.
 */
export const parseAoe4GuidesPayload = (payload: unknown, id: string): BuildOrder => {
  const result = RawAoe4GuidesSchema.safeParse(payload);
  if (!result.success) {
    throw new Error(
      `aoe4guides.com returned a response that doesn't match the expected shape: ${result.error.issues[0]?.message ?? "unknown validation error"}.`,
    );
  }
  const data = result.data;

  const rawGroups = (Array.isArray(data.steps) ? data.steps : data.build_order) ?? [];
  if (rawGroups.length === 0) {
    throw new Error("aoe4guides build had no steps.");
  }

  const steps = flattenSteps(rawGroups);
  if (steps.length === 0) {
    throw new Error("aoe4guides build had no usable steps.");
  }

  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: String(data.title ?? data.name ?? "Imported build"),
    civilization: mapCiv(data.civilization ?? data.civ),
    author: String(data.author ?? data.user?.name ?? ""),
    description: data.description ? String(data.description) : "",
    source: `https://aoe4guides.com/builds/${id}`,
    matchup: "",
    createdAt: now,
    updatedAt: now,
    steps,
  };
};

const AOE4GUIDES_FETCH_TIMEOUT_MS = 10_000;

export const fetchAoe4GuidesBuild = async (id: string): Promise<BuildOrder> => {
  let res: Response;
  try {
    res = await fetch(`https://aoe4guides.com/api/builds/${id}`, {
      signal: AbortSignal.timeout(AOE4GUIDES_FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    const detail = err instanceof Error && err.message ? ` (${err.message})` : "";
    throw new Error(
      `Could not fetch from aoe4guides.com${detail} — the request may have been blocked by CORS or the network failed. Try pasting the build JSON directly instead.`,
    );
  }

  if (!res.ok) {
    if (res.status === 404) throw new Error("Build not found on aoe4guides.com.");
    throw new Error(`aoe4guides.com returned an error (status ${res.status}).`);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("aoe4guides.com returned an invalid response.");
  }

  return parseAoe4GuidesPayload(data, id);
};
