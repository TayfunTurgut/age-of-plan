import type { BuildOrder, BuildStep, Resources } from "@/types/buildOrder";

const emptyResources = (): Resources => ({
  food: 0,
  wood: 0,
  gold: 0,
  stone: 0,
  builder: 0,
});

/** Sum of all resource assignments — the source of truth for villager counts. */
export function computeVillagerCount(r: Resources): number {
  return (
    r.food +
    r.wood +
    r.gold +
    r.stone +
    r.builder +
    (r.oliveOil ?? 0) +
    (r.silver ?? 0)
  );
}

/**
 * Decide whether an imported step's villager count is a manual override or
 * should be recomputed from the resource sum. A positive imported count that
 * doesn't match the sum signals the source author tracked villagers separately
 * (common for aoe4guides builds). Shared by both importers so the rule stays
 * in sync.
 */
export function inferVillagerCountFields(
  resources: Resources,
  importedCount: number,
): { villagerCount: number; villagerCountManual: boolean } {
  const computed = computeVillagerCount(resources);
  const manual = importedCount > 0 && importedCount !== computed;
  return {
    villagerCount: manual ? importedCount : computed,
    villagerCountManual: manual,
  };
}

/** A fresh step, inheriting age/villager/builders context from the previous one. */
export function createEmptyStep(previousStep?: BuildStep): BuildStep {
  return {
    id: crypto.randomUUID(),
    age: previousStep?.age ?? 1,
    villagerCount: previousStep?.villagerCount ?? 0,
    villagerCountManual: false,
    buildersUnknown: previousStep?.buildersUnknown,
    resources: emptyResources(),
    timeSeconds: undefined,
    notes: [],
  };
}

/** Deep-clone a step with fresh ids for the step, its notes, and its tags. */
export function cloneStep(step: BuildStep): BuildStep {
  return {
    ...step,
    id: crypto.randomUUID(),
    resources: { ...step.resources },
    notes: step.notes.map((n) => ({ id: crypto.randomUUID(), text: n.text })),
    tags: step.tags?.map((t) => ({
      id: crypto.randomUUID(),
      unit: t.unit,
      location: t.location,
    })),
  };
}

/** A new, empty build order for the given civ. */
export function createEmptyBuildOrder(civId: string): BuildOrder {
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
}
