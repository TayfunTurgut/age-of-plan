import { describe, expect, it } from "vitest";

import { toRtsOverlayPayload } from "@/lib/exportBuildOrder";
import { parseStoredBuildOrder } from "@/lib/storage";
import type { BuildOrder } from "@/types/buildOrder";

function build(): BuildOrder {
  return {
    id: "b1",
    name: "Olive Opener",
    civilization: "byzantines",
    author: "Me",
    source: "",
    description: "",
    matchup: "",
    createdAt: 100,
    updatedAt: 100,
    steps: [
      {
        id: "s1",
        age: 1,
        villagerCount: 8,
        villagerCountManual: false,
        resources: { food: 6, wood: 2, gold: 0, stone: 0, builder: 0, oliveOil: 0 },
        timeSeconds: 65,
        notes: [{ id: "n1", text: "Send to {{resources/food.webp}}" }],
      },
    ],
  };
}

describe("toRtsOverlayPayload", () => {
  it("maps civ id to the canonical display name", () => {
    expect(toRtsOverlayPayload(build()).civilization).toBe("Byzantines");
  });

  it("formats time as m:ss and converts {{tokens}} to @tokens@", () => {
    const payload = toRtsOverlayPayload(build());
    expect(payload.build_order[0].time).toBe("1:05");
    expect(payload.build_order[0].notes[0]).toBe("Send to @resources/food.webp@");
    expect(payload.build_order[0].villager_count).toBe(8);
    expect(payload.build_order[0].resources.food).toBe(6);
  });
});

describe("native JSON round-trip", () => {
  it("survives serialize → storage parse unchanged", () => {
    const bo = build();
    const parsed = parseStoredBuildOrder(JSON.parse(JSON.stringify(bo)));
    expect(parsed).not.toBeNull();
    expect(parsed!.value).toEqual(bo);
    expect(parsed!.mutated).toBe(false);
  });
});
