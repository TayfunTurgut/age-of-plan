/**
 * Single switch-point for game asset URLs.
 * Currently hotlinks RTS_Overlay's hosted AoE4 assets.
 * Swap ASSET_BASE_URL to migrate to self-hosted later.
 */
export const ASSET_BASE_URL = "https://rts-overlay.github.io/assets/aoe4/";

export const getAssetUrl = (path: string): string => `${ASSET_BASE_URL}${path}`;
