import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { CivFlag } from "@/components/CivFlag";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CIVS, getCiv } from "@/data/civs";
import { createEmptyBuildOrder } from "@/lib/buildOrder";
import { saveBuildOrder, StorageQuotaError } from "@/lib/storage";

/** Create flow — pick a civ + name, then create the build and open the editor. */
export default function NewBuildOrder() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const presetCiv = getCiv(params.get("civ") ?? "");
  const [civId, setCivId] = useState<string>(presetCiv?.id ?? "");
  const [name, setName] = useState("");

  const create = () => {
    if (!getCiv(civId)) {
      toast.error("Pick a civilization first.");
      return;
    }
    const bo = createEmptyBuildOrder(civId);
    const trimmed = name.trim();
    if (trimmed) bo.name = trimmed;
    try {
      saveBuildOrder(bo);
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        toast.error(err.message);
      } else {
        toast.error("Could not create the build. See the console for details.");
        console.error("[createEmptyBuildOrder]", err);
      }
      return;
    }
    navigate(`/build/${bo.id}/edit`);
  };

  return (
    <section className="page-enter mx-auto max-w-xl">
      <Seo
        title="New build order"
        description="Create a new Age of Empires IV build order: pick a civilization, name it, and start adding steps."
        path="/build/new"
      />

      <h1 className="font-display text-3xl font-bold text-primary">New build order</h1>
      <p className="mt-2 text-muted-foreground">
        Choose a civilization and name your build.
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="bo-name" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="bo-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fast Castle into Knights"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="bo-civ" className="text-sm font-medium">
            Civilization
          </label>
          <Select value={civId} onValueChange={setCivId}>
            <SelectTrigger id="bo-civ" aria-label="Civilization">
              <SelectValue placeholder="Select a civilization" />
            </SelectTrigger>
            <SelectContent>
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
        </div>

        <Button type="submit" disabled={!civId}>
          Create build order
        </Button>
      </form>
    </section>
  );
}
