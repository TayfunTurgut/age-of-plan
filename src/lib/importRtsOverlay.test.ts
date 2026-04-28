import { describe, expect, it } from "vitest";
import { normalizeCivId, parseRtsOverlayJson } from "./importRtsOverlay";

describe("normalizeCivId", () => {
  it("maps canonical display names", () => {
    expect(normalizeCivId("English")).toBe("english");
    expect(normalizeCivId("Holy Roman Empire")).toBe("hre");
    expect(normalizeCivId("Delhi Sultanate")).toBe("delhi");
    expect(normalizeCivId("Abbasid Dynasty")).toBe("abbasid");
  });

  it("is diacritics- and apostrophe-insensitive", () => {
    expect(normalizeCivId("Jeanne d'Arc")).toBe("jeanne-darc");
    expect(normalizeCivId("Jeanne dArc")).toBe("jeanne-darc");
    expect(normalizeCivId("Zhu Xi's Legacy")).toBe("zhu-xi");
  });

  it("recognizes common aliases", () => {
    expect(normalizeCivId("templar")).toBe("knights-templar");
    expect(normalizeCivId("Lancaster")).toBe("house-of-lancaster");
    expect(normalizeCivId("macedonians")).toBe("macedonian");
    expect(normalizeCivId("Tughlaq")).toBe("tughluqid");
  });

  it("returns 'unknown' for empty or unrecognized input", () => {
    expect(normalizeCivId("")).toBe("unknown");
    expect(normalizeCivId("Not A Civ")).toBe("unknown");
  });
});

