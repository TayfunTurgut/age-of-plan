/* eslint-disable react-refresh/only-export-components -- this module exports
 * pure token-parsing helpers (parseNoteTokens / hasNoteTokens / renderNote)
 * alongside the internal NoteIcon component. Splitting them buys nothing but
 * extra files. */
import { useState, type ReactNode } from "react";

import { TouchableTooltip } from "@/components/ui/touchable-tooltip";
import { getAssetUrl } from "@/lib/assets";
import { NOTE_TOKEN_RE } from "@/lib/noteToken";
import { ICON_CATALOG } from "@/data/iconCatalog";

/**
 * Parses `{{category/file.png}}` (or `.webp`) tokens inside note text into a
 * flat token list, interleaving inline icons with plain text.
 *
 * Parsing and rendering are split: `parseNoteTokens` is pure and cached (the
 * cache holds cheap token arrays, not ReactNodes, so it never pins React
 * internals), and `<NoteIcon>` tracks its own failed-image state via useState
 * rather than mutating `style.display` in an onError handler.
 */

export type NoteToken =
  | { kind: "text"; value: string }
  | { kind: "image"; path: string };

const MAX_CACHE = 200;
const tokenCache = new Map<string, NoteToken[]>();

export function parseNoteTokens(text: string): NoteToken[] {
  if (!text) return [];
  const cached = tokenCache.get(text);
  if (cached) return cached;

  const tokens: NoteToken[] = [];
  let last = 0;
  for (const m of text.matchAll(NOTE_TOKEN_RE)) {
    const start = m.index ?? 0;
    if (start > last) tokens.push({ kind: "text", value: text.slice(last, start) });
    tokens.push({ kind: "image", path: m[1] });
    last = start + m[0].length;
  }
  if (last < text.length) tokens.push({ kind: "text", value: text.slice(last) });

  if (tokenCache.size >= MAX_CACHE) {
    const firstKey = tokenCache.keys().next().value;
    if (firstKey !== undefined) tokenCache.delete(firstKey);
  }
  tokenCache.set(text, tokens);
  return tokens;
}

let pathToLabel: Map<string, string> | null = null;
function getPathToLabel(): Map<string, string> {
  if (pathToLabel) return pathToLabel;
  pathToLabel = new Map();
  for (const entry of ICON_CATALOG) pathToLabel.set(entry.path, entry.name);
  return pathToLabel;
}

function labelFromPath(path: string): string {
  const fromCatalog = getPathToLabel().get(path);
  if (fromCatalog) return fromCatalog;
  const file = path.split("/").pop() ?? path;
  const base = file.replace(/\.(png|webp)$/i, "");
  return base
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function NoteIcon({
  path,
  withTooltip = false,
}: {
  path: string;
  withTooltip?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  const img = (
    <img
      src={getAssetUrl(path)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="mx-0.5 inline h-6 w-6 align-text-bottom"
    />
  );
  if (!withTooltip) return img;

  return (
    <TouchableTooltip content={labelFromPath(path)} side="top">
      <span className="inline-flex">{img}</span>
    </TouchableTooltip>
  );
}

/** Cheap check: does the text contain at least one icon token? Reuses the cache. */
export function hasNoteTokens(text: string): boolean {
  return parseNoteTokens(text).some((t) => t.kind === "image");
}

export function renderNote(
  text: string,
  opts?: { withTooltip?: boolean },
): ReactNode[] {
  return parseNoteTokens(text).map((tok, i) =>
    tok.kind === "text" ? (
      <span key={`t-${i}`}>{tok.value}</span>
    ) : (
      <NoteIcon key={`i-${i}`} path={tok.path} withTooltip={opts?.withTooltip} />
    ),
  );
}
