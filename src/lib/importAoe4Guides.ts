import { z } from "zod";

import { inferVillagerCountFields } from "@/lib/buildOrder";
import { newId } from "@/lib/id";
import { parseTime } from "@/lib/time";
import type { BuildOrder, BuildStep, Resources } from "@/types/buildOrder";
import {
  aoe4GuidesSrcToToken,
  capitalizeAoe4GuidesBasename,
  substituteAoe4GuidesBuildKeyword,
} from "./aoe4GuidesIconMap";
import { normalizeCivId } from "./importRtsOverlay";

/**
 * aoe4guides.com payload parsing. The live API at
 * https://aoe4guides.com/api/builds/{id} returns a structure unlike RTS_Overlay:
 *   - Top-level `steps` is an array of *age groups*, each with a nested `steps`
 *     array, an `age` (1-4), and a `type` ("age" | "ageUp").
 *   - Leaf steps carry resources as top-level strings (food/wood/gold/stone/
 *     builders/villagers).
 *   - `description` is an HTML string with `<img>` icons + `<br>`s.
 *   - `time` is "m:ss"; `civ` is a 3-letter code like "ENG".
 *
 * This module is the pure parse layer. The network `fetchAoe4GuidesBuild`
 * wrapper (and its react-query consumer) lands in M9 with the import modal.
 */

/** Match a 20-char Firestore-style document id. */
const ID_RE = /^[A-Za-z0-9]{20}$/;

export function extractAoe4GuidesId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.includes("aoe4guides.com")) {
    // Accept both /build/<id> and /builds/<id>.
    const m = trimmed.match(/\/builds?\/([A-Za-z0-9]{20})/);
    return m ? m[1] : null;
  }
  return ID_RE.test(trimmed) ? trimmed : null;
}

/** aoe4guides civ codes → internal ids. Live codes first; older 2-letter forms
 *  kept as legacy fallbacks. ANY = civ-agnostic guide → unknown (user picks). */
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
  DRA: "order-of-the-dragon",
  OOD: "order-of-the-dragon",
  KTE: "knights-templar",
  KT: "knights-templar",
  HOL: "house-of-lancaster",
  GOH: "golden-horde",
  GH: "golden-horde",
  MAC: "macedonian",
  SEN: "sengoku-daimyo",
  SD: "sengoku-daimyo",
  TUG: "tughluqid",
  ANY: "unknown",
};

function mapCiv(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "unknown";
  const upper = s.toUpperCase();
  if (CIV_CODE_MAP[upper]) return CIV_CODE_MAP[upper];
  // Fall back to RTS_Overlay-style name matching.
  return normalizeCivId(s);
}

/** Extract readable plain text (with `{{icon}}` tokens) from aoe4guides HTML. */
function htmlToText(html: string): string {
  if (!html) return "";
  let out = html;
  // Recognized aoe4guides icon → {{path.ext}} token.
  out = out.replace(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/gi, (whole, src: string) => {
    const token = aoe4GuidesSrcToToken(src);
    return token ? ` ${token} ` : whole;
  });
  // Pull title/alt off remaining <img> tags so icon meaning isn't lost.
  out = out.replace(/<img\b[^>]*\b(?:title|alt)="([^"]+)"[^>]*>/gi, " $1 ");
  // Remaining aoe4guides <img> tags (no mapping, no title/alt) → capitalized
  // basename text so the information isn't dropped silently.
  out = out.replace(
    /<img\b[^>]*\bsrc="(?:https?:\/\/aoe4guides\.com)?\/assets\/pictures\/[^"]*\/([^/"]+?)\.(?:png|webp)"[^>]*>/gi,
    (_match, basename: string) => ` ${capitalizeAoe4GuidesBasename(basename)} `,
  );
  // Drop any remaining <img> tags (non-aoe4guides hosts).
  out = out.replace(/<img\b[^>]*>/gi, "");
  out = out.replace(/<br\s*\/?>/gi, "\n");
  out = out.replace(/<\/?[a-z][^>]*>/gi, "");
  // aoe4guides writes the bare word "build" expecting its build-marker icon;
  // the shared helper substitutes it while skipping existing {{…}} tokens.
  out = substituteAoe4GuidesBuildKeyword(out);
  out = out
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  return out
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
}

