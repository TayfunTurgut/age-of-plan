import { useLayoutEffect, type RefObject } from "react";

/**
 * Resize a textarea to fit its content on every dep change. Adds the border
 * widths back because Tailwind's `box-sizing: border-box` makes the inline
 * `height` include them — without this, content under-fits by ~2px and shows a
 * vertical scrollbar.
 *
 * No-op when the ref points at anything that isn't an HTMLTextAreaElement, so a
 * polymorphic ref (e.g. InlineText, which renders an <input> or a <textarea>)
 * can call it unconditionally.
 */
export function useAutoResize(
  ref: RefObject<HTMLElement | null>,
  deps: ReadonlyArray<unknown>,
): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!(el instanceof HTMLTextAreaElement)) return;
    el.style.height = "auto";
    const cs = getComputedStyle(el);
    const borderY =
      parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    el.style.height = `${el.scrollHeight + borderY}px`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
