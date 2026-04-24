import type { BuildOrder, BuildStep, Resources } from "@/types/buildOrder";

const emptyResources = (): Resources => ({
  food: 0,
  wood: 0,
  gold: 0,
  stone: 0,
  builder: 0,
});

export const createEmptyStep = (previousStep?: BuildStep): BuildStep => ({
  id: crypto.randomUUID(),
  age: previousStep?.age ?? 1,
  villagerCount: previousStep?.villagerCount ?? 0,
  populationCount: undefined,
  resources: emptyResources(),
  timeSeconds: undefined,
  notes: [],
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
