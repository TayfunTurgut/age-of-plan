import { cn } from "@/lib/utils";
import type { Civ } from "@/data/civs";

type Size = "sm" | "md";

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-10 w-10 text-sm",
  md: "h-16 w-16 text-lg",
};

const initialsFor = (name: string): string => {
  const cleaned = name.replace(/['']/g, "");
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

interface CivFlagProps {
  civ: Civ;
  size?: Size;
  className?: string;
}

export const CivFlag = ({ civ, size = "md", className }: CivFlagProps) => {
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border border-primary/40 font-display font-bold text-primary-foreground shadow-sm",
        SIZE_CLASSES[size],
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, ${civ.flagColor.from}, ${civ.flagColor.to})`,
      }}
    >
      <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{initialsFor(civ.name)}</span>
    </div>
  );
};
