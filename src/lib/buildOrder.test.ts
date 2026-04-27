import { describe, expect, it } from "vitest";
import type { BuildStep, Resources } from "@/types/buildOrder";
import {
  cloneStep,
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

describe("cloneStep", () => {
  const source: BuildStep = {
    id: "source-id",
    age: 2,
    villagerCount: 15,
    villagerCountManual: true,
    resources: r({ food: 6, wood: 5, gold: 3, builder: 1 }),
    timeSeconds: 180,
    notes: [
      { id: "n1", text: "scout map" },
      { id: "n2", text: "place TC" },
    ],
    tags: [
      { id: "t1", unit: "Scout", location: "enemy base" },
      { id: "t2", unit: "Villager", location: "gold" },
    ],
  };

  it("copies scalar fields verbatim", () => {
    const clone = cloneStep(source);
    expect(clone.age).toBe(source.age);
    expect(clone.villagerCount).toBe(source.villagerCount);
    expect(clone.villagerCountManual).toBe(source.villagerCountManual);
    expect(clone.timeSeconds).toBe(source.timeSeconds);
  });

  it("produces a fresh id that differs from the source", () => {
    const clone = cloneStep(source);
    expect(clone.id).not.toBe(source.id);
    expect(typeof clone.id).toBe("string");
  });

  it("produces a new resources object with equal values", () => {
    const clone = cloneStep(source);
    expect(clone.resources).not.toBe(source.resources);
    expect(clone.resources).toEqual(source.resources);
  });

  it("gives each note a fresh id but preserves text", () => {
    const clone = cloneStep(source);
    expect(clone.notes).toHaveLength(source.notes.length);
    clone.notes.forEach((note, i) => {
      expect(note.id).not.toBe(source.notes[i].id);
      expect(note.text).toBe(source.notes[i].text);
    });
  });

  it("gives each tag a fresh id but preserves unit and location", () => {
    const clone = cloneStep(source);
    expect(clone.tags).toHaveLength(source.tags!.length);
    clone.tags!.forEach((tag, i) => {
      expect(tag.id).not.toBe(source.tags![i].id);
      expect(tag.unit).toBe(source.tags![i].unit);
      expect(tag.location).toBe(source.tags![i].location);
    });
  });

  it("leaves tags undefined when the source has no tags", () => {
    const { tags: _tags, ...rest } = source;
    const clone = cloneStep(rest);
    expect(clone.tags).toBeUndefined();
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
