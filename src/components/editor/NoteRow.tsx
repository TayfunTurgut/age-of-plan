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

import { IconPicker } from "./IconPicker";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAutoResize } from "@/hooks/useAutoResize";
import { useFontSize } from "@/hooks/useFontSize";
import { useIconAutocomplete } from "@/hooks/useIconAutocomplete";
import { hasNoteTokens, renderNote } from "@/lib/noteRenderer";

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
 * One note row: a persistent textarea (not click-to-edit) so the icon
 * autocomplete has a stable cursor + ref. Sortable (drag within/across steps),
 * auto-resizing, with `{{` icon autocomplete and an inline token preview.
 */
export function NoteRow({ note, stepId, civId, index, onCommit, onDelete }: Props) {
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
  const [draft, setDraft] = useState(note.text);
  const pendingCursor = useRef<number | null>(null);
  const { fontSize } = useFontSize();

  useEffect(() => {
    setDraft(note.text);
  }, [note.text]);

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
      setDraft(note.text);
      textareaRef.current?.blur();
    }
  };

  const onTextareaBlur = () => {
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
        className="focus-ring relative mt-1 flex h-6 w-4 cursor-grab items-center justify-center rounded text-muted-foreground/50 before:absolute before:-inset-2 before:content-[''] hover:text-foreground active:cursor-grabbing"
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
          onSelect={() => autocomplete.refresh()}
          onClick={() => autocomplete.refresh()}
          onBlur={onTextareaBlur}
          rows={1}
          aria-label={`Note ${index + 1}`}
          autoFocus={note.text === ""}
          placeholder="Add a note… (type {{ for icons)"
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
}
