import { describe, it, expect } from "vitest";
import {
  aoe4GuidesSrcToToken,
  aoe4GuidesAtTokenPathToToken,
  capitalizeAoe4GuidesBasename,
  substituteAoe4GuidesBuildKeyword,
} from "./aoe4GuidesIconMap";

describe("aoe4GuidesSrcToToken", () => {
  it("maps a relative aoe4guides building src to its internal token", () => {
    expect(
      aoe4GuidesSrcToToken("/assets/pictures/building_economy/house.webp"),
    ).toBe("{{images/buildings/house-1.png}}");
  });

  it("maps a relative unit src whose filename includes an age suffix", () => {
    expect(
      aoe4GuidesSrcToToken("/assets/pictures/unit_french/royal-knight-2.webp"),
    ).toBe("{{images/units/royal-knight-2.png}}");
  });

  it("maps a relative worker (villager) src", () => {
    expect(
      aoe4GuidesSrcToToken("/assets/pictures/unit_worker/villager.webp"),
    ).toBe("{{images/units/villager-1.png}}");
  });

  it("maps a relative landmark src", () => {
    expect(
      aoe4GuidesSrcToToken(
        "/assets/pictures/landmark_french/school-of-cavalry.webp",
      ),
    ).toBe("{{images/buildings/school-of-cavalry-1.png}}");
  });

  it("maps a relative technology src", () => {
    expect(
      aoe4GuidesSrcToToken(
        "/assets/pictures/technology_economy/wheelbarrow.webp",
      ),
    ).toBe("{{images/technologies/wheelbarrow-1.png}}");
  });

  it("maps a resource src whose basename uses underscores (resource_gold)", () => {
    expect(
      aoe4GuidesSrcToToken("/assets/pictures/resource/resource_gold.webp"),
    ).toBe("{{resources/gold.png}}");
  });

  it("maps an age icon (age_2 → age-2)", () => {
    expect(aoe4GuidesSrcToToken("/assets/pictures/age/age_2.webp")).toBe(
      "{{ages/age_2.webp}}",
    );
  });

  it("accepts absolute aoe4guides.com URLs", () => {
    expect(
      aoe4GuidesSrcToToken(
        "https://aoe4guides.com/assets/pictures/unit_cavalry/scout.webp",
      ),
    ).toBe("{{images/units/scout-1.png}}");
  });

  it("returns null for unmapped basenames without a general/ alias (e.g. sheep)", () => {
    expect(aoe4GuidesSrcToToken("/assets/pictures/resource/sheep.webp")).toBeNull();
    expect(aoe4GuidesSrcToToken("/assets/pictures/resource/berrybush.webp")).toBeNull();
  });

  it("maps UI-marker imgs (rally, build) to their general/ aliases", () => {
    // aoe4guides occasionally emits these <img> tags with no title/alt, which
    // would otherwise drop silently. We ship matching icons under general/.
    expect(aoe4GuidesSrcToToken("/assets/pictures/resource/rally.webp")).toBe(
      "{{general/rally.webp}}",
    );
    expect(aoe4GuidesSrcToToken("/assets/pictures/resource/build.webp")).toBe(
      "{{general/build.webp}}",
    );
  });

  it("maps the aoe4guides 'towara-1' typo to our tawara icon", () => {
    expect(
      aoe4GuidesSrcToToken("/assets/pictures/technology_japanese/towara-1.webp"),
    ).toBe("{{images/technologies/tawara-1.png}}");
  });

  it("tries the alternate extension when the literal one isn't mapped", () => {
    // aoe4guides occasionally serves the same asset as `.png` instead of
    // `.webp`. The mapping only contains the `.webp` form, so we retry
    // with the swapped extension.
    expect(
      aoe4GuidesSrcToToken("/assets/pictures/unit_worker/villager.png"),
    ).toBe("{{images/units/villager-1.png}}");
    expect(
      aoe4GuidesSrcToToken("/assets/pictures/building_economy/house.png"),
    ).toBe("{{images/buildings/house-1.png}}");
  });

  it("maps civilization-flag srcs to flags/<civ>.png", () => {
    expect(
      aoe4GuidesSrcToToken("/assets/pictures/civilization_flag/eng.webp"),
    ).toBe("{{flags/english.png}}");
    expect(
      aoe4GuidesSrcToToken("/assets/pictures/civilization_flag/goh.webp"),
    ).toBe("{{flags/golden-horde.png}}");
    expect(
      aoe4GuidesSrcToToken("/assets/pictures/civilization_flag/sen.webp"),
    ).toBe("{{flags/sengoku-daimyo.png}}");
  });

  it("falls back to the generic villager icon for civ-suffixed villager srcs", () => {
    // aoe4guides ships per-civ villager glyphs (villager-japanese, villager-french,
    // …); we have a single villager icon, so all civ variants point at it.
    expect(
      aoe4GuidesSrcToToken("/assets/pictures/unit_worker/villager-japanese.webp"),
    ).toBe("{{images/units/villager-1.png}}");
    expect(
      aoe4GuidesSrcToToken("/assets/pictures/unit_worker/villager-french.webp"),
    ).toBe("{{images/units/villager-1.png}}");
    expect(
      aoe4GuidesSrcToToken(
        "/assets/pictures/unit_worker/villager-zhu-xi.webp",
      ),
    ).toBe("{{images/units/villager-1.png}}");
  });

  it("returns null for non-aoe4guides hosts", () => {
    expect(
      aoe4GuidesSrcToToken("https://example.com/assets/pictures/unit_worker/villager.webp"),
    ).toBeNull();
  });

  it("returns null for paths outside /assets/pictures/", () => {
    expect(aoe4GuidesSrcToToken("/some-other/path/file.webp")).toBeNull();
    expect(aoe4GuidesSrcToToken("/assets/scripts/index.js")).toBeNull();
  });

  it("returns null for empty / non-string input", () => {
    expect(aoe4GuidesSrcToToken("")).toBeNull();
    expect(aoe4GuidesSrcToToken(undefined as unknown as string)).toBeNull();
    expect(aoe4GuidesSrcToToken(null as unknown as string)).toBeNull();
  });
});

