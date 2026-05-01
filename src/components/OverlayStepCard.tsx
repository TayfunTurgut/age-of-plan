import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { BuildStep } from "@/types/buildOrder";
import type { Civ } from "@/data/civs";
import { getAssetUrl } from "@/lib/assets";
import { formatTime } from "@/lib/time";
import { renderNote } from "@/lib/noteRenderer";
import type { ResourceKey } from "@/types/buildOrder";
import { TouchableTooltip } from "@/components/ui/touchable-tooltip";
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

const CompactResourceChip = ({
  resource,
  value,
  unknown = false,
}: {
  resource: ResourceKey;
  value: number;
  unknown?: boolean;
}) => {
  const m = RESOURCE_META[resource];
  const [iconFailed, setIconFailed] = useState(false);
  return (
    <TouchableTooltip content={m.label} side="top">
      <span className="pointer-events-auto inline-flex select-none items-center gap-1 rounded-full border border-border bg-secondary/50 px-1.5 py-0.5">
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
          <span className="text-xs font-medium text-muted-foreground">
            {m.label[0]}
          </span>
        )}
        <span className="text-base tabular-nums text-foreground">
          {unknown ? "?" : value}
        </span>
      </span>
    </TouchableTooltip>
  );
};

type OverlayStepCardProps = {
  step: BuildStep | undefined;
  civ: Civ | undefined;
  targetReached?: boolean;
  className?: string;
  /**
   * Renders a faint "→" in the bottom-right that brightens on `group-hover`
   * from an ancestor with the `group` class. The runner uses this to hint
   * that the card is click-to-advance.
   */
  showAdvanceHint?: boolean;
};

const OverlayStepCard = ({
  step,
  civ,
  targetReached = false,
  className,
  showAdvanceHint = false,
}: OverlayStepCardProps) => {
  if (!step) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        No steps in this build.
      </p>
    );
  }

  const extraResources = civ?.extraResources ?? [];

  const visibleTags = (step.tags ?? []).filter(
    (t) => t.unit.trim() || t.location.trim(),
  );

  return (
    <div
      className={cn(
        "relative rounded-md border border-border border-l-4 bg-card p-2",
        AGE_BORDER[step.age],
        AGE_GLOW[step.age],
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <TouchableTooltip content={AGE_LABELS[step.age]} side="bottom">
          <span className="inline-flex">
            <img
              src={getAssetUrl(AGE_ICON[step.age])}
              alt={AGE_LABELS[step.age]}
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
              className="h-5 w-5 object-contain"
            />
          </span>
        </TouchableTooltip>
        <span className="text-sm text-muted-foreground">
          {AGE_LABELS[step.age]}
        </span>
        {step.timeSeconds !== undefined && (
          <span
            className={cn(
              "ml-auto rounded-full border border-border px-1.5 py-0 text-xs tabular-nums",
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
          const isBuilderUnknown = r === "builder" && step.buildersUnknown === true;
          if (v <= 0 && !isBuilderUnknown) return null;
          if (r === "oliveOil" && !extraResources.includes("oliveOil"))
            return null;
          if (r === "silver" && !extraResources.includes("silver"))
            return null;
          return (
            <CompactResourceChip
              key={r}
              resource={r}
              value={v}
              unknown={isBuilderUnknown}
            />
          );
        })}
      </div>

      {(step.villagerCount > 0 || step.buildersUnknown) && (
        <div className="mt-1 text-sm text-muted-foreground">
          Vils:{" "}
          <span className="text-foreground">
            {step.buildersUnknown ? "?" : step.villagerCount}
          </span>
        </div>
      )}

      {step.prerequisite && step.prerequisite.trim() && (
        <div className="mt-2 rounded-md bg-muted/40 px-2 py-1.5 text-base leading-tight text-foreground [&_img]:!h-5 [&_img]:!w-5">
          <span className="mr-1.5 align-text-bottom text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Need
          </span>
          {renderNote(step.prerequisite, { withTooltip: true })}
        </div>
      )}

      {step.notes.length > 0 && (
        <ul className="mt-2 space-y-1 text-base leading-tight text-foreground [&_img]:!h-5 [&_img]:!w-5">
          {step.notes.map((n) => (
            <li key={n.id} className="flex gap-1.5">
              <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
              <span className="min-w-0 flex-1">
                {renderNote(n.text, { withTooltip: true })}
              </span>
            </li>
          ))}
        </ul>
      )}

      {visibleTags.length > 0 && (
        <div className="mt-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Positions
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {visibleTags.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 rounded-full border border-teal-500/40 bg-teal-500/10 px-1.5 py-0 text-sm text-teal-700 dark:text-teal-300"
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
      )}

      {showAdvanceHint && (
        <span className="pointer-events-none absolute bottom-1 right-2 text-xs text-muted-foreground/30 transition-opacity group-hover:text-muted-foreground/70">
          →
        </span>
      )}
    </div>
  );
};

export default OverlayStepCard;
