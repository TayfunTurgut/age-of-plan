#!/usr/bin/env bun
/**
 * Single source-of-truth sync for AoE4 game data + icons. Operator tooling —
 * regenerates `src/data/generated/*` and the `public/aoe4/**` assets from
 * aoe4world. Idempotent: existing non-empty asset files are skipped.
 *
 *   data:      https://data.aoe4world.com/{units,buildings,technologies}/all.json
 *   icons:     per-entity `icon` URL (https://data.aoe4world.com/images/...)
 *   flags:     https://raw.githubusercontent.com/aoe4world/explorer/main/assets/flags/...
 *   resources: https://raw.githubusercontent.com/aoe4world/explorer/main/assets/resources/...
 *   ages:      copied from the prior public/assets/aoe4/age/ .webp mirror
 *
 * Run via:  bun run sync-data
 *
 * The transform/emit/audit helpers below are pure and unit-tested; only main()
 * touches the network or filesystem. main() runs only when executed directly.
 *
 * NOTE: the path-migration map is derived from the legacy rts-overlay mirror at
 * OLD_MIRROR (public/assets/aoe4), which this repo does not ship — a fresh run
 * regenerates only the *static* migrations. The full committed pathMigration.ts
 * was produced from that mirror during the initial port; restore the legacy
 * mirror before re-running if you need to rebuild it whole.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

import { EXTRA_RESOURCES_BY_CIV } from "../src/data/civExtras";

export const PUBLIC_ROOT = "public/aoe4";
export const GENERATED_ROOT = "src/data/generated";
const OLD_MIRROR = "public/assets/aoe4";

// ---------- Civ mapping (verified against data.aoe4world.com) ----------
export const CODE_TO_CIV: Record<string, string> = {
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

export const CIV_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(CODE_TO_CIV).map(([k, v]) => [v, k]),
);

export const ALL_CIV_IDS = Object.values(CODE_TO_CIV).sort();

export type CivMeta = {
  id: string;
  name: string;
  variantOf?: string;
  /** Filename in aoe4world/explorer/assets/flags/. */
  flagSource: string;
};

export const CIV_META: CivMeta[] = [
  { id: "english", name: "English", flagSource: "english.png" },
  { id: "french", name: "French", flagSource: "french.png" },
  { id: "hre", name: "Holy Roman Empire", flagSource: "hre.png" },
  { id: "mongols", name: "Mongols", flagSource: "mongols.png" },
  { id: "rus", name: "Rus", flagSource: "rus.png" },
  { id: "chinese", name: "Chinese", flagSource: "chinese.png" },
  { id: "delhi", name: "Delhi Sultanate", flagSource: "delhi.png" },
  { id: "abbasid", name: "Abbasid Dynasty", flagSource: "abbasid.png" },
  { id: "ottomans", name: "Ottomans", flagSource: "ottomans.png" },
  { id: "malians", name: "Malians", flagSource: "malians.png" },
  { id: "byzantines", name: "Byzantines", flagSource: "byzantines.png" },
  { id: "japanese", name: "Japanese", flagSource: "japanese.png" },
  { id: "ayyubids", name: "Ayyubids", variantOf: "abbasid", flagSource: "ayyubids.png" },
  { id: "zhu-xi", name: "Zhu Xi's Legacy", variantOf: "chinese", flagSource: "zhuxi.png" },
  { id: "jeanne-darc", name: "Jeanne d'Arc", variantOf: "french", flagSource: "jeannedarc.png" },
  { id: "order-of-the-dragon", name: "Order of the Dragon", variantOf: "hre", flagSource: "orderofthedragon.png" },
  { id: "knights-templar", name: "Knights Templar", variantOf: "french", flagSource: "templar.png" },
  { id: "house-of-lancaster", name: "House of Lancaster", variantOf: "english", flagSource: "lancaster.png" },
  { id: "golden-horde", name: "Golden Horde", variantOf: "mongols", flagSource: "goldenhorde.png" },
  { id: "macedonian", name: "Macedonian Dynasty", variantOf: "byzantines", flagSource: "macedonian.png" },
  { id: "sengoku-daimyo", name: "Sengoku Daimyo", variantOf: "japanese", flagSource: "sengoku.png" },
  { id: "tughluqid", name: "Tughluqid Dynasty", variantOf: "delhi", flagSource: "tughlaq.png" },
];

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

