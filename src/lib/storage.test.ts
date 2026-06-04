import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteBuildOrder,
  getAllBuildOrders,
  getBuildOrder,
  getBuildOrdersByCiv,
  parseStoredBuildOrder,
  saveBuildOrder,
  StorageQuotaError,
} from "@/lib/storage";
import type { BuildOrder } from "@/types/buildOrder";

const KEY_PREFIX = "aoe4bo:bo:";

/** A realistic build order exercising every field, with consistent (auto) villager counts. */
function realisticBuild(): BuildOrder {
  return {
    id: "build-1",
    name: "Fast Castle",
    civilization: "byzantines",
    matchup: "vs French",
    author: "Tester",
    source: "manual",
    description: "A {{resources/food.webp}} focused opener",
    createdAt: 1000,
    updatedAt: 1000,
    steps: [
      {
        id: "step-1",
        age: 1,
        villagerCount: 8,
        villagerCountManual: false,
        buildersUnknown: false,
        resources: { food: 6, wood: 2, gold: 0, stone: 0, builder: 0, oliveOil: 0 },
        timeSeconds: 0,
        prerequisite: "Start of game",
        notes: [
          { id: "n1", text: "Send all to {{resources/food.webp}}" },
          { id: "n2", text: "Scout the map" },
        ],
        tags: [{ id: "t1", unit: "Scout", location: "Scouting (Map)" }],
      },
      {
        id: "step-2",
        age: 2,
        villagerCount: 14,
        villagerCountManual: true,
        resources: { food: 6, wood: 4, gold: 2, stone: 0, builder: 0, oliveOil: 1 },
        timeSeconds: 320,
        notes: [],
      },
    ],
  };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("save/read round-trip", () => {
  it("round-trips a realistic build order losslessly (modulo updatedAt)", () => {
    const bo = realisticBuild();
    saveBuildOrder(bo);

    const read = getBuildOrder(bo.id);
    expect(read).not.toBeNull();
    // save() stamps updatedAt; everything else must survive the round-trip.
    expect(read).toEqual({ ...bo, updatedAt: read!.updatedAt });
    expect(read!.updatedAt).toBeGreaterThanOrEqual(bo.createdAt);
  });

  it("returns null for a missing build", () => {
    expect(getBuildOrder("nope")).toBeNull();
  });

  it("returns null and warns on corrupted JSON", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    window.localStorage.setItem(`${KEY_PREFIX}bad`, "{not json");
    expect(getBuildOrder("bad")).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});

describe("enumeration", () => {
  it("lists builds sorted by updatedAt desc and ignores foreign keys", () => {
    window.localStorage.setItem("unrelated", "x");
    // Write directly with controlled timestamps — saveBuildOrder stamps updatedAt.
    window.localStorage.setItem(
      `${KEY_PREFIX}a`,
      JSON.stringify({ ...realisticBuild(), id: "a", updatedAt: 1 }),
    );
    window.localStorage.setItem(
      `${KEY_PREFIX}b`,
      JSON.stringify({ ...realisticBuild(), id: "b", updatedAt: 2 }),
    );

    const all = getAllBuildOrders();
    expect(all.map((b) => b.id)).toEqual(["b", "a"]);
  });

  it("filters by civilization", () => {
    saveBuildOrder({ ...realisticBuild(), id: "a", civilization: "french" });
    saveBuildOrder({ ...realisticBuild(), id: "b", civilization: "byzantines" });
    expect(getBuildOrdersByCiv("french").map((b) => b.id)).toEqual(["a"]);
  });

  it("deletes a build", () => {
    saveBuildOrder({ ...realisticBuild(), id: "a" });
    deleteBuildOrder("a");
    expect(getBuildOrder("a")).toBeNull();
  });
});

describe("migration", () => {
  const base = (steps: unknown[]) => ({
    id: "m",
    name: "Legacy",
    civilization: "english",
    createdAt: 1,
    updatedAt: 1,
    steps,
  });

  function readMigrated(raw: unknown) {
    window.localStorage.setItem(`${KEY_PREFIX}m`, JSON.stringify(raw));
    return getBuildOrder("m");
  }

  it("converts legacy string[] notes into { id, text }[]", () => {
    const bo = readMigrated(
      base([
        {
          id: "s",
          age: 1,
          villagerCount: 0,
          villagerCountManual: false,
          resources: { food: 0, wood: 0, gold: 0, stone: 0, builder: 0 },
          notes: ["first", "second"],
        },
      ]),
    );
    expect(bo!.steps[0].notes).toHaveLength(2);
    expect(bo!.steps[0].notes[0].text).toBe("first");
    expect(bo!.steps[0].notes[0].id).toMatch(/[0-9a-f-]{36}/);
  });

  it("rewrites @path@ token syntax into {{path}}", () => {
    const bo = readMigrated(
      base([
        {
          id: "s",
          age: 1,
          villagerCount: 0,
          villagerCountManual: false,
          resources: { food: 0, wood: 0, gold: 0, stone: 0, builder: 0 },
          notes: [{ id: "n", text: "go @resources/food.webp@ now" }],
        },
      ]),
    );
    expect(bo!.steps[0].notes[0].text).toBe("go {{resources/food.webp}} now");
  });

  it("infers villagerCountManual=true when a legacy count diverges from the sum", () => {
    const bo = readMigrated(
      base([
        {
          id: "s",
          age: 1,
          villagerCount: 99, // diverges from sum (6)
          resources: { food: 6, wood: 0, gold: 0, stone: 0, builder: 0 },
          notes: [],
        },
      ]),
    );
    expect(bo!.steps[0].villagerCountManual).toBe(true);
    expect(bo!.steps[0].villagerCount).toBe(99); // preserved
  });

  it("recomputes villagerCount in auto mode when it disagrees with the sum", () => {
    const bo = readMigrated(
      base([
        {
          id: "s",
          age: 1,
          villagerCount: 3, // wrong; auto mode must recompute to 10
          villagerCountManual: false,
          resources: { food: 6, wood: 4, gold: 0, stone: 0, builder: 0 },
          notes: [],
        },
      ]),
    );
    expect(bo!.steps[0].villagerCount).toBe(10);
    expect(bo!.steps[0].villagerCountManual).toBe(false);
  });

  it("persists the migrated shape back to storage", () => {
    window.localStorage.setItem(
      `${KEY_PREFIX}m`,
      JSON.stringify(
        base([
          {
            id: "s",
            age: 1,
            villagerCount: 0,
            villagerCountManual: false,
            resources: { food: 0, wood: 0, gold: 0, stone: 0, builder: 0 },
            notes: ["legacy"],
          },
        ]),
      ),
    );
    getBuildOrder("m"); // triggers migrate + rewrite
    const reread = JSON.parse(window.localStorage.getItem(`${KEY_PREFIX}m`)!);
    expect(typeof reread.steps[0].notes[0]).toBe("object");
    expect(reread.steps[0].notes[0].text).toBe("legacy");
  });
});

describe("parseStoredBuildOrder", () => {
  it("rejects non-conforming data", () => {
    expect(parseStoredBuildOrder({ not: "a build" })).toBeNull();
    expect(parseStoredBuildOrder(null)).toBeNull();
    expect(parseStoredBuildOrder([])).toBeNull();
  });
});

describe("private-mode / quota tolerance", () => {
  it("throws StorageQuotaError on a quota failure during save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const err = new Error("The quota has been exceeded.");
      err.name = "QuotaExceededError";
      throw err;
    });
    expect(() => saveBuildOrder(realisticBuild())).toThrow(StorageQuotaError);
  });

  it("rethrows non-quota errors during save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("some other failure");
    });
    expect(() => saveBuildOrder(realisticBuild())).toThrow(/some other failure/);
  });

  it("does not throw when delete fails", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => deleteBuildOrder("a")).not.toThrow();
  });
});
