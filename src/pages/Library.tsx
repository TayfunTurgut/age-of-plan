import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Search } from "lucide-react";

import { BuildCard } from "@/components/library/BuildCard";
import { CivFlag } from "@/components/CivFlag";
import { ImportModal } from "@/components/ImportModal";
import { Seo } from "@/components/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CIVS } from "@/data/civs";
import { deleteBuildOrder, getAllBuildOrders } from "@/lib/storage";
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

export default function Library() {
  const [builds, setBuilds] = useState<BuildOrder[]>([]);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [civFilter, setCivFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [importOpen, setImportOpen] = useState(false);

  // Initial load + cross-tab sync (another tab saved/deleted a build).
  useEffect(() => {
    const refresh = () => setBuilds(getAllBuildOrders());
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return builds.filter((bo) => {
      if (civFilter !== "all" && bo.civilization !== civFilter) return false;
      if (!q) return true;
      const haystack = [bo.name, bo.author, bo.matchup, bo.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [builds, debounced, civFilter]);

  const sorted = useMemo(() => sortBuilds(filtered, sort), [filtered, sort]);

  const handleDelete = (id: string) => {
    deleteBuildOrder(id);
    setBuilds(getAllBuildOrders());
  };

  const clearFilters = () => {
    setQuery("");
    setDebounced("");
    setCivFilter("all");
    setSort("updated");
  };

  const noBuildsAtAll = builds.length === 0;
  const filteredEmpty = !noBuildsAtAll && sorted.length === 0;

  return (
    <section className="page-enter mx-auto max-w-6xl">
      <Seo
        title="Build Order Library"
        description="Browse, search, and manage your saved Age of Empires IV build orders. Filter by civilization and sort by recency."
        path="/library"
      />

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold text-primary sm:text-4xl">
          Build Order Library
        </h1>
        <Badge variant="secondary" className="text-xs">
          {sorted.length} {sorted.length === 1 ? "build" : "builds"}
        </Badge>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, author, matchup, description"
            aria-label="Search build orders by name, author, matchup, or description"
            className="h-9 pl-8"
          />
        </div>

        <Select value={civFilter} onValueChange={setCivFilter}>
          <SelectTrigger className="h-9 w-[200px]" aria-label="Filter by civilization">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All civilizations</SelectItem>
            {CIVS.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <CivFlag civ={c} size="sm" className="h-5 w-5" />
                  <span>{c.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        <Button
          variant="outline"
          size="sm"
          onClick={() => setImportOpen(true)}
          className="ml-auto"
        >
          <Download className="h-4 w-4" /> Import
        </Button>
      </div>

      {noBuildsAtAll ? (
        <div className="mt-10 rounded-lg border border-dashed border-border bg-muted/20 p-10 text-center">
          <p className="text-muted-foreground">No build orders saved yet.</p>
          <p className="mt-3 text-sm">
            <Link to="/" className="text-primary underline-offset-2 hover:underline">
              Pick a civilization to create one
            </Link>
          </p>
        </div>
      ) : filteredEmpty ? (
        <div className="mt-10 rounded-lg border border-dashed border-border bg-muted/20 p-10 text-center">
          <p className="text-muted-foreground">No builds match your filters.</p>
          <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-3">
            Clear filters
          </Button>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((bo) => (
            <li key={bo.id}>
              <BuildCard bo={bo} onDelete={handleDelete} />
            </li>
          ))}
        </ul>
      )}

      <ImportModal open={importOpen} onOpenChange={setImportOpen} />
    </section>
  );
}
