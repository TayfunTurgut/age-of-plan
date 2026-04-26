/**
 * Font-size module — single source of truth for the localStorage key and the
 * allowed pixel values used by the text-size picker. The blocking inline script
 * in `index.html` mirrors these constants by string for zero-flash bootstrapping.
 */

export type FontSize = 14 | 15 | 16 | 17 | 18 | 20;

export const FONT_SIZES: readonly FontSize[] = [14, 15, 16, 17, 18, 20];
export const FONT_SIZE_KEY = "aoe4bo:fontSize";
export const FONT_SIZE_EVENT = "aoe4bo:fontsize-change";
export const DEFAULT_FONT_SIZE: FontSize = 17;

const isBrowser = (): boolean => typeof window !== "undefined" && !!document;

const isValidFontSize = (n: number): n is FontSize =>
  (FONT_SIZES as readonly number[]).includes(n);

export const getFontSize = (): FontSize => {
  if (!isBrowser()) return DEFAULT_FONT_SIZE;
  try {
    const raw = window.localStorage.getItem(FONT_SIZE_KEY);
    if (raw) {
      const n = parseInt(raw, 10);
      if (isValidFontSize(n)) return n;
    }
  } catch {
    // private mode / sandboxed: fall through
  }
  return DEFAULT_FONT_SIZE;
};

export const setFontSize = (size: FontSize): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(FONT_SIZE_KEY, String(size));
  } catch {
    // ignore storage errors
  }
  document.documentElement.style.fontSize = `${size}px`;
  // Broadcast to in-window listeners. The native `storage` event only fires
  // across other windows, so without this, sibling components using
  // useFontSize wouldn't re-render on a same-window size change.
  window.dispatchEvent(new CustomEvent<FontSize>(FONT_SIZE_EVENT, { detail: size }));
};
