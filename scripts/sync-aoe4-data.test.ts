import { describe, expect, it } from "vitest";

import {
  type Aoe4GuidesEntity,
  type SourcedEntity,
  type SourceFile,
  buildCivData,
  buildIconCatalog,
  civsForExtraResource,
  deriveUnique,
  emitCivDataTs,
  emitIconsTs,
  imgSrcToPath,
  mapCivCodes,
  normalizeAge,
  slugify,
  stripAge,
} from "./sync-aoe4-data";
import { collectImgs, findUnmappedImgs } from "./check-aoe4guides-coverage";

function entity(over: Partial<Aoe4GuidesEntity>): Aoe4GuidesEntity {
  return {
    title: "Thing",
    age: 1,
    imgSrc: "/assets/pictures/unit_cavalry/thing.webp",
    civ: ["ENG"],
    class: "military",
    type: "unit",
    ...over,
  };
}
const sourced = (e: Aoe4GuidesEntity, source: SourceFile = "unitMilitary"): SourcedEntity => ({
  entity: e,
  source,
});

const ALL_CODES = [
  "ABB", "AYY", "BYZ", "CHI", "DEL", "DRA", "ENG", "FRE", "GOH", "HOL", "HRE", "JAP",
  "JDA", "JIN", "KTE", "MAC", "MAL", "MON", "OTT", "RUS", "SEN", "TUG", "ZXL",
];

describe("slug helpers", () => {
  it("slugify strips non-alphanumerics and lowercases", () => {
    expect(slugify("Royal Knight-2")).toBe("royalknight2");
  });
  it("stripAge removes a trailing -<n>", () => {
    expect(stripAge("longbowman-4")).toBe("longbowman");
    expect(stripAge("granary")).toBe("granary");
  });
});

describe("normalizeAge", () => {
  it("coerces numeric strings to 1-4 and rejects out-of-range / missing", () => {
    expect(normalizeAge("2")).toBe(2);
    expect(normalizeAge(4)).toBe(4);
    expect(normalizeAge(0)).toBeUndefined();
    expect(normalizeAge(5)).toBeUndefined();
    expect(normalizeAge(undefined)).toBeUndefined();
  });
});

describe("imgSrcToPath", () => {
  it("rewrites an aoe4guides imgSrc to an images/<category>/<file> path", () => {
    expect(imgSrcToPath("/assets/pictures/unit_cavalry/scout.webp")).toBe(
      "images/unit_cavalry/scout.webp",
    );
    expect(imgSrcToPath("https://aoe4guides.com/assets/pictures/age/age_1.webp")).toBe(
      "images/age/age_1.webp",
    );
    expect(imgSrcToPath("")).toBeNull();
    expect(imgSrcToPath("/other/x.webp")).toBeNull();
  });
});

describe("mapCivCodes", () => {
  it("maps 3-letter codes to ids, dedups, and drops unknowns", () => {
    expect(mapCivCodes(["ENG", "HOL", "ZZ"])).toEqual(["english", "house-of-lancaster"]);
    expect(mapCivCodes(["eng", "ENG"])).toEqual(["english"]);
  });
});

describe("deriveUnique", () => {
  it("forces heroes / landmarks / abilities unique and eco units non-unique", () => {
    expect(deriveUnique(entity({}), "unitHero")).toBe(true);
    expect(deriveUnique(entity({}), "landmarks")).toBe(true);
    expect(deriveUnique(entity({}), "abilityHero")).toBe(true);
    expect(deriveUnique(entity({ civ: ["DEL"] }), "unitEco")).toBe(false);
  });
  it("treats single-base-civ items as unique (variants collapse onto parents)", () => {
    expect(deriveUnique(entity({ civ: ["ENG", "HOL"] }), "unitMilitary")).toBe(true);
    expect(deriveUnique(entity({ civ: ["ENG", "HRE"] }), "unitMilitary")).toBe(false);
    expect(deriveUnique(entity({ civ: ["JIN"] }), "unitMilitary")).toBe(true);
  });
});

