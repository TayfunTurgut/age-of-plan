import { describe, expect, it } from "vitest";
import type { BuildStep, Resources } from "@/types/buildOrder";
import {
  computeVillagerCount,
  createEmptyBuildOrder,
  createEmptyStep,
} from "./buildOrder";

const r = (overrides: Partial<Resources> = {}): Resources => ({
  food: 0,
  wood: 0,
  gold: 0,
  stone: 0,
  builder: 0,
  ...overrides,
});

describe("computeVillagerCount", () => {
  it("sums the core four resources plus builder", () => {
    expect(computeVillagerCount(r({ food: 2, wood: 3, gold: 1, stone: 0, builder: 1 }))).toBe(7);
  });

  it("adds oliveOil when present (Byzantines / Ayyubids)", () => {
    expect(computeVillagerCount(r({ food: 5, oliveOil: 3 }))).toBe(8);
  });

  it("adds silver when present (Macedonians)", () => {
    expect(computeVillagerCount(r({ wood: 4, silver: 2 }))).toBe(6);
  });

  it("treats missing fifth-resource fields as zero", () => {
    expect(computeVillagerCount(r({ food: 1 }))).toBe(1);
  });

  it("returns zero for an empty resource breakdown", () => {
    expect(computeVillagerCount(r())).toBe(0);
  });
});

describe("createEmptyStep", () => {
  it("starts in age 1 with zero villagers and auto-mode when no previous step", () => {
    const step = createEmptyStep();
    expect(step.age).toBe(1);
    expect(step.villagerCount).toBe(0);
    expect(step.villagerCountManual).toBe(false);
    expect(step.notes).toEqual([]);
    expect(step.resources).toEqual(r());
    expect(step.timeSeconds).toBeUndefined();
  });

  it("inherits age and villagerCount from the previous step", () => {
    const prev: BuildStep = {
      id: "prev",
      age: 3,
      villagerCount: 42,
      villagerCountManual: true,
      resources: r({ food: 20, wood: 10 }),
      notes: [],
    };
    const step = createEmptyStep(prev);
    expect(step.age).toBe(3);
    expect(step.villagerCount).toBe(42);
    // But the new step is in auto mode regardless of the previous step's mode.
    expect(step.villagerCountManual).toBe(false);
  });

  it("generates a fresh UUID per call", () => {
    const a = createEmptyStep();
    const b = createEmptyStep();
    expect(a.id).not.toBe(b.id);
  });
});

describe("createEmptyBuildOrder", () => {
  it("records the requested civilization and sets timestamps", () => {
    const before = Date.now();
    const bo = createEmptyBuildOrder("english");
    expect(bo.civilization).toBe("english");
    expect(bo.name).toBe("Untitled build");
    expect(bo.steps).toEqual([]);
    expect(bo.createdAt).toBeGreaterThanOrEqual(before);
    expect(bo.updatedAt).toBe(bo.createdAt);
  });
});
