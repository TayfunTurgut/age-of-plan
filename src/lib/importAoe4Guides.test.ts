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
    expect(bo.steps[0].notes[0].text).toBe(
      "{{general/build.webp}} Town Center on\nthe hill",
    );
  });

  it("converts recognized aoe4guides image URLs into inline icon tokens", () => {
    const payload = {
      civ: "FRE",
      steps: [
        {
          age: 1,
          steps: [
            {
              age: 1,
              food: 6,
              description:
                'Build <img src="/assets/pictures/building_economy/house.webp" title="House" /> next to <img src="/assets/pictures/unit_worker/villager.webp" title="Villager" />',
            },
          ],
        },
      ],
    };
    const bo = parseAoe4GuidesPayload(payload, ID);
    expect(bo.steps[0].notes[0].text).toBe(
      "{{general/build.webp}} {{images/buildings/house-1.png}} next to {{images/units/villager-1.png}}",
    );
  });

  it("falls back to title/alt when an image src is from an unknown host", () => {
    const payload = {
      civ: "FRE",
      steps: [
        {
          age: 1,
          steps: [
            {
              age: 1,
              food: 6,
              description:
                'Build <img src="https://example.com/icons/house.webp" title="House" /> on the hill',
            },
          ],
        },
      ],
    };
    const bo = parseAoe4GuidesPayload(payload, ID);
    expect(bo.steps[0].notes[0].text).toBe(
      "{{general/build.webp}} House on the hill",
    );
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

  it("converts the bare word 'build' (case-insensitive) to the build icon token", () => {
    // aoe4guides writes "to build <img farmhouse>" with `build` as plain text.
    // We have a general/build.webp icon — substitute it on import.
    const payload = {
      civ: "JAP",
      steps: [
        {
          age: 1,
          steps: [
            {
              age: 1,
              food: 6,
              description:
                'and 1 to build <img src="/assets/pictures/building_japanese/farmhouse-1.webp" title="Farmhouse" />',
            },
          ],
        },
      ],
    };
    const bo = parseAoe4GuidesPayload(payload, ID);
    expect(bo.steps[0].notes[0].text).toBe(
      "and 1 to {{general/build.webp}} {{images/buildings/farmhouse-1.png}}",
    );
  });

  it("only substitutes the standalone word 'build', not 'builder'/'building'/'rebuild'", () => {
    // Word-boundary regression: nearby morphemes must stay untouched.
    const payload = {
      civ: "ENG",
      steps: [
        {
          age: 1,
          steps: [
            {
              age: 1,
              food: 1,
              description: "Build a builder, then a building, then rebuild it.",
            },
          ],
        },
      ],
    };
    const bo = parseAoe4GuidesPayload(payload, ID);
    expect(bo.steps[0].notes[0].text).toBe(
      "{{general/build.webp}} a builder, then a building, then rebuild it.",
    );
  });

  it("smoke: full Japanese fast-castle step-1 description (Tawara + villager-civ + build)", () => {
    // Real description shape from build yeDbJIwrrgHzUdJJb7gi step 1 — exercises
    // every fix together: civ-suffixed villager, towara typo alias, and the
    // bare-word 'build' substitution.
    const payload = {
      civ: "JAP",
      steps: [
        {
          age: 1,
          steps: [
            {
              age: 1,
              food: 6,
              description:
                '5 to <img src="/assets/pictures/resource/sheep.webp" class="icon-none" title="Sheep" /> and 1 <img src="/assets/pictures/unit_worker/villager-japanese.webp" class="icon-default" /> to build <img src="/assets/pictures/building_japanese/farmhouse-1.webp" class="icon-default" title="Farmhouse" /> (get <img src="/assets/pictures/technology_japanese/towara-1.webp" class="icon-tech" />)',
            },
          ],
        },
      ],
    };
    const bo = parseAoe4GuidesPayload(payload, ID);
    const text = bo.steps[0].notes[0].text;
    expect(text).toContain("Sheep");
    expect(text).toContain("{{images/units/villager-1.png}}");
    expect(text).toContain("{{general/build.webp}}");
    expect(text).toContain("{{images/buildings/farmhouse-1.png}}");
    expect(text).toContain("{{images/technologies/tawara-1.png}}");
  });

  it("derives a capitalized text label for unmapped aoe4guides imgs without title/alt", () => {
    // Real aoe4guides quirk: many resource/UI marker imgs (sheep, deer,
    // berrybush, repair…) are emitted with no title/alt. We keep the
    // information visible by capitalizing the basename.
    const payload = {
      civ: "ENG",
      steps: [
        {
          age: 1,
          steps: [
            {
              age: 1,
              food: 1,
              description:
                'Pull <img src="/assets/pictures/resource/deer.webp" class="icon-none" /> and 2 to <img src="/assets/pictures/resource/berrybush.webp" class="icon-none" />',
            },
          ],
        },
      ],
    };
    const bo = parseAoe4GuidesPayload(payload, ID);
    expect(bo.steps[0].notes[0].text).toBe("Pull Deer and 2 to Berrybush");
  });

  it("title/alt still wins over the basename fallback", () => {
    const payload = {
      civ: "ENG",
      steps: [
        {
          age: 1,
          steps: [
            {
              age: 1,
              food: 1,
              description:
                'Pull <img src="/assets/pictures/resource/berrybush.webp" title="Berries" />',
            },
          ],
        },
      ],
    };
    const bo = parseAoe4GuidesPayload(payload, ID);
    expect(bo.steps[0].notes[0].text).toBe("Pull Berries");
  });

  it("survives nullable string fields in the payload (author/title/etc.)", () => {
    // aoe4guides emits null (not just undefined) for empty optional fields.
    const payload = {
      civ: "HOL",
      author: null,
      map: null,
      title: null,
      description: null,
      steps: [
        {
          age: 1,
          gameplan: null,
          steps: [
            {
              age: 1,
              food: 6,
              builders: null,
              description: 'Open with <img src="/assets/pictures/resource/sheep.webp" title="Sheep" />',
            },
          ],
        },
      ],
    };
    const bo = parseAoe4GuidesPayload(payload, ID);
    expect(bo.civilization).toBe("house-of-lancaster");
    expect(bo.steps[0].notes[0].text).toBe("Open with Sheep");
  });

  it("maps the live aoe4guides civ codes (KTE, DRA, GOH, SEN) and ANY to unknown", () => {
    const make = (civ: string) =>
      parseAoe4GuidesPayload(
        {
          civ,
          steps: [{ age: 1, steps: [{ age: 1, food: 1, description: "x" }] }],
        },
        ID,
      ).civilization;
    expect(make("KTE")).toBe("knights-templar");
    expect(make("DRA")).toBe("order-of-the-dragon");
    expect(make("GOH")).toBe("golden-horde");
    expect(make("SEN")).toBe("sengoku-daimyo");
    expect(make("ANY")).toBe("unknown");
    // Legacy 2-letter codes still work.
    expect(make("KT")).toBe("knights-templar");
    expect(make("OOD")).toBe("order-of-the-dragon");
    expect(make("GH")).toBe("golden-horde");
    expect(make("SD")).toBe("sengoku-daimyo");
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