export type Aoe4WorldEntity = {
  id: string;
  baseId: string;
  type: "unit" | "building" | "technology";
  name: string;
  age: number;
  civs: string[];
  unique: boolean;
  icon: string;
  classes?: string[];
  displayClasses?: string[];
};

export type Kind = "units" | "buildings" | "technologies";

const KIND_TO_CATEGORY: Record<Kind, IconCategory> = {
  units: "Unit",
  buildings: "Building",
  technologies: "Technology",
};

const CATEGORY_ORDER: IconCategory[] = [
  "Resource",
  "Age",
  "Unit",
  "Building",
  "Technology",
];

/** Civ ids that use a given extra-resource key, or undefined if none. */
export function civsForExtraResource(key: string): string[] | undefined {
  const civs = Object.entries(EXTRA_RESOURCES_BY_CIV)
    .filter(([, keys]) => (keys as readonly string[]).includes(key))
    .map(([civ]) => civ)
    .sort();
  return civs.length > 0 ? civs : undefined;
}

export const STATIC_RESOURCES: IconEntry[] = [
  { path: "resources/food.png", name: "Food", category: "Resource" },
  { path: "resources/wood.png", name: "Wood", category: "Resource" },
  { path: "resources/gold.png", name: "Gold", category: "Resource" },
  { path: "resources/stone.png", name: "Stone", category: "Resource" },
  { path: "resources/oliveoil.png", name: "Olive Oil", category: "Resource", civs: civsForExtraResource("oliveOil") },
  { path: "resources/silver.png", name: "Silver", category: "Resource", civs: civsForExtraResource("silver") },
];

export const STATIC_AGES: IconEntry[] = [
  { path: "ages/age_1.webp", name: "Dark Age", category: "Age", age: 1 },
  { path: "ages/age_2.webp", name: "Feudal Age", category: "Age", age: 2 },
  { path: "ages/age_3.webp", name: "Castle Age", category: "Age", age: 3 },
  { path: "ages/age_4.webp", name: "Imperial Age", category: "Age", age: 4 },
];

/** Local asset path for an entity's icon, e.g. images/units/longbowman-4.png. */
export function iconLocalPath(kind: Kind, entity: Aoe4WorldEntity): string | null {
  if (!entity.icon) return null;
  let filename: string;
  try {
    filename = new URL(entity.icon).pathname.split("/").pop() ?? "";
  } catch {
    filename = entity.icon.split("/").pop() ?? "";
  }
  return filename ? `images/${kind}/${filename}` : null;
}

/**
 * Build the full icon catalog from aoe4world entities: one entry per distinct
 * icon path (dedup), keeping the lowest age and OR-ing the unique flag,
 * collapsing the civ-restriction when an icon covers every civ, then merging
 * the static resource/age entries and sorting by category then name. Pure.
 */
