import { describe, expect, it } from "vitest";

import {
  aoe4GuidesAtTokenPathToToken,
  aoe4GuidesSrcToToken,
  capitalizeAoe4GuidesBasename,
  substituteAoe4GuidesBuildKeyword,
} from "@/lib/aoe4GuidesIconMap";
import { PATH_MIGRATION } from "@/data/generated/pathMigration";

const [legacyWebp, internalPath] = Object.entries(PATH_MIGRATION).find(([k]) =>
  k.endsWith(".webp"),
)!;

describe("aoe4GuidesSrcToToken", () => {
  it("maps a known PATH_MIGRATION asset (relative and absolute)", () => {
    expect(aoe4GuidesSrcToToken(`/assets/pictures/${legacyWebp}`)).toBe(
      `{{${internalPath}}}`,
    );
    expect(
      aoe4GuidesSrcToToken(`https://aoe4guides.com/assets/pictures/${legacyWebp}`),
    ).toBe(`{{${internalPath}}}`);
  });

  it("falls back to the alternate extension (.png ↔ .webp)", () => {
    const pngForm = `${legacyWebp.slice(0, -5)}.png`;
    expect(aoe4GuidesSrcToToken(`/assets/pictures/${pngForm}`)).toBe(
      `{{${internalPath}}}`,
    );
  });

  it("normalizes underscores to hyphens before lookup", () => {
    const underscored = legacyWebp.replace(/-/g, "_");
    expect(aoe4GuidesSrcToToken(`/assets/pictures/${underscored}`)).toBe(
      `{{${internalPath}}}`,
    );
  });

  it("applies hand overrides ahead of PATH_MIGRATION", () => {
    expect(aoe4GuidesSrcToToken("/assets/pictures/resource/rally.webp")).toBe(
      "{{general/rally.webp}}",
    );
  });

  it("maps civilization flags by 3-letter code", () => {
    expect(
      aoe4GuidesSrcToToken("/assets/pictures/civilization-flag/goh.webp"),
    ).toBe("{{flags/golden-horde.png}}");
  });

  it("collapses per-civ villager glyphs onto the generic villager icon", () => {
    const generic = PATH_MIGRATION["unit-worker/villager.webp"];
    expect(
      aoe4GuidesSrcToToken("/assets/pictures/unit-worker/villager-french.webp"),
    ).toBe(`{{${generic}}}`);
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
