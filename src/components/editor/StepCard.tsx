import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Lock, MoreHorizontal, Unlock, Users, X } from "lucide-react";
import { forwardRef, useState, type CSSProperties } from "react";
import type { BuildStep, Resources } from "@/types/buildOrder";
import type { Civ } from "@/data/civs";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InlineText } from "./InlineText";
import { ResourcePill, type ResourceKey } from "./ResourcePill";
import { formatTime, parseTime } from "@/lib/time";
import { getAssetUrl } from "@/lib/assets";
import { StepTags } from "./StepTags";

const AGE_LABELS: Record<1 | 2 | 3 | 4, { roman: string; name: string }> = {
  1: { roman: "I", name: "Dark Age" },
  2: { roman: "II", name: "Feudal Age" },
  3: { roman: "III", name: "Castle Age" },
  4: { roman: "IV", name: "Imperial Age" },
};

const AGE_ICON: Record<1 | 2 | 3 | 4, string> = {
  1: "age/age_1.webp",
  2: "age/age_2.webp",
  3: "age/age_3.webp",
  4: "age/age_4.webp",
};

const AGE_BORDER: Record<1 | 2 | 3 | 4, string> = {
  1: "border-l-muted-foreground/40",
  2: "border-l-green-600",
  3: "border-l-blue-500",
  4: "border-l-primary",
};

const AgeIcon = forwardRef<HTMLSpanElement, { age: 1 | 2 | 3 | 4; className?: string }>(
  ({ age, className }, ref) => {
    const [failed, setFailed] = useState(false);
    return (
      <span ref={ref} className={cn("inline-flex items-center justify-center", className)}>
        {failed ? (
          <span className="text-xs font-bold">{AGE_LABELS[age].roman}</span>
        ) : (
          <img
            src={getAssetUrl(AGE_ICON[age])}
            alt={AGE_LABELS[age].roman}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-contain"
          />
        )}
      </span>
    );
  },
);
AgeIcon.displayName = "AgeIcon";

type Note = { id: string; text: string };

type Props = {
  step: BuildStep;
  index: number;
  civ: Civ | undefined;
  onChange: (next: BuildStep) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  /** When true, render as a static (non-sortable) overlay clone. */
  overlay?: boolean;
  /** True when a note from another step is currently hovering this step. */
  isOverForeignNote?: boolean;
  /** Villager count of the previous step, used for the +/- delta indicator. */
  previousVillagerCount?: number;
};

const stepHasContent = (s: BuildStep): boolean => {
  if (s.notes.some((n) => n.text.trim().length > 0)) return true;
  if (s.villagerCount > 0) return true;
  if ((s.tags ?? []).some((t) => t.unit.trim().length > 0 || t.location.trim().length > 0))
    return true;
  const r = s.resources;
  return [r.food, r.wood, r.gold, r.stone, r.builder, r.oliveOil ?? 0, r.silver ?? 0].some(
    (n) => n > 0,
  );
};

