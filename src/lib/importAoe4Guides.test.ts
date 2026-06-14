import { describe, expect, it } from "vitest";

import {
  extractAoe4GuidesId,
  parseAoe4GuidesPayload,
} from "@/lib/importAoe4Guides";

describe("extractAoe4GuidesId", () => {
  it("extracts from /build/ and /builds/ URLs and bare ids", () => {
    const id = "abcdefghij0123456789";
    expect(extractAoe4GuidesId(`https://aoe4guides.com/builds/${id}`)).toBe(id);
    expect(extractAoe4GuidesId(`https://aoe4guides.com/build/${id}`)).toBe(id);
    expect(extractAoe4GuidesId(id)).toBe(id);
  });

  it("returns null for non-matching input", () => {
    expect(extractAoe4GuidesId("")).toBeNull();
    expect(extractAoe4GuidesId("not-an-id")).toBeNull();
    expect(extractAoe4GuidesId("https://aoe4guides.com/builds/short")).toBeNull();
  });
});

describe("parseAoe4GuidesPayload", () => {
  const id = "abcdefghij0123456789";

  it("parses age-grouped steps, civ codes, times, resources, and notes", () => {
    const payload = {
      title: "Test Build",
      civ: "ENG",
      author: null, // aoe4guides emits null for empty fields
      description: null,
      steps: [
        {
          age: 1,
          type: "age",
          steps: [
            {
              age: 1,
              time: "0:30",
              food: "6",
              wood: "2",
              gold: "0",
              stone: "0",
              builders: "0",
              villagers: "8",
              description: 'Make villagers<br><img src="/assets/pictures/resource/rally.webp">build here',
            },
          ],
        },
        {
          age: 2,
          type: "ageUp",
          steps: [
            { age: 2, time: "3:00", food: "10", wood: "4", villagers: "14", description: "Age up" },
          ],
        },
      ],
    };

    const bo = parseAoe4GuidesPayload(payload, id);
    expect(bo.name).toBe("Test Build");
    expect(bo.civilization).toBe("english");
    expect(bo.author).toBe("");
    expect(bo.source).toBe(`https://aoe4guides.com/builds/${id}`);
    expect(bo.steps).toHaveLength(2);

    expect(bo.steps[0].timeSeconds).toBe(30);
    expect(bo.steps[0].resources.food).toBe(6);
    expect(bo.steps[0].villagerCount).toBe(8);
    // img → rally token; bare "build" → build marker.
    expect(bo.steps[0].notes[0].text).toContain("{{general/rally.webp}}");
    expect(bo.steps[0].notes[0].text).toContain("{{general/build.webp}}");

    expect(bo.steps[1].age).toBe(2);
    expect(bo.steps[1].timeSeconds).toBe(180);
  });

  it("maps legacy and ANY civ codes", () => {
    const make = (civ: string) => ({
      civ,
      steps: [{ age: 1, steps: [{ age: 1, food: "1" }] }],
    });
    expect(parseAoe4GuidesPayload(make("OOD"), id).civilization).toBe(
      "order-of-the-dragon",
    );
    expect(parseAoe4GuidesPayload(make("ANY"), id).civilization).toBe("unknown");
  });

  it("decodes entities once without over-decoding double-encoded ones", () => {
    const make = (description: string) => ({
      civ: "ENG",
      steps: [{ age: 1, steps: [{ age: 1, description }] }],
    });
    const noteText = (description: string) =>
      parseAoe4GuidesPayload(make(description), id).steps[0].notes[0].text;

    expect(noteText("5 &amp; 6 &lt;100 pop&gt;")).toBe("5 & 6 <100 pop>");
    // Author wrote a literal "&lt;b&gt;" (double-encoded on the wire); it must
    // survive as the escaped form, not collapse to "<b>".
    expect(noteText("&amp;lt;b&amp;gt; stays escaped")).toBe(
      "&lt;b&gt; stays escaped",
    );
  });

  it("throws when there are no steps", () => {
    expect(() => parseAoe4GuidesPayload({ steps: [] }, id)).toThrow(
      /no steps/,
    );
  });

  it("throws when groups contain no usable steps", () => {
    expect(() =>
      parseAoe4GuidesPayload({ steps: [{ age: 1, steps: [{ age: 1 }] }] }, id),
    ).toThrow(/no usable steps/);
  });
});
