/**
 * Theme module — single source of truth for the localStorage key and class name
 * used by the dark/light toggle. The blocking inline script in `index.html`
 * mirrors these constants by string for zero-flash bootstrapping.
 */

export type Theme = "dark" | "light";

const THEME_KEY = "aoe4bo:theme";
const DARK_CLASS = "dark";

const isBrowser = (): boolean => typeof window !== "undefined" && !!document;

export const getTheme = (): Theme => {
  if (!isBrowser()) return "dark";
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // private mode / sandboxed: fall through to class-based detection
  }
  return document.documentElement.classList.contains(DARK_CLASS) ? "dark" : "light";
};

export const setTheme = (t: Theme): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(THEME_KEY, t);
  } catch {
    // ignore storage errors
  }
  if (t === "dark") {
    document.documentElement.classList.add(DARK_CLASS);
  } else {
    document.documentElement.classList.remove(DARK_CLASS);
  }
};

export const toggleTheme = (): Theme => {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
};
