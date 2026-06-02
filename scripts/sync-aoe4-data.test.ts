import { describe, expect, it } from "vitest";

import {
  type Aoe4WorldEntity,
  buildCivData,
  buildIconCatalog,
  buildPathMigration,
  civsForExtraResource,
  emitCivDataTs,
  emitIconsTs,
  emitMigrationTs,
  groupByCiv,
  iconLocalPath,
  slugify,
  stripAge,
} from "./sync-aoe4-data";
import { collectImgs, findUnmappedImgs } from "./check-aoe4guides-coverage";

function entity(over: Partial<Aoe4WorldEntity>): Aoe4WorldEntity {
  return {
    id: "x",
    baseId: "x",
    type: "unit",
    name: "Thing",
    age: 1,
    civs: [],
    unique: false,
    icon: "https://data.aoe4world.com/images/units/thing.png",
    ...over,
  };
}

describe("slug helpers", () => {
  it("slugify strips non-alphanumerics and lowercases", () => {
    expect(slugify("Royal Knight-2")).toBe("royalknight2");
  });
  it("stripAge removes a trailing -<n>", () => {
    expect(stripAge("longbowman-4")).toBe("longbowman");
    expect(stripAge("granary")).toBe("granary");
  });
});

describe("civsForExtraResource", () => {
  it("derives civ restrictions from EXTRA_RESOURCES_BY_CIV", () => {
    expect(civsForExtraResource("oliveOil")).toEqual(["ayyubids", "byzantines"]);
    expect(civsForExtraResource("silver")).toEqual(["macedonian"]);
    expect(civsForExtraResource("nope")).toBeUndefined();
  });
});

describe("iconLocalPath", () => {
  it("derives images/<kind>/<file> from the icon URL", () => {
    expect(iconLocalPath("units", entity({ icon: "https://data.aoe4world.com/images/units/longbowman-4.png" }))).toBe(
      "images/units/longbowman-4.png",
    );
    expect(iconLocalPath("units", entity({ icon: "" }))).toBeNull();
  });
});

describe("buildIconCatalog", () => {
  it("dedups by icon path, collapses all-civ restrictions, and sorts by category", () => {
    const longbow = entity({
      name: "Longbowman",
      icon: "https://data.aoe4world.com/images/units/longbowman.png",
      civs: ["en"],
      unique: true,
      age: 2,
    });
    // Same icon path, second civ -> should merge into one entry with both civs.
    const longbow2 = entity({ ...longbow, civs: ["hl"] });
    // A spearman shared by every civ -> restriction collapses to undefined.
    const allCivs = [
      "ab", "ay", "by", "ch", "de", "en", "fr", "gol", "hl", "hr", "ja",
      "je", "kt", "ma", "mac", "mo", "od", "ot", "ru", "sen", "tug", "zx",
    ];
    const spear = entity({
      name: "Spearman",
      icon: "https://data.aoe4world.com/images/units/spearman.png",
      civs: allCivs,
    });

    const catalog = buildIconCatalog([longbow, longbow2, spear], [], []);

    const lb = catalog.find((e) => e.path === "images/units/longbowman.png");
    expect(lb?.civs).toEqual(["english", "house-of-lancaster"]);
    expect(lb?.unique).toBe(true);

    const sp = catalog.find((e) => e.path === "images/units/spearman.png");
    expect(sp?.civs).toBeUndefined();

    // Static resources + ages come before units (category order).
    const firstUnitIdx = catalog.findIndex((e) => e.category === "Unit");
    const resourceIdx = catalog.findIndex((e) => e.category === "Resource");
    expect(resourceIdx).toBeLessThan(firstUnitIdx);
  });
});

describe("buildCivData", () => {
  it("derives unique units, landmarks, and a tagline per civ", () => {
    const king = entity({ name: "King", civs: ["en"], unique: true, age: 1 });
    const longbow = entity({ name: "Longbowman", civs: ["en"], unique: true, age: 2 });
    const abbey = entity({
      type: "building",
      name: "Abbey of Kings",
      civs: ["en"],
      classes: ["landmark"],
      age: 1,
    });
    const english = buildCivData(
      groupByCiv([king, longbow]),
      groupByCiv([abbey]),
    ).find((c) => c.id === "english");

    expect(english?.uniqueUnits).toEqual(["King", "Longbowman"]);
    expect(english?.landmarks).toEqual(["Abbey of Kings"]);
    expect(english?.tagline).toBe("King • Longbowman • Abbey of Kings");
    expect(english?.code).toBe("en");
  });

  it("produces all 22 civs", () => {
    expect(buildCivData(new Map(), new Map())).toHaveLength(22);
  });
});

describe("buildPathMigration", () => {
  it("maps old kebab paths to new image paths by basename slug", () => {
    const catalog = [
      { path: "images/units/longbowman-4.png", name: "Longbowman", category: "Unit" as const },
    ];
    const out = buildPathMigration(catalog, ["unit-english/longbowman-4.webp"]);
    expect(out["unit-english/longbowman-4.webp"]).toBe("images/units/longbowman-4.png");
    // Static relocations are always present.
    expect(out["age/age-1.webp"]).toBe("ages/age_1.webp");
    expect(out["civilization-flag/english.webp"]).toBe("flags/english.png");
  });
});

describe("emitters", () => {
  it("emit valid generated-file headers and content", () => {
    expect(emitIconsTs([{ path: "resources/food.png", name: "Food", category: "Resource" }])).toContain(
      "export const ICON_CATALOG",
    );
    expect(
      emitCivDataTs([
        { id: "english", name: "English", code: "en", flagPath: "flags/english.png", uniqueUnits: [], landmarks: [], tagline: "x" },
      ]),
    ).toContain("export const CIV_DATA");
    expect(emitMigrationTs({ "a/b.webp": "images/units/b.png" })).toContain("PATH_MIGRATION");
  });
});

describe("coverage audit helpers", () => {
  it("collectImgs extracts src + title/alt presence", () => {
    const imgs = collectImgs(
      '<img src="/a.webp"> text <img src="/b.webp" title="Sheep">',
    );
    expect(imgs).toEqual([
      { src: "/a.webp", hasTitle: false },
      { src: "/b.webp", hasTitle: true },
    ]);
  });

  it("findUnmappedImgs returns only srcs with no token and no title/alt", () => {
    const html = [
      '<img src="/assets/pictures/resource/rally.webp">', // maps to a token
      '<img src="/assets/pictures/unknown/mystery.webp">', // no token, no title -> gap
      '<img src="/assets/pictures/unknown/other.webp" alt="Other">', // alt fallback
    ].join("");
    expect(findUnmappedImgs(html)).toEqual(["/assets/pictures/unknown/mystery.webp"]);
  });
});
