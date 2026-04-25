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
 * `<img>` with the returned token; on null it falls back to title/alt.
 */
export const aoe4GuidesSrcToToken = (src: string | undefined | null): string | null => {
  if (!src || typeof src !== "string") return null;
  const m = src.match(/^(?:https?:\/\/aoe4guides\.com)?\/assets\/pictures\/(.+)$/);
  if (!m) return null;
  const legacyKey = m[1].replace(/_/g, "-");
  const target = PATH_MIGRATION[legacyKey];
  return target ? `{{${target}}}` : null;
};
