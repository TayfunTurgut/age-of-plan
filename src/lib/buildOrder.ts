import type { BuildOrder, BuildStep, Resources } from "@/types/buildOrder";

const emptyResources = (): Resources => ({
  food: 0,
  wood: 0,
  gold: 0,
  stone: 0,
  builder: 0,
});

/** Sum of all resource assignments — the source of truth for villager counts. */
export const computeVillagerCount = (r: Resources): number =>
  r.food + r.wood + r.gold + r.stone + r.builder + (r.oliveOil ?? 0) + (r.silver ?? 0);

export const createEmptyStep = (previousStep?: BuildStep): BuildStep => ({
  id: crypto.randomUUID(),
  age: previousStep?.age ?? 1,
  villagerCount: previousStep?.villagerCount ?? 0,
  villagerCountManual: false,
  populationCount: undefined,
  resources: emptyResources(),
  timeSeconds: undefined,
  notes: [],
});

export const cloneStep = (step: BuildStep): BuildStep => ({
  ...step,
  id: crypto.randomUUID(),
  resources: { ...step.resources },
  notes: step.notes.map((n) => ({ id: crypto.randomUUID(), text: n.text })),
  tags: step.tags?.map((t) => ({
    id: crypto.randomUUID(),
    unit: t.unit,
    location: t.location,
  })),
});

export const createEmptyBuildOrder = (civId: string): BuildOrder => {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: "Untitled build",
    civilization: civId,
    matchup: "",
    author: "",
    description: "",
    createdAt: now,
    updatedAt: now,
    steps: [],
  };
};
