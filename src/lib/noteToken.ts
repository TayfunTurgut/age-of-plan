/**
 * Single source of truth for the `{{path/to/file.ext}}` icon-token pattern used
 * in note + prerequisite text. Shared by:
 *   - `noteRenderer.tsx`    — extracts tokens for rendering as <img> (M5).
 *   - `storage.ts`          — rewrites token paths after a data sync.
 *   - `exportBuildOrder.ts` — converts back to RTS_Overlay's `@path@` form.
 *
 * Global flag: safe with `matchAll` / `replace` / `replaceAll` (they reset
 * `lastIndex` per the spec). Do not call `.exec()` in a loop on this instance.
 */
export const NOTE_TOKEN_RE = /\{\{([^{}\s]+\.(?:png|webp))\}\}/g;
