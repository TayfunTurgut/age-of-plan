import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Image as ImageIcon } from "lucide-react";

import { IconPicker } from "./IconPicker";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAutoResize } from "@/hooks/useAutoResize";
import { useFontSize } from "@/hooks/useFontSize";
import { useIconAutocomplete } from "@/hooks/useIconAutocomplete";
import { hasNoteTokens, renderNote } from "@/lib/noteRenderer";

type Props = {
  value: string;
  /** Civ id for filtering icon picker entries. */
  civId: string;
  /** Commit on Enter/blur. Empty string means cleared. */
  onCommit: (text: string) => void;
  autoFocus?: boolean;
};

/**
 * Per-step prerequisite editor — a slimmed-down NoteRow without the sortable
 * wrapper or delete button. Clearing the textarea (commit `""`) removes it; the
 * parent collapses back to the "+ Add prerequisite" button.
 */
export function PrerequisiteRow({ value, civId, onCommit, autoFocus = false }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [draft, setDraft] = useState(value);
  const pendingCursor = useRef<number | null>(null);
  const { fontSize } = useFontSize();

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useAutoResize(textareaRef, [draft, fontSize]);

  useLayoutEffect(() => {
    if (pendingCursor.current === null) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = pendingCursor.current;
    pendingCursor.current = null;
    ta.setSelectionRange(pos, pos);
  }, [draft]);

  const handleAutocompleteChange = useCallback((next: string, nextCursor: number) => {
    setDraft(next);
    pendingCursor.current = nextCursor;
  }, []);

  const autocomplete = useIconAutocomplete({
    textareaRef,
    civId,
    value: draft,
    onChange: handleAutocompleteChange,
  });

  const onTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    queueMicrotask(autocomplete.refresh);
  };

  const onTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    autocomplete.onKeyDown(e);
    if (e.defaultPrevented) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onCommit(draft.trim());
      textareaRef.current?.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraft(value);
      textareaRef.current?.blur();
    }
  };

  const onTextareaBlur = () => {
    const trimmed = draft.trim();
    if (trimmed !== value) onCommit(trimmed);
    autocomplete.close();
  };

  const showPreview = hasNoteTokens(draft);

  return (
    <div className="flex items-start gap-1">
      <div className="min-w-0 flex-1">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={onTextareaChange}
          onKeyDown={onTextareaKeyDown}
          onSelect={() => autocomplete.refresh()}
          onClick={() => autocomplete.refresh()}
          onBlur={onTextareaBlur}
          rows={1}
          aria-label="Prerequisite"
          autoFocus={autoFocus}
          placeholder="e.g. 400 food + 200 gold for Feudal (type {{ for icons)"
          className="w-full resize-none rounded-md border border-input bg-background px-2 py-1 text-base text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        {showPreview && (
          <div className="mt-1 px-2 text-sm leading-relaxed text-muted-foreground">
            {renderNote(draft, { withTooltip: true })}
          </div>
        )}
        {autocomplete.isOpen && (
          <IconPicker
            query={autocomplete.query}
            filteredIcons={autocomplete.filteredIcons}
            selectedIndex={autocomplete.selectedIndex}
            position={autocomplete.position}
            onPick={autocomplete.selectByIndex}
            onHover={() => {}}
          />
        )}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={autocomplete.openManually}
            aria-label="Insert icon"
            className="focus-ring mt-1 rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Insert icon (or type &#123;&#123;)</TooltipContent>
      </Tooltip>
    </div>
  );
}
