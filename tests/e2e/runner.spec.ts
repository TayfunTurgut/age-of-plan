import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";

function build(id: string) {
  const step = (sid: string, note: string, timeSeconds: number) => ({
    id: sid,
    age: 1 as const,
    villagerCount: 6,
    villagerCountManual: false,
    resources: { food: 6, wood: 0, gold: 0, stone: 0, builder: 0 },
    timeSeconds,
    notes: [{ id: `${sid}-n`, text: note }],
  });
  return {
    id,
    name: "Runner Build",
    civilization: "french",
    author: "",
    source: "",
    description: "",
    matchup: "",
    createdAt: 1,
    updatedAt: 1,
    steps: [
      step("s1", "Scout the map", 0),
      step("s2", "Build houses", 60),
      step("s3", "Age up now", 180),
    ],
  };
}

async function seed(page: Page, payload: object) {
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key as string, value as string),
    [`aoe4bo:bo:${(payload as { id: string }).id}`, JSON.stringify(payload)],
  );
}

test("runner shows the first step and advances with the keyboard", async ({ page }) => {
  await seed(page, build("run-1"));
  await page.goto("/build/run-1/run");

  await expect(page.getByText("Scout the map")).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Build houses")).toBeVisible();

  await page.keyboard.press("d");
  await expect(page.getByText("Age up now")).toBeVisible();

  // Clamps at the last step.
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Age up now")).toBeVisible();

  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("Build houses")).toBeVisible();
});

test("R resets to the first step", async ({ page }) => {
  await seed(page, build("run-2"));
  await page.goto("/build/run-2/run");

  // Wait for the build to load (the keydown listener attaches only once bo is set).
  await expect(page.getByText("Scout the map")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Age up now")).toBeVisible();

  await page.keyboard.press("r");
  await expect(page.getByText("Scout the map")).toBeVisible();
});

test("clicking the step advances in manual mode", async ({ page }) => {
  await seed(page, build("run-3"));
  await page.goto("/build/run-3/run");

  await page.getByText("Scout the map").click();
  await expect(page.getByText("Build houses")).toBeVisible();
});

test("runner renders standalone with no app nav chrome", async ({ page }) => {
  await seed(page, build("run-4"));
  await page.goto("/build/run-4/run");

  // The shared NavBar brand link should not be present in the overlay.
  await expect(page.getByRole("link", { name: "Age of Plan" })).toHaveCount(0);
});

test("runner has no critical or serious accessibility violations", async ({ page }) => {
  await seed(page, build("run-5"));
  await page.goto("/build/run-5/run");
  await expect(page.getByText("Scout the map")).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(
    blocking,
    blocking.map((v) => `${v.id}: ${v.help}`).join("\n"),
  ).toEqual([]);
});
