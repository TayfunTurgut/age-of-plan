import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Upload } from "lucide-react";
import type { BuildOrder } from "@/types/buildOrder";
import { CIVS } from "@/data/civs";
import { CivFlag } from "@/components/CivFlag";
import { SiteFooter } from "@/components/SiteFooter";
import { ImportModal } from "@/components/ImportModal";
import { BuildCard } from "@/components/library/BuildCard";
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
import { deleteBuildOrder, getAllBuildOrders } from "@/lib/storage";

type SortKey = "updated" | "name-asc" | "name-desc" | "created-desc" | "created-asc";

const Library = () => {
  const [builds, setBuilds] = useState<BuildOrder[]>([]);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [civFilter, setCivFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [importOpen, setImportOpen] = useState(false);

  // Initial load + cross-tab sync.
  const refresh = () => setBuilds(getAllBuildOrders());
  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Debounce search input.
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

  const sorted = useMemo(() => {
    const copy = filtered.slice();
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
  }, [filtered, sort]);

  const handleDelete = (id: string) => {
    deleteBuildOrder(id);
    refresh();
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
    <main className="page-enter min-h-screen bg-background px-6 py-10 md:py-14">
      <div className="mx-auto max-w-6xl">
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
              className="h-9 pl-8"
            />
          </div>

          <Select value={civFilter} onValueChange={setCivFilter}>
            <SelectTrigger className="h-9 w-[200px]">
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="ml-auto"
          >
            <Upload className="h-4 w-4" /> Import
          </Button>
        </div>

        {noBuildsAtAll ? (
          <div className="mt-10 rounded-lg border border-dashed border-border bg-muted/20 p-10 text-center">
            <p className="text-muted-foreground">No build orders saved yet.</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm">
              <Link to="/" className="text-primary underline-offset-2 hover:underline">
                Create one
              </Link>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="text-primary underline-offset-2 hover:underline"
              >
                Import
              </button>
            </div>
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
      </div>
      <SiteFooter />
      <ImportModal open={importOpen} onOpenChange={setImportOpen} />
    </main>
  );
};

export default Library;
