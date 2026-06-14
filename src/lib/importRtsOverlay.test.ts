import { describe, expect, it } from "vitest";

import { toRtsOverlayPayload } from "@/lib/exportBuildOrder";
import {
  civIdToDisplayName,
  normalizeCivId,
  parseRtsOverlayJson,
} from "@/lib/importRtsOverlay";
import type { BuildOrder } from "@/types/buildOrder";

describe("normalizeCivId", () => {
  it("matches display names, aliases, and 2-letter codes", () => {
    expect(normalizeCivId("French")).toBe("french");
    expect(normalizeCivId("Holy Roman Empire")).toBe("hre");
    expect(normalizeCivId("fr")).toBe("french");
    expect(normalizeCivId("Delhi Sultanate")).toBe("delhi");
    expect(normalizeCivId("Jin Dynasty")).toBe("jin");
  });

  it("is diacritic- and apostrophe-insensitive", () => {
    expect(normalizeCivId("Jeanne d'Arc")).toBe("jeanne-darc");
    expect(normalizeCivId("Zhu Xi's Legacy")).toBe("zhu-xi");
  });

  it("returns unknown for empty or unrecognized civs", () => {
    expect(normalizeCivId("")).toBe("unknown");
    expect(normalizeCivId("Atlanteans")).toBe("unknown");
  });
});

describe("civIdToDisplayName", () => {
  it("maps ids to display names and passes unknown ids through", () => {
    expect(civIdToDisplayName("byzantines")).toBe("Byzantines");
    expect(civIdToDisplayName("mystery")).toBe("mystery");
  });

  it("round-trips the Jin Dynasty variant civ", () => {
    expect(normalizeCivId(civIdToDisplayName("jin"))).toBe("jin");
  });
});

describe("parseRtsOverlayJson", () => {
  it("parses a valid RTS_Overlay build", () => {
    const json = JSON.stringify({
      name: "Scout Rush",
      civilization: "Mongols",
      build_order: [
        {
          age: 1,
          villager_count: 8,
          resources: { food: 6, wood: 2, gold: 0, stone: 0, builder: 0 },
          time: "1:05",
          notes: ["go @resources/food.webp@ then scout"],
        },
      ],
    });
    const bo = parseRtsOverlayJson(json);
    expect(bo.name).toBe("Scout Rush");
    expect(bo.civilization).toBe("mongols");
    expect(bo.steps).toHaveLength(1);
    expect(bo.steps[0].timeSeconds).toBe(65);
    expect(bo.steps[0].notes[0].text).toBe("go {{resources/food.webp}} then scout");
  });

  it("throws a specific error when build_order is missing", () => {
    expect(() => parseRtsOverlayJson(JSON.stringify({ name: "x" }))).toThrow(
      /Missing build_order array/,
    );
  });

  it("throws on invalid JSON", () => {
    expect(() => parseRtsOverlayJson("{nope")).toThrow(/Invalid JSON/);
  });

  it("throws when the top level isn't an object", () => {
    expect(() => parseRtsOverlayJson("[]")).toThrow(/expected an object/);
  });
});

describe("export → RTS_Overlay → import round-trip", () => {
  it("preserves civ, time, resources, and icon tokens", () => {
    const original: BuildOrder = {
      id: "b1",
      name: "Round Trip",
      civilization: "byzantines",
      author: "Me",
      source: "",
      description: "",
      matchup: "",
      createdAt: 1,
      updatedAt: 1,
      steps: [
        {
          id: "s1",
          age: 2,
          villagerCount: 8,
          villagerCountManual: false,
          resources: { food: 6, wood: 2, gold: 0, stone: 0, builder: 0 },
          timeSeconds: 125,
          notes: [{ id: "n1", text: "build to {{resources/wood.webp}}" }],
        },
      ],
    };

    const reimported = parseRtsOverlayJson(
      JSON.stringify(toRtsOverlayPayload(original)),
    );
    expect(reimported.civilization).toBe("byzantines");
    expect(reimported.steps[0].timeSeconds).toBe(125);
    expect(reimported.steps[0].resources.food).toBe(6);
    expect(reimported.steps[0].villagerCount).toBe(8);
    expect(reimported.steps[0].notes[0].text).toBe(
      "build to {{resources/wood.webp}}",
    );
  });
});
