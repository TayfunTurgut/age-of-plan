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

function initialsFor(name: string): string {
  const cleaned = name.replace(/['‘’]/g, "");
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface CivFlagProps extends React.HTMLAttributes<HTMLDivElement> {
  civ: Civ;
  size?: Size;
}

/** Decorative civ badge: flag image with an initials fallback. Marked
 *  aria-hidden because the civ name is always shown as adjacent text. */
export const CivFlag = React.forwardRef<HTMLDivElement, CivFlagProps>(
  ({ civ, size = "md", className, ...props }, ref) => {
    const [failed, setFailed] = React.useState(false);
    const [loaded, setLoaded] = React.useState(false);
    const showImage = !failed && Boolean(civ.flagIcon);

    return (
      <div
        ref={ref}
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-primary/40 bg-muted font-display font-bold text-foreground shadow-sm",
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      >
        {showImage ? (
          <img
            src={getAssetUrl(civ.flagIcon)}
            alt=""
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn(
              "h-full w-full object-contain p-1 transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
        ) : (
          <span>{initialsFor(civ.name)}</span>
        )}
      </div>
    );
  },
);
CivFlag.displayName = "CivFlag";

export default CivFlag;
