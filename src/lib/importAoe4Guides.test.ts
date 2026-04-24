import { describe, expect, it } from "vitest";
import {
  extractAoe4GuidesId,
  parseAoe4GuidesPayload,
} from "./importAoe4Guides";

describe("extractAoe4GuidesId", () => {
  it("accepts a bare 20-char id", () => {
    expect(extractAoe4GuidesId("ABC1234567890abcdefg")).toBe("ABC1234567890abcdefg");
  });

  it("pulls the id out of /builds/<id> URLs", () => {
    expect(
      extractAoe4GuidesId("https://aoe4guides.com/builds/ABC1234567890abcdefg"),
    ).toBe("ABC1234567890abcdefg");
  });

  it("accepts /build/<id> (singular) URLs too", () => {
    expect(
      extractAoe4GuidesId("https://aoe4guides.com/build/XYZ7654321098zyxwvuts"),
    ).toBe("XYZ7654321098zyxwvut");
  });

  it("returns null for empty or malformed input", () => {
    expect(extractAoe4GuidesId("")).toBeNull();
    expect(extractAoe4GuidesId("   ")).toBeNull();
    expect(extractAoe4GuidesId("too-short")).toBeNull();
    expect(extractAoe4GuidesId("https://aoe4guides.com/builds/too-short")).toBeNull();
  });
});

describe("parseAoe4GuidesPayload", () => {
  const ID = "ABC1234567890abcdefg";

  it("parses a minimal age-grouped payload into a BuildOrder", () => {
    const payload = {
      title: "Fast Castle",
      civ: "ENG",
      author: "Beastyqt",
      steps: [
        {
          age: 1,
          steps: [
            {
              age: 1,
              time: "0:00",
              description: "Scout map",
              food: "6",
              wood: "0",
              gold: "0",
              stone: "0",
              builders: "0",
            },
          ],
        },
      ],
    };
    const bo = parseAoe4GuidesPayload(payload, ID);
    expect(bo.name).toBe("Fast Castle");
    expect(bo.civilization).toBe("english");
    expect(bo.author).toBe("Beastyqt");
    expect(bo.source).toBe(`https://aoe4guides.com/builds/${ID}`);
    expect(bo.steps).toHaveLength(1);
    expect(bo.steps[0].age).toBe(1);
    expect(bo.steps[0].timeSeconds).toBe(0);
    expect(bo.steps[0].resources.food).toBe(6);
    expect(bo.steps[0].notes[0].text).toBe("Scout map");
  });

  it("accepts build_order as a fallback key for steps", () => {
    const bo = parseAoe4GuidesPayload(
      {
        civ: "FRE",
        build_order: [
          { age: 1, steps: [{ age: 1, food: 2, wood: 3, description: "Go" }] },
        ],
      },
      ID,
    );
    expect(bo.civilization).toBe("french");
    expect(bo.steps).toHaveLength(1);
    expect(bo.steps[0].resources.wood).toBe(3);
  });

  it("rejects non-object payloads with a helpful error", () => {
    expect(() => parseAoe4GuidesPayload(null, ID)).toThrow(/expected shape/);
    expect(() => parseAoe4GuidesPayload("hello", ID)).toThrow(/expected shape/);
    expect(() => parseAoe4GuidesPayload([1, 2, 3], ID)).toThrow(/expected shape/);
    expect(() => parseAoe4GuidesPayload(42, ID)).toThrow(/expected shape/);
  });

  it("rejects payloads with no steps", () => {
    expect(() => parseAoe4GuidesPayload({ civ: "ENG" }, ID)).toThrow(/no steps/);
    expect(() => parseAoe4GuidesPayload({ civ: "ENG", steps: [] }, ID)).toThrow(/no steps/);
  });

  it("rejects payloads whose age-groups contain no usable steps", () => {
    const payload = {
      civ: "ENG",
      steps: [{ age: 1, steps: [{ age: 1 }] }], // empty step — filtered out
    };
    expect(() => parseAoe4GuidesPayload(payload, ID)).toThrow(/no usable steps/);
  });

  it("strips HTML tags from descriptions while preserving title/alt text", () => {
    const payload = {
      civ: "HRE",
      steps: [
        {
          age: 2,
          steps: [
            {
              age: 2,
              food: 10,
              description: 'Build <img title="Town Center"> on <br>the hill',
            },
          ],
        },
      ],
    };
    const bo = parseAoe4GuidesPayload(payload, ID);
    expect(bo.steps[0].notes[0].text).toBe("Build Town Center on\nthe hill");
  });

  it("maps manual villager counts that disagree with the resource sum", () => {
    const payload = {
      civ: "ENG",
      steps: [
        {
          age: 1,
          steps: [
            {
              age: 1,
              food: "2",
              wood: "3",
              gold: "0",
              stone: "0",
              builders: "0",
              villagers: "10", // deliberately diverges from 2+3+0+0+0=5
            },
          ],
        },
      ],
    };
    const bo = parseAoe4GuidesPayload(payload, ID);
    expect(bo.steps[0].villagerCount).toBe(10);
    expect(bo.steps[0].villagerCountManual).toBe(true);
  });

  it("auto-syncs villager count when it matches the resource sum", () => {
    const payload = {
      civ: "ENG",
      steps: [
        {
          age: 1,
          steps: [
            {
              age: 1,
              food: "2",
              wood: "3",
              gold: "0",
              stone: "0",
              builders: "0",
              villagers: "5",
            },
          ],
        },
      ],
    };
    const bo = parseAoe4GuidesPayload(payload, ID);
    expect(bo.steps[0].villagerCount).toBe(5);
    expect(bo.steps[0].villagerCountManual).toBe(false);
  });
});
