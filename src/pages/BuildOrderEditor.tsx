import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import type { BuildOrder, BuildStep } from "@/types/buildOrder";
import { getBuildOrder, saveBuildOrder } from "@/lib/storage";
import { getCiv } from "@/data/civs";
import { createEmptyStep } from "@/lib/buildOrder";
import { InlineText } from "@/components/editor/InlineText";
import { StepCard } from "@/components/editor/StepCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OVERLAY_FEATURES =
  "width=420,height=520,menubar=no,toolbar=no,location=no,status=no,resizable=yes";

type SaveStatus = "idle" | "saving" | "saved";
type ActiveType = "step" | "note" | null;

const BuildOrderEditor = () => {
  const { id } = useParams<{ id: string }>();
  const [bo, setBo] = useState<BuildOrder | null | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<ActiveType>(null);
  const [overContainerId, setOverContainerId] = useState<string | null>(null);
  const skipNextSave = useRef(true);
  const activeContainerRef = useRef<string | null>(null);
  const startSnapshotRef = useRef<BuildStep[] | null>(null);

  // Load once.
  useEffect(() => {
    if (!id) {
      setBo(null);
      return;
    }
    const found = getBuildOrder(id);
    setBo(found ?? null);
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
    const t = setTimeout(() => {
      saveBuildOrder(bo);
      setSaveStatus("saved");
    }, 500);
    return () => clearTimeout(t);
  }, [bo]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const civ = useMemo(() => (bo ? getCiv(bo.civilization) : undefined), [bo]);

  if (bo === undefined) {
    return <main className="page-enter min-h-screen bg-background" />;
  }

  if (bo === null) {
    return (
      <main className="page-enter min-h-screen bg-background px-6 py-14">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-2xl font-bold text-primary">Build not found</h1>
          <Link to="/" className="mt-4 inline-block text-sm text-muted-foreground hover:text-primary">
            ← Back to civs
          </Link>
        </div>
      </main>
    );
  }

  const updateBo = (patch: Partial<BuildOrder>) => setBo({ ...bo, ...patch });

  const setStep = (next: BuildStep) =>
    updateBo({ steps: bo.steps.map((s) => (s.id === next.id ? next : s)) });

  const insertStepAt = (idx: number) => {
    const prev = bo.steps[idx - 1];
    const fresh = createEmptyStep(prev);
    const steps = bo.steps.slice();
    steps.splice(idx, 0, fresh);
    updateBo({ steps });
  };

  const appendStep = () => insertStepAt(bo.steps.length);

  const duplicateStep = (idx: number) => {
    const original = bo.steps[idx];
    const clone: BuildStep = {
      ...original,
      id: crypto.randomUUID(),
      resources: { ...original.resources },
      notes: original.notes.map((n) => ({ id: crypto.randomUUID(), text: n.text })),
    };
    const steps = bo.steps.slice();
    steps.splice(idx + 1, 0, clone);
    updateBo({ steps });
  };

  const deleteStep = (idx: number) =>
    updateBo({ steps: bo.steps.filter((_, i) => i !== idx) });

  // ---- Drag helpers ----

  /** Find which step currently owns a given note id. */
  const findNoteStepIndex = (steps: BuildStep[], noteId: string): number =>
    steps.findIndex((s) => s.notes.some((n) => n.id === noteId));

  /** Resolve the destination step id from a drag-over event when dragging a note. */
  const resolveOverStepId = (over: DragOverEvent["over"]): string | null => {
    if (!over) return null;
    const data = over.data.current as
      | { type?: string; sourceStepId?: string; stepId?: string }
      | undefined;
    if (data?.type === "note" && data.sourceStepId) return data.sourceStepId;
    if (data?.type === "notes-container" && data.stepId) return data.stepId;
    // Fallback: parse from id like "notes:<stepId>"
    const idStr = String(over.id);
    if (idStr.startsWith("notes:")) return idStr.slice("notes:".length);
    return null;
  };

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as { type?: ActiveType; sourceStepId?: string } | undefined;
    const type = (data?.type as ActiveType) ?? "step";
    setActiveId(String(e.active.id));
    setActiveType(type);
    startSnapshotRef.current = bo.steps;
    if (type === "note" && data?.sourceStepId) {
      activeContainerRef.current = data.sourceStepId;
    } else {
      activeContainerRef.current = null;
    }
  };

  const onDragOver = (e: DragOverEvent) => {
    if (activeType !== "note") return;
    const { active, over } = e;
    if (!over) return;
    const noteId = String(active.id);
    const targetStepId = resolveOverStepId(over);
    if (!targetStepId) return;

    setOverContainerId(targetStepId);

    const sourceStepId = activeContainerRef.current;
    if (sourceStepId === targetStepId) return;

    // Move the dragged note from source step → target step (append).
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
      const overData = over.data.current as { type?: string; sourceStepId?: string } | undefined;

      setBo((current) => {
        if (!current) return current;
        const stepIdx = findNoteStepIndex(current.steps, noteId);
        if (stepIdx < 0) return current;
        const step = current.steps[stepIdx];

        // If dropped on another note in the same step, reorder; otherwise leave as-is
        // (already appended to target step by onDragOver).
        if (overData?.type === "note" && overData.sourceStepId) {
          // Note: data.current still reflects original sourceStepId — find by id instead.
          const fromIdx = step.notes.findIndex((n) => n.id === noteId);
          const toIdx = step.notes.findIndex((n) => n.id === String(over.id));
          if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
            const notes = arrayMove(step.notes, fromIdx, toIdx);
            const steps = current.steps.map((s, i) => (i === stepIdx ? { ...s, notes } : s));
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
      setBo((current) => (current ? { ...current, steps: startSnapshotRef.current! } : current));
    }
    resetDragState();
  };

  // ---- Active drag previews ----
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
    <main className="page-enter min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to={civ ? `/civ/${civ.id}` : "/"}
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
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
              onClick={() => window.open(`/build/${bo.id}/run`, "aoe4-overlay", OVERLAY_FEATURES)}
            >
              Preview Overlay
            </Button>
          </div>
        </div>

        {/* Title */}
        <div className="mt-4">
          <InlineText
            value={bo.name}
            onCommit={(name) => updateBo({ name: name.trim() || "Untitled build" })}
            ariaLabel="Build name"
            displayClassName="font-display text-3xl sm:text-4xl font-bold text-primary px-0"
            inputClassName="font-display text-3xl sm:text-4xl font-bold text-primary"
            className="w-full"
          />
        </div>

        {/* Metadata row */}
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Input
            value={bo.author ?? ""}
            placeholder="Author"
            onChange={(e) => updateBo({ author: e.target.value })}
            className="h-9"
          />
          <Input
            value={bo.matchup ?? ""}
            placeholder="e.g. vs French"
            onChange={(e) => updateBo({ matchup: e.target.value })}
            className="h-9"
          />
          <Input
            value={bo.description ?? ""}
            placeholder="Description"
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
                className="mt-4 inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/20"
              >
                + Add Step
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              onDragCancel={onDragCancel}
            >
              <SortableContext
                items={bo.steps.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
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
                          onChange={setStep}
                          onDuplicate={() => duplicateStep(i)}
                          onDelete={() => deleteStep(i)}
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
                "mt-4 w-full rounded-lg border border-dashed border-border bg-transparent px-4 py-3 text-sm text-muted-foreground transition-colors",
                "hover:border-primary hover:text-primary",
              )}
            >
              + Add Step
            </button>
          )}
        </div>
      </div>
    </main>
  );
};

const InsertHere = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Insert step here"
    className="group flex h-4 w-full items-center justify-center"
  >
    <span className="h-px w-full bg-transparent transition-colors group-hover:bg-primary/40" />
    <span className="absolute -translate-y-px rounded-full border border-primary/40 bg-background px-2 text-[10px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
      + Insert Step
    </span>
  </button>
);

export default BuildOrderEditor;
