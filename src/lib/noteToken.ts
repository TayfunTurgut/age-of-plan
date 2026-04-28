/**
 * Single source of truth for the `{{path/to/file.ext}}` icon-token pattern
 * used in note text. Shared by:
 *   - `noteRenderer.tsx`   — extracts tokens for rendering as <img>.
 *   - `storage.ts`         — rewrites paths after `sync-aoe4-data`.
 *   - `exportBuildOrder.ts` — converts back to RTS_Overlay's `@path@` form.
 *
 * Safe to share with `matchAll` / `replace` / `replaceAll` (they reset
 * `lastIndex` internally per the spec). Don't call `.exec()` in a loop on
 * this instance.
 */
export const NOTE_TOKEN_RE = /\{\{([^{}\s]+\.(?:png|webp))\}\}/g;