/** Parse a possibly-string, possibly-empty number. Returns 0 for falsy/NaN. */
function toInt(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return 0;
    const n = parseInt(trimmed, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

// aoe4guides freely emits `null` for empty optional fields, so every optional is
// `nullish` — without this a single `"author": null` would throw the import.
const StringOrNumber = z.union([z.string(), z.number()]).nullish();

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

function mapStep(raw: RawAoe4Step, fallbackAge: 1 | 2 | 3 | 4): BuildStep {
  const ageNum = typeof raw.age === "number" ? raw.age : fallbackAge;
  const age: 1 | 2 | 3 | 4 =
    ageNum === 1 || ageNum === 2 || ageNum === 3 || ageNum === 4
      ? ageNum
      : fallbackAge;

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

  const { villagerCount, villagerCountManual } = inferVillagerCountFields(
    resources,
    toInt(raw.villagers),
  );

  const text = htmlToText(String(raw.description ?? ""));
  const notes = text ? [{ id: newId(), text }] : [];

  return {
    id: newId(),
    age,
    villagerCount,
    villagerCountManual,
    resources,
    timeSeconds,
    notes,
  };
}

/** Flatten aoe4guides' age-grouped structure into our flat step list. */
function flattenSteps(groups: RawAoe4AgeGroup[]): BuildStep[] {
  const out: BuildStep[] = [];
  for (const group of groups) {
    const groupAge = typeof group.age === "number" ? group.age : 1;
    const fallback: 1 | 2 | 3 | 4 =
      groupAge === 1 || groupAge === 2 || groupAge === 3 || groupAge === 4
        ? groupAge
        : 1;
    if (!Array.isArray(group.steps)) continue;
    for (const s of group.steps) {
      const mapped = mapStep(s, fallback);
      const hasResources = Object.values(mapped.resources).some(
        (n) => typeof n === "number" && n > 0,
      );
      if (!mapped.notes.length && !hasResources && mapped.timeSeconds === undefined) {
        continue;
      }
      out.push(mapped);
    }
  }
  return out;
}

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

/** Parse + normalize an aoe4guides.com payload into a BuildOrder. Exported
 *  separately from the fetch wrapper so tests cover validation without `fetch`. */
export function parseAoe4GuidesPayload(payload: unknown, id: string): BuildOrder {
  const result = RawAoe4GuidesSchema.safeParse(payload);
  if (!result.success) {
    throw new Error(
      `aoe4guides.com returned a response that doesn't match the expected shape: ${
        result.error.issues[0]?.message ?? "unknown validation error"
      }.`,
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
    id: newId(),
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
}

const AOE4GUIDES_FETCH_TIMEOUT_MS = 10_000;

/**
 * Fetch + parse a build from the aoe4guides.com public API. CORS is open
 * (`access-control-allow-origin: *`), but we still surface a paste-the-JSON
 * hint on network failure since the JSON tab is a co-equal import path.
 */
export async function fetchAoe4GuidesBuild(id: string): Promise<BuildOrder> {
  let res: Response;
  try {
    res = await fetch(`https://aoe4guides.com/api/builds/${id}`, {
      signal: AbortSignal.timeout(AOE4GUIDES_FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    const detail = err instanceof Error && err.message ? ` (${err.message})` : "";
    throw new Error(
      `Could not fetch from aoe4guides.com${detail} — the request may have been blocked or the network failed. Try pasting the build JSON instead.`,
      { cause: err },
    );
  }

  if (!res.ok) {
    if (res.status === 404) throw new Error("Build not found on aoe4guides.com.");
    throw new Error(`aoe4guides.com returned an error (status ${res.status}).`);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error("aoe4guides.com returned an invalid response.", { cause: err });
  }

  return parseAoe4GuidesPayload(data, id);
}
