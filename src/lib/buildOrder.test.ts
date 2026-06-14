import { describe, expect, it } from "vitest";

import {
  cloneStep,
  computeVillagerCount,
  createEmptyBuildOrder,
  createEmptyStep,
  inferVillagerCountFields,
} from "@/lib/buildOrder";
import type { Resources } from "@/types/buildOrder";

const resources = (over: Partial<Resources> = {}): Resources => ({
  food: 0,
  wood: 0,
  gold: 0,
  stone: 0,
  builder: 0,
  ...over,
});

describe("computeVillagerCount", () => {
  it("sums the standard four plus builders", () => {
    expect(computeVillagerCount(resources({ food: 6, wood: 4, builder: 2 }))).toBe(12);
  });

  it("includes 5th resources when present", () => {
    expect(computeVillagerCount(resources({ food: 3, oliveOil: 2, silver: 1 }))).toBe(6);
  });
});

describe("inferVillagerCountFields", () => {
  it("recomputes when the imported count matches the sum", () => {
    const r = resources({ food: 5, wood: 5 });
    expect(inferVillagerCountFields(r, 10)).toEqual({
      villagerCount: 10,
      villagerCountManual: false,
    });
  });

  it("treats a non-matching positive count as a manual override", () => {
    const r = resources({ food: 5, wood: 5 });
    expect(inferVillagerCountFields(r, 12)).toEqual({
      villagerCount: 12,
      villagerCountManual: true,
    });
  });

  it("recomputes when the imported count is zero", () => {
    const r = resources({ food: 5 });
    expect(inferVillagerCountFields(r, 0)).toEqual({
      villagerCount: 5,
      villagerCountManual: false,
    });
  });
});

describe("createEmptyStep", () => {
  it("starts in age 1 with empty resources and notes", () => {
    const step = createEmptyStep();
    expect(step.age).toBe(1);
    expect(step.villagerCount).toBe(0);
    expect(step.notes).toEqual([]);
    expect(computeVillagerCount(step.resources)).toBe(0);
    expect(step.id).toMatch(/[0-9a-f-]{36}/);
  });

  it("inherits age, villager count, and buildersUnknown from the previous step", () => {
    const prev = { ...createEmptyStep(), age: 3 as const, villagerCount: 20, buildersUnknown: true };
    const step = createEmptyStep(prev);
    expect(step.age).toBe(3);
    expect(step.villagerCount).toBe(20);
    expect(step.buildersUnknown).toBe(true);
  });
});

describe("cloneStep", () => {
  it("copies values but assigns fresh ids to step, notes, and tags", () => {
    const original = {
      ...createEmptyStep(),
      notes: [{ id: "n1", text: "hello" }],
      tags: [{ id: "t1", unit: "Scout", location: "Map" }],
    };
    const clone = cloneStep(original);

    expect(clone.id).not.toBe(original.id);
    expect(clone.notes[0].text).toBe("hello");
    expect(clone.notes[0].id).not.toBe("n1");
    expect(clone.tags?.[0].unit).toBe("Scout");
    expect(clone.tags?.[0].id).not.toBe("t1");
    // Mutating the clone must not affect the original.
    clone.resources.food = 5;
    expect(original.resources.food).toBe(0);
  });
});

describe("createEmptyBuildOrder", () => {
  it("creates a named build for the civ with matching timestamps", () => {
    const bo = createEmptyBuildOrder("french");
    expect(bo.civilization).toBe("french");
    expect(bo.name).toBe("Untitled build");
    expect(bo.steps).toEqual([]);
    expect(bo.createdAt).toBe(bo.updatedAt);
  });
});
