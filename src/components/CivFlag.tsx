import * as React from "react";
import { cn } from "@/lib/utils";
import { getAssetUrl } from "@/lib/assets";
import type { Civ } from "@/data/civs";

type Size = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-10 w-10 text-sm",
  md: "h-16 w-16 text-lg",
  lg: "h-24 w-24 text-2xl",
};

const initialsFor = (name: string): string => {
  const cleaned = name.replace(/['']/g, "");
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

interface CivFlagProps extends React.HTMLAttributes<HTMLDivElement> {
  civ: Civ;
  size?: Size;
}

export const CivFlag = React.forwardRef<HTMLDivElement, CivFlagProps>(
  ({ civ, size = "md", className, style, ...props }, ref) => {
    const [failed, setFailed] = React.useState(false);
    const showImage = !failed && Boolean(civ.flagIcon);

    return (
      <div
        ref={ref}
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-primary/40 font-display font-bold text-primary-foreground shadow-sm",
          SIZE_CLASSES[size],
          className,
        )}
        style={
          showImage
            ? { backgroundColor: "hsl(var(--secondary))", ...style }
            : {
                backgroundImage: `linear-gradient(135deg, ${civ.flagColor.from}, ${civ.flagColor.to})`,
                ...style,
              }
        }
        {...props}
      >
        {showImage ? (
          <img
            src={getAssetUrl(civ.flagIcon)}
            alt={civ.name}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{initialsFor(civ.name)}</span>
        )}
      </div>
    );
  },
);
CivFlag.displayName = "CivFlag";
