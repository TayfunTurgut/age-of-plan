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

/**
 * Convert the `@<category>/<file>.ext@` icon syntax used by aoe4guides'
 * "Copy as JSON" / `.bo` exports into our internal `{{path.ext}}` token,
 * or `null` if the path doesn't resolve. Thin wrapper over
 * `aoe4GuidesSrcToToken` that prepends the `/assets/pictures/` prefix the
 * clipboard format omits.
 */
export const aoe4GuidesAtTokenPathToToken = (
  path: string | undefined | null,
): string | null => {
  if (!path || typeof path !== "string") return null;
  return aoe4GuidesSrcToToken(`/assets/pictures/${path}`);
};

/**
 * Substitute the bare word `build` with our `{{general/build.webp}}`
 * marker — aoe4guides' notes use `build` as an icon-keyword (rally is
 * always emitted as an `<img>`/`@…@` token, but build often isn't).
 * Word boundaries protect `builder`, `building`, `rebuild`, etc.
 *
 * The alternation also matches `{{…}}` tokens already inserted by the
 * `<img>` / `@…@` converters and passes them through unchanged. Without
 * that, a token like `{{general/build.webp}}` would get its inner
 * `build` re-substituted into `{{general/{{general/build.webp}}.webp}}`.
 *
 * Shared by both importers (URL `htmlToText` and JSON
 * `parseRtsOverlayJson`'s aoe4guides branch) so they agree.
 */
export const substituteAoe4GuidesBuildKeyword = (text: string): string =>
  text.replace(
    /(\{\{[^{}]*\}\})|\bbuild\b/gi,
    (_whole, token: string | undefined) => token ?? "{{general/build.webp}}",
  );

/**
 * Capitalized text fallback used when an aoe4guides asset has no mapping.
 * Accepts either a bare basename (`sheep`, `sheep.webp`) or a full
 * relative path (`resource/sheep.webp`). Strips any trailing `.webp`/`.png`,
 * keeps only the last path segment, splits on `-` / `_`, title-cases each
 * word: `unit_worker/villager-japanese.webp` → `"Villager Japanese"`.
 */
export const capitalizeAoe4GuidesBasename = (pathOrBasename: string): string => {
  if (!pathOrBasename) return "";
  const file = pathOrBasename.split("/").pop() ?? pathOrBasename;
  const stem = file.replace(/\.(?:png|webp)$/i, "");
  return stem
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};
