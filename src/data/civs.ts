import type { ResourceKey } from "@/types/buildOrder";
import { CIV_DATA } from "./generated/civData";
import { getExtraResources } from "./civExtras";

export type Civ = {
  id: string;
  name: string;
  variantOf?: string;
  /** 2–3 signature units / landmarks, joined by " • " for display. */
  tagline: string;
  /** Path (relative to ASSET_BASE_URL) to the civ flag icon. */
  flagIcon: string;
  /** Extra resources beyond the standard four (e.g. olive oil, silver). */
  extraResources: readonly ResourceKey[];
};

/** All 12 base civs + 10 variants, derived from generated aoe4world data. */
export const CIVS: readonly Civ[] = CIV_DATA.map((c) => ({
  id: c.id,
  name: c.name,
  variantOf: c.variantOf,
  tagline: c.tagline,
  flagIcon: c.flagPath,
  extraResources: getExtraResources(c.id),
}));

export const getCiv = (id: string | undefined): Civ | undefined =>
  id ? CIVS.find((c) => c.id === id) : undefined;
