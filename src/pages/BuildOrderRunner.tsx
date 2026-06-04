import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  MousePointer,
  Pause,
  Play,
  RotateCcw,
  Timer,
} from "lucide-react";

import OverlayStepCard from "@/components/OverlayStepCard";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getCiv } from "@/data/civs";
import { useFontSize } from "@/hooks/useFontSize";
import { useOverlayTimer } from "@/hooks/useOverlayTimer";
import { useTheme } from "@/hooks/useTheme";
import { getBuildOrder } from "@/lib/storage";
import { formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { BuildOrder } from "@/types/buildOrder";

const COLLAPSED_KEY = "aoe4bo:runner:collapsed";

/** Standalone chrome-less overlay step-runner (rendered outside AppLayout). */
export default function BuildOrderRunner() {
  const { id } = useParams<{ id: string }>();
  const [bo, setBo] = useState<BuildOrder | null | undefined>(undefined);
  const [stepIdx, setStepIdx] = useState(0);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Follow the main window's theme + font size live (cross-window storage event).
  useTheme();
  useFontSize();

  // Mark <html> so index.css neutralizes #root layout and lets <main> shrink to
  // max-content — without it the popup can never wrap its content.
  useEffect(() => {
    document.documentElement.classList.add("runner-overlay");
    return () => {
      document.documentElement.classList.remove("runner-overlay");
    };
  }, []);

  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // sessionStorage may be unavailable in some embedded contexts.
    }
  }, [collapsed]);

  useEffect(() => {
    setBo(id ? getBuildOrder(id) : null);
  }, [id]);

  const totalSteps = bo?.steps.length ?? 0;
  const nextStepTime = bo?.steps[stepIdx + 1]?.timeSeconds;

  const {
    elapsed,
    isRunning,
    isAutoAdvance,
    isApproachingNext,
    toggle,
    reset,
    toggleMode,
  } = useOverlayTimer(nextStepTime);

  // Auto-advance: catch up to the latest step whose time <= elapsed, halting at
  // any step missing a time (manual gate) or the end of the build.
  useEffect(() => {
    if (!bo || !isAutoAdvance || !isRunning) return;
    let target = stepIdx;
    while (target + 1 < bo.steps.length) {
      const next = bo.steps[target + 1];
      if (next.timeSeconds === undefined) break;
      if (elapsed < next.timeSeconds) break;
      target += 1;
    }
    if (target !== stepIdx) setStepIdx(target);
  }, [elapsed, isAutoAdvance, isRunning, stepIdx, bo]);

  // Keyboard shortcuts.
  useEffect(() => {
    if (!bo) return;
    const onKey = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowRight":
        case "KeyD":
        case "Enter":
          e.preventDefault();
          setStepIdx((i) => Math.min(bo.steps.length - 1, i + 1));
          break;
        case "ArrowLeft":
        case "KeyA":
        case "Backspace":
          e.preventDefault();
          setStepIdx((i) => Math.max(0, i - 1));
          break;
        case "Space":
          e.preventDefault();
          toggle();
          break;
        case "KeyR":
          e.preventDefault();
          reset();
          setStepIdx(0);
          break;
        case "KeyM":
          e.preventDefault();
          toggleMode();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bo, toggle, reset, toggleMode]);

  // Resize the popup so its OUTER dimensions wrap the content panel. Measure
  // <main> (not documentElement) so #root padding can't bleed in; a
  // ResizeObserver re-fits on async reflow (icon load, font-size change, content
  // swap). A 2px hysteresis absorbs sub-pixel jitter. resizeTo is best-effort —
  // blocked on non-popup windows / after a manual user resize.
  useLayoutEffect(() => {
    const target = mainRef.current;
    if (!target) return;
    const HYST = 2;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const chromeW = Math.max(0, window.outerWidth - window.innerWidth);
      const chromeH = Math.max(0, window.outerHeight - window.innerHeight);
      const wantW = target.offsetWidth + chromeW;
      const wantH = Math.min(target.offsetHeight + chromeH, 700);
      const grew = wantW > window.outerWidth || wantH > window.outerHeight;
      const shrunk =
        window.outerWidth - wantW > HYST || window.outerHeight - wantH > HYST;
      if (grew || shrunk) {
        try {
          window.resizeTo(wantW, wantH);
        } catch {
          // resizeTo blocked on non-popup windows / after user resize.
        }
      }
    };
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(apply);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(target);
    schedule();
    return () => {
      ro.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [bo]);

  if (bo === undefined) {
    return (
      <div
        className="text-foreground"
        style={{ background: "hsl(var(--background) / 0.95)" }}
      />
    );
  }

  if (bo === null) {
    return (
      <main
        ref={mainRef}
        className="flex flex-col items-center justify-center gap-3 px-6 py-6 text-center text-foreground"
        style={{ background: "hsl(var(--background) / 0.95)" }}
      >
        <h1 className="font-display text-lg font-bold text-primary">Build not found</h1>
        <p className="text-sm text-muted-foreground">
          You can close this window or return to the library.
        </p>
        <button
          type="button"
          onClick={() => window.close()}
          className="focus-ring mt-1 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Close window
        </button>
      </main>
    );
  }

  const civ = getCiv(bo.civilization);
  const step = bo.steps[stepIdx];
  const progressPct = totalSteps > 0 ? ((stepIdx + 1) / totalSteps) * 100 : 0;
  const targetReached =
    step?.timeSeconds !== undefined && elapsed >= step.timeSeconds;

  const advanceStep = () => setStepIdx((i) => Math.min(totalSteps - 1, i + 1));
  const prevStep = () => setStepIdx((i) => Math.max(0, i - 1));

  const showControls = !collapsed && totalSteps > 1;
  const cardClickable = !isAutoAdvance && totalSteps > 0;

  return (
    <main
      ref={mainRef}
      className="relative flex flex-col text-foreground"
      style={{ background: "hsl(var(--background) / 0.95)" }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-border px-2 py-1">
        <h1 className="truncate font-display text-sm font-normal text-primary">{bo.name}</h1>
        <span className="truncate text-sm text-muted-foreground">
          {civ ? civ.name : "Unknown civ"}
          {bo.matchup ? ` • ${bo.matchup}` : ""}
        </span>
        {collapsed && totalSteps > 0 && (
          <span className="ml-auto text-sm tabular-nums text-muted-foreground">
            {stepIdx + 1}/{totalSteps}
          </span>
        )}
        {totalSteps > 1 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={collapsed ? "Expand controls" : "Collapse controls"}
                onClick={(e) => {
                  e.stopPropagation();
                  setCollapsed((c) => !c);
                }}
                className={cn(
                  "focus-ring flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground",
                  !collapsed && "ml-auto",
                )}
              >
                {collapsed ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6} collisionPadding={8}>
              {collapsed ? "Expand controls" : "Collapse controls"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.stopPropagation()}
          className="flex items-center gap-1 border-b border-border px-2 py-1"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Previous step"
                disabled={stepIdx === 0}
                onClick={prevStep}
                className="focus-ring flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6} collisionPadding={8}>
              Previous step
            </TooltipContent>
          </Tooltip>
          <span className="px-1 text-sm tabular-nums text-muted-foreground">
            <span className="text-foreground">{stepIdx + 1}</span>/{totalSteps}
          </span>

          <span
            className={cn(
              "mx-auto font-mono text-base tabular-nums text-foreground",
              isAutoAdvance && isRunning && isApproachingNext && "timer-pulse text-primary",
            )}
          >
            {formatTime(Math.floor(elapsed))}
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={isRunning ? "Pause" : "Play"}
                onClick={toggle}
                className="focus-ring flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6} collisionPadding={8}>
              {isRunning ? "Pause" : "Play"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Reset timer"
                onClick={() => {
                  reset();
                  setStepIdx(0);
                }}
                className="focus-ring flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6} collisionPadding={8}>
              Reset timer
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={
                  isAutoAdvance ? "Switch to manual mode" : "Switch to auto-advance mode"
                }
                onClick={toggleMode}
                className={cn(
                  "focus-ring flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-muted/50",
                  isAutoAdvance ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {isAutoAdvance ? (
                  <Timer className="h-3.5 w-3.5" />
                ) : (
                  <MousePointer className="h-3.5 w-3.5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6} collisionPadding={8}>
              {isAutoAdvance ? "Switch to manual mode" : "Switch to auto-advance mode"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Next step"
                disabled={stepIdx >= totalSteps - 1}
                onClick={advanceStep}
                className="focus-ring flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6} collisionPadding={8}>
              Next step
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Current step (click to advance, right-click to go back, in manual mode) */}
      <div
        onClick={cardClickable ? advanceStep : undefined}
        onContextMenu={
          cardClickable
            ? (e) => {
                e.preventDefault();
                prevStep();
              }
            : undefined
        }
        className={cn("relative px-2 pb-3 pt-2", cardClickable && "group cursor-pointer")}
      >
        <OverlayStepCard
          key={stepIdx}
          step={step}
          civ={civ}
          targetReached={targetReached}
          showAdvanceHint={cardClickable}
          className="step-enter"
        />
      </div>

      {/* Progress hairline */}
      <div className="absolute bottom-0 left-0 h-0.5 w-full bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </main>
  );
}
