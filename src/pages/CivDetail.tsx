import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download } from "lucide-react";
import { getCiv } from "@/data/civs";
import { CivFlag } from "@/components/CivFlag";
import { SiteFooter } from "@/components/SiteFooter";
import { ImportModal } from "@/components/ImportModal";
import { BuildCard } from "@/components/library/BuildCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteBuildOrder, getBuildOrdersByCiv } from "@/lib/storage";
import type { BuildOrder } from "@/types/buildOrder";

type SortKey = "updated" | "name-asc" | "name-desc" | "created-desc" | "created-asc";

const CivDetail = () => {
  const { id } = useParams<{ id: string }>();
  const civ = getCiv(id);
  const parent = getCiv(civ?.variantOf);
  const [builds, setBuilds] = useState<BuildOrder[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>("updated");

  useEffect(() => {
    if (!id) return;
    setBuilds(getBuildOrdersByCiv(id));
  }, [id]);

  const sorted = useMemo(() => {
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
  }, [builds, sort]);

  if (!civ) {
    return (
      <main className="page-enter flex min-h-screen items-center justify-center bg-background px-6">
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
    <main className="page-enter min-h-screen bg-background px-6 py-10 md:py-14">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="inline-block text-sm text-muted-foreground transition-colors hover:text-primary"
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
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link to={`/build/new?civ=${civ.id}`}>New Build Order</Link>
            </Button>
            <Button variant="outline" size="lg" onClick={() => setImportOpen(true)}>
              <Download className="h-4 w-4" /> Import Build Order
            </Button>
          </div>
        </header>

        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold text-foreground">Saved build orders</h2>
            {builds.length > 0 && (
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-9 w-[160px]">
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
      </div>
      <SiteFooter />
      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        presetCivId={civ.id}
      />
    </main>
  );
};

export default CivDetail;
