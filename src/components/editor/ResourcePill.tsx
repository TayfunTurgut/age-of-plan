import { cn } from "@/lib/utils";

export type ResourceKey = "food" | "wood" | "gold" | "stone" | "builder" | "oliveOil" | "silver";

const META: Record<ResourceKey, { label: string; dot: string; full: string }> = {
  food: { label: "F", dot: "bg-red-500", full: "Food" },
  wood: { label: "W", dot: "bg-green-600", full: "Wood" },
  gold: { label: "G", dot: "bg-yellow-500", full: "Gold" },
  stone: { label: "S", dot: "bg-gray-400", full: "Stone" },
  builder: { label: "B", dot: "bg-blue-500", full: "Builders" },
  oliveOil: { label: "O", dot: "bg-purple-500", full: "Olive Oil" },
  silver: { label: "Sv", dot: "bg-zinc-200", full: "Silver" },
};

type Props = {
  resource: ResourceKey;
  value: number;
  onChange: (next: number) => void;
};

export const ResourcePill = ({ resource, value, onChange }: Props) => {
  const meta = META[resource];
  return (
    <label
      title={meta.full}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2 py-1",
        "transition-colors focus-within:border-primary",
      )}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} aria-hidden />
      <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
      <input
        type="number"
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
