#!/usr/bin/env bun
/**
 * Single source-of-truth sync for AoE4 game data + icons. Operator tooling —
 * regenerates `src/data/generated/*` and the `public/aoe4/**` assets from a
 * local checkout of the aoe4guides project (https://aoe4guides.com), our source
 * of truth for civilization / unit / building / technology names and icons.
 *
 *   data:    <AOE4GUIDES_REPO>/src/composables/builds/icons/json/*.json
 *   images:  <AOE4GUIDES_REPO>/public/assets/pictures/<category>/<file>.webp
 *
 * Point AOE4GUIDES_REPO at a clone of the aoe4guides repository (default
 * `../aoe4-guides`). Run via:  bun run sync-data
 *
 * Idempotent: existing non-empty asset files are skipped. Every shipped icon
 * comes from aoe4guides — there is no legacy/back-compat asset set.
 *
 * The transform/emit helpers below are pure and unit-tested; only main() touches
 * the filesystem. main() runs only when executed directly.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

import { EXTRA_RESOURCES_BY_CIV } from "../src/data/civExtras";

export const PUBLIC_ROOT = "public/aoe4";
export const GENERATED_ROOT = "src/data/generated";
const AOE4GUIDES_REPO = process.env.AOE4GUIDES_REPO ?? "../aoe4-guides";
const AG_PICTURES = join(AOE4GUIDES_REPO, "public", "assets", "pictures");
const AG_JSON = join(AOE4GUIDES_REPO, "src", "composables", "builds", "icons", "json");

// ---------- Civ mapping (aoe4guides 3-letter code -> our internal civ id) ----------
export const CODE_TO_CIV: Record<string, string> = {
  abb: "abbasid",
  ayy: "ayyubids",
  byz: "byzantines",
  chi: "chinese",
  del: "delhi",
  dra: "order-of-the-dragon",
  eng: "english",
  fre: "french",
  goh: "golden-horde",
  hol: "house-of-lancaster",
  hre: "hre",
  jap: "japanese",
  jda: "jeanne-darc",
  jin: "jin",
  kte: "knights-templar",
  mac: "macedonian",
  mal: "malians",
  mon: "mongols",
  ott: "ottomans",
  rus: "rus",
  sen: "sengoku-daimyo",
  tug: "tughluqid",
  zxl: "zhu-xi",
};

export type CivMeta = {
  id: string;
  name: string;
  variantOf?: string;
  /** aoe4guides 3-letter code; locates the civ flag asset. */
  code: string;
};

export const CIV_META: CivMeta[] = [
  { id: "english", name: "English", code: "eng" },
  { id: "french", name: "French", code: "fre" },
  { id: "hre", name: "Holy Roman Empire", code: "hre" },
  { id: "mongols", name: "Mongols", code: "mon" },
  { id: "rus", name: "Rus", code: "rus" },
  { id: "chinese", name: "Chinese", code: "chi" },
  { id: "delhi", name: "Delhi Sultanate", code: "del" },
  { id: "abbasid", name: "Abbasid Dynasty", code: "abb" },
  { id: "ottomans", name: "Ottomans", code: "ott" },
  { id: "malians", name: "Malians", code: "mal" },
  { id: "byzantines", name: "Byzantines", code: "byz" },
  { id: "japanese", name: "Japanese", code: "jap" },
  { id: "ayyubids", name: "Ayyubids", variantOf: "abbasid", code: "ayy" },
  { id: "zhu-xi", name: "Zhu Xi's Legacy", variantOf: "chinese", code: "zxl" },
  { id: "jeanne-darc", name: "Jeanne d'Arc", variantOf: "french", code: "jda" },
  { id: "order-of-the-dragon", name: "Order of the Dragon", variantOf: "hre", code: "dra" },
  { id: "knights-templar", name: "Knights Templar", variantOf: "french", code: "kte" },
  { id: "house-of-lancaster", name: "House of Lancaster", variantOf: "english", code: "hol" },
  { id: "golden-horde", name: "Golden Horde", variantOf: "mongols", code: "goh" },
  { id: "macedonian", name: "Macedonian Dynasty", variantOf: "byzantines", code: "mac" },
  { id: "sengoku-daimyo", name: "Sengoku Daimyo", variantOf: "japanese", code: "sen" },
  { id: "tughluqid", name: "Tughluqid Dynasty", variantOf: "delhi", code: "tug" },
  { id: "jin", name: "Jin Dynasty", variantOf: "chinese", code: "jin" },
];

export const ALL_CIV_IDS = CIV_META.map((m) => m.id).sort();

