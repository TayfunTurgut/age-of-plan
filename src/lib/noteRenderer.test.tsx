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
    expect(parseNoteTokens("go {{resources/food.png}} now")).toEqual([
      { kind: "text", value: "go " },
      { kind: "image", path: "resources/food.png" },
      { kind: "text", value: " now" },
    ]);
  });

  it("handles multiple tokens, including .webp", () => {
    expect(
      parseNoteTokens("{{ages/age_2.webp}}{{resources/wood.png}}"),
    ).toEqual([
      { kind: "image", path: "ages/age_2.webp" },
      { kind: "image", path: "resources/wood.png" },
    ]);
  });

  it("returns cached identity for repeated calls", () => {
    const a = parseNoteTokens("cache {{resources/gold.png}}");
    const b = parseNoteTokens("cache {{resources/gold.png}}");
    expect(a).toBe(b);
  });
});

describe("hasNoteTokens", () => {
  it("detects image tokens", () => {
    expect(hasNoteTokens("plain")).toBe(false);
    expect(hasNoteTokens("x {{resources/food.png}}")).toBe(true);
  });
});

describe("renderNote", () => {
  it("renders text spans plus an inline icon img with the asset URL", () => {
    const { container } = render(
      <div>{renderNote("go {{resources/food.png}} now")}</div>,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe("/aoe4/resources/food.png");
    expect(container.textContent).toBe("go  now");
  });
});
