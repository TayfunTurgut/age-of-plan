/**
 * Single switch-point for game asset URLs.
 *
 * Assets live under public/aoe4/ and are served from this origin. Synced
 * from aoe4world via `bun run sync-data` — see scripts/README.md for
 * provenance and re-sync steps.
 */
export const ASSET_BASE_URL = "/aoe4/";

export const getAssetUrl = (path: string): string => `${ASSET_BASE_URL}${path}`;
