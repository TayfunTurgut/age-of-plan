import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useTheme } from "@/hooks/useTheme";
import { THEME_KEY } from "@/lib/theme";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("useTheme", () => {
  it("toggles theme, applies the dark class, and persists", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");
  });

  it("follows a cross-window storage event (runner popup sync)", () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: THEME_KEY, newValue: "dark" }),
      );
    });
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("ignores storage events for other keys", () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "other", newValue: "dark" }),
      );
    });
    expect(result.current.theme).toBe("light");
  });
});
