import { useCallback, useEffect, useState } from "react";

import {
  FONT_SIZE_EVENT,
  FONT_SIZE_KEY,
  FONT_SIZES,
  getFontSize,
  setFontSize as applyFontSize,
  type FontSize,
} from "@/lib/fontSize";

function isFontSize(n: number): n is FontSize {
  return (FONT_SIZES as readonly number[]).includes(n);
}

/**
 * Reactive wrapper around the font-size module. The inline script in index.html
 * applies the saved size before paint; this hook keeps React state in sync,
 * exposes a stable setter, and listens for:
 *   - the cross-window `storage` event (the runner popup follows the main window);
 *   - the same-window FONT_SIZE_EVENT (sibling components re-render — the
 *     `storage` event does not fire in the window that made the change).
 */
export function useFontSize(): {
  fontSize: FontSize;
  setFontSize: (s: FontSize) => void;
} {
  const [fontSize, setState] = useState<FontSize>(() => getFontSize());

  // Safety net: re-apply on mount in case the inline script was blocked.
  useEffect(() => {
    applyFontSize(fontSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== FONT_SIZE_KEY || !e.newValue) return;
      const n = parseInt(e.newValue, 10);
      if (isFontSize(n)) {
        applyFontSize(n);
        setState(n);
      }
    };
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<FontSize>).detail;
      if (isFontSize(next)) setState(next);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(FONT_SIZE_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(FONT_SIZE_EVENT, onChange);
    };
  }, []);

  const setFontSize = useCallback((next: FontSize) => {
    applyFontSize(next);
    setState(next);
  }, []);

  return { fontSize, setFontSize };
}
