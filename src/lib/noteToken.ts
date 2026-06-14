/**
 * Single source of truth for the `{{path/to/file.webp}}` icon-token pattern used
 * in note + prerequisite text. Shared by:
 *   - `noteRenderer.tsx`    — extracts tokens for rendering as <img> (M5).
 *   - `exportBuildOrder.ts` — converts back to RTS_Overlay's `@path@` form.
 *
 * Every shipped icon is WebP, so internal tokens are WebP-only — a `.png` token
 * could only ever 404, so it is intentionally not matched (it renders as plain
 * text rather than a broken image). External `@path@` imports may still
 * reference `.png` (e.g. RTS_Overlay); the importer maps those onto WebP assets.
 *
 * Global flag: safe with `matchAll` / `replace` / `replaceAll` (they reset
 * `lastIndex` per the spec). Do not call `.exec()` in a loop on this instance.
 */
// Charset is intentionally strict (alphanumeric start; alphanumeric/_/-//
// after): it matches every synced catalog path while rejecting `..` segments,
// so a crafted token can never make <img src> escape the /aoe4/ asset root.
export const NOTE_TOKEN_RE = /\{\{([A-Za-z0-9][A-Za-z0-9_/-]*\.webp)\}\}/g;
