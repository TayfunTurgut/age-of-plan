import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { InlineText } from "@/components/editor/InlineText";
import { StepCard } from "@/components/editor/StepCard";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { getCiv } from "@/data/civs";
import { cloneStep, computeVillagerCount, createEmptyStep } from "@/lib/buildOrder";
import { exportAsJson, exportAsRtsOverlay } from "@/lib/exportBuildOrder";
import { openOverlayFor } from "@/lib/overlayWindow";
import { getBuildOrder, saveBuildOrder, StorageQuotaError } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { BuildOrder, BuildStep } from "@/types/buildOrder";

type SaveStatus = "idle" | "saving" | "saved";

/** Main build-order editor with debounced autosave. Drag-and-drop reordering,
 *  draggable notes, tags, and the icon picker arrive in M11. */
export default function BuildOrderEditor() {
  const { id } = useParams<{ id: string }>();
  const [bo, setBo] = useState<BuildOrder | null | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const skipNextSave = useRef(true);
  // Latest unsaved build + its debounce timer, so beforeunload can flush.
  const pendingSaveRef = useRef<{ bo: BuildOrder; timer: number } | null>(null);

  useEffect(() => {
    setBo(id ? (getBuildOrder(id) ?? null) : null);
    skipNextSave.current = true;
  }, [id]);

  // Debounced autosave.
  useEffect(() => {
    if (!bo) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      pendingSaveRef.current = null;
      try {
        saveBuildOrder(bo);
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("idle");
        if (err instanceof StorageQuotaError) {
          toast.error(err.message, {
            description: "Delete unused builds from the library and try again.",
          });
        } else {
          toast.error("Could not save build. See the console for details.");
          console.error("[saveBuildOrder]", err);
        }
      }
    }, 500);
    pendingSaveRef.current = { bo, timer };
    return () => {
      clearTimeout(timer);
      if (pendingSaveRef.current?.timer === timer) pendingSaveRef.current = null;
    };
  }, [bo]);

  // Flush a pending autosave before the tab unloads (localStorage is sync).
  useEffect(() => {
    const onBeforeUnload = () => {
      const pending = pendingSaveRef.current;
      if (!pending) return;
      clearTimeout(pending.timer);
      pendingSaveRef.current = null;
      try {
        saveBuildOrder(pending.bo);
      } catch {
        // best-effort
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const civ = useMemo(() => (bo ? getCiv(bo.civilization) : undefined), [bo]);

  // In auto mode, villagerCount always mirrors the resource sum.
  const setStep = useCallback((next: BuildStep) => {
    setBo((current) => {
      if (!current) return current;
      const synced: BuildStep =
        next.villagerCountManual === true
          ? next
          : { ...next, villagerCount: computeVillagerCount(next.resources) };
      return {
        ...current,
        steps: current.steps.map((s) => (s.id === synced.id ? synced : s)),
      };
    });
  }, []);

  const duplicateStep = useCallback((stepId: string) => {
    setBo((current) => {
      if (!current) return current;
      const idx = current.steps.findIndex((s) => s.id === stepId);
      if (idx < 0) return current;
      const steps = current.steps.slice();
      steps.splice(idx + 1, 0, cloneStep(current.steps[idx]));
      return { ...current, steps };
    });
  }, []);

  const deleteStep = useCallback((stepId: string) => {
    setBo((current) =>
      current
        ? { ...current, steps: current.steps.filter((s) => s.id !== stepId) }
        : current,
    );
  }, []);

  if (bo === undefined) {
    return <section className="page-enter min-h-[40vh]" />;
  }

  if (bo === null) {
    return (
      <section className="page-enter mx-auto max-w-md text-center">
        <div className="rounded-lg border border-border bg-card p-8">
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
      </section>
    );
  }

  const updateBo = (patch: Partial<BuildOrder>) =>
    setBo((current) => (current ? { ...current, ...patch } : current));

  const insertStepAt = (idx: number) => {
    const prev = bo.steps[idx - 1];
    const fresh = prev ? cloneStep(prev) : createEmptyStep();
    const steps = bo.steps.slice();
    steps.splice(idx, 0, fresh);
    updateBo({ steps });
  };
  const appendStep = () => insertStepAt(bo.steps.length);

  const saveLabel =
    saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "";

  return (
    <section className="page-enter mx-auto max-w-4xl">
      <Seo
        title={bo.name || "Edit build"}
        description={`Edit the ${civ ? civ.name : "Age of Empires IV"} build order "${bo.name}" step by step.`.slice(
          0,
          160,
        )}
        path={`/build/${bo.id}/edit`}
      />

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <Link
          to={civ ? `/civ/${civ.id}` : "/"}
          className="text-sm text-muted-foreground transition-colors hover:text-primary focus-ring"
        >
          ← Back{civ ? ` to ${civ.name}` : ""}
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {saveLabel}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openOverlayFor(bo.id)}
          >
            Preview overlay
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Export">
                <Upload className="h-4 w-4" />
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
      </div>

      {/* Title */}
      <h1 className="mt-4">
        <InlineText
          value={bo.name}
          onCommit={(name) => updateBo({ name: name.trim() || "Untitled build" })}
          ariaLabel="Build name"
          displayClassName="font-display text-3xl sm:text-4xl font-bold text-primary px-0"
          inputClassName="font-display text-3xl sm:text-4xl font-bold text-primary"
          className="w-full"
        />
      </h1>

      {/* Metadata */}
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Input
          value={bo.author ?? ""}
          placeholder="Author"
          aria-label="Author"
          onChange={(e) => updateBo({ author: e.target.value })}
          className="h-9"
        />
        <Input
          value={bo.matchup ?? ""}
          placeholder="e.g. vs French"
          aria-label="Matchup"
          onChange={(e) => updateBo({ matchup: e.target.value })}
          className="h-9"
        />
        <Input
          value={bo.description ?? ""}
          placeholder="Description"
          aria-label="Description"
          onChange={(e) => updateBo({ description: e.target.value })}
          className="h-9"
        />
      </div>

      {/* Steps */}
      <div className="mt-8">
        {bo.steps.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-10 text-center">
            <p className="text-muted-foreground">Add your first step to get started</p>
            <button
              type="button"
              onClick={appendStep}
              className="focus-ring mt-4 inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/20"
            >
              + Add step
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {bo.steps.map((step, i) => (
              <StepCard
                key={step.id}
                step={step}
                index={i}
                civ={civ}
                previousStep={i > 0 ? bo.steps[i - 1] : undefined}
                onChange={setStep}
                onDuplicate={() => duplicateStep(step.id)}
                onDelete={() => deleteStep(step.id)}
              />
            ))}
          </div>
        )}

        {bo.steps.length > 0 && (
          <button
            type="button"
            onClick={appendStep}
            className={cn(
              "focus-ring mt-4 w-full rounded-lg border border-dashed border-border bg-transparent px-4 py-3 text-sm text-muted-foreground transition-colors",
              "hover:border-primary hover:text-primary",
            )}
          >
            + Add step
          </button>
        )}
      </div>
    </section>
  );
}
