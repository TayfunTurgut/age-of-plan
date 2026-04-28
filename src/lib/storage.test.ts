import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BuildOrder } from "@/types/buildOrder";
import {
  deleteBuildOrder,
  getAllBuildOrders,
  getBuildOrder,
  saveBuildOrder,
  StorageQuotaError,
} from "./storage";

const makeBo = (overrides: Partial<BuildOrder> = {}): BuildOrder => ({
  id: "bo-1",
  name: "Test",
  civilization: "english",
  createdAt: 1,
  updatedAt: 2,
  steps: [
    {
      id: "s1",
      age: 1,
      villagerCount: 5,
      villagerCountManual: false,
      resources: { food: 2, wood: 3, gold: 0, stone: 0, builder: 0 },
      notes: [],
    },
  ],
  ...overrides,
});

describe("storage round-trip", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves and reads back a build order", () => {
    const bo = makeBo();
    saveBuildOrder(bo);
    const readBack = getBuildOrder("bo-1");
    expect(readBack).not.toBeNull();
    expect(readBack?.name).toBe("Test");
    expect(readBack?.steps[0].villagerCount).toBe(5);
  });

  it("updates the updatedAt timestamp on save", () => {
    const before = Date.now();
    saveBuildOrder(makeBo({ updatedAt: 0 }));
    const read = getBuildOrder("bo-1");
    expect(read!.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it("deleteBuildOrder removes the entry", () => {
    saveBuildOrder(makeBo());
    deleteBuildOrder("bo-1");
    expect(getBuildOrder("bo-1")).toBeNull();
  });

  it("getAllBuildOrders enumerates and sorts by updatedAt desc", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(1000);
    saveBuildOrder(makeBo({ id: "a", name: "A" }));
    nowSpy.mockReturnValue(2000);
    saveBuildOrder(makeBo({ id: "b", name: "B" }));
    const all = getAllBuildOrders();
    expect(all.map((b) => b.id)).toEqual(["b", "a"]);
    nowSpy.mockRestore();
  });

  it("ignores non-namespaced keys in localStorage", () => {
    window.localStorage.setItem("some-other-key", "foo");
    saveBuildOrder(makeBo());
    expect(getAllBuildOrders()).toHaveLength(1);
  });
});

