import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";

function buildWithStep(id: string) {
  return {
    id,
    name: "Editable Build",
    civilization: "french",
    author: "",
    source: "",
    description: "",
    matchup: "",
    createdAt: 1,
    updatedAt: 1,
    steps: [
      {
        id: "step-1",
        age: 1,
        villagerCount: 0,
        villagerCountManual: false,
        resources: { food: 0, wood: 0, gold: 0, stone: 0, builder: 0 },
        notes: [],
      },
    ],
  };
}

function emptyBuild(id: string) {
  return { ...buildWithStep(id), steps: [] };
}

async function seed(page: Page, payload: object) {
  // Set-if-absent: addInitScript runs on every navigation (including reload),
  // so an unconditional set would clobber autosaved edits after a reload.
  await page.addInitScript(
    ([key, value]) => {
      if (!localStorage.getItem(key as string)) {
        localStorage.setItem(key as string, value as string);
      }
    },
    [`aoe4bo:bo:${(payload as { id: string }).id}`, JSON.stringify(payload)],
  );
}

test("editing a step recomputes villagers and persists across reload", async ({ page }) => {
  await seed(page, buildWithStep("edit-1"));
  await page.goto("/build/edit-1/edit");

  // Auto villager count starts at 0.
  await expect(page.getByLabel("Villager count (auto)")).toHaveText("0");

  // Set food to 6 — villager count auto-recomputes.
  await page.getByRole("spinbutton", { name: "Food" }).fill("6");
  await expect(page.getByLabel("Villager count (auto)")).toHaveText("6");

  // Wait for the debounced autosave to land.
  await expect(page.getByText("Saved")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("spinbutton", { name: "Food" })).toHaveValue("6");
  await expect(page.getByLabel("Villager count (auto)")).toHaveText("6");
});

test("editing the build name persists across reload", async ({ page }) => {
  await seed(page, buildWithStep("edit-2"));
  await page.goto("/build/edit-2/edit");

  await page.getByRole("button", { name: "Build name" }).click();
  await page.getByRole("textbox", { name: "Build name" }).fill("Renamed Build");
  await page.getByRole("textbox", { name: "Build name" }).press("Enter");

  await expect(page.getByText("Saved")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Build name" })).toHaveText(
    "Renamed Build",
  );
});

test("add step appends a new step", async ({ page }) => {
  await seed(page, emptyBuild("edit-3"));
  await page.goto("/build/edit-3/edit");

  await expect(page.getByRole("spinbutton", { name: "Food" })).toHaveCount(0);
  await page.getByRole("button", { name: "+ Add step" }).click();
  await expect(page.getByRole("spinbutton", { name: "Food" })).toHaveCount(1);
});

test("editor has no critical or serious accessibility violations", async ({ page }) => {
  await seed(page, buildWithStep("edit-4"));
  await page.goto("/build/edit-4/edit");
  await expect(page.getByRole("spinbutton", { name: "Food" })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(
    blocking,
    blocking.map((v) => `${v.id}: ${v.help}`).join("\n"),
  ).toEqual([]);
});