describe("parseRtsOverlayJson", () => {
  it("parses a minimal valid RTS_Overlay export", () => {
    const json = JSON.stringify({
      name: "Simple FC",
      civilization: "English",
      author: "Me",
      build_order: [
        {
          age: 1,
          villager_count: 7,
          resources: { food: 6, wood: 0, gold: 0, stone: 0, builder: 1 },
          time: "0:45",
          notes: ["Scout", "Collect sheep"],
        },
      ],
    });
    const bo = parseRtsOverlayJson(json);
    expect(bo.name).toBe("Simple FC");
    expect(bo.civilization).toBe("english");
    expect(bo.author).toBe("Me");
    expect(bo.steps).toHaveLength(1);
    expect(bo.steps[0].age).toBe(1);
    expect(bo.steps[0].timeSeconds).toBe(45);
    expect(bo.steps[0].resources.food).toBe(6);
    expect(bo.steps[0].resources.builder).toBe(1);
    expect(bo.steps[0].notes.map((n) => n.text)).toEqual(["Scout", "Collect sheep"]);
  });

  it("preserves manual villager counts when they diverge from the resource sum", () => {
    const json = JSON.stringify({
      civilization: "English",
      build_order: [
        {
          age: 1,
          villager_count: 12,
          resources: { food: 2, wood: 3, gold: 0, stone: 0, builder: 0 },
        },
      ],
    });
    const bo = parseRtsOverlayJson(json);
    expect(bo.steps[0].villagerCountManual).toBe(true);
    expect(bo.steps[0].villagerCount).toBe(12);
  });

  it("auto-syncs villager count when it matches the resource sum", () => {
    const json = JSON.stringify({
      civilization: "English",
      build_order: [
        {
          age: 1,
          villager_count: 5,
          resources: { food: 2, wood: 3, gold: 0, stone: 0, builder: 0 },
        },
      ],
    });
    const bo = parseRtsOverlayJson(json);
    expect(bo.steps[0].villagerCountManual).toBe(false);
  });

  it("tolerates note entries as objects with text/note fields", () => {
    const json = JSON.stringify({
      civilization: "French",
      build_order: [
        {
          age: 1,
          notes: ["a", { text: "b" }, { note: "c" }, { foo: "ignored" }, ""],
        },
      ],
    });
    const bo = parseRtsOverlayJson(json);
    expect(bo.steps[0].notes.map((n) => n.text)).toEqual(["a", "b", "c"]);
  });

  it("supports optional fifth resources (oliveOil, silver) when positive", () => {
    const json = JSON.stringify({
      civilization: "Byzantines",
      build_order: [
        {
          age: 2,
          resources: { food: 5, wood: 0, gold: 0, stone: 0, builder: 0, olive_oil: 3 },
        },
      ],
    });
    const bo = parseRtsOverlayJson(json);
    expect(bo.steps[0].resources.oliveOil).toBe(3);
    expect(bo.steps[0].resources.silver).toBeUndefined();
  });

  it("clamps out-of-range age values to 1", () => {
    const json = JSON.stringify({
      civilization: "English",
      build_order: [{ age: 9 }, { age: "nonsense" }],
    });
    const bo = parseRtsOverlayJson(json);
    expect(bo.steps[0].age).toBe(1);
    expect(bo.steps[1].age).toBe(1);
  });

  it("rejects malformed JSON with a clear error", () => {
    expect(() => parseRtsOverlayJson("{ not valid json")).toThrow(/Invalid JSON/);
  });

  it("rejects top-level non-objects", () => {
    expect(() => parseRtsOverlayJson("[]")).toThrow(/expected an object/);
    expect(() => parseRtsOverlayJson("42")).toThrow(/expected an object/);
    expect(() => parseRtsOverlayJson("null")).toThrow(/expected an object/);
  });

  it("rejects objects missing build_order with a targeted message", () => {
    expect(() =>
      parseRtsOverlayJson(JSON.stringify({ civilization: "English" })),
    ).toThrow(/Missing build_order/);
  });

  it("converts RTS_Overlay @...@ icon tokens to internal {{...}} on import", () => {
    // Path-style tokens with a slash get translated through the aoe4guides
    // icon mapper (it understands legacy aoe4world paths like
    // `unit-english/longbowman-2.webp` via PATH_MIGRATION). Bare basenames
    // stay verbatim-wrapped (RTS_Overlay's historical format). Tokens with
    // whitespace inside don't match the regex and pass through untouched.
    const json = JSON.stringify({
      civilization: "English",
      build_order: [
        {
          age: 1,
          notes: [
            "build @unit-english/longbowman-2.webp@",
            "no token here",
            "@bad path.png@ stays put",
            "bare @longbowman-2.webp@",
          ],
        },
      ],
    });
    const bo = parseRtsOverlayJson(json);
    expect(bo.steps[0].notes.map((n) => n.text)).toEqual([
      "build {{images/units/longbowman-2.png}}",
      "no token here",
      "@bad path.png@ stays put",
      "bare {{longbowman-2.webp}}",
    ]);
  });

  it("translates aoe4guides clipboard path-style tokens with slash through the icon map", () => {
    // aoe4guides' "Copy as JSON" / .bo download emits paths like
    // `@unit_worker/villager-japanese.webp@`. Underscored paths, civ-suffixed
    // villagers, the towara typo, and the rally UI marker all go through
    // aoe4GuidesSrcToToken's full alias chain. (The bare-word `build`
    // substitution is covered by its own test below.)
    const json = JSON.stringify({
      civilization: "Japanese",
      source: "https://aoe4guides.com/builds/yWFJNLAsfTKGCKfC1awK",
      build_order: [
        {
          age: 1,
          notes: [
            "1 @unit_worker/villager-japanese.webp@ next to @building_japanese/farmhouse-1.webp@",
            "Queue @technology_japanese/towara-1.webp@",
            "@resource/rally.webp@ new villager",
          ],
        },
      ],
    });
    const bo = parseRtsOverlayJson(json);
    expect(bo.steps[0].notes.map((n) => n.text)).toEqual([
      "1 {{images/units/villager-1.png}} next to {{images/buildings/farmhouse-1.png}}",
      "Queue {{images/technologies/tawara-1.png}}",
      "{{general/rally.webp}} new villager",
    ]);
  });

  it("substitutes the bare word 'build' for aoe4guides clipboard JSON only", () => {
    // aoe4guides writes "to build farmhouse" expecting a build-marker
    // icon. The URL importer's htmlToText already does this; the JSON
    // path now matches by detecting the aoe4guides.com source URL.
    // Plain RTS_Overlay JSON without an aoe4guides source must keep
    // 'build' as text (could be sentence content), and word-boundaries
    // protect 'builder' / 'building' / 'rebuild' in either case.
    const aoe4Json = JSON.stringify({
      civilization: "Japanese",
      source: "https://aoe4guides.com/builds/abc",
      build_order: [
        {
          age: 1,
          notes: ["1 villager to build farmhouse, builder still gathering"],
        },
      ],
    });
    expect(parseRtsOverlayJson(aoe4Json).steps[0].notes[0].text).toBe(
      "1 villager to {{general/build.webp}} farmhouse, builder still gathering",
    );

    const rtsJson = JSON.stringify({
      civilization: "English",
      build_order: [
        {
          age: 1,
          notes: ["queue a longbowman, then build a barracks"],
        },
      ],
    });
    expect(parseRtsOverlayJson(rtsJson).steps[0].notes[0].text).toBe(
      "queue a longbowman, then build a barracks",
    );
  });

  it("falls back to a capitalized text label when an aoe4guides path is unmapped", () => {
    // aoe4guides ships per-civ resource glyphs (sheep, berrybush, deer…) we
    // intentionally don't carry. The clipboard importer must keep the
    // information visible, matching the URL importer's basename-text
    // fallback in htmlToText.
    const json = JSON.stringify({
      civilization: "English",
      source: "https://aoe4guides.com/builds/abc",
      build_order: [
        {
          age: 1,
          notes: [
            "Pull @resource/deer.webp@ and gather @resource/berrybush.webp@",
            "5 to @resource/sheep.webp@",
          ],
        },
      ],
    });
    const bo = parseRtsOverlayJson(json);
    expect(bo.steps[0].notes.map((n) => n.text)).toEqual([
      "Pull Deer and gather Berrybush",
      "5 to Sheep",
    ]);
  });
});
