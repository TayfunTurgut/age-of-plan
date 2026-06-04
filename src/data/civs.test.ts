import { describe, expect, it } from "vitest";

import { CIVS, getCiv } from "@/data/civs";
import { getUnitPresets, LOCATION_PRESETS } from "@/data/tagPresets";

const EXPECTED_IDS = [
  "english", "french", "hre", "mongols", "rus", "chinese", "delhi", "abbasid",
  "ottomans", "malians", "byzantines", "japanese", "ayyubids", "zhu-xi",
  "jeanne-darc", "order-of-the-dragon", "knights-templar", "house-of-lancaster",
  "golden-horde", "macedonian", "sengoku-daimyo", "tughluqid", "jin",
];

describe("CIVS", () => {
  it("contains exactly 23 civilizations matching the spec ids", () => {
    expect(CIVS).toHaveLength(23);
    expect(CIVS.map((c) => c.id).sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it("includes Jin Dynasty as a Chinese variant", () => {
    expect(getCiv("jin")?.name).toBe("Jin Dynasty");
    expect(getCiv("jin")?.variantOf).toBe("chinese");
  });

  it("gives every civ a name, tagline, and flag path", () => {
    for (const civ of CIVS) {
      expect(civ.name.length).toBeGreaterThan(0);
      expect(civ.tagline.length).toBeGreaterThan(0);
      expect(civ.flagIcon).toMatch(/^flags\/.+\.webp$/);
    }
  });
});

describe("getCiv", () => {
  it("looks up by id", () => {
    expect(getCiv("french")?.name).toBe("French");
  });

  it("returns undefined for unknown or missing ids", () => {
    expect(getCiv("atlantis")).toBeUndefined();
    expect(getCiv(undefined)).toBeUndefined();
  });
});

describe("extra resources gating", () => {
  it("assigns olive oil to byzantines and ayyubids", () => {
    expect(getCiv("byzantines")?.extraResources).toEqual(["oliveOil"]);
    expect(getCiv("ayyubids")?.extraResources).toEqual(["oliveOil"]);
  });

  it("assigns silver to macedonian", () => {
    expect(getCiv("macedonian")?.extraResources).toEqual(["silver"]);
  });

  it("gives standard civs no extra resources", () => {
    expect(getCiv("english")?.extraResources).toEqual([]);
    expect(getCiv("french")?.extraResources).toEqual([]);
  });
});

describe("tag presets", () => {
  it("prepends common units to a civ's unique units", () => {
    const presets = getUnitPresets("english");
    expect(presets.slice(0, 2)).toEqual(["Scout", "Villager"]);
    expect(presets).toContain("Longbowman");
  });

  it("offers location presets", () => {
    expect(LOCATION_PRESETS).toContain("Food (Sheep)");
    expect(LOCATION_PRESETS.length).toBeGreaterThan(5);
  });
});
