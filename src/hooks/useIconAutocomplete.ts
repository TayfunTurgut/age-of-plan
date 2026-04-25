import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { getIconsForCiv, type IconEntry } from "@/data/iconCatalog";

/**
 * Detects the `{{` autocomplete trigger inside a textarea, filters the icon
 * catalog by the typed query, and reports back the popover state needed to
 * render an `<IconPicker>` next to the cursor.
 *
 * The hook owns no DOM — it expects a textarea ref from the consumer and
 * yields a `selectByIndex` callback that the consumer calls (with the
 * desired entry's index) to perform the insert. Keyboard handling lives
 * here so the consumer just spreads `{onKeyDown}` onto the textarea.
 */

export type PickerPlacement = "below" | "above";

export type PickerPosition = {
  top: number;
  left: number;
  maxHeight: number;
  placement: PickerPlacement;
};

export type IconAutocompleteState = {
  isOpen: boolean;
  query: string;
  filteredIcons: IconEntry[];
  selectedIndex: number;
  /** Anchor + size constraints the picker should render with. */
  position: PickerPosition;
  /** Spread on the textarea's `onKeyDown`. */
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  /** Call after the textarea's value/selection changes (in onChange and onClick/onKeyUp). */
  refresh: () => void;
  /** Insert `{{` at the cursor and open the picker (used by the picker button). */
  openManually: () => void;
  /** Pick an entry by its index in `filteredIcons`. */
  selectByIndex: (index: number) => void;
  /** Close the picker without inserting. */
  close: () => void;
};

type Args = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  civId: string;
  value: string;
  onChange: (next: string, nextCursor: number) => void;
};

/** Find the start index of the `{{` immediately preceding `cursor`, if any.
 *  Returns `-1` if not in a token context (no `{{`, or `}}` between them, or
 *  whitespace inside the partial query). */
const findTriggerStart = (text: string, cursor: number): number => {
  if (cursor < 2) return -1;
  // Walk back from the cursor looking for `{{`. Bail on whitespace, `}}` or `}`.
  for (let i = cursor - 1; i >= 1; i--) {
    const c = text[i];
    if (c === "}") return -1; // a closing brace before we hit `{{` means the token is already complete
    if (/\s/.test(c)) return -1;
    if (c === "{" && text[i - 1] === "{") {
      return i - 1; // index of the first `{`
    }
  }
  return -1;
};

const filterIcons = (all: IconEntry[], query: string): IconEntry[] => {
  if (!query) return all;
  const q = query.toLowerCase();
  return all.filter(
    (e) =>
      e.name.toLowerCase().includes(q) || e.path.toLowerCase().includes(q),
  );
};

const PICKER_PREFERRED_HEIGHT = 320;
const PICKER_WIDTH = 320;
const ANCHOR_GAP = 4;
const VIEWPORT_PADDING = 8;
const MIN_USEFUL_HEIGHT = 120;

