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
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { BuildOrder, BuildStep } from "@/types/buildOrder";
import { getBuildOrder, saveBuildOrder } from "@/lib/storage";
import { getCiv } from "@/data/civs";
import { createEmptyStep } from "@/lib/buildOrder";
import { InlineText } from "@/components/editor/InlineText";
import { StepCard } from "@/components/editor/StepCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved";

const BuildOrderEditor = () => {
  const { id } = useParams<{ id: string }>();
  const [bo, setBo] = useState<BuildOrder | null | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [activeId, setActiveId] = useState<string | null>(null);
  const skipNextSave = useRef(true);

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
    return <main className="min-h-screen bg-background" />;
  }

  if (bo === null) {
    return (
      <main className="min-h-screen bg-background px-6 py-14">
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
      notes: original.notes.slice(),
    };
    const steps = bo.steps.slice();
    steps.splice(idx + 1, 0, clone);
    updateBo({ steps });
  };

  const deleteStep = (idx: number) =>
    updateBo({ steps: bo.steps.filter((_, i) => i !== idx) });

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = bo.steps.findIndex((s) => s.id === active.id);
    const to = bo.steps.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;
    updateBo({ steps: arrayMove(bo.steps, from, to) });
  };

  const activeStep = activeId ? bo.steps.find((s) => s.id === activeId) : null;
  const activeIndex = activeId ? bo.steps.findIndex((s) => s.id === activeId) : -1;

  const saveLabel =
    saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "";

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to={civ ? `/civ/${civ.id}` : "/"}
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            ← Back{civ ? ` to ${civ.name}` : ""}
          </Link>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {saveLabel}
          </span>
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
              onDragEnd={onDragEnd}
              onDragCancel={() => setActiveId(null)}
            >
              <SortableContext
                items={bo.steps.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col">
                  {bo.steps.map((step, i) => (
                    <div key={step.id}>
                      {i > 0 && <InsertHere onClick={() => insertStepAt(i)} />}
                      <StepCard
                        step={step}
                        index={i}
                        civ={civ}
                        onChange={setStep}
                        onDuplicate={() => duplicateStep(i)}
                        onDelete={() => deleteStep(i)}
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeStep ? (
                  <StepCard
                    step={activeStep}
                    index={activeIndex}
                    civ={civ}
                    onChange={() => {}}
                    onDuplicate={() => {}}
                    onDelete={() => {}}
                    overlay
                  />
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
