import { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Play, Trash2 } from "lucide-react";

import { CivFlag } from "@/components/CivFlag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCiv } from "@/data/civs";
import { openOverlayFor } from "@/lib/overlayWindow";
import { formatRelativeTime } from "@/lib/relativeTime";
import { cn } from "@/lib/utils";
import type { BuildOrder } from "@/types/buildOrder";

type Props = {
  bo: BuildOrder;
  onDelete: (id: string) => void;
  /** Hide the civ strip (used on CivDetail where the civ is implicit). */
  hideCiv?: boolean;
};

function BuildCardImpl({ bo, onDelete, hideCiv = false }: Props) {
  const navigate = useNavigate();
  const civ = getCiv(bo.civilization);

  const handleDelete = () => {
    if (window.confirm("Delete this build order?")) onDelete(bo.id);
  };

  return (
    <div className="group relative h-full">
      <Card
        className={cn(
          "relative flex h-full flex-col gap-2 p-4 transition-all duration-200",
          "group-hover:-translate-y-0.5 group-hover:border-primary/60",
          "group-hover:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.4)]",
        )}
      >
        {/* Full-card link sits below the action row. */}
        <Link
          to={`/build/${bo.id}`}
          aria-label={bo.name || "Open build order"}
          className="focus-ring absolute inset-0 z-0 rounded-lg"
        />

        {!hideCiv && civ && (
          <div className="pointer-events-none relative z-[1] flex items-center gap-2">
            <CivFlag civ={civ} size="sm" />
            <span className="truncate text-xs uppercase tracking-wider text-muted-foreground">
              {civ.name}
            </span>
          </div>
        )}

        <h3 className="pointer-events-none relative z-[1] line-clamp-2 font-display text-lg font-bold text-foreground">
          {bo.name || "Untitled build"}
        </h3>

        <div className="pointer-events-none relative z-[1] flex flex-wrap items-center gap-2">
          {bo.matchup ? (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              {bo.matchup}
            </Badge>
          ) : null}
          {bo.author ? (
            <span className="truncate text-xs text-muted-foreground">
              by {bo.author}
            </span>
          ) : null}
        </div>

        <p className="pointer-events-none relative z-[1] mt-auto text-xs text-muted-foreground">
          Edited {formatRelativeTime(bo.updatedAt)}
        </p>

        <div className="action-row absolute right-2 top-2 z-10 flex gap-1 rounded-md bg-background/70 p-1 backdrop-blur">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Edit"
            className="focus-ring h-7 w-7 text-muted-foreground hover:text-primary"
            onClick={() => navigate(`/build/${bo.id}/edit`)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open overlay"
            className="focus-ring h-7 w-7 text-muted-foreground hover:text-primary"
            onClick={() => openOverlayFor(bo.id)}
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Delete"
            className="focus-ring h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

export const BuildCard = memo(BuildCardImpl);
