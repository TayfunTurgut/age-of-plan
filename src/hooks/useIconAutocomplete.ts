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
 * catalog by the typed query, and reports the popover state needed to render an
 * `<IconPicker>` next to the cursor. The hook owns no DOM — the consumer passes
 * a textarea ref and spreads `{onKeyDown}` on it.
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
  position: PickerPosition;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  refresh: () => void;
  openManually: () => void;
  selectByIndex: (index: number) => void;
  close: () => void;
};

type Args = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  civId: string;
  value: string;
  onChange: (next: string, nextCursor: number) => void;
};

/** Start index of the `{{` immediately before `cursor`, or -1 if not in a token. */
function findTriggerStart(text: string, cursor: number): number {
  if (cursor < 2) return -1;
  for (let i = cursor - 1; i >= 1; i--) {
    const c = text[i];
    if (c === "}") return -1; // token already complete
    if (/\s/.test(c)) return -1;
    if (c === "{" && text[i - 1] === "{") return i - 1;
  }
  return -1;
}

/** Index just past any existing token content following `cursor`. */
function findTriggerEnd(text: string, cursor: number): number {
  let end = cursor;
  while (end < text.length) {
    const c = text[end];
    if (c === "{" || c === "}" || /\s/.test(c)) break;
    end++;
  }
  if (text[end] === "}" && text[end + 1] === "}") end += 2;
  return end;
}

function filterIcons(all: IconEntry[], query: string): IconEntry[] {
  if (!query) return all;
  const q = query.toLowerCase();
  return all.filter(
    (e) => e.name.toLowerCase().includes(q) || e.path.toLowerCase().includes(q),
  );
}

const PICKER_PREFERRED_HEIGHT = 320;
const PICKER_WIDTH = 320;
const ANCHOR_GAP = 4;
const VIEWPORT_PADDING = 8;
const MIN_USEFUL_HEIGHT = 120;

export function useIconAutocomplete({
  textareaRef,
  civId,
  value,
  onChange,
}: Args): IconAutocompleteState {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState<PickerPosition>({
    top: 0,
    left: 0,
    maxHeight: PICKER_PREFERRED_HEIGHT,
    placement: "below",
  });
  const triggerStartRef = useRef(-1);

  const allIcons = useMemo(() => getIconsForCiv(civId), [civId]);
  const filteredIcons = useMemo(
    () => filterIcons(allIcons, query),
    [allIcons, query],
  );

  useEffect(() => {
    setSelectedIndex((i) =>
      filteredIcons.length === 0 ? 0 : Math.min(i, filteredIcons.length - 1),
    );
  }, [filteredIcons]);

  // Anchor + size, viewport-relative (picker is position: fixed). Uses
  // visualViewport so it reacts to the mobile keyboard shrinking the area.
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

  // Keep the picker anchored while open (keyboard show/hide, ancestor scroll).
  useEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const next = computePosition();
      if (next) setPosition(next);
    };
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
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
      const tokenEnd = findTriggerEnd(value, cursor);
      const before = value.slice(0, start);
      const after = value.slice(tokenEnd);
      // Auto-trail with a space, unless the next char is already whitespace.
      const nextChar = after[0] ?? "";
      const trailingSpace = /\s/.test(nextChar) ? "" : " ";
      const insertion = `{{${entry.path}}}${trailingSpace}`;
      const next = before + insertion + after;
      const cursorAdvance = trailingSpace === "" ? 1 : 0;
      const nextCursor = before.length + insertion.length + cursorAdvance;
      onChange(next, nextCursor);
      close();
    },
    [filteredIcons, onChange, textareaRef, value, close],
  );

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
    onChange(before + "{{" + after, cursor + 2);
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
}
