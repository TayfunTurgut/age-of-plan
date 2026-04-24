import type { BuildOrder, BuildStep, Resources } from "@/types/buildOrder";
import { normalizeCivId } from "./importRtsOverlay";
import { parseTime } from "@/lib/time";
import { computeVillagerCount } from "@/lib/buildOrder";

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

/** Map aoe4guides 3-letter civ codes to our internal ids. */
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
  OOD: "order-of-the-dragon",
  KT: "knights-templar",
  HOL: "house-of-lancaster",
  GH: "golden-horde",
  MAC: "macedonian",
  SD: "sengoku-daimyo",
  TUG: "tughluqid",
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
 *  - Replace `<img ... title="X">` or `alt="X"` with " X ".
 *  - Replace `<br>` with newlines.
 *  - Strip remaining tags.
 *  - Decode the handful of HTML entities aoe4guides actually emits.
 */
const htmlToText = (html: string): string => {
  if (!html) return "";
  let out = html;
  // Pull title/alt off of <img> tags so icon meaning isn't lost.
  out = out.replace(/<img\b[^>]*\b(?:title|alt)="([^"]+)"[^>]*>/gi, " $1 ");
  // Drop any remaining <img> tags (no title/alt).
  out = out.replace(/<img\b[^>]*>/gi, "");
  // <br>, <br/>, <br /> → newline.
  out = out.replace(/<br\s*\/?>/gi, "\n");
  // Strip any other tags.
  out = out.replace(/<\/?[a-z][^>]*>/gi, "");
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

type RawAoe4Step = {
  age?: number;
  time?: string;
  description?: string;
  food?: string | number;
  wood?: string | number;
  gold?: string | number;
  stone?: string | number;
  builders?: string | number;
  villagers?: string | number;
  oliveOil?: string | number;
  olive_oil?: string | number;
  silver?: string | number;
};

type RawAoe4AgeGroup = {
  age?: number;
  type?: string;
  steps?: RawAoe4Step[];
};

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

type RawAoe4Guides = {
  title?: string;
  name?: string;
  civilization?: string;
  civ?: string;
  author?: string;
  user?: { name?: string };
  description?: string;
  steps?: RawAoe4AgeGroup[];
  build_order?: RawAoe4AgeGroup[];
};

export const fetchAoe4GuidesBuild = async (id: string): Promise<BuildOrder> => {
  let res: Response;
  try {
    res = await fetch(`https://aoe4guides.com/api/builds/${id}`);
  } catch {
    throw new Error(
      "Could not fetch from aoe4guides.com — CORS may be blocked. Try pasting the build JSON directly instead.",
    );
  }

  if (!res.ok) {
    if (res.status === 404) throw new Error("Build not found on aoe4guides.com.");
    throw new Error(`aoe4guides.com returned an error (status ${res.status}).`);
  }

  let data: RawAoe4Guides;
  try {
    data = (await res.json()) as RawAoe4Guides;
  } catch {
    throw new Error("aoe4guides.com returned an invalid response.");
  }

  const rawGroups = (Array.isArray(data.steps) ? data.steps : data.build_order) ?? [];
  if (!Array.isArray(rawGroups) || rawGroups.length === 0) {
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
