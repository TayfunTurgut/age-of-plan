import { describe, expect, it } from "vitest";
import type { BuildOrder } from "@/types/buildOrder";
import { toRtsOverlayPayload } from "./exportBuildOrder";
import { parseRtsOverlayJson } from "./importRtsOverlay";

const sampleBuildOrder = (): BuildOrder => ({
  id: "bo-1",
  name: "Fast Castle",
  civilization: "english",
  matchup: "vs French",
  author: "Beastyqt",
  source: "",
  description: "Safe FC into Ranger mass",
  createdAt: 1000,
  updatedAt: 2000,
  steps: [
    {
      id: "s1",
      age: 1,
      villagerCount: 6,
      villagerCountManual: false,
      resources: { food: 6, wood: 0, gold: 0, stone: 0, builder: 0 },
      timeSeconds: 0,
      notes: [
        { id: "n1", text: "Scout map" },
        { id: "n2", text: "Send first vil to sheep" },
      ],
    },
    {
      // Manual mode: villagerCount (25) deliberately diverges from the
      // resource sum (20). This is the only way the RTS_Overlay round-trip
      // can preserve the "manual" flag, since the flag is inferred on import
      // from whether villagerCount disagrees with the resource total.
      id: "s2",
      age: 2,
      villagerCount: 25,
      villagerCountManual: true,
      resources: { food: 12, wood: 6, gold: 2, stone: 0, builder: 0 },
      timeSeconds: 725,
      notes: [],
    },
  ],
});

describe("toRtsOverlayPayload", () => {
  it("maps internal civ id to RTS_Overlay display name", () => {
    expect(toRtsOverlayPayload(sampleBuildOrder()).civilization).toBe("English");
  });

  it("formats times back to 'm:ss' strings", () => {
    const payload = toRtsOverlayPayload(sampleBuildOrder());
    expect(payload.build_order[0].time).toBe("0:00");
    expect(payload.build_order[1].time).toBe("12:05");
  });

  it("serializes notes as plain string arrays", () => {
    const payload = toRtsOverlayPayload(sampleBuildOrder());
    expect(payload.build_order[0].notes).toEqual([
      "Scout map",
      "Send first vil to sheep",
    ]);
  });
});

describe("exportBuildOrder round-trip via RTS_Overlay import", () => {
  it("preserves civ, step count, ages, times, resources, notes, and villager counts", () => {
    const original = sampleBuildOrder();
    const payload = toRtsOverlayPayload(original);
    const reimported = parseRtsOverlayJson(JSON.stringify(payload));

    expect(reimported.civilization).toBe(original.civilization);
    expect(reimported.name).toBe(original.name);
    expect(reimported.author).toBe(original.author);
    expect(reimported.description).toBe(original.description);
    expect(reimported.steps).toHaveLength(original.steps.length);

    for (let i = 0; i < original.steps.length; i++) {
      const a = original.steps[i];
      const b = reimported.steps[i];
      expect(b.age).toBe(a.age);
      expect(b.timeSeconds).toBe(a.timeSeconds);
      expect(b.villagerCount).toBe(a.villagerCount);
      expect(b.villagerCountManual).toBe(a.villagerCountManual);
      expect(b.resources).toEqual(a.resources);
      expect(b.notes.map((n) => n.text)).toEqual(a.notes.map((n) => n.text));
    }
  });

  it("converts internal {{...}} icon tokens to RTS_Overlay @...@ on export", () => {
    const bo: BuildOrder = {
      ...sampleBuildOrder(),
      steps: [
        {
          ...sampleBuildOrder().steps[0],
          notes: [
            { id: "n1", text: "build {{unit-english/longbowman-2.webp}}" },
            { id: "n2", text: "no token" },
            { id: "n3", text: "{{bad path.png}} stays put" },
          ],
        },
      ],
    };
    const payload = toRtsOverlayPayload(bo);
    expect(payload.build_order[0].notes).toEqual([
      "build @unit-english/longbowman-2.webp@",
      "no token",
      "{{bad path.png}} stays put",
    ]);
  });

  it("icon tokens round-trip {{...}} → @...@ → {{...}}", () => {
    const original: BuildOrder = {
      ...sampleBuildOrder(),
      steps: [
        {
          ...sampleBuildOrder().steps[0],
          notes: [
            {
              id: "n1",
              text: "build {{unit-french/royal-knight-2.webp}} fast",
            },
          ],
        },
      ],
    };
    const reimported = parseRtsOverlayJson(
      JSON.stringify(toRtsOverlayPayload(original)),
    );
    expect(reimported.steps[0].notes[0].text).toBe(
      "build {{unit-french/royal-knight-2.webp}} fast",
    );
  });

  it("RTS_Overlay-style civ round-trips to the same internal id", () => {
    const cases = [
      "english",
      "french",
      "hre",
      "delhi",
      "abbasid",
      "zhu-xi",
      "jeanne-darc",
      "knights-templar",
      "macedonian",
    ];
    for (const civId of cases) {
      const bo: BuildOrder = {
        ...sampleBuildOrder(),
        civilization: civId,
      };
      const reimported = parseRtsOverlayJson(
        JSON.stringify(toRtsOverlayPayload(bo)),
      );
      expect(reimported.civilization).toBe(civId);
    }
  });
});
