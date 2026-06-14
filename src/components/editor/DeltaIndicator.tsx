import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/time";

type Props = {
  value: number | undefined;
  format?: "number" | "time";
};

/** Step-over-step change indicator. Renders nothing when zero/undefined. */
export function DeltaIndicator({ value, format = "number" }: Props) {
  if (value === undefined || value === 0) return null;
  const sign = value > 0 ? "+" : "-";
  const abs = Math.abs(value);
  const text = format === "time" ? `${sign}${formatTime(abs)}` : `${sign}${abs}`;
  return (
    <span
      className={cn(
        "pl-2 text-xs font-medium tabular-nums leading-none",
        value > 0 ? "text-green-600 dark:text-green-500" : "text-destructive",
      )}
      aria-label={`Change from previous step: ${text}`}
    >
      {text}
    </span>
  );
}
