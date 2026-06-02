import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_FONT_SIZE,
  FONT_SIZE_EVENT,
  FONT_SIZE_KEY,
  getFontSize,
  setFontSize,
} from "@/lib/fontSize";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.style.fontSize = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fontSize", () => {
  it("returns the default when nothing is stored", () => {
    expect(getFontSize()).toBe(DEFAULT_FONT_SIZE);
  });

  it("setFontSize persists, applies to the root, and round-trips", () => {
    setFontSize(20);
    expect(window.localStorage.getItem(FONT_SIZE_KEY)).toBe("20");
    expect(document.documentElement.style.fontSize).toBe("20px");
    expect(getFontSize()).toBe(20);
  });

  it("falls back to the default for an out-of-range stored value", () => {
    window.localStorage.setItem(FONT_SIZE_KEY, "99");
    expect(getFontSize()).toBe(DEFAULT_FONT_SIZE);
  });

  it("broadcasts a same-window custom event with the new size", () => {
    const handler = vi.fn();
    window.addEventListener(FONT_SIZE_EVENT, handler as EventListener);
    setFontSize(16);
    window.removeEventListener(FONT_SIZE_EVENT, handler as EventListener);

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent<number>;
    expect(event.detail).toBe(16);
  });
});
