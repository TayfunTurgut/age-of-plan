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
    const json = JSON.stringify({
      civilization: "English",
      build_order: [
        {
          age: 1,
          notes: [
            "build @unit-english/longbowman-2.webp@",
            "no token here",
            "@bad path.png@ stays put",
          ],
        },
      ],
    });
    const bo = parseRtsOverlayJson(json);
    expect(bo.steps[0].notes.map((n) => n.text)).toEqual([
      "build {{unit-english/longbowman-2.webp}}",
      "no token here",
      "@bad path.png@ stays put",
    ]);
  });
});
