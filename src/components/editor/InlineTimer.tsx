import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/time";

type Props = {
  value: number | undefined;
  onCommit: (next: number | undefined) => void;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
};

const MAX_MINUTES = 99;
const MAX_SECONDS = 59;

const seedDrafts = (value: number | undefined): { mm: string; ss: string } => {
  if (value === undefined) return { mm: "", ss: "" };
  const total = Math.max(0, Math.floor(value));
  const m = Math.min(MAX_MINUTES, Math.floor(total / 60));
  const s = total % 60;
  return { mm: String(m), ss: s.toString().padStart(2, "0") };
};

/**
 * Click-to-edit timer cell. Renders "m:ss" by default, swaps to two
 * digit-only inputs (MM and SS) on click. Commits on Enter or blur outside
 * the component; reverts on Escape.
 */
export const InlineTimer = ({
  value,
  onCommit,
  ariaLabel,
  placeholder = "—",
  className,
}: Props) => {
  const [editing, setEditing] = useState(false);
  const [mm, setMm] = useState("");
  const [ss, setSs] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const mmRef = useRef<HTMLInputElement>(null);
  const ssRef = useRef<HTMLInputElement>(null);
  // Suppresses the bubbled blur that fires when Escape unmounts the inputs.
  const cancellingRef = useRef(false);

  useEffect(() => {
    if (editing && ssRef.current) {
      ssRef.current.focus();
      ssRef.current.select();
    }
  }, [editing]);

  const enter = () => {
    const seeded = seedDrafts(value);
    setMm(seeded.mm);
    setSs(seeded.ss);
    setEditing(true);
  };

  const computeNext = (): number | undefined => {
    if (mm === "" && ss === "") return undefined;
    const m = Math.min(MAX_MINUTES, parseInt(mm || "0", 10));
    const s = Math.min(MAX_SECONDS, parseInt(ss || "0", 10));
    return m * 60 + s;
  };

  const commit = () => {
    const next = computeNext();
    if (next !== value) onCommit(next);
    setEditing(false);
  };

  const cancel = () => {
    cancellingRef.current = true;
    setEditing(false);
  };

  const onMmChange = (raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, 2);
    setMm(v);
    if (v.length === 2) ssRef.current?.focus();
  };

  const onSsChange = (raw: string) => {
    setSs(raw.replace(/\D/g, "").slice(0, 2));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  const onMmPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").trim();
    const m = text.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!m) return;
    e.preventDefault();
    setMm(m[1]);
    setSs(m[2]);
    ssRef.current?.focus();
  };

  const onContainerBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (cancellingRef.current) {
      cancellingRef.current = false;
      return;
    }
    const next = e.relatedTarget as Node | null;
    if (next && containerRef.current?.contains(next)) return;
    commit();
  };

  if (editing) {
    return (
      <div
        ref={containerRef}
        onBlur={onContainerBlur}
        className={cn(
          "inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus-within:ring-2 focus-within:ring-ring",
          className,
        )}
      >
        <input
          ref={mmRef}
          value={mm}
          onChange={(e) => onMmChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={onKeyDown}
          onPaste={onMmPaste}
          inputMode="numeric"
          maxLength={2}
          aria-label="Minutes"
          className="w-7 bg-transparent text-right tabular-nums outline-none"
        />
        <span aria-hidden className="px-0.5">:</span>
        <input
          ref={ssRef}
          value={ss}
          onChange={(e) => onSsChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={onKeyDown}
          inputMode="numeric"
          maxLength={2}
          aria-label="Seconds"
          className="w-7 bg-transparent text-left tabular-nums outline-none"
        />
      </div>
    );
  }

  const display = value === undefined ? placeholder : formatTime(value);

  return (
    <button
      type="button"
      onClick={enter}
      aria-label={ariaLabel}
      className={cn(
        "cursor-text rounded-md border border-transparent px-2 py-1 text-left text-sm tabular-nums transition-colors hover:border-border hover:bg-muted/40",
        value === undefined && "text-muted-foreground",
        className,
      )}
    >
      {display}
    </button>
  );
};
