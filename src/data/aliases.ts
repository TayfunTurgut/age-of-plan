import type { IconEntry } from "./iconCatalog";

/**
 * Hand-maintained aliases that surface as the "General" category in the icon
 * picker. Assets live under public/aoe4/general/ and are referenced via the
 * usual `category/file.ext` form so the shared token/render pipeline resolves
 * them like any other catalog entry.
 */
export const ICON_ALIASES: readonly IconEntry[] = Object.freeze([
  { path: "general/build.webp", name: "Build", category: "General" },
  { path: "general/rally.webp", name: "Rally", category: "General" },
]);
