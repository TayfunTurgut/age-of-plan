import { beforeEach, describe, expect, it } from "vitest";

import { getTheme, setTheme, THEME_KEY, toggleTheme } from "@/lib/theme";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("theme", () => {
  it("defaults to dark when nothing is stored and no class is set", () => {
    expect(getTheme()).toBe("light"); // no dark class present after reset
    setTheme("dark");
    expect(getTheme()).toBe("dark");
  });

  it("setTheme stores the value and toggles the dark class", () => {
    setTheme("dark");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    setTheme("light");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggleTheme flips and returns the new theme", () => {
    setTheme("light");
    expect(toggleTheme()).toBe("dark");
    expect(getTheme()).toBe("dark");
    expect(toggleTheme()).toBe("light");
  });
});