/** Variant civ id -> its base civ id (for collapsing when judging uniqueness). */
const PARENT_OF: Record<string, string> = Object.fromEntries(
  CIV_META.filter((m) => m.variantOf).map((m) => [m.id, m.variantOf as string]),
);
const baseCiv = (id: string): string => PARENT_OF[id] ?? id;

// ---------- Pure helpers ----------
export const slugify = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export const stripAge = (basename: string): string => basename.replace(/-\d+$/, "");

export type IconCategory = "Resource" | "Age" | "Unit" | "Building" | "Technology";

export type IconEntry = {
  path: string;
  name: string;
  category: IconCategory;
  civs?: string[];
  age?: number;
  unique?: boolean;
};

/** An aoe4guides icon JSON entry (units / buildings / technologies / landmarks). */
export type Aoe4GuidesEntity = {
  title: string;
  age?: number | string;
  imgSrc?: string;
  civ?: string[];
  class?: string;
  type?: "unit" | "building" | "technology";
};

/** The aoe4guides JSON files that feed the catalog, in load order. */
export const SOURCE_FILES = [
  "unitEco",
  "unitMilitary",
  "unitReligious",
  "unitHero",
  "buildingEco",
  "buildingMilitary",
  "buildingReligious",
  "buildingTech",
  "landmarks",
  "techEco",
  "techMilitary",
  "abilityHero",
] as const;
export type SourceFile = (typeof SOURCE_FILES)[number];
export type SourcedEntity = { entity: Aoe4GuidesEntity; source: SourceFile };

const TYPE_TO_CATEGORY: Record<string, IconCategory> = {
  unit: "Unit",
  building: "Building",
  technology: "Technology",
};

const CATEGORY_ORDER: IconCategory[] = ["Resource", "Age", "Unit", "Building", "Technology"];

/** Coerce an aoe4guides `age` (number or numeric string) to 1-4, else undefined. */
export function normalizeAge(age: number | string | undefined): number | undefined {
  const n = typeof age === "string" ? Number(age) : age;
  return typeof n === "number" && Number.isFinite(n) && n >= 1 && n <= 4 ? n : undefined;
}

/** Local catalog path for an `imgSrc`, e.g. `images/unit_cavalry/scout.webp`. */
export function imgSrcToPath(imgSrc: string | undefined): string | null {
  if (!imgSrc) return null;
  const marker = "/assets/pictures/";
  const i = imgSrc.indexOf(marker);
  if (i < 0) return null;
  const rel = imgSrc.slice(i + marker.length);
  return rel ? `images/${rel}` : null;
}

/** Map aoe4guides civ codes to our internal civ ids (deduped, unknowns dropped). */
export function mapCivCodes(codes: string[] | undefined): string[] {
  return Array.from(
    new Set(
      (codes ?? [])
        .map((c) => CODE_TO_CIV[c.toLowerCase()])
        .filter((v): v is string => Boolean(v)),
    ),
  );
}

/**
 * aoe4guides has no explicit "unique" flag, so we derive it: heroes, landmarks
 * and hero abilities are always unique; economic units (villagers, traders,
 * etc.) never are; everything else is unique iff it belongs to a single base
 * civilization (variants collapsed onto their parent).
 */
export function deriveUnique(entity: Aoe4GuidesEntity, source: SourceFile): boolean {
  if (source === "unitEco") return false;
  if (source === "unitHero" || source === "abilityHero" || source === "landmarks") return true;
  const bases = new Set(mapCivCodes(entity.civ).map(baseCiv));
  return bases.size === 1;
}

/** Civ ids that use a given extra-resource key, or undefined if none. */
export function civsForExtraResource(key: string): string[] | undefined {
  const civs = Object.entries(EXTRA_RESOURCES_BY_CIV)
    .filter(([, keys]) => (keys as readonly string[]).includes(key))
    .map(([civ]) => civ)
    .sort();
  return civs.length > 0 ? civs : undefined;
}

export const STATIC_RESOURCES: IconEntry[] = [
  { path: "resources/food.webp", name: "Food", category: "Resource" },
  { path: "resources/wood.webp", name: "Wood", category: "Resource" },
  { path: "resources/gold.webp", name: "Gold", category: "Resource" },
  { path: "resources/stone.webp", name: "Stone", category: "Resource" },
  { path: "resources/oliveoil.webp", name: "Olive Oil", category: "Resource", civs: civsForExtraResource("oliveOil") },
  { path: "resources/silver.webp", name: "Silver", category: "Resource", civs: civsForExtraResource("silver") },
];

/**
 * Non-catalog assets copied straight from aoe4guides: resource glyphs, age
 * pips, and the build/rally UI markers. `[srcRelative, dstRelative]` pairs
 * under AG_PICTURES / PUBLIC_ROOT respectively.
 */
