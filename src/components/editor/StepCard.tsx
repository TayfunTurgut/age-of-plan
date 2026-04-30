import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Lock, MoreHorizontal, Unlock, Users } from "lucide-react";
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
import { InlineTimer } from "./InlineTimer";
import { ResourcePill } from "./ResourcePill";
import { NoteRow } from "./NoteRow";
import { getAssetUrl } from "@/lib/assets";
import { StepTags } from "./StepTags";
import { DeltaIndicator } from "./DeltaIndicator";

const deltaOf = (curr?: number, prev?: number) =>
  curr === undefined || prev === undefined ? undefined : curr - prev;

const AGE_LABELS: Record<1 | 2 | 3 | 4, { roman: string; name: string }> = {
  1: { roman: "I", name: "Dark Age" },
  2: { roman: "II", name: "Feudal Age" },
  3: { roman: "III", name: "Castle Age" },
  4: { roman: "IV", name: "Imperial Age" },
};

const AGE_ICON: Record<1 | 2 | 3 | 4, string> = {
  1: "ages/age_1.webp",
  2: "ages/age_2.webp",
  3: "ages/age_3.webp",
  4: "ages/age_4.webp",
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
          <span className="text-sm font-bold">{AGE_LABELS[age].roman}</span>
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
  /** Previous step in the build order, used to render +/- deltas on numeric fields. */
  previousStep?: BuildStep;
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
  previousStep,
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

  const extraResources = civ?.extraResources ?? [];

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
        "relative flex gap-3 border-border bg-card p-3 sm:p-4 border-l-4 transition-colors duration-200",
        AGE_BORDER[step.age],
        isDragging && !overlay && "opacity-40",
        overlay && "shadow-2xl ring-1 ring-primary/40",
      )}
    >
      {/* Drag handle + index */}
      <div className="flex flex-col items-center gap-1 pt-1">
        <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
        <button
          type="button"
          aria-label="Drag step"
          className="relative flex h-10 w-6 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground active:cursor-grabbing before:absolute before:-inset-2 before:content-[''] focus-ring"
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
          <VillagerBadge step={step} previousStep={previousStep} onUpdate={update} />

          {/* Time */}
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">Time</span>
            <InlineTimer
              value={step.timeSeconds}
              ariaLabel="Time (m:ss)"
              placeholder="—"
              onCommit={(next) => update({ timeSeconds: next })}
              delta={deltaOf(step.timeSeconds, previousStep?.timeSeconds)}
            />
          </div>

          {/* Overflow menu */}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Step actions"
                className="focus-ring rounded-md p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
            delta={deltaOf(step.resources.food, previousStep?.resources.food)}
          />
          <ResourcePill
            resource="wood"
            value={step.resources.wood}
            onChange={(n) => updateResource("wood", n)}
            delta={deltaOf(step.resources.wood, previousStep?.resources.wood)}
          />
          <ResourcePill
            resource="gold"
            value={step.resources.gold}
            onChange={(n) => updateResource("gold", n)}
            delta={deltaOf(step.resources.gold, previousStep?.resources.gold)}
          />
          <ResourcePill
            resource="stone"
            value={step.resources.stone}
            onChange={(n) => updateResource("stone", n)}
            delta={deltaOf(step.resources.stone, previousStep?.resources.stone)}
          />
          <ResourcePill
            resource="builder"
            value={step.resources.builder}
            onChange={(n) => updateResource("builder", n)}
            delta={
              step.buildersUnknown || previousStep?.buildersUnknown
                ? undefined
                : deltaOf(step.resources.builder, previousStep?.resources.builder)
            }
            unknown={step.buildersUnknown}
            onUnknownToggle={(next) => update({ buildersUnknown: next })}
          />
          {extraResources.includes("oliveOil") && (
            <ResourcePill
              resource="oliveOil"
              value={step.resources.oliveOil ?? 0}
              onChange={(n) => updateResource("oliveOil", n)}
              delta={deltaOf(step.resources.oliveOil, previousStep?.resources.oliveOil)}
            />
          )}
          {extraResources.includes("silver") && (
            <ResourcePill
              resource="silver"
              value={step.resources.silver ?? 0}
              onChange={(n) => updateResource("silver", n)}
              delta={deltaOf(step.resources.silver, previousStep?.resources.silver)}
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
                <div className="flex min-h-12 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground/70">
                  Drop notes here
                </div>
              ) : (
                <div className="space-y-1.5">
                  {step.notes.map((note, i) => (
                    <NoteRow
                      key={note.id}
                      note={note}
                      stepId={step.id}
                      civId={civ?.id ?? ""}
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
            className="focus-ring mt-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-primary"
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
      <div className="flex min-h-12 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground/70">
        Drop notes here
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {notes.map((n) => (
        <div key={n.id} className="flex items-start gap-2 px-1 py-1 text-base">
          <GripVertical className="mt-0.5 h-3 w-3 text-muted-foreground/50" />
          <span className="min-w-0 flex-1 truncate">{n.text || "Add a note…"}</span>
        </div>
      ))}
    </div>
  );
};

type VillagerBadgeProps = {
  step: BuildStep;
  previousStep?: BuildStep;
  onUpdate: (patch: Partial<BuildStep>) => void;
};

const VillagerBadge = ({ step, previousStep, onUpdate }: VillagerBadgeProps) => {
  const isManual = step.villagerCountManual === true;
  const isUnknown = step.buildersUnknown === true;
  const delta =
    isUnknown || previousStep?.buildersUnknown
      ? undefined
      : deltaOf(step.villagerCount, previousStep?.villagerCount);

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
            isManual && !isUnknown && "border-primary/50 bg-primary/10",
          )}
        >
          <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          {isUnknown ? (
            <span
              className="min-w-[1.5rem] text-center text-sm font-medium tabular-nums text-foreground"
              aria-label="Villager count (unknown)"
            >
              ?
            </span>
          ) : isManual ? (
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
        {!isUnknown && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleLock}
                aria-label={isManual ? "Unlock to auto-calculate villagers" : "Lock villager count"}
                aria-pressed={isManual}
                className={cn(
                  "focus-ring rounded-md p-1 transition-colors hover:bg-muted/50",
                  isManual ? "text-primary" : "text-muted-foreground/70 hover:text-foreground",
                )}
              >
                {isManual ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <DeltaIndicator value={delta} format="number" />
    </div>
  );
};
