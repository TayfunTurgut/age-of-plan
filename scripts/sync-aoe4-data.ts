#!/usr/bin/env bun
/**
 * Single source-of-truth sync for AoE4 game data and icons.
 *
 *   data:      https://data.aoe4world.com/{units,buildings,technologies}/all.json
 *   icons:     per-entity `icon` URL (https://data.aoe4world.com/images/...)
 *   flags:     https://raw.githubusercontent.com/aoe4world/explorer/main/assets/flags/...
 *   resources: https://raw.githubusercontent.com/aoe4world/explorer/main/assets/resources/...
 *   ages:      copied from the existing public/assets/aoe4/age/ .webp files
 *              (rts-overlay only ships .webp; aoe4world has no age icons)
 *
 * Output layout:
 *   public/aoe4/images/{units,buildings,technologies}/<id>.png
 *   public/aoe4/flags/<civ-id>.png
 *   public/aoe4/resources/<name>.png
 *   public/aoe4/ages/age_{1..4}.webp
 *   public/aoe4/manifest.json
 *   src/data/generated/icons.ts
 *   src/data/generated/civData.ts
 *   src/data/generated/pathMigration.ts
 *
 * Idempotent: existing non-empty files are skipped.
 * Run via:  bun run sync-data       (or)   npx tsx scripts/sync-aoe4-data.ts
 */

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";

const PUBLIC_ROOT = "public/aoe4";
const GENERATED_ROOT = "src/data/generated";
const OLD_MIRROR = "public/assets/aoe4";

// ---------- Civ mapping (verified against data.aoe4world.com) ----------
type CivId = string;
type AoeCode = string;