export const STATIC_ASSET_COPIES: ReadonlyArray<readonly [string, string]> = [
  ["resource/resource_food.webp", "resources/food.webp"],
  ["resource/resource_wood.webp", "resources/wood.webp"],
  ["resource/resource_gold.webp", "resources/gold.webp"],
  ["resource/resource_stone.webp", "resources/stone.webp"],
  ["resource/oliveoil.webp", "resources/oliveoil.webp"],
  // aoe4guides has no generic silver glyph; the Macedonian silver-deposit art is
  // the closest match for the Macedonian-only Silver resource.
  ["building_macedonian/silver_deposit.webp", "resources/silver.webp"],
  ["age/age_1.webp", "ages/age_1.webp"],
  ["age/age_2.webp", "ages/age_2.webp"],
  ["age/age_3.webp", "ages/age_3.webp"],
  ["age/age_4.webp", "ages/age_4.webp"],
  ["abilities/repair.webp", "general/build.webp"],
  ["resource/rally.webp", "general/rally.webp"],
];

export const STATIC_AGES: IconEntry[] = [
  { path: "ages/age_1.webp", name: "Dark Age", category: "Age", age: 1 },
  { path: "ages/age_2.webp", name: "Feudal Age", category: "Age", age: 2 },
  { path: "ages/age_3.webp", name: "Castle Age", category: "Age", age: 3 },
  { path: "ages/age_4.webp", name: "Imperial Age", category: "Age", age: 4 },
];

/**
 * Build the full icon catalog from aoe4guides entities: one entry per distinct
 * icon path (dedup), keeping the lowest age and OR-ing the unique flag,
 * collapsing the civ-restriction when an icon covers every civ, then merging the
 * static resource/age entries and sorting by category then name. Pure.
 */
export function buildIconCatalog(items: SourcedEntity[]): IconEntry[] {
  type Acc = { entry: IconEntry; civIds: Set<string> };
  const byPath = new Map<string, Acc>();

  for (const { entity, source } of items) {
    const path = imgSrcToPath(entity.imgSrc);
    if (!path) continue;
    const category = TYPE_TO_CATEGORY[entity.type ?? ""];
    if (!category) continue;
    const age = normalizeAge(entity.age);
    const unique = deriveUnique(entity, source);

    let acc = byPath.get(path);
    if (!acc) {
      acc = { entry: { path, name: entity.title, category }, civIds: new Set() };
      if (age !== undefined) acc.entry.age = age;
      if (unique) acc.entry.unique = true;
      byPath.set(path, acc);
    }
    for (const id of mapCivCodes(entity.civ)) acc.civIds.add(id);
    if (age !== undefined && (acc.entry.age === undefined || age < acc.entry.age)) {
      acc.entry.age = age;
    }
    if (unique) acc.entry.unique = true;
  }

  const gameIcons: IconEntry[] = [];
  for (const acc of byPath.values()) {
    const civs = Array.from(acc.civIds).sort();
    // Drop the restriction when the icon covers every civ.
    if (civs.length > 0 && civs.length < ALL_CIV_IDS.length) acc.entry.civs = civs;
    gameIcons.push(acc.entry);
  }

  return [...STATIC_RESOURCES, ...STATIC_AGES, ...gameIcons].sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category);
    const cb = CATEGORY_ORDER.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name);
  });
}

export type CivData = {
  id: string;
  name: string;
  variantOf?: string;
  flagPath: string;
  uniqueUnits: string[];
  landmarks: string[];
  tagline: string;
};

/** Sort {name, age} records by age then collapse to a deduped name list. */
function sortedDistinctNames(entries: { name: string; age: number }[] | undefined): string[] {
  return Array.from(
    new Set((entries ?? []).slice().sort((a, b) => a.age - b.age).map((e) => e.name)),
  );
}

/**
 * Derive per-civ unique units (military / religious / hero) and landmarks from
 * the aoe4guides entities, plus an auto tagline (top 2 unique units + first
 * landmark). Pure.
 */