export function buildIconCatalog(
  units: Aoe4WorldEntity[],
  buildings: Aoe4WorldEntity[],
  technologies: Aoe4WorldEntity[],
): IconEntry[] {
  type Acc = { entry: IconEntry; civCodes: Set<string> };
  const byPath = new Map<string, Acc>();

  const ingest = (kind: Kind, e: Aoe4WorldEntity) => {
    const path = iconLocalPath(kind, e);
    if (!path) return;
    let acc = byPath.get(path);
    if (!acc) {
      acc = {
        entry: { path, name: e.name, category: KIND_TO_CATEGORY[kind], age: e.age, unique: e.unique },
        civCodes: new Set(),
      };
      byPath.set(path, acc);
    }
    for (const c of e.civs ?? []) acc.civCodes.add(c);
    if (typeof e.age === "number" && (acc.entry.age === undefined || e.age < acc.entry.age)) {
      acc.entry.age = e.age;
    }
    if (e.unique) acc.entry.unique = true;
  };

  for (const e of units) ingest("units", e);
  for (const e of buildings) ingest("buildings", e);
  for (const e of technologies) ingest("technologies", e);

  const gameIcons: IconEntry[] = [];
  for (const acc of byPath.values()) {
    const civs = Array.from(
      new Set(
        Array.from(acc.civCodes)
          .map((c) => CODE_TO_CIV[c])
          .filter((v): v is string => Boolean(v)),
      ),
    ).sort();
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
  code: string;
  variantOf?: string;
  flagPath: string;
  uniqueUnits: string[];
  landmarks: string[];
  tagline: string;
};

/** Group entities by internal civ id from their aoe4world civ codes. */
export function groupByCiv(entities: Aoe4WorldEntity[]): Map<string, Aoe4WorldEntity[]> {
  const out = new Map<string, Aoe4WorldEntity[]>();
  for (const e of entities) {
    for (const code of e.civs ?? []) {
      const id = CODE_TO_CIV[code];
      if (!id) continue;
      const list = out.get(id) ?? [];
      list.push(e);
      out.set(id, list);
    }
  }
  return out;
}

export function buildCivData(
  unitsByCiv: Map<string, Aoe4WorldEntity[]>,
  buildingsByCiv: Map<string, Aoe4WorldEntity[]>,
): CivData[] {
  return CIV_META.map((meta) => {
    const uniqueUnits = Array.from(
      new Set(
        (unitsByCiv.get(meta.id) ?? [])
          .filter((e) => e.unique)
          .sort((a, b) => a.age - b.age)
          .map((e) => e.name),
      ),
    );
    const landmarks = Array.from(
      new Set(
        (buildingsByCiv.get(meta.id) ?? [])
          .filter((e) => {
            const flat = (e.classes ?? []).concat(e.displayClasses ?? []).join(" ").toLowerCase();
            return flat.includes("landmark") || flat.includes("wonder");
          })
          .sort((a, b) => a.age - b.age)
          .map((e) => e.name),
      ),
    );
    const taglineParts = [...uniqueUnits.slice(0, 2), landmarks[0]].filter(Boolean) as string[];
    return {
      id: meta.id,
      name: meta.name,
      code: CIV_TO_CODE[meta.id],
      variantOf: meta.variantOf,
      flagPath: `flags/${meta.id}.png`,
      uniqueUnits,
      landmarks,
      tagline: taglineParts.length > 0 ? taglineParts.join(" • ") : "Civilization",
    };
  });
}

/**
 * Map old rts-overlay kebab paths → new aoe4world paths by matching basename
 * slugs (with and without the age suffix). Pure: takes the list of old
 * `<folder>/<file>` paths instead of walking the disk.
 */
export function buildPathMigration(
  newCatalog: IconEntry[],
  oldPaths: string[],
): Record<string, string> {
  const newIndex = new Map<string, string>();
  for (const e of newCatalog) {
    const base = (e.path.split("/").pop() ?? "").replace(/\.(png|webp)$/i, "");
    const withAge = slugify(base);
    const noAge = slugify(stripAge(base));
    if (!newIndex.has(withAge)) newIndex.set(withAge, e.path);
    if (!newIndex.has(noAge)) newIndex.set(noAge, e.path);
  }

  const out: Record<string, string> = {};
  for (const oldPath of oldPaths) {
    if (!/\.(webp|png)$/i.test(oldPath)) continue;
    const base = (oldPath.split("/").pop() ?? "").replace(/\.(webp|png)$/i, "");
    const newPath = newIndex.get(slugify(base)) ?? newIndex.get(slugify(stripAge(base)));
    if (newPath && newPath !== oldPath) out[oldPath] = newPath;
  }

  // Static relocations.
  out["age/age-1.webp"] = "ages/age_1.webp";
  out["age/age-2.webp"] = "ages/age_2.webp";
  out["age/age-3.webp"] = "ages/age_3.webp";
  out["age/age-4.webp"] = "ages/age_4.webp";
  out["resource/resource-food.webp"] = "resources/food.png";
  out["resource/resource-wood.webp"] = "resources/wood.png";
  out["resource/resource-gold.webp"] = "resources/gold.png";
  out["resource/resource-stone.webp"] = "resources/stone.png";
  out["resource/oliveoil.webp"] = "resources/oliveoil.png";
  for (const meta of CIV_META) {
    out[`civilization-flag/${meta.id}.webp`] = `flags/${meta.id}.png`;
  }
  return out;
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
    '  /** Path relative to /aoe4/, e.g. "images/units/longbowman-4.png". */',
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
    "  /** aoe4world 2-letter civ code. */",
    "  code: string;",
    "  variantOf?: string;",
    '  /** Path relative to /aoe4/, e.g. "flags/english.png". */',
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
    lines.push(`    code: ${JSON.stringify(c.code)},`);
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

export function emitMigrationTs(mapping: Record<string, string>): string {
  const lines = [
    "// Generated by scripts/sync-aoe4-data.ts. Do not edit.",
    "//",
    "// Maps old asset paths (kebab-case rts-overlay layout) to new aoe4world paths.",
    "// Used by storage.ts to migrate {{...}} icon tokens in saved build orders.",
    "",
    "export const PATH_MIGRATION: Readonly<Record<string, string>> = Object.freeze({",
  ];
  for (const [k, v] of Object.entries(mapping).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  }
  lines.push("});");
  lines.push("");
  return lines.join("\n");
}

// ---------- IO (only reached from main) ----------
const FETCH_TIMEOUT_MS = 30_000;
const POOL_SIZE = 8;

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

async function fetchKind(kind: Kind): Promise<Aoe4WorldEntity[]> {
  const url = `https://data.aoe4world.com/${kind}/all.json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  const doc = (await res.json()) as { data: Aoe4WorldEntity[] };
  return doc.data;
}

type Download = { url: string; localPath: string };

async function downloadAll(downloads: Download[]): Promise<{ skipped: number; downloaded: number; failed: number }> {
  const tally = { skipped: 0, downloaded: 0, failed: 0 };
  let next = 0;
  const worker = async () => {
    for (let i = next++; i < downloads.length; i = next++) {
      const d = downloads[i];
      if (fileNonEmpty(d.localPath)) {
        tally.skipped++;
        continue;
      }
      ensureDir(dirname(d.localPath));
      try {
        const res = await fetch(d.url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        if (!res.ok) {
          tally.failed++;
          continue;
        }
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.byteLength === 0) {
          tally.failed++;
          continue;
        }
        writeFileSync(d.localPath, buf);
        tally.downloaded++;
      } catch {
        tally.failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: POOL_SIZE }, worker));
  return tally;
}

/** Enumerate `<folder>/<file>` asset paths under the old rts-overlay mirror. */
function readOldMirrorPaths(): string[] {
  if (!existsSync(OLD_MIRROR)) return [];
  const out: string[] = [];
  for (const folder of readdirSync(OLD_MIRROR)) {
    const dir = join(OLD_MIRROR, folder);
    try {
      if (!statSync(dir).isDirectory()) continue;
    } catch {
      continue;
    }
    for (const file of readdirSync(dir)) {
      if (/\.(webp|png)$/i.test(file)) out.push(`${folder}/${file}`);
    }
  }
  return out;
}

async function main() {
  console.error("Fetching aoe4world data...");
  const [units, buildings, technologies] = await Promise.all([
    fetchKind("units"),
    fetchKind("buildings"),
    fetchKind("technologies"),
  ]);
  console.error(`  units: ${units.length}, buildings: ${buildings.length}, techs: ${technologies.length}`);

  const catalog = buildIconCatalog(units, buildings, technologies);

  // Download queue: game icons + flags + resources.
  ensureDir(PUBLIC_ROOT);
  const downloads: Download[] = [];
  for (const e of catalog) {
    if (e.path.startsWith("images/")) {
      downloads.push({ url: `https://data.aoe4world.com/${e.path}`, localPath: join(PUBLIC_ROOT, e.path) });
    }
  }
  for (const meta of CIV_META) {
    downloads.push({
      url: `https://raw.githubusercontent.com/aoe4world/explorer/main/assets/flags/${meta.flagSource}`,
      localPath: join(PUBLIC_ROOT, "flags", `${meta.id}.png`),
    });
  }
  for (const r of ["food", "wood", "gold", "stone", "oliveoil", "silver", "popcap", "time"]) {
    downloads.push({
      url: `https://raw.githubusercontent.com/aoe4world/explorer/main/assets/resources/${r}.png`,
      localPath: join(PUBLIC_ROOT, "resources", `${r}.png`),
    });
  }
  console.error(`Queued ${downloads.length} downloads.`);
  const tally = await downloadAll(downloads);
  console.error(`Done: skipped=${tally.skipped} downloaded=${tally.downloaded} failed=${tally.failed}`);

  // Age icons from the old mirror.
  ensureDir(join(PUBLIC_ROOT, "ages"));
  for (let n = 1; n <= 4; n++) {
    const dst = join(PUBLIC_ROOT, "ages", `age_${n}.webp`);
    const src = join(OLD_MIRROR, "age", `age-${n}.webp`);
    if (!fileNonEmpty(dst) && fileNonEmpty(src)) copyFileSync(src, dst);
  }

  const civData = buildCivData(groupByCiv(units), groupByCiv(buildings));
  const migration = buildPathMigration(catalog, readOldMirrorPaths());

  // Drop catalog entries whose icon failed to download (aoe4world 404s).
  const prunedCatalog = catalog.filter((e) => fileNonEmpty(join(PUBLIC_ROOT, e.path)));

  ensureDir(GENERATED_ROOT);
  writeFileSync(join(GENERATED_ROOT, "icons.ts"), emitIconsTs(prunedCatalog));
  writeFileSync(join(GENERATED_ROOT, "civData.ts"), emitCivDataTs(civData));
  writeFileSync(join(GENERATED_ROOT, "pathMigration.ts"), emitMigrationTs(migration));

  const manifest = {
    generatedAt: new Date().toISOString(),
    sources: {
      units: "https://data.aoe4world.com/units/all.json",
      buildings: "https://data.aoe4world.com/buildings/all.json",
      technologies: "https://data.aoe4world.com/technologies/all.json",
      flags: "https://github.com/aoe4world/explorer/tree/main/assets/flags",
      resources: "https://github.com/aoe4world/explorer/tree/main/assets/resources",
      ages: "copied from prior public/assets/aoe4/age/ (rts-overlay)",
    },
    counts: {
      civs: CIV_META.length,
      units: units.length,
      buildings: buildings.length,
      technologies: technologies.length,
      icons: prunedCatalog.length,
      pathMigrations: Object.keys(migration).length,
    },
  };
  writeFileSync(join(PUBLIC_ROOT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.error(
    `Synced ${manifest.counts.civs} civs, ${prunedCatalog.length} catalog icons; ${Object.keys(migration).length} path migrations.`,
  );
}

// Run only when executed directly (Bun sets import.meta.main); never on import.
if ((import.meta as { main?: boolean }).main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
