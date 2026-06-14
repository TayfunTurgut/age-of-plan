/**
 * Theme module — single source of truth for the localStorage key and class name
 * used by the dark/light toggle. The blocking inline script in `index.html`
 * mirrors these constants by string for zero-flash bootstrapping.
 *
 * Cross-window note: the runner overlay is a separate window/document. It picks
 * up theme changes from the main window via the native `storage` event (see
 * `useTheme` in M4); a CSS class alone cannot cross the window boundary.
 */
import { isBrowser } from "@/lib/env";

export type Theme = "dark" | "light";

export const THEME_KEY = "aoe4bo:theme";
const DARK_CLASS = "dark";

export function getTheme(): Theme {
  if (!isBrowser()) return "dark";
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Private mode / sandboxed: fall through to class-based detection.
  }
  return document.documentElement.classList.contains(DARK_CLASS) ? "dark" : "light";
}

export function setTheme(theme: Theme): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore storage errors.
  }
  document.documentElement.classList.toggle(DARK_CLASS, theme === "dark");
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