export function buildCivData(items: SourcedEntity[]): CivData[] {
  const uniqueUnitsByCiv = new Map<string, { name: string; age: number }[]>();
  const landmarksByCiv = new Map<string, { name: string; age: number }[]>();
  const push = (
    map: Map<string, { name: string; age: number }[]>,
    id: string,
    rec: { name: string; age: number },
  ) => {
    const list = map.get(id) ?? [];
    list.push(rec);
    map.set(id, list);
  };

  for (const { entity, source } of items) {
    const ids = mapCivCodes(entity.civ);
    const age = normalizeAge(entity.age) ?? 99;
    const isMilitaryUnit =
      source === "unitMilitary" || source === "unitReligious" || source === "unitHero";
    if (isMilitaryUnit && deriveUnique(entity, source)) {
      for (const id of ids) push(uniqueUnitsByCiv, id, { name: entity.title, age });
    }
    if (source === "landmarks") {
      for (const id of ids) push(landmarksByCiv, id, { name: entity.title, age });
    }
  }

  return CIV_META.map((meta) => {
    const uniqueUnits = sortedDistinctNames(uniqueUnitsByCiv.get(meta.id));
    const landmarks = sortedDistinctNames(landmarksByCiv.get(meta.id));
    const taglineParts = [...uniqueUnits.slice(0, 2), landmarks[0]].filter(Boolean) as string[];
    return {
      id: meta.id,
      name: meta.name,
      variantOf: meta.variantOf,
      flagPath: `flags/${meta.id}.webp`,
      uniqueUnits,
      landmarks,
      tagline: taglineParts.length > 0 ? taglineParts.join(" • ") : "Civilization",
    };
  });
}

// ---------- Code emitters (pure) ----------
export function emitIconsTs(catalog: IconEntry[]): string {
  const lines = [
    "// Generated by scripts/sync-aoe4-data.ts. Do not edit.",
    "",
    "export type IconCategory =",
    '  | "Resource"',
    '  | "Age"',
    '  | "Unit"',
    '  | "Building"',
    '  | "Technology";',
    "",
    "export type IconEntry = {",
    '  /** Path relative to /aoe4/, e.g. "images/unit_cavalry/scout.webp". */',
    "  path: string;",
    "  name: string;",
    "  category: IconCategory;",
    "  /** Civ ids the entry is restricted to. Undefined = available to all civs. */",
    "  civs?: string[];",
    "  /** 1-4 when the item becomes available. */",
    "  age?: number;",
    "  /** True for unique units / unique buildings / unique techs. */",
    "  unique?: boolean;",
    "};",
    "",
    "export const ICON_CATEGORIES: readonly IconCategory[] = [",
    '  "Resource",',
    '  "Age",',
    '  "Unit",',
    '  "Building",',
    '  "Technology",',
    "] as const;",
    "",
    "export const ICON_CATALOG: readonly IconEntry[] = Object.freeze([",
  ];
  for (const e of catalog) {
    const parts = [
      `path: ${JSON.stringify(e.path)}`,
      `name: ${JSON.stringify(e.name)}`,
      `category: ${JSON.stringify(e.category)}`,
    ];
    if (e.civs) parts.push(`civs: [${e.civs.map((c) => JSON.stringify(c)).join(", ")}]`);
    if (e.age !== undefined) parts.push(`age: ${e.age}`);
    if (e.unique) parts.push("unique: true");
    lines.push(`  { ${parts.join(", ")} },`);
  }
  lines.push("]);");
  lines.push("");
  lines.push("/** Catalog entries available to a given civ. */");
  lines.push("export const getIconsForCiv = (civId: string): IconEntry[] =>");
  lines.push("  ICON_CATALOG.filter((e) => !e.civs || e.civs.includes(civId)).slice();");
  lines.push("");
  return lines.join("\n");
}

export function emitCivDataTs(data: CivData[]): string {
  const lines = [
    "// Generated by scripts/sync-aoe4-data.ts. Do not edit.",
    "",
    "export type CivData = {",
    "  id: string;",
    "  name: string;",
    "  variantOf?: string;",
    '  /** Path relative to /aoe4/, e.g. "flags/english.webp". */',
    "  flagPath: string;",
    "  /** Display names of unique units, sorted by age. */",
    "  uniqueUnits: string[];",
    "  /** Display names of civ landmarks, sorted by age. */",
    "  landmarks: string[];",
    "  /** Auto-generated from the top 2 unique units + first landmark. */",
    "  tagline: string;",
    "};",
    "",
    "export const CIV_DATA: readonly CivData[] = Object.freeze([",
  ];
  for (const c of data) {
    lines.push("  {");
    lines.push(`    id: ${JSON.stringify(c.id)},`);
    lines.push(`    name: ${JSON.stringify(c.name)},`);
    if (c.variantOf) lines.push(`    variantOf: ${JSON.stringify(c.variantOf)},`);
    lines.push(`    flagPath: ${JSON.stringify(c.flagPath)},`);
    lines.push(`    uniqueUnits: [${c.uniqueUnits.map((u) => JSON.stringify(u)).join(", ")}],`);
    lines.push(`    landmarks: [${c.landmarks.map((u) => JSON.stringify(u)).join(", ")}],`);
    lines.push(`    tagline: ${JSON.stringify(c.tagline)},`);
    lines.push("  },");
  }
  lines.push("]);");
  lines.push("");
  return lines.join("\n");
}

