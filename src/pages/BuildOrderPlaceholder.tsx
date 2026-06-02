import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Upload } from "lucide-react";

import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCiv } from "@/data/civs";
import { exportAsJson, exportAsRtsOverlay } from "@/lib/exportBuildOrder";
import { openOverlayFor } from "@/lib/overlayWindow";
import { getBuildOrder } from "@/lib/storage";
import type { BuildOrder } from "@/types/buildOrder";

/** Build landing — edit / run / export actions for one build. */
export default function BuildOrderPlaceholder() {
  const { id } = useParams<{ id: string }>();
  // undefined = loading, null = not found.
  const [bo, setBo] = useState<BuildOrder | null | undefined>(undefined);

  useEffect(() => {
    setBo(id ? getBuildOrder(id) : null);
  }, [id]);

  if (bo === undefined) {
    return <section className="page-enter min-h-[40vh]" />;
  }

  if (bo === null) {
    return (
      <section className="page-enter mx-auto max-w-md text-center">
        <Card className="p-8">
          <h1 className="font-display text-2xl font-bold text-primary">
            Build order not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This build order could not be found. It may have been deleted.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">← Back to civilizations</Link>
          </Button>
        </Card>
      </section>
    );
  }

  const civ = getCiv(bo.civilization);
  const backHref = civ ? `/civ/${civ.id}` : "/";
  const backLabel = civ ? `Back to ${civ.name}` : "All civilizations";

  return (
    <section className="page-enter mx-auto max-w-3xl">
      <Seo
        title={bo.name || "Build order"}
        description={`${civ ? civ.name : "Age of Empires IV"} build order${
          bo.matchup ? ` ${bo.matchup}` : ""
        }${bo.author ? ` by ${bo.author}` : ""}. Open the overlay or edit step by step.`.slice(
          0,
          160,
        )}
        path={`/build/${bo.id}`}
      />

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
          {" • "}
          {bo.steps.length} {bo.steps.length === 1 ? "step" : "steps"}
        </p>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => id && openOverlayFor(id)}>Open overlay</Button>
        <Button asChild variant="outline">
          <Link to={`/build/${id}/edit`}>Edit</Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Upload className="h-4 w-4" /> Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportAsJson(bo)}>
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAsRtsOverlay(bo)}>
              Export for RTS_Overlay
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  );
}
