import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
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
import { ResourcePill, type ResourceKey } from "@/components/editor/ResourcePill";
import { cn } from "@/lib/utils";

const AGE_ICON: Record<1 | 2 | 3 | 4, string> = {
  1: "age/age_1.webp",
  2: "age/age_2.webp",
  3: "age/age_3.webp",
  4: "age/age_4.webp",
};

const AGE_BORDER: Record<1 | 2 | 3 | 4, string> = {
  1: "border-l-muted-foreground/40",
  2: "border-l-green-600",
  3: "border-l-blue-500",
  4: "border-l-primary",
};

const AGE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Dark Age",
  2: "Feudal Age",
  3: "Castle Age",
  4: "Imperial Age",
};

const noop = () => {};

const BuildOrderRunner = () => {
  const { id } = useParams<{ id: string }>();
  const [bo, setBo] = useState<BuildOrder | null | undefined>(undefined);
  const [stepIdx, setStepIdx] = useState(0);
  const { elapsed, isRunning, isAutoAdvance, toggle, reset, toggleMode } = useOverlayTimer();

  useEffect(() => {
    if (!id) {
      setBo(null);
      return;
    }
    setBo(getBuildOrder(id));
  }, [id]);

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
          setStepIdx((i) => Math.min(bo.steps.length - 1, i + 1));
          break;
        case "ArrowLeft":
        case "KeyA":
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

  if (bo === undefined) {
    return <div className="min-h-screen bg-background" />;
  }

  if (bo === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
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
      </div>
    );
  }

  const civ = getCiv(bo.civilization);
  const step = bo.steps[stepIdx];
  const totalSteps = bo.steps.length;
  const progressPct = totalSteps > 0 ? ((stepIdx + 1) / totalSteps) * 100 : 0;

  const extraResources: ResourceKey[] = [];
  if (civ?.id === "byzantines" || civ?.id === "ayyubids") extraResources.push("oliveOil");
  if (civ?.id === "macedonian") extraResources.push("silver");

  const targetReached =
    step?.timeSeconds !== undefined && elapsed >= step.timeSeconds;

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="truncate font-display text-xs text-primary">{bo.name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {civ ? civ.name : "Unknown civ"}
          {bo.matchup ? ` • ${bo.matchup}` : ""}
        </span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 touch-manipulation">
        <button
          type="button"
          aria-label="Previous step"
          disabled={stepIdx === 0}
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
          className="focus-ring flex h-11 w-11 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-muted-foreground">
          Step <span className="text-foreground">{totalSteps === 0 ? "—" : stepIdx + 1}</span> / {totalSteps}
        </span>
        <button
          type="button"
          aria-label="Next step"
          disabled={stepIdx >= totalSteps - 1}
          onClick={() => setStepIdx((i) => Math.min(totalSteps - 1, i + 1))}
          className="focus-ring flex h-11 w-11 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Timer row */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 touch-manipulation">
        <span className="font-mono text-sm tabular-nums text-foreground">
          {formatTime(Math.floor(elapsed))}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label={isRunning ? "Pause" : "Play"}
            onClick={toggle}
            className="focus-ring flex h-11 w-11 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            aria-label="Reset timer"
            onClick={() => {
              reset();
              setStepIdx(0);
            }}
            className="focus-ring flex h-11 w-11 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={isAutoAdvance ? "Switch to manual mode" : "Switch to auto-advance mode"}
            onClick={toggleMode}
            className={cn(
              "focus-ring flex h-11 w-11 items-center justify-center rounded transition-colors hover:bg-muted/50",
              isAutoAdvance ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isAutoAdvance ? <Timer className="h-4 w-4" /> : <MousePointer className="h-4 w-4" />}
          </button>
        </div>
      </div>


      {/* Current step */}
      <div className="flex-1 overflow-y-auto p-3 pb-6">
        {step ? (
          <div
            className={cn(
              "rounded-md border border-border border-l-4 bg-card p-3",
              AGE_BORDER[step.age],
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
                className="h-6 w-6 object-contain"
              />
              <span className="text-xs text-muted-foreground">{AGE_LABELS[step.age]}</span>
              {step.timeSeconds !== undefined && (
                <span
                  className={cn(
                    "ml-auto rounded-full border border-border px-2 py-0.5 text-[11px]",
                    targetReached ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  Target: {formatTime(step.timeSeconds)}
                </span>
              )}
            </div>

            {/* Resource pills (read-only) */}
            <div className="pointer-events-none mt-2 flex flex-wrap gap-1.5 max-[349px]:flex-col">
              {step.resources.food > 0 && (
                <ResourcePill resource="food" value={step.resources.food} onChange={noop} />
              )}
              {step.resources.wood > 0 && (
                <ResourcePill resource="wood" value={step.resources.wood} onChange={noop} />
              )}
              {step.resources.gold > 0 && (
                <ResourcePill resource="gold" value={step.resources.gold} onChange={noop} />
              )}
              {step.resources.stone > 0 && (
                <ResourcePill resource="stone" value={step.resources.stone} onChange={noop} />
              )}
              {step.resources.builder > 0 && (
                <ResourcePill resource="builder" value={step.resources.builder} onChange={noop} />
              )}
              {extraResources.includes("oliveOil") && (step.resources.oliveOil ?? 0) > 0 && (
                <ResourcePill
                  resource="oliveOil"
                  value={step.resources.oliveOil ?? 0}
                  onChange={noop}
                />
              )}
              {extraResources.includes("silver") && (step.resources.silver ?? 0) > 0 && (
                <ResourcePill
                  resource="silver"
                  value={step.resources.silver ?? 0}
                  onChange={noop}
                />
              )}
            </div>

            {/* Vils / Pop */}
            {(step.villagerCount > 0 || step.populationCount !== undefined) && (
              <div className="mt-2 text-[13px] text-muted-foreground">
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

            {/* Notes */}
            {step.notes.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-foreground">
                {step.notes.map((n) => (
                  <li key={n.id} className="flex gap-2">
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
                <div className="mt-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Positions
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {visibleTags.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/40 bg-teal-500/10 px-2 py-0.5 text-[11px] text-teal-700 dark:text-teal-300"
                      >
                        <span>{t.unit || "—"}</span>
                        <ArrowRight className="h-3 w-3 text-teal-500/70" aria-hidden />
                        <span>{t.location || "—"}</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">No steps in this build.</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-1 w-full bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
};

export default BuildOrderRunner;
