import { memo, useEffect, useRef, useState } from "react";
import {
  ICON_CATEGORIES,
  type IconCategory,
  type IconEntry,
} from "@/data/iconCatalog";
import { getAssetUrl } from "@/lib/assets";
import { cn } from "@/lib/utils";
import type { PickerPosition } from "@/hooks/useIconAutocomplete";

type Props = {
  query: string;
  filteredIcons: IconEntry[];
  selectedIndex: number;
  position: PickerPosition;
  onPick: (index: number) => void;
  onHover: (index: number) => void;
};

/**
 * Absolutely-positioned dropdown panel rendered while the icon autocomplete
 * is active. Pure presentational — all keyboard handling and trigger
 * detection live in `useIconAutocomplete`. The list scrolls into view so
 * the highlighted row stays visible during arrow-key navigation.
 */
const IconPickerImpl = ({
  query,
  filteredIcons,
  selectedIndex,
  position,
  onPick,
  onHover,
}: Props) => {
  // Group entries by category, preserving the catalog's pre-sort order.
  const groups = new Map<IconCategory, { entry: IconEntry; absoluteIndex: number }[]>();
  filteredIcons.forEach((entry, absoluteIndex) => {
    const list = groups.get(entry.category) ?? [];
    list.push({ entry, absoluteIndex });
    groups.set(entry.category, list);
  });

  // Auto-scroll the selected row into view.
  const selectedRowRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <div
      role="listbox"
      aria-label="Icon picker"
      className={cn(
        "fixed z-50 w-[320px] overflow-y-auto rounded-md border border-border bg-popover text-sm shadow-lg",
      )}
      style={{
        top: position.top,
        left: position.left,
        maxHeight: position.maxHeight,
        // When there isn't enough room below the textarea (mobile keyboard
        // open, etc.), the hook reports placement: "above" with `top` set to
        // the textarea's top edge; translateY(-100%) shifts the panel up by
        // its own rendered height so it sits *above* the textarea.
        transform: position.placement === "above" ? "translateY(-100%)" : undefined,
      }}
      // Prevent the textarea from losing focus when the user clicks a row.
      onMouseDown={(e) => e.preventDefault()}
    >
      {filteredIcons.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground">
          No icons match{" "}
          <span className="font-mono text-foreground">{query || "—"}</span>
        </div>
      ) : (
        ICON_CATEGORIES.filter((cat) => groups.has(cat)).map((cat) => (
          <div key={cat}>
            <div className="sticky top-0 z-[1] bg-popover px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
              {cat}
            </div>
            {groups.get(cat)!.map(({ entry, absoluteIndex }) => (
              <PickerRow
                key={entry.path}
                entry={entry}
                isSelected={absoluteIndex === selectedIndex}
                rowRef={absoluteIndex === selectedIndex ? selectedRowRef : null}
                onClick={() => onPick(absoluteIndex)}
                onMouseEnter={() => onHover(absoluteIndex)}
              />
            ))}
          </div>
        ))
      )}
      <div className="sticky bottom-0 border-t border-border bg-popover/90 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
        Type{" "}
        <span className="rounded border border-border bg-muted/40 px-1 font-mono">
          {"{{"}
        </span>{" "}
        to search · ↑↓ navigate · ↵ insert · esc cancel
      </div>
    </div>
  );
};

type RowProps = {
  entry: IconEntry;
  isSelected: boolean;
  rowRef: React.RefObject<HTMLButtonElement | null> | null;
  onClick: () => void;
  onMouseEnter: () => void;
};

const PickerRow = ({ entry, isSelected, rowRef, onClick, onMouseEnter }: RowProps) => {
  const [iconFailed, setIconFailed] = useState(false);
  return (
    <button
      ref={rowRef}
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors",
        isSelected ? "bg-primary/10 text-foreground" : "text-foreground hover:bg-muted/50",
      )}
    >
      {iconFailed ? (
        <span className="h-5 w-5 shrink-0 rounded-full bg-muted" aria-hidden />
      ) : (
        <img
          src={getAssetUrl(entry.path)}
          alt=""
          aria-hidden
          loading="lazy"
          onError={() => setIconFailed(true)}
          className="h-5 w-5 shrink-0 object-contain"
        />
      )}
      <span className="flex-1">{entry.name}</span>
    </button>
  );
};

export const IconPicker = memo(IconPickerImpl);
