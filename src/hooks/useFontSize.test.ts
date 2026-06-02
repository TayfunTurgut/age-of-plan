import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useFontSize } from "@/hooks/useFontSize";
import { DEFAULT_FONT_SIZE, FONT_SIZE_EVENT, FONT_SIZE_KEY } from "@/lib/fontSize";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.style.fontSize = "";
});

describe("useFontSize", () => {
  it("starts at the default and applies a new size on set", () => {
    const { result } = renderHook(() => useFontSize());
    expect(result.current.fontSize).toBe(DEFAULT_FONT_SIZE);

    act(() => result.current.setFontSize(20));
    expect(result.current.fontSize).toBe(20);
    expect(document.documentElement.style.fontSize).toBe("20px");
    expect(window.localStorage.getItem(FONT_SIZE_KEY)).toBe("20");
  });

  it("re-renders on the same-window custom event (sibling sync)", () => {
    const { result } = renderHook(() => useFontSize());
    act(() => {
      window.dispatchEvent(
        new CustomEvent(FONT_SIZE_EVENT, { detail: 16 }),
      );
    });
    expect(result.current.fontSize).toBe(16);
  });

  it("follows a cross-window storage event (runner popup sync)", () => {
    const { result } = renderHook(() => useFontSize());
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: FONT_SIZE_KEY, newValue: "18" }),
      );
    });
    expect(result.current.fontSize).toBe(18);
  });

  it("ignores out-of-range storage values", () => {
    const { result } = renderHook(() => useFontSize());
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: FONT_SIZE_KEY, newValue: "99" }),
      );
    });
    expect(result.current.fontSize).toBe(DEFAULT_FONT_SIZE);
  });
});
