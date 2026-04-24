import { useCallback, useEffect, useState } from "react";
import { getTheme, setTheme as applyTheme, type Theme } from "@/lib/theme";

/**
 * Reactive wrapper around the theme module.
 * The inline script in index.html sets the class before paint; this hook
 * keeps React state in sync and exposes a stable toggle.
 */
export const useTheme = (): { theme: Theme; toggleTheme: () => void } => {
  const [theme, setTheme] = useState<Theme>(() => getTheme());

  // Safety net: re-apply once on mount in case the inline script was blocked.
  useEffect(() => {
    applyTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
