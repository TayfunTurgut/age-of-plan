import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { getAssetUrl } from "@/lib/assets";

export type ResourceKey = "food" | "wood" | "gold" | "stone" | "builder" | "oliveOil" | "silver";

const META: Record<ResourceKey, { label: string; dot: string; full: string; icon?: string }> = {
  food: { label: "F", dot: "bg-red-500", full: "Food", icon: "resources/food.png" },
  wood: { label: "W", dot: "bg-green-600", full: "Wood", icon: "resources/wood.png" },
  gold: { label: "G", dot: "bg-yellow-500", full: "Gold", icon: "resources/gold.png" },
  stone: { label: "S", dot: "bg-gray-400", full: "Stone", icon: "resources/stone.png" },
  builder: { label: "B", dot: "bg-blue-500", full: "Builders" },
  oliveOil: { label: "O", dot: "bg-purple-500", full: "Olive Oil", icon: "resources/oliveoil.png" },
  silver: { label: "Sv", dot: "bg-zinc-200", full: "Silver", icon: "resources/silver.png" },
};

type Props = {
  resource: ResourceKey;
  value: number;
  onChange: (next: number) => void;
};

const ResourcePillImpl = ({ resource, value, onChange }: Props) => {
  const meta = META[resource];
  const [iconFailed, setIconFailed] = useState(false);
  const showIcon = Boolean(meta.icon) && !iconFailed;

  return (
    <label
      title={meta.full}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2 py-1",
        "transition-colors focus-within:border-primary",
      )}
    >
      {showIcon ? (
        <img
          src={getAssetUrl(meta.icon!)}
          alt=""
          aria-hidden
          loading="lazy"
          onError={() => setIconFailed(true)}
          className="h-4 w-4 object-contain"
        />
      ) : (
        <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} aria-hidden />
      )}
      <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
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
        aria-label={meta.full}
        className="w-12 bg-transparent text-sm text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </label>
  );
};

export const ResourcePill = memo(ResourcePillImpl);
