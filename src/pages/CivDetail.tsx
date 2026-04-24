import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { getCiv } from "@/data/civs";
import { CivFlag } from "@/components/CivFlag";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteBuildOrder, getBuildOrdersByCiv } from "@/lib/storage";
import type { BuildOrder } from "@/types/buildOrder";

const formatDate = (ts: number): string =>
  new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const CivDetail = () => {
  const { id } = useParams<{ id: string }>();
  const civ = getCiv(id);
  const parent = getCiv(civ?.variantOf);
  const [builds, setBuilds] = useState<BuildOrder[]>([]);

  useEffect(() => {
    if (!id) return;
    setBuilds(getBuildOrdersByCiv(id));
  }, [id]);

  if (!civ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-primary">Civilization not found</h1>
          <Link to="/" className="mt-4 inline-block text-muted-foreground hover:text-primary">
            ← All civilizations
          </Link>
        </div>
      </main>
    );
  }

  const handleDelete = (boId: string) => {
    deleteBuildOrder(boId);
    setBuilds(getBuildOrdersByCiv(civ.id));
  };

  return (
    <main className="min-h-screen bg-background px-6 py-10 md:py-14">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="inline-block text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          ← All civilizations
        </Link>

        <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <CivFlag civ={civ} size="md" />
            <div>
              <h1 className="font-display text-3xl font-bold text-primary sm:text-4xl">
                {civ.name}
              </h1>
              {parent && (
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Variant of {parent.name}
                </p>
              )}
              <p className="mt-1 text-base text-muted-foreground">{civ.tagline}</p>
            </div>
          </div>
          <Button asChild size="lg">
            <Link to={`/build/new?civ=${civ.id}`}>New Build Order</Link>
          </Button>
        </header>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold text-foreground">Saved build orders</h2>

          {builds.length === 0 ? (
            <Card className="mt-4 border-dashed bg-muted/30 p-8 text-center">
              <p className="text-muted-foreground">
                No build orders yet. Create your first one.
              </p>
            </Card>
          ) : (
            <ul className="mt-4 space-y-3">
              {builds.map((bo) => (
                <li key={bo.id}>
                  <Card className="flex items-center justify-between gap-4 p-4 transition-colors hover:border-primary/60">
                    <Link to={`/build/${bo.id}`} className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-lg font-bold text-foreground">
                        {bo.name || "Untitled build"}
                      </h3>
                      <p className="truncate text-sm text-muted-foreground">
                        {bo.matchup ? `${bo.matchup} • ` : ""}Updated {formatDate(bo.updatedAt)}
                      </p>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${bo.name || "build order"}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(bo.id);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
};

export default CivDetail;