export const StepCard = ({
  step,
  index,
  civ,
  onChange,
  onDuplicate,
  onDelete,
  overlay = false,
  isOverForeignNote = false,
  previousVillagerCount,
}: Props) => {
  const sortable = useSortable({
    id: step.id,
    disabled: overlay,
    data: { type: "step", stepId: step.id },
  });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const update = (patch: Partial<BuildStep>) => onChange({ ...step, ...patch });
  const updateResource = (key: keyof Resources, n: number) =>
    update({ resources: { ...step.resources, [key]: n } });

  const setNote = (i: number, text: string) => {
    const notes = step.notes.slice();
    notes[i] = { ...notes[i], text };
    update({ notes });
  };
  const deleteNote = (i: number) => {
    const notes = step.notes.slice();
    notes.splice(i, 1);
    update({ notes });
  };
  const addNote = () =>
    update({ notes: [...step.notes, { id: crypto.randomUUID(), text: "" }] });

  const handleDelete = () => {
    if (stepHasContent(step)) {
      const ok = window.confirm("Delete this step? It has content that will be lost.");
      if (!ok) return;
    }
    onDelete();
  };

  const extraResources: ResourceKey[] = [];
  if (civ?.id === "byzantines" || civ?.id === "ayyubids") extraResources.push("oliveOil");
  if (civ?.id === "macedonian") extraResources.push("silver");

  // Droppable wrapper for the notes container so empty steps still accept drops.
  const { setNodeRef: setNotesDroppableRef } = useDroppable({
    id: `notes:${step.id}`,
    data: { type: "notes-container", stepId: step.id },
    disabled: overlay,
  });

  return (
    <Card
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      className={cn(
        "relative flex gap-3 border-border bg-card p-3 sm:p-4 border-l-4",
        AGE_BORDER[step.age],
        isDragging && !overlay && "opacity-40",
        overlay && "shadow-2xl ring-1 ring-primary/40",
      )}
    >
      {/* Drag handle + index */}
      <div className="flex flex-col items-center gap-1 pt-1">
        <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
        <button
          type="button"
          aria-label="Drag step"
          className="flex h-10 w-6 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="min-w-0 flex-1">
        {/* Top row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Age */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-20">
                <Select
                  value={String(step.age)}
                  onValueChange={(v) => update({ age: Number(v) as 1 | 2 | 3 | 4 })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue asChild>
                      <span className="flex items-center justify-center">
                        <AgeIcon age={step.age} className="h-5 w-5" />
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((a) => (
                      <SelectItem key={a} value={String(a)}>
                        <span className="flex items-center gap-2">
                          <AgeIcon age={a as 1 | 2 | 3 | 4} className="h-4 w-4" />
                          <span>{AGE_LABELS[a as 1 | 2 | 3 | 4].roman}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent>{AGE_LABELS[step.age].name}</TooltipContent>
          </Tooltip>

          {/* Vils — auto-computed from resources unless locked */}
          <VillagerBadge
            step={step}
            previousVillagerCount={previousVillagerCount}
            onUpdate={update}
          />

          {/* Pop */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Pop</span>
            <InlineText
              value={step.populationCount === undefined ? "" : String(step.populationCount)}
              inputType="number"
              ariaLabel="Population count"
              placeholder="—"
              className="w-14"
              validate={(raw) => raw.trim() === "" || /^\d+$/.test(raw.trim())}
              onCommit={(raw) =>
                update({
                  populationCount: raw.trim() === "" ? undefined : parseInt(raw, 10) || 0,
                })
              }
            />
          </div>

          {/* Time */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Time</span>
            <InlineText
              value={step.timeSeconds === undefined ? "" : formatTime(step.timeSeconds)}
              ariaLabel="Time (m:ss)"
              placeholder="—"
              className="w-16"
              validate={(raw) => raw.trim() === "" || parseTime(raw) !== null}
              onCommit={(raw) => {
                if (raw.trim() === "") update({ timeSeconds: undefined });
                else {
                  const s = parseTime(raw);
                  if (s !== null) update({ timeSeconds: s });
                }
              }}
            />
          </div>

          {/* Overflow menu */}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Step actions"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onDuplicate}>Duplicate Step</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  Delete Step
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Resources */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <ResourcePill
            resource="food"
            value={step.resources.food}
            onChange={(n) => updateResource("food", n)}
          />
          <ResourcePill
            resource="wood"
            value={step.resources.wood}
            onChange={(n) => updateResource("wood", n)}
          />
          <ResourcePill
            resource="gold"
            value={step.resources.gold}
            onChange={(n) => updateResource("gold", n)}
          />
          <ResourcePill
            resource="stone"
            value={step.resources.stone}
            onChange={(n) => updateResource("stone", n)}
          />
          <ResourcePill
            resource="builder"
            value={step.resources.builder}
            onChange={(n) => updateResource("builder", n)}
          />
          {extraResources.includes("oliveOil") && (
            <ResourcePill
              resource="oliveOil"
              value={step.resources.oliveOil ?? 0}
              onChange={(n) => updateResource("oliveOil", n)}
            />
          )}
          {extraResources.includes("silver") && (
            <ResourcePill
              resource="silver"
              value={step.resources.silver ?? 0}
              onChange={(n) => updateResource("silver", n)}
            />
          )}
        </div>

        {/* Notes */}
        <div
          ref={overlay ? undefined : setNotesDroppableRef}
          className={cn(
            "mt-3 rounded-md p-1 transition-shadow",
            isOverForeignNote && "ring-1 ring-primary/40",
          )}
        >
          {overlay ? (
            <NotesStaticList notes={step.notes} />
          ) : (
            <SortableContext
              items={step.notes.map((n) => n.id)}
              strategy={verticalListSortingStrategy}
            >
              {step.notes.length === 0 ? (
                <div className="flex min-h-12 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground/70">
                  Drop notes here
                </div>
              ) : (
                <div className="space-y-1.5">
                  {step.notes.map((note, i) => (
                    <NoteRow
                      key={note.id}
                      note={note}
                      stepId={step.id}
                      index={i}
                      onCommit={(text) => setNote(i, text)}
                      onDelete={() => deleteNote(i)}
                    />
                  ))}
                </div>
              )}
            </SortableContext>
          )}
          <button
            type="button"
            onClick={addNote}
            className="mt-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            + Add Note
          </button>
        </div>

        {/* Tags — unit position trackers */}
        {!overlay && (
          <StepTags
            step={step}
            civId={civ?.id ?? ""}
            onUpdate={(tags) => update({ tags })}
          />
        )}
      </div>
    </Card>
  );
};

const NotesStaticList = ({ notes }: { notes: Note[] }) => {
  if (notes.length === 0) {
    return (
      <div className="flex min-h-12 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground/70">
        Drop notes here
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {notes.map((n) => (
        <div key={n.id} className="flex items-start gap-2 px-1 py-1 text-sm">
          <GripVertical className="mt-0.5 h-3 w-3 text-muted-foreground/50" />
          <span className="min-w-0 flex-1 truncate">{n.text || "Add a note…"}</span>
        </div>
      ))}
    </div>
  );
};

type NoteRowProps = {
  note: Note;
  stepId: string;
  index: number;
  onCommit: (text: string) => void;
  onDelete: () => void;
};

const NoteRow = ({ note, stepId, index, onCommit, onDelete }: NoteRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
    data: { type: "note", noteId: note.id, sourceStepId: stepId },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-9 rounded-md border border-dashed border-primary/40 bg-transparent"
      />
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1">
      <button
        type="button"
        aria-label="Drag note"
        className="mt-1 flex h-6 w-4 cursor-grab items-center justify-center rounded text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <div className="min-w-0 flex-1">
        <InlineText
          value={note.text}
          multiline
          autoFocus={note.text === ""}
          placeholder="Add a note…"
          ariaLabel={`Note ${index + 1}`}
          onCommit={onCommit}
        />
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete note"
        className="mt-1 rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

type VillagerBadgeProps = {
  step: BuildStep;
  previousVillagerCount?: number;
  onUpdate: (patch: Partial<BuildStep>) => void;
};

const VillagerBadge = ({ step, previousVillagerCount, onUpdate }: VillagerBadgeProps) => {
  const isManual = step.villagerCountManual === true;
  const delta =
    previousVillagerCount === undefined ? 0 : step.villagerCount - previousVillagerCount;
  const showDelta = previousVillagerCount !== undefined && delta !== 0;

  const toggleLock = () => onUpdate({ villagerCountManual: !isManual });

  const tooltip = isManual
    ? "Manual override. Click to recompute from resources."
    : "Auto-calculated from resources. Click to override.";

  return (
    <div className="flex flex-col items-start gap-0.5">
      <div className="flex items-center gap-1">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-1",
            isManual && "border-primary/50 bg-primary/10",
          )}
        >
          <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          {isManual ? (
            <InlineText
              value={String(step.villagerCount)}
              inputType="number"
              ariaLabel="Villager count (manual)"
              className="w-10"
              validate={(raw) => /^\d+$/.test(raw.trim())}
              onCommit={(raw) => onUpdate({ villagerCount: parseInt(raw, 10) || 0 })}
            />
          ) : (
            <span
              className="min-w-[1.5rem] text-center text-sm font-medium tabular-nums text-foreground"
              aria-label="Villager count (auto)"
            >
              {step.villagerCount}
            </span>
          )}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleLock}
              aria-label={isManual ? "Unlock to auto-calculate villagers" : "Lock villager count"}
              aria-pressed={isManual}
              className={cn(
                "rounded-md p-1 transition-colors hover:bg-muted/50",
                isManual ? "text-primary" : "text-muted-foreground/70 hover:text-foreground",
              )}
            >
              {isManual ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </div>
      {showDelta && (
        <span
          className={cn(
            "pl-2 text-[10px] font-medium tabular-nums leading-none",
            delta > 0 ? "text-green-600 dark:text-green-500" : "text-destructive",
          )}
          aria-label={`Change from previous step: ${delta > 0 ? "+" : ""}${delta}`}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
    </div>
  );
};
