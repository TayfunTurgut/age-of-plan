import { describe, expect, it } from "vitest";

import {
  aoe4GuidesAtTokenPathToToken,
  aoe4GuidesSrcToToken,
  capitalizeAoe4GuidesBasename,
  substituteAoe4GuidesBuildKeyword,
} from "@/lib/aoe4GuidesIconMap";
import { ICON_CATALOG } from "@/data/generated/icons";

// A real catalog asset under images/ — aoe4guides is our source of truth, so its
// `<category>/<file>` maps straight to `images/<category>/<file>`.
const samplePath = ICON_CATALOG.find((e) => e.path.startsWith("images/"))!.path;
const sampleRest = samplePath.slice("images/".length);

describe("aoe4GuidesSrcToToken", () => {
  it("maps a current catalog asset (relative and absolute)", () => {
    expect(aoe4GuidesSrcToToken(`/assets/pictures/${sampleRest}`)).toBe(`{{${samplePath}}}`);
    expect(
      aoe4GuidesSrcToToken(`https://aoe4guides.com/assets/pictures/${sampleRest}`),
    ).toBe(`{{${samplePath}}}`);
  });

  it("falls back to the alternate extension (.png ↔ .webp)", () => {
    const pngRest = sampleRest.replace(/\.webp$/, ".png");
    expect(aoe4GuidesSrcToToken(`/assets/pictures/${pngRest}`)).toBe(`{{${samplePath}}}`);
  });

  it("normalizes underscores to hyphens for alias lookups", () => {
    // aoe4guides serves `resource/resource_food.webp`; alias key is hyphenated.
    expect(aoe4GuidesSrcToToken("/assets/pictures/resource/resource_food.webp")).toBe(
      "{{resources/food.webp}}",
    );
  });

  it("applies hand overrides for UI markers", () => {
    expect(aoe4GuidesSrcToToken("/assets/pictures/resource/rally.webp")).toBe(
      "{{general/rally.webp}}",
    );
  });

  it("maps civilization flags by 3-letter code", () => {
    expect(
      aoe4GuidesSrcToToken("/assets/pictures/civilization-flag/goh.webp"),
    ).toBe("{{flags/golden-horde.webp}}");
  });

  it("collapses per-civ villager glyphs onto the generic villager icon", () => {
    expect(
      aoe4GuidesSrcToToken("/assets/pictures/unit-worker/villager-french.webp"),
    ).toBe("{{images/unit_worker/villager.webp}}");
  });

  it("returns null for unmapped or non-aoe4guides sources", () => {
    expect(aoe4GuidesSrcToToken("/assets/pictures/nonsense/xyz.webp")).toBeNull();
    expect(aoe4GuidesSrcToToken("https://example.com/foo.png")).toBeNull();
    expect(aoe4GuidesSrcToToken("")).toBeNull();
    expect(aoe4GuidesSrcToToken(null)).toBeNull();
  });
});

describe("aoe4GuidesAtTokenPathToToken", () => {
  it("resolves the clipboard @path@ form by prepending the pictures prefix", () => {
    expect(aoe4GuidesAtTokenPathToToken("resource/rally.webp")).toBe(
      "{{general/rally.webp}}",
    );
    expect(aoe4GuidesAtTokenPathToToken(null)).toBeNull();
  });
});

describe("substituteAoe4GuidesBuildKeyword", () => {
  it("replaces the standalone word build with the build marker", () => {
    expect(substituteAoe4GuidesBuildKeyword("build a house")).toBe(
      "{{general/build.webp}} a house",
    );
  });

  it("leaves builder/building/builds untouched (word boundary)", () => {
    expect(substituteAoe4GuidesBuildKeyword("builder builds a building")).toBe(
      "builder builds a building",
    );
  });

  it("passes existing tokens through without re-substituting", () => {
    expect(substituteAoe4GuidesBuildKeyword("{{general/build.webp}} now")).toBe(
      "{{general/build.webp}} now",
    );
  });
});

describe("capitalizeAoe4GuidesBasename", () => {
  it("title-cases the last path segment", () => {
    expect(
      capitalizeAoe4GuidesBasename("unit-worker/villager-japanese.webp"),
    ).toBe("Villager Japanese");
    expect(capitalizeAoe4GuidesBasename("sheep")).toBe("Sheep");
    expect(capitalizeAoe4GuidesBasename("")).toBe("");
  });
});
