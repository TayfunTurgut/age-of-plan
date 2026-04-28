import { useCallback, useEffect, useState } from "react";
import { getTheme, setTheme as applyTheme, THEME_KEY, type Theme } from "@/lib/theme";

/**
 * Reactive wrapper around the theme module.
 * The inline script in index.html sets the class before paint; this hook
 * keeps React state in sync, exposes a stable toggle, and listens for
 * cross-window storage events so a popup (e.g. the runner) follows along
 * when the main window changes theme.
 */
export const useTheme = (): { theme: Theme; toggleTheme: () => void } => {
  const [theme, setTheme] = useState<Theme>(() => getTheme());

  // Safety net: re-apply once on mount in case the inline script was blocked.
  useEffect(() => {
    applyTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cross-window sync mirrors useFontSize: when the main window writes the
  // theme key, other tabs/popups receive a `storage` event and update.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_KEY || !e.newValue) return;
      if (e.newValue !== "light" && e.newValue !== "dark") return;
      applyTheme(e.newValue);
      setTheme(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
};