describe("aoe4GuidesAtTokenPathToToken", () => {
  // The clipboard / .bo export uses `@<category>/<file>.ext@` syntax. The
  // path inside the @-delimiters is the bare relative path under
  // `/assets/pictures/`. This helper prepends that prefix and reuses the
  // existing src-to-token mapper so all aliases / fallbacks apply.
  it("maps a known unit path", () => {
    expect(
      aoe4GuidesAtTokenPathToToken("unit_worker/villager-japanese.webp"),
    ).toBe("{{images/units/villager-1.png}}");
  });

  it("maps a known building path", () => {
    expect(
      aoe4GuidesAtTokenPathToToken("building_japanese/farmhouse-1.webp"),
    ).toBe("{{images/buildings/farmhouse-1.png}}");
  });

  it("maps the towara typo via AOE4GUIDES_ALIASES", () => {
    expect(
      aoe4GuidesAtTokenPathToToken("technology_japanese/towara-1.webp"),
    ).toBe("{{images/technologies/tawara-1.png}}");
  });

  it("maps UI-marker resource imgs (rally / build) via AOE4GUIDES_ALIASES", () => {
    expect(aoe4GuidesAtTokenPathToToken("resource/rally.webp")).toBe(
      "{{general/rally.webp}}",
    );
    expect(aoe4GuidesAtTokenPathToToken("resource/build.webp")).toBe(
      "{{general/build.webp}}",
    );
  });

  it("returns null for unmapped paths (caller falls back to text)", () => {
    expect(aoe4GuidesAtTokenPathToToken("resource/sheep.webp")).toBeNull();
    expect(aoe4GuidesAtTokenPathToToken("resource/berrybush.webp")).toBeNull();
  });

  it("returns null for empty / non-string input", () => {
    expect(aoe4GuidesAtTokenPathToToken("")).toBeNull();
    expect(
      aoe4GuidesAtTokenPathToToken(undefined as unknown as string),
    ).toBeNull();
  });
});

describe("capitalizeAoe4GuidesBasename", () => {
  // Shared text fallback used by both the URL importer (htmlToText) and the
  // clipboard importer (convertIconTokens). Strips path/extension, splits on
  // - and _, title-cases each word.
  it("title-cases a bare basename", () => {
    expect(capitalizeAoe4GuidesBasename("sheep")).toBe("Sheep");
    expect(capitalizeAoe4GuidesBasename("berrybush")).toBe("Berrybush");
  });

  it("strips a .webp/.png extension", () => {
    expect(capitalizeAoe4GuidesBasename("sheep.webp")).toBe("Sheep");
    expect(capitalizeAoe4GuidesBasename("sheep.png")).toBe("Sheep");
  });

  it("extracts the basename from a relative path", () => {
    expect(capitalizeAoe4GuidesBasename("resource/sheep.webp")).toBe("Sheep");
    expect(
      capitalizeAoe4GuidesBasename("unit_worker/villager-japanese.webp"),
    ).toBe("Villager Japanese");
  });

  it("splits on '-' and '_' and title-cases each word", () => {
    expect(capitalizeAoe4GuidesBasename("villager-japanese")).toBe(
      "Villager Japanese",
    );
    expect(capitalizeAoe4GuidesBasename("FOO_BAR-BAZ")).toBe("Foo Bar Baz");
  });

  it("returns an empty string for empty input", () => {
    expect(capitalizeAoe4GuidesBasename("")).toBe("");
  });
});

describe("substituteAoe4GuidesBuildKeyword", () => {
  it("substitutes the bare word 'build' with the build-marker token", () => {
    expect(substituteAoe4GuidesBuildKeyword("to build farmhouse")).toBe(
      "to {{general/build.webp}} farmhouse",
    );
  });

  it("is case-insensitive and idempotent", () => {
    expect(substituteAoe4GuidesBuildKeyword("Build a house")).toBe(
      "{{general/build.webp}} a house",
    );
    // Running it again yields the same string — the inserted token is
    // protected from re-substitution.
    expect(
      substituteAoe4GuidesBuildKeyword(
        substituteAoe4GuidesBuildKeyword("Build a house"),
      ),
    ).toBe("{{general/build.webp}} a house");
  });

  it("respects word boundaries (builder / building / rebuild stay)", () => {
    expect(
      substituteAoe4GuidesBuildKeyword("the builder is building, rebuild it"),
    ).toBe("the builder is building, rebuild it");
  });

  it("does not corrupt {{...}} tokens that contain 'build' in the path", () => {
    // Realistic case after convertIconTokens / aoe4GuidesSrcToToken has
    // already turned `resource/build.webp` into a token. The keyword
    // substitution must NOT re-match `build` inside that token.
    expect(substituteAoe4GuidesBuildKeyword("{{general/build.webp}}")).toBe(
      "{{general/build.webp}}",
    );
    expect(
      substituteAoe4GuidesBuildKeyword("Build {{general/build.webp}} now"),
    ).toBe("{{general/build.webp}} {{general/build.webp}} now");
  });
});
