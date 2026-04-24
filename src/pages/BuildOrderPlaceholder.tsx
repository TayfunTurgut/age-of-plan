import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCiv } from "@/data/civs";
import { Card } from "@/components/ui/card";
import { getBuildOrder } from "@/lib/storage";
import type { BuildOrder } from "@/types/buildOrder";

const BuildOrderPlaceholder = () => {
  const { id } = useParams<{ id: string }>();
  const [bo, setBo] = useState<BuildOrder | null>(null);

  useEffect(() => {
    if (!id) return;
    setBo(getBuildOrder(id));
  }, [id]);

  const civ = getCiv(bo?.civilization);
  const backHref = civ ? `/civ/${civ.id}` : "/";
  const backLabel = civ ? `Back to ${civ.name}` : "All civilizations";

  return (
    <main className="page-enter min-h-screen bg-background px-6 py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <Link
          to={backHref}
          className="inline-block text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          ← {backLabel}
        </Link>

        <header className="mt-6">
          <h1 className="font-display text-3xl font-bold text-primary sm:text-4xl">
            {bo?.name || "Build order"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {civ ? civ.name : "Unknown civilization"}
            {bo?.matchup ? ` • ${bo.matchup}` : ""}
          </p>
        </header>

        <Card className="mt-6 border-dashed bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground">Viewer coming soon.</p>
        </Card>
      </div>
    </main>
  );
};

export default BuildOrderPlaceholder;
