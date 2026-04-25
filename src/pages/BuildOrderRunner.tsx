import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowRight,
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
import type { BuildOrder } from "@/types/buildOrder";
import { getBuildOrder } from "@/lib/storage";
import { getCiv } from "@/data/civs";
import { getAssetUrl } from "@/lib/assets";
import { formatTime } from "@/lib/time";
import { renderNote } from "@/lib/noteRenderer";
import { useOverlayTimer } from "@/hooks/useOverlayTimer";
import { type ResourceKey } from "@/components/editor/ResourcePill";
import { cn } from "@/lib/utils";

const AGE_ICON: Record<1 | 2 | 3 | 4, string> = {
  1: "ages/age_1.webp",
  2: "ages/age_2.webp",
  3: "ages/age_3.webp",
  4: "ages/age_4.webp",
};

const AGE_BORDER: Record<1 | 2 | 3 | 4, string> = {
  1: "border-l-muted-foreground/40",
  2: "border-l-green-600",
  3: "border-l-blue-500",
  4: "border-l-primary",
};

const AGE_GLOW: Record<1 | 2 | 3 | 4, string> = {
  1: "shadow-[0_0_12px_-4px_hsl(var(--muted-foreground)/0.4)]",
  2: "shadow-[0_0_12px_-4px_rgb(22_163_74_/_0.45)]",
  3: "shadow-[0_0_12px_-4px_rgb(59_130_246_/_0.45)]",
  4: "shadow-[0_0_12px_-4px_hsl(var(--primary)/0.45)]",
};

const AGE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Dark Age",
  2: "Feudal Age",
  3: "Castle Age",
  4: "Imperial Age",
};

const RESOURCE_ORDER: ResourceKey[] = [
  "food",
  "wood",
  "gold",
  "stone",
  "builder",
  "oliveOil",
  "silver",
];

const RESOURCE_META: Record<ResourceKey, { icon: string; label: string }> = {
  food: { icon: "resources/food.png", label: "Food" },
  wood: { icon: "resources/wood.png", label: "Wood" },
  gold: { icon: "resources/gold.png", label: "Gold" },
  stone: { icon: "resources/stone.png", label: "Stone" },
  builder: { icon: "images/technologies/banco-repairs-2.png", label: "Builders" },
  oliveOil: { icon: "resources/oliveoil.png", label: "Olive Oil" },
  silver: { icon: "resources/silver.png", label: "Silver" },
};

const COLLAPSED_KEY = "aoe4bo:runner:collapsed";

const CompactResourceChip = ({
  resource,
  value,
}: {
  resource: ResourceKey;
  value: number;
}) => {
  const m = RESOURCE_META[resource];
  const [iconFailed, setIconFailed] = useState(false);
  return (
    <span
      title={m.label}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-1.5 py-0.5"
    >
      {!iconFailed ? (
        <img
          src={getAssetUrl(m.icon)}
          alt=""
          aria-hidden
          loading="lazy"
          onError={() => setIconFailed(true)}
          className="h-3.5 w-3.5 object-contain"
        />
      ) : (
        <span className="text-[11px] font-medium text-muted-foreground">
          {m.label[0]}
        </span>
      )}
      <span className="text-sm tabular-nums text-foreground">{value}</span>
    </span>
  );
};

