import { memo, useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import type { BuildStep } from "@/types/buildOrder";
import { getUnitPresets, LOCATION_PRESETS } from "@/data/tagPresets";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

type Tag = { id: string; unit: string; location: string };

type Props = {
  step: BuildStep;
  civId: string;
  onUpdate: (tags: Tag[]) => void;
};

const PILL_BASE =
  "inline-flex items-center gap-1.5 rounded-full border border-teal-500/40 bg-teal-500/10 px-2 py-1 text-sm text-teal-700 dark:text-teal-300";

const StepTagsImpl = ({ step, civId, onUpdate }: Props) => {
  const tags = step.tags ?? [];
  const [autoFocusId, setAutoFocusId] = useState<string | null>(null);

  const update = (i: number, patch: Partial<Tag>) => {
    const next = tags.slice();
    next[i] = { ...next[i], ...patch };
    onUpdate(next);
  };

  const remove = (i: number) => {
    const next = tags.slice();
    next.splice(i, 1);
    onUpdate(next);
  };

  const add = () => {
    const fresh: Tag = { id: crypto.randomUUID(), unit: "", location: "" };
    setAutoFocusId(fresh.id);
    onUpdate([...tags, fresh]);
  };

  const unitPresets = getUnitPresets(civId);

  return (
    <div className="mt-3">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <div key={tag.id} className={PILL_BASE}>
              <TagCombobox
                value={tag.unit}
                presets={unitPresets}
                placeholder="Unit…"
                ariaLabel="Unit"
                autoFocus={autoFocusId === tag.id}
                onCommit={(v) => update(i, { unit: v })}
              />
              <ArrowRight className="h-3 w-3 shrink-0 text-teal-500/70" aria-hidden />
              <TagCombobox
                value={tag.location}
                presets={LOCATION_PRESETS}
                placeholder="Location…"
                ariaLabel="Location"
                onCommit={(v) => update(i, { location: v })}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Delete tag"
                className="ml-0.5 rounded p-0.5 text-teal-600/70 transition-colors hover:bg-teal-500/20 hover:text-teal-700 dark:text-teal-400/70 dark:hover:text-teal-200"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={add}
        className="focus-ring mt-1.5 rounded text-sm text-teal-600/80 transition-colors hover:text-teal-700 dark:text-teal-400/80 dark:hover:text-teal-300"
      >
        + Add Tag
      </button>
    </div>
  );
};

export const StepTags = memo(StepTagsImpl);

type ComboboxProps = {
  value: string;
  presets: string[];
  placeholder: string;
  ariaLabel: string;
  autoFocus?: boolean;
  onCommit: (next: string) => void;
};

const TagCombobox = ({
  value,
  presets,
  placeholder,
  ariaLabel,
  autoFocus = false,
  onCommit,
}: ComboboxProps) => {
  const [open, setOpen] = useState(autoFocus);
  const [draft, setDraft] = useState(value);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const didAutoOpen = useRef(false);

  useEffect(() => {
    if (autoFocus && !didAutoOpen.current) {
      didAutoOpen.current = true;
      setOpen(true);
    }
  }, [autoFocus]);

  useEffect(() => {
    if (!open) setDraft(value);
  }, [value, open]);

  const commit = (next: string) => {
    if (next !== value) onCommit(next);
    setOpen(false);
  };

  const display = value || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "rounded px-1 text-sm outline-none transition-colors hover:bg-teal-500/15 focus-visible:ring-1 focus-visible:ring-teal-500/60",
            !value && "text-teal-600/60 dark:text-teal-400/60",
          )}
        >
          {display}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0" sideOffset={4}>
        <Command shouldFilter>
          <CommandInput
            value={draft}
            onValueChange={setDraft}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(draft.trim());
              }
            }}
          />
          <CommandList>
            <CommandEmpty>
              {draft.trim() ? (
                <button
                  type="button"
                  onClick={() => commit(draft.trim())}
                  className="w-full rounded px-2 py-1 text-left text-sm hover:bg-accent"
                >
                  Use "{draft.trim()}"
                </button>
              ) : (
                <span className="text-sm text-muted-foreground">No suggestions.</span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {presets.map((p) => (
                <CommandItem key={p} value={p} onSelect={() => commit(p)}>
                  {p}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