export const useIconAutocomplete = ({
  textareaRef,
  civId,
  value,
  onChange,
}: Args): IconAutocompleteState => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState<PickerPosition>({
    top: 0,
    left: 0,
    maxHeight: PICKER_PREFERRED_HEIGHT,
    placement: "below",
  });
  // Cache where the active `{{` lives so we can replace it precisely.
  const triggerStartRef = useRef(-1);

  const allIcons = useMemo(() => getIconsForCiv(civId), [civId]);
  const filteredIcons = useMemo(
    () => filterIcons(allIcons, query),
    [allIcons, query],
  );

  // Clamp selected index whenever the filtered list changes.
  useEffect(() => {
    setSelectedIndex((i) =>
      filteredIcons.length === 0 ? 0 : Math.min(i, filteredIcons.length - 1),
    );
  }, [filteredIcons]);

  /** Compute the picker's anchor + size given the current textarea rect and
   *  the visual viewport. Uses `visualViewport` (when available) so we react
   *  to the mobile keyboard shrinking the usable area.
   *
   *  The picker is rendered with `position: fixed`, so coordinates are
   *  viewport-relative. We must NOT add `window.scrollY/scrollX` —
   *  `getBoundingClientRect()` is already viewport-relative. */
  const computePosition = useCallback((): PickerPosition | null => {
    const ta = textareaRef.current;
    if (!ta) return null;
    const rect = ta.getBoundingClientRect();
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    const viewportTop = vv?.offsetTop ?? 0;
    const viewportLeft = vv?.offsetLeft ?? 0;
    const viewportWidth = vv?.width ?? window.innerWidth;
    const viewportHeight = vv?.height ?? window.innerHeight;
    const viewportRight = viewportLeft + viewportWidth;
    const viewportBottom = viewportTop + viewportHeight;

    const spaceBelow = Math.max(
      0,
      viewportBottom - rect.bottom - ANCHOR_GAP - VIEWPORT_PADDING,
    );
    const spaceAbove = Math.max(
      0,
      rect.top - viewportTop - ANCHOR_GAP - VIEWPORT_PADDING,
    );

    // Prefer below; flip above only when below is too cramped AND above has
    // more room. This keeps desktop behavior identical and only flips on
    // short mobile viewports (e.g., when the on-screen keyboard is open).
    const placeBelow = spaceBelow >= MIN_USEFUL_HEIGHT || spaceBelow >= spaceAbove;

    const left = Math.max(
      viewportLeft + VIEWPORT_PADDING,
      Math.min(rect.left, viewportRight - PICKER_WIDTH - VIEWPORT_PADDING),
    );

    if (placeBelow) {
      return {
        top: rect.bottom + ANCHOR_GAP,
        left,
        maxHeight: Math.min(PICKER_PREFERRED_HEIGHT, spaceBelow),
        placement: "below",
      };
    }
    return {
      top: rect.top - ANCHOR_GAP,
      left,
      maxHeight: Math.min(PICKER_PREFERRED_HEIGHT, spaceAbove),
      placement: "above",
    };
  }, [textareaRef]);

  /** Re-evaluate trigger state after the textarea's value/selection changed. */
  const refresh = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) {
      setIsOpen(false);
      return;
    }
    const cursor = ta.selectionStart ?? ta.value.length;
    const start = findTriggerStart(ta.value, cursor);
    if (start < 0) {
      setIsOpen(false);
      triggerStartRef.current = -1;
      return;
    }
    triggerStartRef.current = start;
    setQuery(ta.value.slice(start + 2, cursor));
    setIsOpen(true);
    const next = computePosition();
    if (next) setPosition(next);
  }, [textareaRef, computePosition]);

  // Keep the picker anchored while it's open: the visual viewport changes
  // when the on-screen keyboard appears/dismisses, and any scroll moves the
  // textarea relative to the viewport.
  useEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const next = computePosition();
      if (next) setPosition(next);
    };
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    // Capture-phase scroll catches scrolling inside any ancestor container.
    window.addEventListener("scroll", update, true);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isOpen, computePosition]);

  const close = useCallback(() => {
    setIsOpen(false);
    triggerStartRef.current = -1;
  }, []);

  const selectByIndex = useCallback(
    (index: number) => {
      const ta = textareaRef.current;
      const entry = filteredIcons[index];
      const start = triggerStartRef.current;
      if (!ta || !entry || start < 0) return;
      const cursor = ta.selectionStart ?? ta.value.length;
      const before = value.slice(0, start);
      const after = value.slice(cursor);
      const insertion = `{{${entry.path}}}`;
      const next = before + insertion + after;
      const nextCursor = before.length + insertion.length;
      onChange(next, nextCursor);
      // Close immediately; the controlled re-render of the textarea below
      // will reposition the cursor.
      close();
    },
    [filteredIcons, onChange, textareaRef, value, close],
  );

  // After a state-driven value+cursor update, restore the textarea's
  // selection to where we want it.
  // The consumer is expected to call `setSelectionRange` themselves after
  // applying onChange's `nextCursor`. This effect is a safety net.
  useEffect(() => {
    if (!isOpen) return;
    const ta = textareaRef.current;
    if (!ta) return;
    // No-op; placeholder for future cursor sync needs.
  }, [isOpen, textareaRef]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isOpen) return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) =>
            filteredIcons.length === 0 ? 0 : Math.min(i + 1, filteredIcons.length - 1),
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
        case "Tab": {
          if (filteredIcons.length === 0) {
            close();
            return;
          }
          e.preventDefault();
          selectByIndex(selectedIndex);
          break;
        }
        case "Escape":
          e.preventDefault();
          close();
          break;
      }
    },
    [isOpen, filteredIcons.length, selectedIndex, selectByIndex, close],
  );

  const openManually = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    const cursor = ta.selectionStart ?? ta.value.length;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const next = before + "{{" + after;
    const nextCursor = cursor + 2;
    onChange(next, nextCursor);
  }, [textareaRef, value, onChange]);

  return {
    isOpen,
    query,
    filteredIcons,
    selectedIndex,
    position,
    onKeyDown,
    refresh,
    openManually,
    selectByIndex,
    close,
  };
};
