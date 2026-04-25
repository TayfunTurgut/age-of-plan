import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download } from "lucide-react";
import { getCiv } from "@/data/civs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getBuildOrder } from "@/lib/storage";
import { exportAsJson, exportAsRtsOverlay } from "@/lib/exportBuildOrder";
import type { BuildOrder } from "@/types/buildOrder";

const OVERLAY_FEATURES =
  "width=380,height=420,menubar=no,toolbar=no,location=no,status=no,resizable=yes";

const BuildOrderPlaceholder = () => {
  const { id } = useParams<{ id: string }>();
  // undefined = loading, null = not found
  const [bo, setBo] = useState<BuildOrder | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setBo(null);
      return;
    }
    setBo(getBuildOrder(id));
  }, [id]);

  // Loading shim (briefly before localStorage resolves on slow devices).
  if (bo === undefined) {
    return <main className="page-enter min-h-screen bg-background" />;
  }

  // Error state — build doesn't exist (deleted, bad link, etc.)
  if (bo === null) {
    return (
      <main className="page-enter min-h-screen bg-background px-6 py-14">
        <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-primary">
            Build order not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This build order could not be found. It may have been deleted.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">← Back to civilizations</Link>
          </Button>
        </div>
      </main>
    );
  }

  const civ = getCiv(bo.civilization);
  const backHref = civ ? `/civ/${civ.id}` : "/";
  const backLabel = civ ? `Back to ${civ.name}` : "All civilizations";

  const openOverlay = () => {
    if (!id) return;
    window.open(`/build/${id}/run`, "aoe4-overlay", OVERLAY_FEATURES);
  };

  return (
    <main className="page-enter min-h-screen bg-background px-6 py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <Link
          to={backHref}
          className="focus-ring inline-block rounded text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          ← {backLabel}
        </Link>

        <header className="mt-6">
          <h1 className="font-display text-3xl font-bold text-primary sm:text-4xl">
            {bo.name || "Build order"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {civ ? civ.name : "Unknown civilization"}
            {bo.matchup ? ` • ${bo.matchup}` : ""}
          </p>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={openOverlay}>Open Overlay</Button>
          <Button asChild variant="outline">
            <Link to={`/build/${id}/edit`}>Edit</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" aria-label="Export">
                <Download className="h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportAsJson(bo)}>
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAsRtsOverlay(bo)}>
                Export for RTS Overlay
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Card className="mt-6 border-dashed bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground">
            Launch the overlay in a small popup window for use alongside the game.
          </p>
        </Card>
      </div>
    </main>
  );
};

export default BuildOrderPlaceholder;
