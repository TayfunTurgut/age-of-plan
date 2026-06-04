import { ICON_CATALOG } from "@/data/generated/icons";

/**
 * Maps aoe4guides.com image assets onto our internal `{{path.ext}}` icon
 * tokens. aoe4guides paths look like `/assets/pictures/<category>/<file>.webp`
 * (or absolute `https://aoe4guides.com/assets/pictures/...`).
 *
 * Since aoe4guides is our own source of truth, our canonical icon path is simply
 * `images/<category>/<file>.webp` — the same `<category>/<file>` with an
 * `images/` prefix. So resolution tries, in order: hand overrides (UI markers,
 * resource glyphs that don't live under `images/`), the direct `images/<rest>`
 * catalog path, then the alternate extension. Civ flags and per-civ villager
 * glyphs are explicit branches.
 */

const CATALOG_PATHS = new Set(ICON_CATALOG.map((e) => e.path));

/**
 * Hand overrides for assets that don't live under `images/` (UI markers and
 * resource glyphs). Keys are the hyphen-normalized `<category>/<file>` form.
 */
const AOE4GUIDES_ALIASES: Record<string, string> = {
  // UI-marker imgs aoe4guides drops inline (often without title/alt).
  "resource/rally.webp": "general/rally.webp",
  "resource/build.webp": "general/build.webp",
  "abilities/repair.webp": "general/build.webp",
  // Resource glyphs.
  "resource/resource-food.webp": "resources/food.webp",
  "resource/resource-wood.webp": "resources/wood.webp",
  "resource/resource-gold.webp": "resources/gold.webp",
  "resource/resource-stone.webp": "resources/stone.webp",
  "resource/oliveoil.webp": "resources/oliveoil.webp",
  // Age glyphs.
  "age/age-1.webp": "ages/age_1.webp",
  "age/age-2.webp": "ages/age_2.webp",
  "age/age-3.webp": "ages/age_3.webp",
  "age/age-4.webp": "ages/age_4.webp",
};

/**
 * aoe4guides' 3-letter civ-flag basenames → our `flags/<civ>.webp` ids
 * (e.g. `goh` → `golden-horde`).
 */
const FLAG_BASENAME_TO_CIV: Record<string, string> = {
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

/** Swap a key's `.png`↔`.webp` extension, or return null if it has neither. */
function swapExtension(key: string): string | null {
  if (key.endsWith(".png")) return `${key.slice(0, -4)}.webp`;
  if (key.endsWith(".webp")) return `${key.slice(0, -5)}.png`;
  return null;
}

/** A `<category>/<file>.ext` is one of our canonical catalog paths under images/. */
function catalogPathFor(rawRest: string): string | null {
  const direct = `images/${rawRest}`;
  if (CATALOG_PATHS.has(direct)) return direct;
  const alt = swapExtension(rawRest);
  if (alt && CATALOG_PATHS.has(`images/${alt}`)) return `images/${alt}`;
  return null;
}

const PICTURES_RE = /^(?:https?:\/\/aoe4guides\.com)?\/assets\/pictures\/(.+)$/;
const FLAG_RE = /^civilization-flag\/([a-z]+)\.(?:webp|png)$/;
const VILLAGER_RE = /^unit-worker\/villager-[a-z-]+\.(?:webp|png)$/;

/**
 * Convert an aoe4guides `<img src>` into an internal `{{path.ext}}` token, or
 * `null` when the URL isn't a recognized aoe4guides asset. The caller then
 * falls back to title/alt and finally a capitalized-basename text label.
 */
export function aoe4GuidesSrcToToken(src: string | undefined | null): string | null {
  if (!src || typeof src !== "string") return null;
  const m = src.match(PICTURES_RE);
  if (!m) return null;
  const rawRest = m[1];
  const key = rawRest.replace(/_/g, "-");

  // Hand overrides win (markers / resource glyphs that aren't under images/).
  const override = AOE4GUIDES_ALIASES[key] ?? AOE4GUIDES_ALIASES[swapExtension(key) ?? ""];
  if (override) return `{{${override}}}`;

  // Our canonical path is images/<rest> — the common case for current assets.
  const direct = catalogPathFor(rawRest);
  if (direct) return `{{${direct}}}`;

  // Civ flags resolve by 3-letter code.
  const flag = key.match(FLAG_RE);
  if (flag) {
    const civ = FLAG_BASENAME_TO_CIV[flag[1]];
    if (civ) return `{{flags/${civ}.webp}}`;
  }

  // aoe4guides ships per-civ villager glyphs; we collapse them onto one icon.
  if (VILLAGER_RE.test(key)) {
    const generic = catalogPathFor("unit_worker/villager.webp");
    if (generic) return `{{${generic}}}`;
  }

  return null;
}

/**
 * Convert the `@<category>/<file>.ext@` icon syntax from aoe4guides' clipboard /
 * `.bo` exports into our `{{path.ext}}` token (or null). Thin wrapper that
 * prepends the `/assets/pictures/` prefix the clipboard format omits.
 */
export function aoe4GuidesAtTokenPathToToken(
  path: string | undefined | null,
): string | null {
  if (!path || typeof path !== "string") return null;
  return aoe4GuidesSrcToToken(`/assets/pictures/${path}`);
}

/**
 * Substitute the bare word `build` with our `{{general/build.webp}}` marker —
 * aoe4guides notes use `build` as an icon keyword. Word boundaries protect
 * `builder`, `building`, `rebuild`. The leading alternation passes through any
 * `{{…}}` token already inserted, so an existing `{{general/build.webp}}` is
 * not re-substituted into itself.
 */
export function substituteAoe4GuidesBuildKeyword(text: string): string {
  return text.replace(
    /(\{\{[^{}]*\}\})|\bbuild\b/gi,
    (_whole, token: string | undefined) => token ?? "{{general/build.webp}}",
  );
}

/**
 * Capitalized text fallback when an aoe4guides asset has no mapping. Accepts a
 * bare basename (`sheep`, `sheep.webp`) or a full relative path
 * (`resource/sheep.webp`); strips the extension, keeps the last segment, splits
 * on `-`/`_`, and title-cases: `unit-worker/villager-japanese.webp` →
 * "Villager Japanese".
 */
export function capitalizeAoe4GuidesBasename(pathOrBasename: string): string {
  if (!pathOrBasename) return "";
  const file = pathOrBasename.split("/").pop() ?? pathOrBasename;
  const stem = file.replace(/\.(?:png|webp)$/i, "");
  return stem
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
