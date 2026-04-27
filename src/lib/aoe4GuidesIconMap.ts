import { PATH_MIGRATION } from "@/data/generated/pathMigration";

/**
 * Convert an `<img src="...">` URL emitted by aoe4guides.com into a
 * `{{path.ext}}` icon token from our internal asset namespace, or return
 * `null` when the URL doesn't reference a recognized aoe4guides asset.
 *
 * aoe4guides paths look like `/assets/pictures/<category>/<file>.webp`
 * (relative) or `https://aoe4guides.com/assets/pictures/...` (absolute).
 * Their `<category>/<file>` form differs from our legacy rts-overlay
 * paths only in `_` vs `-`, so we normalize underscores to hyphens and
 * look the result up in PATH_MIGRATION (which already maps every legacy
 * path to its current aoe4world equivalent).
 *
 * Caller (`htmlToText` in `importAoe4Guides.ts`) replaces the matched
 * `<img>` with the returned token; on null it falls back to title/alt
 * and then to a capitalized-basename text fallback.
 */

/**
 * Hand-maintained overrides for paths that PATH_MIGRATION misses or maps
 * incorrectly. Checked *before* PATH_MIGRATION so we can fix individual
 * aoe4guides quirks without regenerating the whole map (the sync-aoe4-data
 * script would clobber direct edits to pathMigration.ts).
 */
const AOE4GUIDES_ALIASES: Record<string, string> = {
  // aoe4guides typo: their asset is `towara-1.webp`, ours is `tawara-1.png`.
  "technology-japanese/towara-1.webp": "images/technologies/tawara-1.png",
  // UI-marker imgs that aoe4guides drops inline (often without title/alt).
  // We ship matching icons under general/, so map them explicitly rather
  // than letting them fall through to title/alt or the void.
  "resource/rally.webp": "general/rally.webp",
  "resource/build.webp": "general/build.webp",
};

/**
 * Map aoe4guides' civilization-flag basenames (3-letter codes) to our
 * `flags/<civ>.png` assets. aoe4guides uses different short codes than our
 * internal civ ids (e.g. `goh` instead of `golden-horde`).
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

const lookupKey = (key: string): string | null =>
  AOE4GUIDES_ALIASES[key] ?? PATH_MIGRATION[key] ?? null;

export const aoe4GuidesSrcToToken = (src: string | undefined | null): string | null => {
  if (!src || typeof src !== "string") return null;
  const m = src.match(/^(?:https?:\/\/aoe4guides\.com)?\/assets\/pictures\/(.+)$/);
  if (!m) return null;
  const legacyKey = m[1].replace(/_/g, "-");

  // Direct lookup — also try the alternate extension since aoe4guides
  // occasionally serves the same asset as `.png` instead of `.webp`.
  const altKey = legacyKey.endsWith(".png")
    ? legacyKey.slice(0, -4) + ".webp"
    : legacyKey.endsWith(".webp")
      ? legacyKey.slice(0, -5) + ".png"
      : legacyKey;
  const target = lookupKey(legacyKey) ?? (altKey !== legacyKey ? lookupKey(altKey) : null);
  if (target) return `{{${target}}}`;

  // Civilization flag — `civilization-flag/<code>.(webp|png)`.
  const flag = legacyKey.match(/^civilization-flag\/([a-z]+)\.(?:webp|png)$/);
  if (flag) {
    const civ = FLAG_BASENAME_TO_CIV[flag[1]];
    if (civ) return `{{flags/${civ}.png}}`;
  }

  // aoe4guides ships per-civ villager glyphs (`villager-japanese.webp`,
  // `villager-french.webp`, `villager-zhu-xi.webp`, …). We have a single
  // villager icon, so collapse all civ variants onto it.
  if (/^unit-worker\/villager-[a-z-]+\.(?:webp|png)$/.test(legacyKey)) {
    const generic = PATH_MIGRATION["unit-worker/villager.webp"];
    if (generic) return `{{${generic}}}`;
  }

  return null;
};