const BuildOrderRunner = () => {
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

  useEffect(() => {
    try {
      sessionStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // sessionStorage may be unavailable in some embedded contexts.
    }
  }, [collapsed]);

  useEffect(() => {
    if (!id) {
      setBo(null);
      return;
    }
    setBo(getBuildOrder(id));
  }, [id]);

  const totalSteps = bo?.steps.length ?? 0;
  const stepsLength = totalSteps;
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

  // Auto-advance: catch up to latest step whose timeSeconds <= elapsed,
  // halting at any step missing timeSeconds (manual gate) or end of build.
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
          reset();
          setStepIdx(0);
          break;
        case "KeyM":
          toggleMode();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bo, toggle, reset, toggleMode]);

  // Resize the popup so its OUTER dimensions exactly wrap the content.
  // window.resizeTo sets outer bounds, but scrollWidth/scrollHeight are inner;
  // we add the live chrome delta (title bar, borders) so the window doesn't
  // shrink by that delta on every re-fire.
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      const chromeW = Math.max(0, window.outerWidth - window.innerWidth);
      const chromeH = Math.max(0, window.outerHeight - window.innerHeight);
      const w = document.documentElement.scrollWidth + chromeW;
      const h = document.documentElement.scrollHeight + chromeH;
      try {
        window.resizeTo(Math.max(w, 280), Math.min(h, 700));
      } catch {
        // Some browsers block resizeTo on non-popup or after user resize.
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [stepIdx, stepsLength, collapsed]);

  if (bo === undefined) {
    return (
      <div
        className="dark text-foreground"
        style={{ background: "hsl(var(--background) / 0.95)" }}
      />
    );
  }

  if (bo === null) {
    return (
      <main
        className="dark flex flex-col items-center justify-center gap-3 px-6 py-6 text-center text-foreground"
        style={{ background: "hsl(var(--background) / 0.95)" }}
      >
        <h1 className="font-display text-lg font-bold text-primary">Build not found</h1>
        <p className="text-sm text-muted-foreground">
          You can close this window or return to the library.
        </p>
        <button
          type="button"
          onClick={() => window.close()}
          className="focus-ring mt-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Close window
        </button>
      </main>
    );
  }

  const civ = getCiv(bo.civilization);
  const step = bo.steps[stepIdx];
  const progressPct = totalSteps > 0 ? ((stepIdx + 1) / totalSteps) * 100 : 0;

  const extraResources: ResourceKey[] = [];
  if (civ?.id === "byzantines" || civ?.id === "ayyubids")
    extraResources.push("oliveOil");
  if (civ?.id === "macedonian") extraResources.push("silver");

  const targetReached =
    step?.timeSeconds !== undefined && elapsed >= step.timeSeconds;

  const advanceStep = () =>
    setStepIdx((i) => Math.min(totalSteps - 1, i + 1));
  const prevStep = () => setStepIdx((i) => Math.max(0, i - 1));

  const showControls = !collapsed && totalSteps > 1;
  const cardClickable = !isAutoAdvance && totalSteps > 0;

  return (
    <main
      className="dark relative flex flex-col text-foreground"
      style={{ background: "hsl(var(--background) / 0.95)" }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-border px-2 py-1">
        <span className="truncate font-display text-xs text-primary">{bo.name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {civ ? civ.name : "Unknown civ"}
          {bo.matchup ? ` • ${bo.matchup}` : ""}
        </span>
        {collapsed && totalSteps > 0 && (
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {stepIdx + 1}/{totalSteps}
          </span>
        )}
        {totalSteps > 1 && (
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
        )}
      </div>

      {/* Merged controls row */}
      {showControls && (
        <div
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.stopPropagation()}
          className="flex items-center gap-1 border-b border-border px-2 py-1"
        >
          <button
            type="button"
            aria-label="Previous step"
            disabled={stepIdx === 0}
            onClick={prevStep}
            className="focus-ring flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="px-1 text-xs tabular-nums text-muted-foreground">
            <span className="text-foreground">{stepIdx + 1}</span>/{totalSteps}
          </span>

          <span
            className={cn(
              "mx-auto font-mono text-sm tabular-nums text-foreground",
              isAutoAdvance &&
                isRunning &&
                isApproachingNext &&
                "timer-pulse text-primary",
            )}
          >
            {formatTime(Math.floor(elapsed))}
          </span>

          <button
            type="button"
            aria-label={isRunning ? "Pause" : "Play"}
            onClick={toggle}
            className="focus-ring flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            {isRunning ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </button>
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
          <button
            type="button"
            aria-label={
              isAutoAdvance ? "Switch to manual mode" : "Switch to auto-advance mode"
            }
            onClick={toggleMode}
            className={cn(
              "focus-ring flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-muted/50",
              isAutoAdvance
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isAutoAdvance ? (
              <Timer className="h-3.5 w-3.5" />
            ) : (
              <MousePointer className="h-3.5 w-3.5" />
            )}
          </button>

          <button
            type="button"
            aria-label="Next step"
            disabled={stepIdx >= totalSteps - 1}
            onClick={advanceStep}
            className="focus-ring flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Current step */}
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
        className={cn(
          "relative px-2 pb-3 pt-2",
          cardClickable && "group cursor-pointer",
        )}
      >
        {step ? (
          <div
            key={stepIdx}
            className={cn(
              "step-enter relative rounded-md border border-border border-l-4 bg-card p-2",
              AGE_BORDER[step.age],
              AGE_GLOW[step.age],
            )}
          >
            <div className="flex items-center gap-2">
              <img
                src={getAssetUrl(AGE_ICON[step.age])}
                alt={AGE_LABELS[step.age]}
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
                className="h-5 w-5 object-contain"
              />
              <span className="text-xs text-muted-foreground">
                {AGE_LABELS[step.age]}
              </span>
              {step.timeSeconds !== undefined && (
                <span
                  className={cn(
                    "ml-auto rounded-full border border-border px-1.5 py-0 text-[11px] tabular-nums",
                    targetReached ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {formatTime(step.timeSeconds)}
                </span>
              )}
            </div>

            {/* Resource pills (read-only). pointer-events-none lets clicks pass through to advance. */}
            <div className="pointer-events-none mt-1.5 flex flex-wrap gap-1">
              {RESOURCE_ORDER.map((r) => {
                const v = step.resources[r] ?? 0;
                if (v <= 0) return null;
                if (r === "oliveOil" && !extraResources.includes("oliveOil"))
                  return null;
                if (r === "silver" && !extraResources.includes("silver"))
                  return null;
                return <CompactResourceChip key={r} resource={r} value={v} />;
              })}
            </div>

            {/* Vils / Pop */}
            {(step.villagerCount > 0 || step.populationCount !== undefined) && (
              <div className="mt-1 text-xs text-muted-foreground">
                {step.villagerCount > 0 && (
                  <>
                    Vils: <span className="text-foreground">{step.villagerCount}</span>
                  </>
                )}
                {step.villagerCount > 0 && step.populationCount !== undefined && " · "}
                {step.populationCount !== undefined && (
                  <>
                    Pop: <span className="text-foreground">{step.populationCount}</span>
                  </>
                )}
              </div>
            )}

            {/* Notes — text-xs leading-tight; arbitrary variant shrinks the inline icons emitted by renderNote(). */}
            {step.notes.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm leading-tight text-foreground [&_img]:!h-4 [&_img]:!w-4">
                {step.notes.map((n) => (
                  <li key={n.id} className="flex gap-1.5">
                    <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                    <span className="min-w-0 flex-1">{renderNote(n.text)}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Positions (read-only tags) */}
            {(() => {
              const visibleTags = (step.tags ?? []).filter(
                (t) => t.unit.trim() || t.location.trim(),
              );
              if (visibleTags.length === 0) return null;
              return (
                <div className="mt-2">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Positions
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {visibleTags.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1 rounded-full border border-teal-500/40 bg-teal-500/10 px-1.5 py-0 text-xs text-teal-700 dark:text-teal-300"
                      >
                        <span>{t.unit || "—"}</span>
                        <ArrowRight
                          className="h-3 w-3 text-teal-500/70"
                          aria-hidden
                        />
                        <span>{t.location || "—"}</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {cardClickable && (
              <span className="pointer-events-none absolute bottom-1 right-2 text-[11px] text-muted-foreground/30 transition-opacity group-hover:text-muted-foreground/70">
                →
              </span>
            )}
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            No steps in this build.
          </p>
        )}
      </div>

      {/* Progress bar (hairline) */}
      <div className="absolute bottom-0 left-0 h-0.5 w-full bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </main>
  );
};

export default BuildOrderRunner;