describe("civsForExtraResource", () => {
  it("derives civ restrictions from EXTRA_RESOURCES_BY_CIV", () => {
    expect(civsForExtraResource("oliveOil")).toEqual(["ayyubids", "byzantines"]);
    expect(civsForExtraResource("silver")).toEqual(["macedonian"]);
    expect(civsForExtraResource("nope")).toBeUndefined();
  });
});

describe("buildIconCatalog", () => {
  it("dedups by icon path, collapses all-civ restrictions, and sorts by category", () => {
    const longbow = entity({
      title: "Longbowman",
      imgSrc: "/assets/pictures/unit_ranged/longbowman.webp",
      civ: ["ENG", "HOL"],
      age: 2,
    });
    // Same icon path, listed again -> merges into one entry.
    const longbow2 = entity({ ...longbow, civ: ["ENG"] });
    // A spearman shared by every civ -> restriction collapses to undefined.
    const spear = entity({
      title: "Spearman",
      imgSrc: "/assets/pictures/unit_infantry/spearman.webp",
      civ: ALL_CODES,
    });

    const catalog = buildIconCatalog([sourced(longbow), sourced(longbow2), sourced(spear)]);

    const lb = catalog.find((e) => e.path === "images/unit_ranged/longbowman.webp");
    expect(lb?.civs).toEqual(["english", "house-of-lancaster"]);
    expect(lb?.unique).toBe(true);

    const sp = catalog.find((e) => e.path === "images/unit_infantry/spearman.webp");
    expect(sp?.civs).toBeUndefined();

    // Static resources + ages come before units (category order).
    const firstUnitIdx = catalog.findIndex((e) => e.category === "Unit");
    const resourceIdx = catalog.findIndex((e) => e.category === "Resource");
    expect(resourceIdx).toBeLessThan(firstUnitIdx);
  });
});

describe("buildCivData", () => {
  it("derives unique units, landmarks, and a tagline per civ", () => {
    const longbow = sourced(entity({ title: "Longbowman", civ: ["ENG"], age: 2 }), "unitMilitary");
    const king = sourced(entity({ title: "King", civ: ["ENG"], age: 1 }), "unitMilitary");
    const abbey = sourced(
      entity({ title: "Abbey of Kings", civ: ["ENG"], type: "building", class: "landmark", age: 1 }),
      "landmarks",
    );
    // Villagers are economic — must NOT count as unique units.
    const villager = sourced(entity({ title: "Villager", civ: ["ENG"], age: 1 }), "unitEco");

    const english = buildCivData([longbow, king, abbey, villager]).find((c) => c.id === "english");

    expect(english?.uniqueUnits).toEqual(["King", "Longbowman"]);
    expect(english?.landmarks).toEqual(["Abbey of Kings"]);
    expect(english?.tagline).toBe("King • Longbowman • Abbey of Kings");
  });

  it("produces all 23 civs including Jin Dynasty as a Chinese variant", () => {
    const civs = buildCivData([]);
    expect(civs).toHaveLength(23);
    const jin = civs.find((c) => c.id === "jin");
    expect(jin?.name).toBe("Jin Dynasty");
    expect(jin?.variantOf).toBe("chinese");
    expect(jin?.flagPath).toBe("flags/jin.webp");
  });
});

describe("emitters", () => {
  it("emit valid generated-file headers and content", () => {
    expect(emitIconsTs([{ path: "resources/food.webp", name: "Food", category: "Resource" }])).toContain(
      "export const ICON_CATALOG",
    );
    const civTs = emitCivDataTs([
      { id: "english", name: "English", flagPath: "flags/english.webp", uniqueUnits: [], landmarks: [], tagline: "x" },
    ]);
    expect(civTs).toContain("export const CIV_DATA");
    expect(civTs).not.toContain("code:");
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
