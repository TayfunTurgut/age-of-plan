import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { BuildCard } from "@/components/library/BuildCard";
import { CivFlag } from "@/components/CivFlag";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCiv } from "@/data/civs";
import { deleteBuildOrder, getBuildOrdersByCiv } from "@/lib/storage";
import type { BuildOrder } from "@/types/buildOrder";

type SortKey = "updated" | "name-asc" | "name-desc" | "created-desc" | "created-asc";

function sortBuilds(builds: BuildOrder[], sort: SortKey): BuildOrder[] {
  const copy = builds.slice();
  switch (sort) {
    case "name-asc":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return copy.sort((a, b) => b.name.localeCompare(a.name));
    case "created-desc":
      return copy.sort((a, b) => b.createdAt - a.createdAt);
    case "created-asc":
      return copy.sort((a, b) => a.createdAt - b.createdAt);
    case "updated":
    default:
      return copy.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

export default function CivDetail() {
  const { id } = useParams<{ id: string }>();
  const civ = getCiv(id);
  const parent = getCiv(civ?.variantOf);
  const [builds, setBuilds] = useState<BuildOrder[]>([]);
  const [sort, setSort] = useState<SortKey>("updated");

  useEffect(() => {
    if (!id) return;
    const refresh = () => setBuilds(getBuildOrdersByCiv(id));
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [id]);

  const sorted = useMemo(() => sortBuilds(builds, sort), [builds, sort]);

  if (!civ) {
    return (
      <section className="page-enter flex min-h-[50vh] items-center justify-center text-center">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">
            Civilization not found
          </h1>
          <Link
            to="/"
            className="mt-4 inline-block text-muted-foreground hover:text-primary"
          >
            ← All civilizations
          </Link>
        </div>
      </section>
    );
  }

  const handleDelete = (boId: string) => {
    deleteBuildOrder(boId);
    setBuilds(getBuildOrdersByCiv(civ.id));
  };

  return (
    <section className="page-enter mx-auto max-w-4xl">
      <Seo
        title={`${civ.name} build orders`}
        description={`${civ.name} build orders for Age of Empires IV. ${civ.tagline}`.slice(0, 160)}
        path={`/civ/${civ.id}`}
      />

      <Link
        to="/"
        className="inline-block text-sm text-muted-foreground transition-colors hover:text-primary focus-ring"
      >
        ← All civilizations
      </Link>

      <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <CivFlag civ={civ} size="lg" />
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
          <Link to={`/build/new?civ=${civ.id}`}>New build order</Link>
        </Button>
      </header>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold text-foreground">
            Saved build orders
          </h2>
          {builds.length > 0 && (
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-9 w-[160px]" aria-label="Sort builds">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Last edited</SelectItem>
                <SelectItem value="name-asc">Name A–Z</SelectItem>
                <SelectItem value="name-desc">Name Z–A</SelectItem>
                <SelectItem value="created-desc">Newest</SelectItem>
                <SelectItem value="created-asc">Oldest</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {builds.length === 0 ? (
          <Card className="mt-4 border-dashed bg-muted/30 p-8 text-center">
            <p className="text-muted-foreground">
              No build orders yet. Create your first one.
            </p>
          </Card>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {sorted.map((bo) => (
              <li key={bo.id}>
                <BuildCard bo={bo} onDelete={handleDelete} hideCiv />
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
