import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onCommit: (next: string) => void;
  /** Optional validator. Return false to revert instead of committing. */
  validate?: (raw: string) => boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  displayClassName?: string;
  inputType?: "text" | "number";
  /** Render input as <textarea> with auto-resize. */
  multiline?: boolean;
  /** Auto-focus the input on mount (used for newly-added notes). */
  autoFocus?: boolean;
  ariaLabel?: string;
  style?: CSSProperties;
};

/**
 * Click-to-edit cell. Renders styled text by default, swaps to an input on
 * click/focus, commits on blur or Enter, reverts on Escape.
 */
export const InlineText = ({
  value,
  onCommit,
  validate,
  placeholder,
  className,
  inputClassName,
  displayClassName,
  inputType = "text",
  multiline = false,
  autoFocus = false,
  ariaLabel,
  style,
}: Props) => {
  const [editing, setEditing] = useState(autoFocus);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) inputRef.current.select();
    }
  }, [editing]);

  const autoResize = () => {
    const el = inputRef.current;
    if (el instanceof HTMLTextAreaElement) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (editing && multiline) autoResize();
  }, [editing, draft, multiline]);

  const commit = () => {
    if (validate && !validate(draft)) {
      setDraft(value);
      setEditing(false);
      return;
    }
    if (draft !== value) onCommit(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !(multiline && e.shiftKey)) {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  if (editing) {
    return multiline ? (
      <textarea
        ref={(el) => (inputRef.current = el)}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        rows={1}
        style={style}
        className={cn(
          "w-full resize-none rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
          inputClassName,
          className,
        )}
      />
    ) : (
      <input
        ref={(el) => (inputRef.current = el)}
        type={inputType}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        style={style}
        className={cn(
          "rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
          inputClassName,
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={ariaLabel}
      style={style}
      className={cn(
        "cursor-text rounded-md border border-transparent px-2 py-1 text-left text-sm transition-colors hover:border-border hover:bg-muted/40",
        !value && "text-muted-foreground",
        displayClassName,
        className,
      )}
    >
      {value || placeholder || "—"}
    </button>
  );
};
