import { describe, it, expect } from "vitest";
import { aoe4GuidesSrcToToken } from "./aoe4GuidesIconMap";

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
