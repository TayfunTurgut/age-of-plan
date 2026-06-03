import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  hasNoteTokens,
  parseNoteTokens,
  renderNote,
} from "@/lib/noteRenderer";

describe("parseNoteTokens", () => {
  it("returns an empty array for empty text", () => {
    expect(parseNoteTokens("")).toEqual([]);
  });

  it("returns a single text token when there are no icon tokens", () => {
    expect(parseNoteTokens("just words")).toEqual([
      { kind: "text", value: "just words" },
    ]);
  });

  it("splits text around a single image token", () => {
    expect(parseNoteTokens("go {{resources/food.webp}} now")).toEqual([
      { kind: "text", value: "go " },
      { kind: "image", path: "resources/food.webp" },
      { kind: "text", value: " now" },
    ]);
  });

  it("handles multiple tokens", () => {
    expect(
      parseNoteTokens("{{ages/age_2.webp}}{{resources/wood.webp}}"),
    ).toEqual([
      { kind: "image", path: "ages/age_2.webp" },
      { kind: "image", path: "resources/wood.webp" },
    ]);
  });

  it("returns cached identity for repeated calls", () => {
    const a = parseNoteTokens("cache {{resources/gold.webp}}");
    const b = parseNoteTokens("cache {{resources/gold.webp}}");
    expect(a).toBe(b);
  });
});

describe("hasNoteTokens", () => {
  it("detects image tokens", () => {
    expect(hasNoteTokens("plain")).toBe(false);
    expect(hasNoteTokens("x {{resources/food.webp}}")).toBe(true);
  });
});

describe("renderNote", () => {
  it("renders text spans plus an inline icon img with the asset URL", () => {
    const { container } = render(
      <div>{renderNote("go {{resources/food.webp}} now")}</div>,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe("/aoe4/resources/food.webp");
    expect(container.textContent).toBe("go  now");
  });
});
