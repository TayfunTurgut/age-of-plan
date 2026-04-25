import type { IconEntry } from "./iconCatalog";

/**
 * Hand-maintained aliases that surface as the "General" category in the icon
 * picker. Add entries here to make arbitrary keywords insert a specific icon.
 * Assets live under public/aoe4/general/ — reference them via the usual
 * `{path}` form (e.g. "general/rally.webp") so the shared token/render
 * pipeline resolves them like any other catalog entry.
 */
export const ICON_ALIASES: readonly IconEntry[] = Object.freeze([
  { path: "general/build.webp", name: "Build", category: "General" },
  { path: "general/rally.webp", name: "Rally", category: "General" },
]);
