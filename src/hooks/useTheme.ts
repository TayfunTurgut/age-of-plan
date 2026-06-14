import { useCallback, useEffect, useState } from "react";

import { getTheme, setTheme as applyTheme, THEME_KEY, type Theme } from "@/lib/theme";

/**
 * Reactive wrapper around the theme module. The inline script in index.html
 * sets the class before paint; this hook keeps React state in sync, exposes a
 * stable toggle, and listens for cross-window `storage` events so a popup (the
 * runner overlay) follows the main window when it changes theme.
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setThemeState] = useState<Theme>(() => getTheme());

  // Safety net: re-apply once on mount in case the inline script was blocked.
  useEffect(() => {
    applyTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cross-window sync: another window wrote the theme key.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_KEY || !e.newValue) return;
      if (e.newValue !== "light" && e.newValue !== "dark") return;
      applyTheme(e.newValue);
      setThemeState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
