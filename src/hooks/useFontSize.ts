import { useCallback, useEffect, useState } from "react";
import {
  FONT_SIZE_KEY,
  FONT_SIZES,
  getFontSize,
  setFontSize as applyFontSize,
  type FontSize,
} from "@/lib/fontSize";

/**
 * Reactive wrapper around the font-size module. The inline script in
 * index.html applies the saved size before paint; this hook keeps React state
 * in sync, exposes a stable setter, and listens for cross-window storage
 * events so the runner popup updates live when the main window changes size.
 */
export const useFontSize = (): {
  fontSize: FontSize;
  setFontSize: (s: FontSize) => void;
} => {
  const [fontSize, setState] = useState<FontSize>(() => getFontSize());

  // Safety net: re-apply on mount in case the inline script was blocked.
  useEffect(() => {
    applyFontSize(fontSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cross-window sync: when the main window writes the key, the popup
  // (and any other tab) receives a `storage` event and updates.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== FONT_SIZE_KEY || !e.newValue) return;
      const n = parseInt(e.newValue, 10);
      if ((FONT_SIZES as readonly number[]).includes(n)) {
        applyFontSize(n as FontSize);
        setState(n as FontSize);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setFontSize = useCallback((next: FontSize) => {
    applyFontSize(next);
    setState(next);
  }, []);

  return { fontSize, setFontSize };
};
