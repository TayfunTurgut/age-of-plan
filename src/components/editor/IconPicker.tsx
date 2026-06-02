import { memo, useEffect, useRef, useState, type RefObject } from "react";

import {
  ICON_CATEGORIES,
  type IconCategory,
  type IconEntry,
} from "@/data/iconCatalog";
import type { PickerPosition } from "@/hooks/useIconAutocomplete";
import { getAssetUrl } from "@/lib/assets";
import { cn } from "@/lib/utils";

type Props = {
  query: string;
  filteredIcons: IconEntry[];
  selectedIndex: number;
  position: PickerPosition;
  onPick: (index: number) => void;
  onHover: (index: number) => void;
};

/**
 * Absolutely-positioned dropdown shown while the icon autocomplete is active.
 * Pure presentational — keyboard handling + trigger detection live in
 * useIconAutocomplete. The selected row scrolls into view during arrow-key nav.
 */
function IconPickerImpl({
  query,
  filteredIcons,
  selectedIndex,
  position,
  onPick,
  onHover,
}: Props) {
  const groups = new Map<IconCategory, { entry: IconEntry; absoluteIndex: number }[]>();
  filteredIcons.forEach((entry, absoluteIndex) => {
    const list = groups.get(entry.category) ?? [];
    list.push({ entry, absoluteIndex });
    groups.set(entry.category, list);
  });

  const selectedRowRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <div
      role="listbox"
      aria-label="Icon picker"
      className="fixed z-50 w-[320px] overflow-y-auto rounded-md border border-border bg-popover text-sm shadow-lg"
      style={{
        top: position.top,
        left: position.left,
        maxHeight: position.maxHeight,
        transform: position.placement === "above" ? "translateY(-100%)" : undefined,
      }}
      // Keep the textarea focused when a row is clicked.
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
}

type RowProps = {
  entry: IconEntry;
  isSelected: boolean;
  rowRef: RefObject<HTMLButtonElement> | null;
  onClick: () => void;
  onMouseEnter: () => void;
};

function PickerRow({ entry, isSelected, rowRef, onClick, onMouseEnter }: RowProps) {
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
}

export const IconPicker = memo(IconPickerImpl);
