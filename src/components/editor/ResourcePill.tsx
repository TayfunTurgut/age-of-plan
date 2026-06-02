import { memo, useState } from "react";

import { DeltaIndicator } from "@/components/editor/DeltaIndicator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getAssetUrl } from "@/lib/assets";
import { cn } from "@/lib/utils";
import type { ResourceKey } from "@/types/buildOrder";

const META: Record<
  ResourceKey,
  { label: string; dot: string; full: string; icon?: string }
> = {
  food: { label: "F", dot: "bg-red-500", full: "Food", icon: "resources/food.png" },
  wood: { label: "W", dot: "bg-green-600", full: "Wood", icon: "resources/wood.png" },
  gold: { label: "G", dot: "bg-yellow-500", full: "Gold", icon: "resources/gold.png" },
  stone: { label: "S", dot: "bg-gray-400", full: "Stone", icon: "resources/stone.png" },
  builder: { label: "B", dot: "bg-blue-500", full: "Builders", icon: "general/build.webp" },
  oliveOil: { label: "O", dot: "bg-purple-500", full: "Olive Oil", icon: "resources/oliveoil.png" },
  silver: { label: "Sv", dot: "bg-zinc-200", full: "Silver", icon: "resources/silver.png" },
};

type Props = {
  resource: ResourceKey;
  value: number;
  onChange: (next: number) => void;
  /** Step-over-step delta below the pill. Hidden when 0/undefined. */
  delta?: number;
  /** When true, the input is replaced by a static `?` and the delta suppressed. */
  unknown?: boolean;
  /** When provided, renders a toggle that flips `unknown` (Builders pill only). */
  onUnknownToggle?: (next: boolean) => void;
};

function ResourcePillImpl({
  resource,
  value,
  onChange,
  delta,
  unknown = false,
  onUnknownToggle,
}: Props) {
  const meta = META[resource];
  const [iconFailed, setIconFailed] = useState(false);
  const showIcon = Boolean(meta.icon) && !iconFailed;

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <div className="inline-flex items-center gap-1">
        <label
          title={meta.full}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2 py-1 transition-colors focus-within:border-primary"
        >
          {showIcon ? (
            <img
              src={getAssetUrl(meta.icon!)}
              alt=""
              aria-hidden
              loading="lazy"
              onError={() => setIconFailed(true)}
              className="h-5 w-5 object-contain"
            />
          ) : (
            <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} aria-hidden />
          )}
          <span className="text-sm font-medium text-muted-foreground">{meta.label}</span>
          {unknown ? (
            <span
              aria-label={`${meta.full} (unknown)`}
              className="w-12 text-center text-sm tabular-nums text-foreground"
            >
              ?
            </span>
          ) : (
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              value={value}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                onChange(Number.isNaN(n) ? 0 : Math.max(0, n));
              }}
              onFocus={(e) => e.currentTarget.select()}
              aria-label={meta.full}
              className="w-12 bg-transparent text-sm text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          )}
        </label>
        {onUnknownToggle && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onUnknownToggle(!unknown)}
                aria-label={
                  unknown
                    ? `Show numeric ${meta.full.toLowerCase()} count`
                    : `Hide ${meta.full.toLowerCase()} count (display ?)`
                }
                aria-pressed={unknown}
                className={cn(
                  "focus-ring inline-flex h-6 w-6 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  unknown
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border bg-muted/40 text-muted-foreground/80 hover:bg-muted/70 hover:text-foreground",
                )}
              >
                ?
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {unknown
                ? "Showing ? — click to display the numeric count again."
                : "Display ? for builders and total villagers on this step."}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <DeltaIndicator value={unknown ? undefined : delta} format="number" />
    </div>
  );
}

export const ResourcePill = memo(ResourcePillImpl);