describe("storage migration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("migrates legacy string notes into { id, text } objects without mutating source", () => {
    const legacy = {
      id: "bo-legacy",
      name: "Legacy",
      civilization: "english",
      createdAt: 1,
      updatedAt: 2,
      steps: [
        {
          id: "s1",
          age: 1,
          villagerCount: 0,
          resources: { food: 0, wood: 0, gold: 0, stone: 0, builder: 0 },
          notes: ["Scout sheep", "Chop wood"],
        },
      ],
    };
    window.localStorage.setItem("aoe4bo:bo:bo-legacy", JSON.stringify(legacy));

    const bo = getBuildOrder("bo-legacy");
    expect(bo).not.toBeNull();
    const notes = bo!.steps[0].notes;
    expect(notes).toHaveLength(2);
    expect(notes[0]).toMatchObject({ text: "Scout sheep" });
    expect(notes[0].id).toMatch(/.+/);
    expect(notes[1]).toMatchObject({ text: "Chop wood" });

    // Source object in memory is untouched (we're checking the original array).
    expect(legacy.steps[0].notes).toEqual(["Scout sheep", "Chop wood"]);

    // And the migrated shape was persisted.
    const raw = window.localStorage.getItem("aoe4bo:bo:bo-legacy")!;
    const reparsed = JSON.parse(raw);
    expect(typeof reparsed.steps[0].notes[0]).toBe("object");
  });

  it("defaults missing villagerCountManual to false", () => {
    const legacy = {
      id: "bo-v",
      name: "v",
      civilization: "english",
      createdAt: 1,
      updatedAt: 2,
      steps: [
        {
          id: "s1",
          age: 1,
          villagerCount: 5,
          resources: { food: 2, wood: 3, gold: 0, stone: 0, builder: 0 },
          notes: [],
        },
      ],
    };
    window.localStorage.setItem("aoe4bo:bo:bo-v", JSON.stringify(legacy));
    const bo = getBuildOrder("bo-v");
    expect(bo!.steps[0].villagerCountManual).toBe(false);
  });

  it("recomputes villagerCount in auto mode when it drifted from the resource sum", () => {
    const stored = {
      id: "bo-auto",
      name: "auto",
      civilization: "english",
      createdAt: 1,
      updatedAt: 2,
      steps: [
        {
          id: "s1",
          age: 1,
          villagerCount: 99, // drifted
          villagerCountManual: false,
          resources: { food: 2, wood: 3, gold: 0, stone: 0, builder: 0 },
          notes: [],
        },
      ],
    };
    window.localStorage.setItem("aoe4bo:bo:bo-auto", JSON.stringify(stored));
    const bo = getBuildOrder("bo-auto");
    expect(bo!.steps[0].villagerCount).toBe(5);
  });

  it("rewrites @path.ext@ to {{path.ext}} and re-points old paths at the new aoe4world layout", () => {
    const legacy = {
      id: "bo-tok",
      name: "Tok",
      civilization: "english",
      createdAt: 1,
      updatedAt: 2,
      steps: [
        {
          id: "s1",
          age: 1,
          villagerCount: 0,
          villagerCountManual: false,
          resources: { food: 0, wood: 0, gold: 0, stone: 0, builder: 0 },
          notes: [
            { id: "n1", text: "build @unit-french/royal-knight-2.webp@" },
            { id: "n2", text: "no token here" },
            { id: "n3", text: "@bad path.png@ stays put" },
            { id: "n4", text: "already-migrated {{images/units/longbowman-2.png}}" },
          ],
        },
      ],
    };
    window.localStorage.setItem("aoe4bo:bo:bo-tok", JSON.stringify(legacy));
    const bo = getBuildOrder("bo-tok");
    expect(bo!.steps[0].notes.map((n) => n.text)).toEqual([
      // @-form was rewritten to {{...}}, then the path was rewritten to the new layout.
      "build {{images/units/royal-knight-2.png}}",
      "no token here",
      "@bad path.png@ stays put",
      "already-migrated {{images/units/longbowman-2.png}}",
    ]);
    const raw = window.localStorage.getItem("aoe4bo:bo:bo-tok")!;
    expect(raw).toContain("{{images/units/royal-knight-2.png}}");
  });

  it("infers villagerCountManual=true when a legacy build's count diverges from resources and the flag is missing", () => {
    // Pre-`villagerCountManual` schema. Without this inference, the
    // migration would default the flag to false and the auto-recompute
    // would silently overwrite the hand-tuned 12 with the resource sum (5).
    const legacy = {
      id: "bo-legacy-manual",
      name: "Legacy manual",
      civilization: "english",
      createdAt: 1,
      updatedAt: 2,
      steps: [
        {
          id: "s1",
          age: 1,
          villagerCount: 12,
          resources: { food: 2, wood: 3, gold: 0, stone: 0, builder: 0 },
          notes: [],
        },
      ],
    };
    window.localStorage.setItem("aoe4bo:bo:bo-legacy-manual", JSON.stringify(legacy));
    const bo = getBuildOrder("bo-legacy-manual");
    expect(bo!.steps[0].villagerCountManual).toBe(true);
    expect(bo!.steps[0].villagerCount).toBe(12);
  });

  it("preserves manual villagerCount values that diverge from the resource sum", () => {
    const stored = {
      id: "bo-manual",
      name: "manual",
      civilization: "english",
      createdAt: 1,
      updatedAt: 2,
      steps: [
        {
          id: "s1",
          age: 1,
          villagerCount: 12,
          villagerCountManual: true,
          resources: { food: 2, wood: 3, gold: 0, stone: 0, builder: 0 },
          notes: [],
        },
      ],
    };
    window.localStorage.setItem("aoe4bo:bo:bo-manual", JSON.stringify(stored));
    const bo = getBuildOrder("bo-manual");
    expect(bo!.steps[0].villagerCount).toBe(12);
  });
});

describe("storage error surfacing", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null and warns on malformed JSON instead of crashing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    window.localStorage.setItem("aoe4bo:bo:bad", "not json at all {");
    expect(getBuildOrder("bad")).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("returns null and warns on structurally invalid build orders", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    window.localStorage.setItem(
      "aoe4bo:bo:shape",
      JSON.stringify({ id: "shape", not: "a build order" }),
    );
    expect(getBuildOrder("shape")).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("throws StorageQuotaError when localStorage rejects a write for quota reasons", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const err = new Error("setting value exceeded quota");
      err.name = "QuotaExceededError";
      throw err;
    });
    expect(() => saveBuildOrder(makeBo())).toThrow(StorageQuotaError);
  });

  it("re-throws unexpected storage errors (non-quota)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("something else went wrong");
    });
    expect(() => saveBuildOrder(makeBo())).toThrow(/something else/);
  });
});
