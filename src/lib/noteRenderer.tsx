import type { ReactNode } from "react";
import { getAssetUrl } from "@/lib/assets";

/**
 * Parses tokens like `@category/file.png@` (or `.webp`) inside note text and
 * returns a ReactNode array with inline icons interleaved with plain text.
 *
 * Non-matching segments are wrapped in `<span>` to preserve whitespace.
 * Broken images hide themselves via the `onError` handler.
 *
 * Results are memoized in a bounded LRU-ish Map keyed by the raw text. The
 * note renderer is called on every render of the runner / preview, so this
 * cache avoids re-parsing identical strings on each tick.
 */
const TOKEN_RE = /@([^@\s]+\.(?:png|webp))@/g;
const MAX_CACHE = 200;
const cache = new Map<string, ReactNode[]>();

export const renderNote = (text: string): ReactNode[] => {
  if (!text) return [];
  const cached = cache.get(text);
  if (cached) return cached;

  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const start = m.index ?? 0;
    if (start > last) {
      out.push(<span key={`t-${i++}`}>{text.slice(last, start)}</span>);
    }
    const path = m[1];
    out.push(
      <img
        key={`i-${i++}`}
        src={getAssetUrl(path)}
        alt=""
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
        className="mx-0.5 inline h-4 w-4 align-text-bottom"
      />,
    );
    last = start + m[0].length;
  }
  if (last < text.length) {
    out.push(<span key={`t-${i++}`}>{text.slice(last)}</span>);
  }

  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(text, out);
  return out;
};
