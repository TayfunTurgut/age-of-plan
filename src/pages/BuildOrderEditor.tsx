import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GripVertical, Upload } from "lucide-react";
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
type ActiveType = "step" | "note" | null;

/** Drag data that sortable items advertise. */
type DragData = {
  type?: "step" | "note" | "notes-container";
  sourceStepId?: string;
  stepId?: string;
};

function readDragData(data: unknown): DragData | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const out: DragData = {};
  if (obj.type === "step" || obj.type === "note" || obj.type === "notes-container") {
    out.type = obj.type;
  }
  if (typeof obj.sourceStepId === "string") out.sourceStepId = obj.sourceStepId;
  if (typeof obj.stepId === "string") out.stepId = obj.stepId;
  return out;
}

const findNoteStepIndex = (steps: BuildStep[], noteId: string): number =>
  steps.findIndex((s) => s.notes.some((n) => n.id === noteId));

/** Main build-order editor with debounced autosave + drag-and-drop. */
export default function BuildOrderEditor() {
  const { id } = useParams<{ id: string }>();
  const [bo, setBo] = useState<BuildOrder | null | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<ActiveType>(null);
  const [overContainerId, setOverContainerId] = useState<string | null>(null);
  const skipNextSave = useRef(true);
  const activeContainerRef = useRef<string | null>(null);
  const startSnapshotRef = useRef<BuildStep[] | null>(null);
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Each step registers several droppables (step, notes-container, per-note).
  // Filter collision candidates by the active item's type so a step drag ranks
  // only steps and a note drag ranks only notes/containers.
  const collisionDetectionStrategy = useCallback<CollisionDetection>((args) => {
    const activeKind = args.active.data.current?.type;
    if (activeKind === "step") {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (c) => c.data.current?.type === "step",
        ),
      });
    }
    if (activeKind === "note") {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((c) => {
          const t = c.data.current?.type;
          return t === "note" || t === "notes-container";
        }),
      });
    }
    return closestCenter(args);
  }, []);

  const civ = useMemo(() => (bo ? getCiv(bo.civilization) : undefined), [bo]);
  const stepIds = useMemo(() => bo?.steps.map((s) => s.id) ?? [], [bo?.steps]);

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

  // ---- Drag helpers ----

  const resolveOverStepId = (over: DragOverEvent["over"]): string | null => {
    if (!over) return null;
    const data = readDragData(over.data.current);
    if (data?.type === "note" && data.sourceStepId) return data.sourceStepId;
    if (data?.type === "notes-container" && data.stepId) return data.stepId;
    const idStr = String(over.id);
    if (idStr.startsWith("notes:")) return idStr.slice("notes:".length);
    return null;
  };

  const onDragStart = (e: DragStartEvent) => {
    const data = readDragData(e.active.data.current);
    const type: ActiveType = data?.type === "note" ? "note" : "step";
    setActiveId(String(e.active.id));
    setActiveType(type);
    startSnapshotRef.current = bo.steps;
    activeContainerRef.current =
      type === "note" && data?.sourceStepId ? data.sourceStepId : null;
  };

  const onDragOver = (e: DragOverEvent) => {
    if (activeType !== "note") return;
    const { active, over } = e;
    if (!over) return;
    const noteId = String(active.id);
    const targetStepId = resolveOverStepId(over);
    if (!targetStepId) return;

    setOverContainerId(targetStepId);

    if (activeContainerRef.current === targetStepId) return;

    // Move the dragged note from its current step into the target (append).
    setBo((current) => {
      if (!current) return current;
      const fromIdx = findNoteStepIndex(current.steps, noteId);
      const toIdx = current.steps.findIndex((s) => s.id === targetStepId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return current;
      const note = current.steps[fromIdx].notes.find((n) => n.id === noteId);
      if (!note) return current;
      const steps = current.steps.map((s, i) => {
        if (i === fromIdx) return { ...s, notes: s.notes.filter((n) => n.id !== noteId) };
        if (i === toIdx) return { ...s, notes: [...s.notes, note] };
        return s;
      });
      return { ...current, steps };
    });
    activeContainerRef.current = targetStepId;
  };

  const resetDragState = () => {
    setActiveId(null);
    setActiveType(null);
    setOverContainerId(null);
    activeContainerRef.current = null;
    startSnapshotRef.current = null;
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const type = activeType;

    if (type === "step") {
      if (over && active.id !== over.id) {
        const from = bo.steps.findIndex((s) => s.id === active.id);
        const to = bo.steps.findIndex((s) => s.id === over.id);
        if (from >= 0 && to >= 0) updateBo({ steps: arrayMove(bo.steps, from, to) });
      }
      resetDragState();
      return;
    }

    if (type === "note") {
      if (!over) {
        resetDragState();
        return;
      }
      const noteId = String(active.id);
      const overData = readDragData(over.data.current);

      setBo((current) => {
        if (!current) return current;
        const stepIdx = findNoteStepIndex(current.steps, noteId);
        if (stepIdx < 0) return current;
        const step = current.steps[stepIdx];
        // Reorder within the step when dropped on a sibling note; cross-step
        // moves were already applied in onDragOver.
        if (overData?.type === "note") {
          const fromIdx = step.notes.findIndex((n) => n.id === noteId);
          const toIdx = step.notes.findIndex((n) => n.id === String(over.id));
          if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
            const notes = arrayMove(step.notes, fromIdx, toIdx);
            const steps = current.steps.map((s, i) =>
              i === stepIdx ? { ...s, notes } : s,
            );
            return { ...current, steps };
          }
        }
        return current;
      });
      resetDragState();
      return;
    }

    resetDragState();
  };

  const onDragCancel = () => {
    if (startSnapshotRef.current) {
      const snapshot = startSnapshotRef.current;
      setBo((current) => (current ? { ...current, steps: snapshot } : current));
    }
    resetDragState();
  };

  // Active drag previews.
  const activeStep =
    activeType === "step" && activeId ? bo.steps.find((s) => s.id === activeId) : null;
  const activeStepIndex =
    activeType === "step" && activeId ? bo.steps.findIndex((s) => s.id === activeId) : -1;
  const activeNote = (() => {
    if (activeType !== "note" || !activeId) return null;
    for (const s of bo.steps) {
      const n = s.notes.find((nn) => nn.id === activeId);
      if (n) return n;
    }
    return null;
  })();

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
          <Button type="button" variant="outline" size="sm" onClick={() => openOverlayFor(bo.id)}>
            Preview overlay
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Export">
                <Upload className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportAsJson(bo)}>Export JSON</DropdownMenuItem>
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
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetectionStrategy}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
          >
            <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col">
                {bo.steps.map((step, i) => {
                  const sourceStepId =
                    activeType === "note" && activeId
                      ? bo.steps.find((s) => s.notes.some((n) => n.id === activeId))?.id
                      : undefined;
                  const isOverForeignNote =
                    activeType === "note" &&
                    overContainerId === step.id &&
                    sourceStepId !== step.id;
                  return (
                    <div key={step.id}>
                      {i > 0 && <InsertHere onClick={() => insertStepAt(i)} />}
                      <StepCard
                        step={step}
                        index={i}
                        civ={civ}
                        previousStep={i > 0 ? bo.steps[i - 1] : undefined}
                        onChange={setStep}
                        onDuplicate={() => duplicateStep(step.id)}
                        onDelete={() => deleteStep(step.id)}
                        isOverForeignNote={isOverForeignNote}
                      />
                    </div>
                  );
                })}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeStep ? (
                <StepCard
                  step={activeStep}
                  index={activeStepIndex}
                  civ={civ}
                  onChange={() => {}}
                  onDuplicate={() => {}}
                  onDelete={() => {}}
                  overlay
                />
              ) : activeNote ? (
                <div className="flex max-w-md items-center gap-2 rounded-md border border-primary/40 bg-card px-3 py-2 text-sm shadow-2xl">
                  <GripVertical className="h-3 w-3 text-muted-foreground/70" />
                  <span className="truncate">{activeNote.text || "Empty note"}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
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

function InsertHere({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Insert step here"
      className="group relative flex h-4 w-full items-center justify-center"
    >
      <span className="h-px w-full bg-transparent transition-colors group-hover:bg-primary/40" />
      <span className="absolute -translate-y-px rounded-full border border-primary/40 bg-background px-2 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
        + Insert step
      </span>
    </button>
  );
}