// ---------- IO (only reached from main) ----------
const ensureDir = (path: string) => {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
};
const fileNonEmpty = (path: string): boolean => {
  try {
    return statSync(path).size > 0;
  } catch {
    return false;
  }
};

function readJsonArray(path: string): Aoe4GuidesEntity[] {
  const data = JSON.parse(readFileSync(path, "utf8"));
  return Array.isArray(data) ? (data.filter(Boolean) as Aoe4GuidesEntity[]) : [];
}

type Copy = { src: string; dst: string };

function copyAll(copies: Copy[]): { skipped: number; copied: number; failed: number } {
  const tally = { skipped: 0, copied: 0, failed: 0 };
  for (const c of copies) {
    if (fileNonEmpty(c.dst)) {
      tally.skipped++;
      continue;
    }
    if (!fileNonEmpty(c.src)) {
      tally.failed++;
      continue;
    }
    try {
      ensureDir(dirname(c.dst));
      copyFileSync(c.src, c.dst);
      tally.copied++;
    } catch {
      tally.failed++;
    }
  }
  return tally;
}

async function main() {
  if (!existsSync(AG_JSON)) {
    throw new Error(
      `aoe4guides data not found at ${AG_JSON}. Clone https://github.com/aoe4guides/aoe4-guides ` +
        `and set AOE4GUIDES_REPO (default ../aoe4-guides).`,
    );
  }

  console.error(`Loading aoe4guides data from ${AOE4GUIDES_REPO} ...`);
  const items: SourcedEntity[] = [];
  for (const source of SOURCE_FILES) {
    const arr = readJsonArray(join(AG_JSON, `${source}.json`));
    for (const entity of arr) items.push({ entity, source });
  }
  console.error(`  loaded ${items.length} entities from ${SOURCE_FILES.length} files`);

  const catalog = buildIconCatalog(items);
  const civData = buildCivData(items);

  // Copy queue: game icons + flags + the static resource/age/marker assets —
  // every shipped icon comes from aoe4guides.
  ensureDir(PUBLIC_ROOT);
  const copies: Copy[] = [];
  for (const e of catalog) {
    if (e.path.startsWith("images/")) {
      copies.push({ src: join(AG_PICTURES, e.path.slice("images/".length)), dst: join(PUBLIC_ROOT, e.path) });
    }
  }
  for (const meta of CIV_META) {
    copies.push({
      src: join(AG_PICTURES, "civilization_flag", `${meta.code}.webp`),
      dst: join(PUBLIC_ROOT, "flags", `${meta.id}.webp`),
    });
  }
  for (const [src, dst] of STATIC_ASSET_COPIES) {
    copies.push({ src: join(AG_PICTURES, src), dst: join(PUBLIC_ROOT, dst) });
  }
  console.error(`Queued ${copies.length} asset copies.`);
  const tally = copyAll(copies);
  console.error(`Done: skipped=${tally.skipped} copied=${tally.copied} failed=${tally.failed}`);

  // Drop catalog entries whose asset is absent (aoe4guides gap / failed copy).
  const prunedCatalog = catalog.filter((e) => fileNonEmpty(join(PUBLIC_ROOT, e.path)));
  const dropped = catalog.length - prunedCatalog.length;
  if (dropped > 0) {
    console.error(`Pruned ${dropped} catalog entries with no local asset (uncovered by aoe4guides).`);
  }

  ensureDir(GENERATED_ROOT);
  writeFileSync(join(GENERATED_ROOT, "icons.ts"), emitIconsTs(prunedCatalog));
  writeFileSync(join(GENERATED_ROOT, "civData.ts"), emitCivDataTs(civData));

  const manifest = {
    generatedAt: new Date().toISOString(),
    sources: {
      data: "https://aoe4guides.com — src/composables/builds/icons/json/*.json",
      images: "https://aoe4guides.com/assets/pictures/<category>/<file>.webp",
    },
    counts: {
      civs: CIV_META.length,
      entities: items.length,
      icons: prunedCatalog.length,
      uncovered: dropped,
    },
  };
  writeFileSync(join(PUBLIC_ROOT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.error(`Synced ${manifest.counts.civs} civs, ${prunedCatalog.length} catalog icons.`);
}

// Run only when executed directly (Bun sets import.meta.main); never on import.
if ((import.meta as { main?: boolean }).main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
