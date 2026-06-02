import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Timer for the overlay runner.
 * - Ticks every 100ms while running, incrementing `elapsed` by 0.1s.
 * - `isAutoAdvance` is a mode flag the runner reads to decide whether to advance
 *   steps automatically; the hook itself knows nothing about steps.
 * - When given `nextStepTimeSeconds`, derives `isApproachingNext` (true within
 *   the final 3s before that target) so the runner can flash the timer.
 */
export function useOverlayTimer(nextStepTimeSeconds?: number) {
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

  const isApproachingNext =
    nextStepTimeSeconds !== undefined &&
    elapsed >= nextStepTimeSeconds - 3 &&
    elapsed < nextStepTimeSeconds;

  return {
    elapsed,
    isRunning,
    isAutoAdvance,
    isApproachingNext,
    toggle,
    reset,
    toggleMode,
  };
}
