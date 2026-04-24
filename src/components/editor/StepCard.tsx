import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, X } from "lucide-react";
import type { CSSProperties } from "react";
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

const AGE_LABELS: Record<1 | 2 | 3 | 4, { roman: string; name: string }> = {
  1: { roman: "I", name: "Dark Age" },
  2: { roman: "II", name: "Feudal Age" },
  3: { roman: "III", name: "Castle Age" },
  4: { roman: "IV", name: "Imperial Age" },
};

type Props = {
  step: BuildStep;
  index: number;
  civ: Civ | undefined;
  onChange: (next: BuildStep) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  /** When true, render as a static (non-sortable) overlay clone. */
  overlay?: boolean;
};

const stepHasContent = (s: BuildStep): boolean => {
  if (s.notes.some((n) => n.trim().length > 0)) return true;
  if (s.villagerCount > 0) return true;
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
}: Props) => {
  const sortable = useSortable({ id: step.id, disabled: overlay });
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
    notes[i] = text;
    update({ notes });
  };
  const deleteNote = (i: number) => {
    const notes = step.notes.slice();
    notes.splice(i, 1);
    update({ notes });
  };
  const addNote = () => update({ notes: [...step.notes, ""] });

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

  return (
    <Card
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      className={cn(
        "relative flex gap-3 border-border bg-card p-3 sm:p-4",
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((a) => (
                      <SelectItem key={a} value={String(a)}>
                        {AGE_LABELS[a as 1 | 2 | 3 | 4].roman}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent>{AGE_LABELS[step.age].name}</TooltipContent>
          </Tooltip>

          {/* Vils */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Vils</span>
            <InlineText
              value={String(step.villagerCount)}
              inputType="number"
              ariaLabel="Villager count"
              className="w-14"
              validate={(raw) => /^\d+$/.test(raw.trim())}
              onCommit={(raw) => update({ villagerCount: parseInt(raw, 10) || 0 })}
            />
          </div>

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
        <div className="mt-3 space-y-1.5">
          {step.notes.map((note, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <InlineText
                  value={note}
                  multiline
                  autoFocus={note === ""}
                  placeholder="Add a note…"
                  ariaLabel={`Note ${i + 1}`}
                  onCommit={(raw) => setNote(i, raw)}
                />
              </div>
              <button
                type="button"
                onClick={() => deleteNote(i)}
                aria-label="Delete note"
                className="mt-1 rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addNote}
            className="text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            + Add Note
          </button>
        </div>
      </div>
    </Card>
  );
};
