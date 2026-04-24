import type { BuildOrder } from "@/types/buildOrder";
import { mapStep, normalizeCivId } from "./importRtsOverlay";

/**
 * aoe4guides.com REST API import.
 * The public API at https://aoe4guides.com/api/builds/{id} may not allow
 * cross-origin requests; surface a clear CORS-aware error if so.
 */

/** Match a 20-char Firestore-style document id. */
const ID_RE = /^[A-Za-z0-9]{20}$/;

export const extractAoe4GuidesId = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.includes("aoe4guides.com")) {
    const m = trimmed.match(/\/build\/([A-Za-z0-9]{20})/);
    return m ? m[1] : null;
  }
  return ID_RE.test(trimmed) ? trimmed : null;
};

type RawAoe4Guides = {
  title?: string;
  name?: string;
  civilization?: string;
  civ?: string;
  author?: string;
  user?: { name?: string };
  description?: string;
  build_order?: unknown[];
  steps?: unknown[];
};

export const fetchAoe4GuidesBuild = async (id: string): Promise<BuildOrder> => {
  let res: Response;
  try {
    res = await fetch(`https://aoe4guides.com/api/builds/${id}`);
  } catch {
    throw new Error(
      "Could not fetch from aoe4guides.com — CORS may be blocked. Try pasting the build JSON directly instead.",
    );
  }

  if (!res.ok) {
    if (res.status === 404) throw new Error("Build not found on aoe4guides.com.");
    throw new Error(`aoe4guides.com returned an error (status ${res.status}).`);
  }

  let data: RawAoe4Guides;
  try {
    data = (await res.json()) as RawAoe4Guides;
  } catch {
    throw new Error("aoe4guides.com returned an invalid response.");
  }

  const rawSteps = (Array.isArray(data.build_order) ? data.build_order : data.steps) ?? [];
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    name: String(data.title ?? data.name ?? "Imported build"),
    civilization: normalizeCivId(String(data.civilization ?? data.civ ?? "")),
    author: String(data.author ?? data.user?.name ?? ""),
    description: data.description ? String(data.description) : "",
    source: `https://aoe4guides.com/build/${id}`,
    matchup: "",
    createdAt: now,
    updatedAt: now,
    // mapStep accepts the loosely-typed step shape used by both APIs.
    steps: (rawSteps as Parameters<typeof mapStep>[0][]).map(mapStep),
  };
};
