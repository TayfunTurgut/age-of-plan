/**
 * Font-size module — single source of truth for the localStorage key and the
 * allowed pixel values used by the text-size picker. The blocking inline script
 * in `index.html` mirrors these constants by string for zero-flash bootstrapping.
 *
 * Two events keep every surface in sync:
 *   - native `storage` event  → other windows (the runner overlay popup).
 *   - custom FONT_SIZE_EVENT   → same-window siblings (the `storage` event does
 *     NOT fire in the window that made the change).
 * A CSS variable on :root cannot propagate across the window boundary, so the
 * event plumbing is load-bearing, not incidental.
 */
import { isBrowser } from "@/lib/env";

export type FontSize = 14 | 15 | 16 | 17 | 18 | 20;

export const FONT_SIZES: readonly FontSize[] = [14, 15, 16, 17, 18, 20];
export const FONT_SIZE_KEY = "aoe4bo:fontSize";
export const FONT_SIZE_EVENT = "aoe4bo:fontsize-change";
export const DEFAULT_FONT_SIZE: FontSize = 17;

function isValidFontSize(n: number): n is FontSize {
  return (FONT_SIZES as readonly number[]).includes(n);
}

export function getFontSize(): FontSize {
  if (!isBrowser()) return DEFAULT_FONT_SIZE;
  try {
    const raw = window.localStorage.getItem(FONT_SIZE_KEY);
    if (raw) {
      const n = parseInt(raw, 10);
      if (isValidFontSize(n)) return n;
    }
  } catch {
    // Private mode / sandboxed: fall through to the default.
  }
  return DEFAULT_FONT_SIZE;
}

export function setFontSize(size: FontSize): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(FONT_SIZE_KEY, String(size));
  } catch {
    // Ignore storage errors.
  }
  document.documentElement.style.fontSize = `${size}px`;
  window.dispatchEvent(new CustomEvent<FontSize>(FONT_SIZE_EVENT, { detail: size }));
}
