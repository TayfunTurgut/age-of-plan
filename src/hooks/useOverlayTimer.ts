import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Timer hook for the build-order overlay runner.
 * - Ticks every 100ms while running, incrementing `elapsed` by 0.1s.
 * - `isAutoAdvance` is a mode flag the runner page reads to decide whether
 *   to advance steps automatically; the hook itself does not know about steps.
 */
export const useOverlayTimer = () => {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isAutoAdvance, setIsAutoAdvance] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setElapsed((e) => Math.round((e + 0.1) * 10) / 10);
    }, 100);
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const toggle = useCallback(() => setIsRunning((r) => !r), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    setElapsed(0);
  }, []);
  const toggleMode = useCallback(() => setIsAutoAdvance((m) => !m), []);

  return { elapsed, isRunning, isAutoAdvance, toggle, reset, toggleMode };
};