const CODE_TO_CIV: Record<AoeCode, CivId> = {
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

const CIV_TO_CODE: Record<CivId, AoeCode> = Object.fromEntries(
  Object.entries(CODE_TO_CIV).map(([k, v]) => [v, k]),
);

const ALL_CIV_IDS = Object.values(CODE_TO_CIV).sort();

// Editorial civ metadata that aoe4world doesn't provide.
type CivMeta = {
  id: CivId;
  name: string;
  variantOf?: CivId;
  /** Filename in aoe4world/explorer/assets/flags/. */
  flagSource: string;
};

const CIV_META: CivMeta[] = [
  // Base civs (12)
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
  // Variants (10)
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

// ---------- Tiny utilities ----------
const ensureDir = (path: string): void => {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
};

const fileNonEmpty = (path: string): boolean => {
  try {
    return statSync(path).size > 0;
  } catch {
    return false;
  }
};

const slugify = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const stripAge = (basename: string): string => basename.replace(/-\d+$/, "");

// ---------- Type definitions for what we fetch ----------
type Aoe4WorldEntity = {
  id: string;
  baseId: string;
  type: "unit" | "building" | "technology";
  name: string;
  age: number;
  civs: AoeCode[];
  unique: boolean;
  icon: string;
  classes?: string[];
  displayClasses?: string[];
};

type Aoe4WorldDoc = { data: Aoe4WorldEntity[] };

type Kind = "units" | "buildings" | "technologies";

const fetchKind = async (kind: Kind): Promise<Aoe4WorldEntity[]> => {
  const url = `https://data.aoe4world.com/${kind}/all.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  const doc = (await res.json()) as Aoe4WorldDoc;
  return doc.data;
};

// ---------- Concurrent download with idempotent skip ----------
type Download = { url: string; localPath: string; descriptor: string };

const downloadOne = async (d: Download): Promise<"skipped" | "downloaded" | "failed"> => {
  if (fileNonEmpty(d.localPath)) return "skipped";
  ensureDir(dirname(d.localPath));
  try {
    const res = await fetch(d.url);
    if (!res.ok) {
      console.error(`  fail ${res.status}  ${d.descriptor}  ${d.url}`);
      return "failed";
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0) {
      console.error(`  empty body  ${d.descriptor}  ${d.url}`);
      return "failed";
    }
    writeFileSync(d.localPath, buf);
    return "downloaded";
  } catch (err) {
    console.error(`  error  ${d.descriptor}  ${(err as Error).message}`);
    return "failed";
  }
};

const POOL_SIZE = 8;

const downloadAll = async (downloads: Download[], label: string): Promise<{ skipped: number; downloaded: number; failed: number }> => {
  const tally = { skipped: 0, downloaded: 0, failed: 0 };
  let next = 0;
  let lastReport = 0;
  const total = downloads.length;
  const worker = async () => {
    while (true) {
      const i = next++;
      if (i >= total) return;
      const result = await downloadOne(downloads[i]);
      tally[result] += 1;
      // Progress log every ~25
      const done = tally.skipped + tally.downloaded + tally.failed;
      if (done - lastReport >= 25 || done === total) {
        lastReport = done;
        console.error(`  [${label}] ${done}/${total} (skipped ${tally.skipped}, downloaded ${tally.downloaded}, failed ${tally.failed})`);
      }
    }
  };
  await Promise.all(Array.from({ length: POOL_SIZE }, worker));
  return tally;
};

// ---------- Catalog assembly ----------
type IconCategory = "Resource" | "Age" | "Unit" | "Building" | "Technology";

type IconEntry = {
  path: string;
  name: string;
  category: IconCategory;
  civs?: CivId[];
  age?: number;
  unique?: boolean;
};

const KIND_TO_CATEGORY: Record<Kind, IconCategory> = {
  units: "Unit",
  buildings: "Building",
  technologies: "Technology",
};

const STATIC_RESOURCES: IconEntry[] = [
  { path: "resources/food.png", name: "Food", category: "Resource" },
  { path: "resources/wood.png", name: "Wood", category: "Resource" },
  { path: "resources/gold.png", name: "Gold", category: "Resource" },
  { path: "resources/stone.png", name: "Stone", category: "Resource" },
  { path: "resources/oliveoil.png", name: "Olive Oil", category: "Resource", civs: ["ayyubids", "byzantines"] },
  { path: "resources/silver.png", name: "Silver", category: "Resource", civs: ["macedonian"] },
];

const STATIC_AGES: IconEntry[] = [
  { path: "ages/age_1.webp", name: "Dark Age", category: "Age", age: 1 },
  { path: "ages/age_2.webp", name: "Feudal Age", category: "Age", age: 2 },
  { path: "ages/age_3.webp", name: "Castle Age", category: "Age", age: 3 },
  { path: "ages/age_4.webp", name: "Imperial Age", category: "Age", age: 4 },
];

// ---------- Path migration map (old kebab paths → new images paths) ----------
type MigrationPair = { oldPath: string; newPath: string };

const buildPathMigration = (
  newCatalog: IconEntry[],
): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!existsSync(OLD_MIRROR)) {
    console.error("  (old mirror not found — skipping path migration)");
    return out;
  }

  // Index new catalog by slug (basename without age suffix or extension).
  const newIndex = new Map<string, string>();
  for (const e of newCatalog) {
    const base = e.path.split("/").pop() ?? "";
    const baseNoExt = base.replace(/\.(png|webp)$/i, "");
    const slug = slugify(stripAge(baseNoExt));
    if (!newIndex.has(slug)) newIndex.set(slug, e.path);
    // Also map the variation-with-age form (e.g. "longbowman-4")
    const slugWithAge = slugify(baseNoExt);
    if (!newIndex.has(slugWithAge)) newIndex.set(slugWithAge, e.path);
  }

  // Walk every file under the old mirror and try to map it.
  for (const folder of readdirSync(OLD_MIRROR)) {
    const dir = join(OLD_MIRROR, folder);
    let s;
    try {
      s = statSync(dir);
    } catch {
      continue;
    }
    if (!s.isDirectory()) continue;
    for (const file of readdirSync(dir)) {
      if (!/\.(webp|png)$/i.test(file)) continue;
      const oldPath = `${folder}/${file}`;
      const baseNoExt = file.replace(/\.(webp|png)$/i, "");
      const slugWithAge = slugify(baseNoExt);
      const slug = slugify(stripAge(baseNoExt));
      const newPath = newIndex.get(slugWithAge) ?? newIndex.get(slug);
      if (newPath && newPath !== oldPath) out[oldPath] = newPath;
    }
  }
  // Static substitutions for assets we explicitly relocate.
  out["age/age-1.webp"] = "ages/age_1.webp";
  out["age/age-2.webp"] = "ages/age_2.webp";
  out["age/age-3.webp"] = "ages/age_3.webp";
  out["age/age-4.webp"] = "ages/age_4.webp";
  out["resource/resource-food.webp"] = "resources/food.png";
  out["resource/resource-wood.webp"] = "resources/wood.png";
  out["resource/resource-gold.webp"] = "resources/gold.png";
  out["resource/resource-stone.webp"] = "resources/stone.png";
  out["resource/oliveoil.webp"] = "resources/oliveoil.png";
  // Civ flags
  for (const meta of CIV_META) {
    out[`civilization-flag/${meta.id}.webp`] = `flags/${meta.id}.png`;
  }
  return out;
};

// ---------- Code emitters ----------
const emitIconsTs = (catalog: IconEntry[]): string => {
  const lines: string[] = [];
  lines.push("// Generated by scripts/sync-aoe4-data.ts. Do not edit.");
  lines.push("");
  lines.push("export type IconCategory =");
  lines.push("  | \"Resource\"");
  lines.push("  | \"Age\"");
  lines.push("  | \"Unit\"");
  lines.push("  | \"Building\"");
  lines.push("  | \"Technology\";");
  lines.push("");
  lines.push("export type IconEntry = {");
  lines.push("  /** Path relative to /aoe4/, e.g. \"images/units/longbowman-4.png\". */");
  lines.push("  path: string;");
  lines.push("  name: string;");
  lines.push("  category: IconCategory;");
  lines.push("  /** Civ ids the entry is restricted to. Undefined = available to all civs. */");
  lines.push("  civs?: string[];");
  lines.push("  /** 1-4 when the item becomes available. */");
  lines.push("  age?: number;");
  lines.push("  /** True for unique units / unique buildings / unique techs. */");
  lines.push("  unique?: boolean;");
  lines.push("};");
  lines.push("");
  lines.push("export const ICON_CATEGORIES: readonly IconCategory[] = [");
  lines.push("  \"Resource\",");
  lines.push("  \"Age\",");
  lines.push("  \"Unit\",");
  lines.push("  \"Building\",");
  lines.push("  \"Technology\",");
  lines.push("] as const;");
  lines.push("");
  lines.push("export const ICON_CATALOG: readonly IconEntry[] = Object.freeze([");
  for (const e of catalog) {
    const parts: string[] = [`path: ${JSON.stringify(e.path)}`, `name: ${JSON.stringify(e.name)}`, `category: ${JSON.stringify(e.category)}`];
    if (e.civs) parts.push(`civs: [${e.civs.map((c) => JSON.stringify(c)).join(", ")}]`);
    if (e.age !== undefined) parts.push(`age: ${e.age}`);
    if (e.unique) parts.push("unique: true");
    lines.push(`  { ${parts.join(", ")} },`);
  }
  lines.push("]);");
  lines.push("");
  lines.push("/** Catalog entries available to a given civ, sorted by category then name. */");
  lines.push("export const getIconsForCiv = (civId: string): IconEntry[] =>");
  lines.push("  ICON_CATALOG.filter((e) => !e.civs || e.civs.includes(civId)).slice();");
  lines.push("");
  return lines.join("\n");
};

type CivData = {
  id: CivId;
  name: string;
  code: AoeCode;
  variantOf?: CivId;
  flagPath: string;
  uniqueUnits: string[];
  landmarks: string[];
  tagline: string;
};

const buildCivData = (
  unitsByCiv: Map<CivId, Aoe4WorldEntity[]>,
  buildingsByCiv: Map<CivId, Aoe4WorldEntity[]>,
): CivData[] => {
  return CIV_META.map((meta) => {
    const code = CIV_TO_CODE[meta.id];
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
    const tagline =
      taglineParts.length > 0 ? taglineParts.join(" • ") : "Civilization";
    return {
      id: meta.id,
      name: meta.name,
      code,
      variantOf: meta.variantOf,
      flagPath: `flags/${meta.id}.png`,
      uniqueUnits,
      landmarks,
      tagline,
    };
  });
};

const emitCivDataTs = (data: CivData[]): string => {
  const lines: string[] = [];
  lines.push("// Generated by scripts/sync-aoe4-data.ts. Do not edit.");
  lines.push("");
  lines.push("export type CivData = {");
  lines.push("  id: string;");
  lines.push("  name: string;");
  lines.push("  /** aoe4world 2-letter civ code. */");
  lines.push("  code: string;");
  lines.push("  variantOf?: string;");
  lines.push("  /** Path relative to /aoe4/, e.g. \"flags/english.png\". */");
  lines.push("  flagPath: string;");
  lines.push("  /** Display names of unique units, sorted by age. */");
  lines.push("  uniqueUnits: string[];");
  lines.push("  /** Display names of civ landmarks, sorted by age. */");
  lines.push("  landmarks: string[];");
  lines.push("  /** Auto-generated from the top 2 unique units + first landmark. */");
  lines.push("  tagline: string;");
  lines.push("};");
  lines.push("");
  lines.push("export const CIV_DATA: readonly CivData[] = Object.freeze([");
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
};

const emitMigrationTs = (mapping: Record<string, string>): string => {
  const lines: string[] = [];
  lines.push("// Generated by scripts/sync-aoe4-data.ts. Do not edit.");
  lines.push("//");
  lines.push("// Maps old asset paths (kebab-case rts-overlay layout) to new aoe4world paths.");
  lines.push("// Used by storage.ts to migrate {{...}} icon tokens in saved build orders.");
  lines.push("");
  lines.push("export const PATH_MIGRATION: Readonly<Record<string, string>> = Object.freeze({");
  for (const [k, v] of Object.entries(mapping).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  }
  lines.push("});");
  lines.push("");
  return lines.join("\n");
};

// ---------- Main ----------
const main = async () => {
  console.error("Fetching aoe4world data...");
  const [units, buildings, technologies] = await Promise.all([
    fetchKind("units"),
    fetchKind("buildings"),
    fetchKind("technologies"),
  ]);
  console.error(`  units: ${units.length}, buildings: ${buildings.length}, techs: ${technologies.length}`);

  // Sanity-check civ codes
  const seen = new Set<string>();
  for (const e of [...units, ...buildings, ...technologies]) {
    for (const c of e.civs ?? []) seen.add(c);
  }
  for (const c of seen) {
    if (!CODE_TO_CIV[c]) {
      console.error(`  WARNING: unrecognized civ code from aoe4world: "${c}"`);
    }
  }

  // ---------- Build the icon catalog (one entry per distinct icon URL) ----------
  type Accumulator = { entry: IconEntry; civCodes: Set<AoeCode>; ages: Set<number> };
  const byPath = new Map<string, Accumulator>();

  const ingest = (kind: Kind, e: Aoe4WorldEntity): void => {
    if (!e.icon) return;
    const url = new URL(e.icon);
    const filename = url.pathname.split("/").pop() ?? "";
    if (!filename) return;
    const localPath = `images/${kind}/${filename}`;
    let acc = byPath.get(localPath);
    if (!acc) {
      acc = {
        entry: {
          path: localPath,
          name: e.name,
          category: KIND_TO_CATEGORY[kind],
          age: e.age,
          unique: e.unique,
        },
        civCodes: new Set(),
        ages: new Set(),
      };
      byPath.set(localPath, acc);
    }
    for (const c of e.civs ?? []) acc.civCodes.add(c);
    if (typeof e.age === "number") acc.ages.add(e.age);
    // If multiple variations share an icon, keep the lowest age and OR the unique flag.
    if (typeof e.age === "number" && (acc.entry.age === undefined || e.age < acc.entry.age)) {
      acc.entry.age = e.age;
    }
    if (e.unique) acc.entry.unique = true;
  };

  for (const e of units) ingest("units", e);
  for (const e of buildings) ingest("buildings", e);
  for (const e of technologies) ingest("technologies", e);

  // Convert civ-code sets to internal civ id arrays. If the entry covers all
  // 22 civs, drop the restriction entirely.
  const finalIcons: IconEntry[] = [];
  for (const acc of byPath.values()) {
    const civs = Array.from(acc.civCodes)
      .map((c) => CODE_TO_CIV[c])
      .filter(Boolean) as CivId[];
    const dedup = Array.from(new Set(civs)).sort();
    if (dedup.length > 0 && dedup.length < ALL_CIV_IDS.length) {
      acc.entry.civs = dedup;
    }
    finalIcons.push(acc.entry);
  }
  finalIcons.sort((a, b) => a.path.localeCompare(b.path));

  // Final catalog order: Resources, Ages, Units, Buildings, Technologies (by name)
  const CATEGORY_ORDER: IconCategory[] = ["Resource", "Age", "Unit", "Building", "Technology"];
  const fullCatalog: IconEntry[] = [
    ...STATIC_RESOURCES,
    ...STATIC_AGES,
    ...finalIcons,
  ].sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category);
    const cb = CATEGORY_ORDER.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name);
  });

  // ---------- Build the download queue ----------
  ensureDir(PUBLIC_ROOT);
  const downloads: Download[] = [];

  // Game icons (one per distinct icon URL)
  for (const acc of byPath.values()) {
    const localPath = join(PUBLIC_ROOT, acc.entry.path);
    const url = `https://data.aoe4world.com/${acc.entry.path}`;
    downloads.push({ url, localPath, descriptor: acc.entry.path });
  }

  // Civ flags
  for (const meta of CIV_META) {
    downloads.push({
      url: `https://raw.githubusercontent.com/aoe4world/explorer/main/assets/flags/${meta.flagSource}`,
      localPath: join(PUBLIC_ROOT, "flags", `${meta.id}.png`),
      descriptor: `flags/${meta.id}.png`,
    });
  }

  // Resource icons
  for (const r of ["food", "wood", "gold", "stone", "oliveoil", "silver", "popcap", "time"]) {
    downloads.push({
      url: `https://raw.githubusercontent.com/aoe4world/explorer/main/assets/resources/${r}.png`,
      localPath: join(PUBLIC_ROOT, "resources", `${r}.png`),
      descriptor: `resources/${r}.png`,
    });
  }

  console.error(`Queued ${downloads.length} downloads.`);
  const tally = await downloadAll(downloads, "icons");
  console.error(`Done: skipped=${tally.skipped} downloaded=${tally.downloaded} failed=${tally.failed}`);

  // ---------- Copy age icons from old mirror (rts-overlay .webp) ----------
  ensureDir(join(PUBLIC_ROOT, "ages"));
  let agesCopied = 0;
  for (let n = 1; n <= 4; n++) {
    const dst = join(PUBLIC_ROOT, "ages", `age_${n}.webp`);
    if (fileNonEmpty(dst)) continue;
    const src = join(OLD_MIRROR, "age", `age-${n}.webp`);
    if (fileNonEmpty(src)) {
      copyFileSync(src, dst);
      agesCopied += 1;
    } else {
      console.error(`  WARNING: age icon source missing: ${src}`);
    }
  }
  console.error(`Ages copied: ${agesCopied}/4`);

  // ---------- Build civData (uses unit/building lists per civ) ----------
  const unitsByCiv = new Map<CivId, Aoe4WorldEntity[]>();
  const buildingsByCiv = new Map<CivId, Aoe4WorldEntity[]>();
  for (const u of units) {
    for (const c of u.civs ?? []) {
      const id = CODE_TO_CIV[c];
      if (!id) continue;
      const list = unitsByCiv.get(id) ?? [];
      list.push(u);
      unitsByCiv.set(id, list);
    }
  }
  for (const b of buildings) {
    for (const c of b.civs ?? []) {
      const id = CODE_TO_CIV[c];
      if (!id) continue;
      const list = buildingsByCiv.get(id) ?? [];
      list.push(b);
      buildingsByCiv.set(id, list);
    }
  }
  const civData = buildCivData(unitsByCiv, buildingsByCiv);

  // ---------- Build path migration map ----------
  console.error("Building path migration map from old mirror...");
  const migration = buildPathMigration(fullCatalog);
  console.error(`  ${Object.keys(migration).length} migrations`);

  // ---------- Validation: drop catalog entries whose icon failed to download ----------
  let missingFlags = 0;
  for (const meta of CIV_META) {
    const flagPath = join(PUBLIC_ROOT, "flags", `${meta.id}.png`);
    if (!fileNonEmpty(flagPath)) {
      console.error(`  validation: missing civ flag ${flagPath}`);
      missingFlags += 1;
    }
  }
  const beforePrune = fullCatalog.length;
  const prunedCatalog = fullCatalog.filter((e) => fileNonEmpty(join(PUBLIC_ROOT, e.path)));
  const dropped = beforePrune - prunedCatalog.length;
  if (dropped > 0) {
    console.error(`  validation: dropped ${dropped} catalog entries with missing icons (aoe4world 404s)`);
  }
  if (missingFlags > 0) {
    console.error(`  WARNING: ${missingFlags} civ flags missing — fix CIV_META[].flagSource`);
  }

  // ---------- Emit generated TS files ----------
  ensureDir(GENERATED_ROOT);
  writeFileSync(join(GENERATED_ROOT, "icons.ts"), emitIconsTs(prunedCatalog));
  writeFileSync(join(GENERATED_ROOT, "civData.ts"), emitCivDataTs(civData));
  writeFileSync(join(GENERATED_ROOT, "pathMigration.ts"), emitMigrationTs(migration));

  // ---------- Manifest ----------
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

  console.error("");
  console.error(`Synced: ${manifest.counts.civs} civs, ${units.length} units, ${buildings.length} buildings, ${technologies.length} technologies, ${prunedCatalog.length} catalog icons.`);
  console.error(`Generated: ${GENERATED_ROOT}/{icons,civData,pathMigration}.ts`);
  console.error(`Manifest:  ${PUBLIC_ROOT}/manifest.json`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
