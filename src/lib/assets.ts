/**
 * Single switch-point for game asset URLs. Assets live under `public/aoe4/`
 * and are synced from aoe4guides via `bun run sync-data`.
 */
export const ASSET_BASE_URL = "/aoe4/";

export const getAssetUrl = (path: string): string => `${ASSET_BASE_URL}${path}`;
