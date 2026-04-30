import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Image as ImageIcon, X } from "lucide-react";
import { hasNoteTokens, renderNote } from "@/lib/noteRenderer";
import { useAutoResize } from "@/hooks/useAutoResize";
import { useFontSize } from "@/hooks/useFontSize";
import { useIconAutocomplete } from "@/hooks/useIconAutocomplete";
import { IconPicker } from "./IconPicker";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Note = { id: string; text: string };

type Props = {
  note: Note;
  stepId: string;
  /** Civ id for filtering icon picker entries. */
  civId: string;
  index: number;
  onCommit: (text: string) => void;
  onDelete: () => void;
};

/**
 * One row in a step's note list. Rendered as a persistent textarea (not a
 * click-to-edit display) so the icon autocomplete has a stable cursor and
 * ref. Auto-resizes vertically as content grows. The autocomplete activates
 * when the user types `{{` and offers a filtered icon picker; the picker
 * button next to the delete X is the discoverable alternative for users
 * who haven't memorized the trigger.
 */
export const NoteRow = ({
  note,
  stepId,
  civId,
  index,
  onCommit,
  onDelete,
}: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: note.id,
      data: { type: "note", noteId: note.id, sourceStepId: stepId },
    });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Local "draft" state lets the textarea stay editable without thrashing
  // the autosave cycle on every keystroke. Commit on blur (or after a
  // picker insert).
  const [draft, setDraft] = useState(note.text);
  const pendingCursor = useRef<number | null>(null);
  // Re-run the resize effect when the global font size changes — line-height
  // in pixels grows with rem, so a stale inline height would show a scrollbar.
  const { fontSize } = useFontSize();

  // Keep draft in sync if the upstream note changes from outside (rare —
  // currently only happens on initial mount or after a duplicate-step).
  useEffect(() => {
    setDraft(note.text);
  }, [note.text]);

  // Re-fit the textarea on content or global font-size changes.
  useAutoResize(textareaRef, [draft, fontSize]);

  // After a programmatic insert, place the cursor at the requested offset.
  useLayoutEffect(() => {
    if (pendingCursor.current === null) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = pendingCursor.current;
    pendingCursor.current = null;
    ta.setSelectionRange(pos, pos);
  }, [draft]);

  const handleAutocompleteChange = useCallback(
    (next: string, nextCursor: number) => {
      setDraft(next);
      pendingCursor.current = nextCursor;
    },
    [],
  );

  const autocomplete = useIconAutocomplete({
    textareaRef,
    civId,
    value: draft,
    onChange: handleAutocompleteChange,
  });

  // Refresh the autocomplete trigger detection on every input change and
  // selection change.
  const onTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    // Defer to next microtask so selectionStart reflects the new value.
    queueMicrotask(autocomplete.refresh);
  };

  const onTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    autocomplete.onKeyDown(e);
    if (e.defaultPrevented) return;
    if (e.key === "Enter" && !e.shiftKey) {
      // Commit and stay focused — we want the textarea to behave like a
      // multi-note row, not a multi-line paragraph editor.
      e.preventDefault();
      onCommit(draft.trim());
      textareaRef.current?.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraft(note.text);
      textareaRef.current?.blur();
    }
  };

  const onTextareaSelect = () => autocomplete.refresh();

  const onTextareaBlur = () => {
    // Closing the picker on blur is necessary because `mousedown` on the
    // picker is preventDefault'd (textarea keeps focus), but if focus moves
    // anywhere else we should hide the panel.
    const trimmed = draft.trim();
    if (trimmed !== note.text) onCommit(trimmed);
    autocomplete.close();
  };

  const showPreview = hasNoteTokens(draft);

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
        className="relative mt-1 flex h-6 w-4 cursor-grab items-center justify-center rounded text-muted-foreground/50 hover:text-foreground active:cursor-grabbing before:absolute before:-inset-2 before:content-[''] focus-ring"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <div className="min-w-0 flex-1">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={onTextareaChange}
          onKeyDown={onTextareaKeyDown}
          onSelect={onTextareaSelect}
          onClick={onTextareaSelect}
          onBlur={onTextareaBlur}
          rows={1}
          aria-label={`Note ${index + 1}`}
          autoFocus={note.text === ""}
          placeholder="Add a note… (type {{ for icons)"
          className={cn(
            "w-full resize-none rounded-md border border-input bg-background px-2 py-1 text-base text-foreground outline-none focus:ring-2 focus:ring-ring",
          )}
        />
        {showPreview && (
          <div className="mt-1 px-2 text-sm leading-relaxed text-muted-foreground">
            {renderNote(draft)}
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
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete note"
        className="focus-ring mt-1 rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
