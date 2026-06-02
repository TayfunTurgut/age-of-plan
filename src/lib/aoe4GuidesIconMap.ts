import { PATH_MIGRATION } from "@/data/generated/pathMigration";

/**
 * Maps aoe4guides.com image assets onto our internal `{{path.ext}}` icon
 * tokens. aoe4guides paths look like `/assets/pictures/<category>/<file>.webp`
 * (or absolute `https://aoe4guides.com/assets/pictures/...`). Their
 * `<category>/<file>` form differs from our legacy rts-overlay paths only in
 * `_` vs `-`, so we normalize underscores to hyphens and resolve the result
 * against PATH_MIGRATION (which maps every legacy path to its current
 * aoe4world equivalent).
 *
 * Resolution is layered through `resolveKey`: hand overrides, then
 * PATH_MIGRATION, then the alternate extension. Special asset families (civ
 * flags, per-civ villager glyphs) are handled as explicit branches.
 */

/**
 * Hand-maintained overrides for paths PATH_MIGRATION misses or maps wrongly.
 * Checked before PATH_MIGRATION so individual aoe4guides quirks can be fixed
 * without regenerating the whole map (the sync script would clobber direct
 * edits to pathMigration.ts).
 */
const AOE4GUIDES_ALIASES: Record<string, string> = {
  // aoe4guides typo: their asset is `towara-1.webp`, ours is `tawara-1.png`.
  "technology-japanese/towara-1.webp": "images/technologies/tawara-1.png",
  // UI-marker imgs aoe4guides drops inline (often without title/alt).
  "resource/rally.webp": "general/rally.webp",
  "resource/build.webp": "general/build.webp",
};

/**
 * aoe4guides' 3-letter civ-flag basenames → our `flags/<civ>.png` ids
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

/** Resolve a normalized `category/file.ext` key to an internal path, or null. */
function resolveKey(key: string): string | null {
  const direct = AOE4GUIDES_ALIASES[key] ?? PATH_MIGRATION[key];
  if (direct) return direct;
  // aoe4guides occasionally serves the same asset under the other extension.
  const alt = swapExtension(key);
  if (alt) return AOE4GUIDES_ALIASES[alt] ?? PATH_MIGRATION[alt] ?? null;
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
  const key = m[1].replace(/_/g, "-");

  const target = resolveKey(key);
  if (target) return `{{${target}}}`;

  const flag = key.match(FLAG_RE);
  if (flag) {
    const civ = FLAG_BASENAME_TO_CIV[flag[1]];
    if (civ) return `{{flags/${civ}.png}}`;
  }

  // aoe4guides ships per-civ villager glyphs; we collapse them onto one icon.
  if (VILLAGER_RE.test(key)) {
    const generic = PATH_MIGRATION["unit-worker/villager.webp"];
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
