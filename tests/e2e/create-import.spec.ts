import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

const EDITOR_URL = /\/build\/[^/]+\/edit$/;

test("create flow: pick civ + name, then land on the editor", async ({ page }) => {
  await page.goto("/build/new");

  await page.getByLabel("Name").fill("My Fast Castle");
  await page.getByRole("combobox", { name: "Civilization" }).click();
  await page.getByRole("option", { name: "French" }).click();
  await page.getByRole("button", { name: "Create build order" }).click();

  await expect(page).toHaveURL(EDITOR_URL);
});

test("create flow preselects the civ from the query param", async ({ page }) => {
  await page.goto("/civ/french");
  await page.getByRole("link", { name: "New build order" }).click();
  await expect(page).toHaveURL(/\/build\/new\?civ=french$/);
  // Civ is preselected; just name it and create.
  await page.getByRole("button", { name: "Create build order" }).click();
  await expect(page).toHaveURL(EDITOR_URL);
});

test("import native JSON via paste lands on the editor", async ({ page }) => {
  await page.goto("/library");
  await page.getByRole("button", { name: "Import" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "From JSON" }).click();

  const native = {
    id: "native-1",
    name: "Imported Native",
    civilization: "french",
    author: "",
    source: "",
    description: "",
    matchup: "",
    createdAt: 1,
    updatedAt: 1,
    steps: [
      {
        id: "s1",
        age: 1,
        villagerCount: 6,
        villagerCountManual: false,
        resources: { food: 6, wood: 0, gold: 0, stone: 0, builder: 0 },
        notes: [],
      },
    ],
  };
  await dialog.getByLabel("Build order JSON").fill(JSON.stringify(native));
  await dialog.getByRole("button", { name: "Import" }).click();

  await expect(page).toHaveURL(EDITOR_URL);
});

test("import RTS_Overlay JSON via paste lands on the editor", async ({ page }) => {
  await page.goto("/library");
  await page.getByRole("button", { name: "Import" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "From JSON" }).click();

  const rts = {
    name: "Imported RTS",
    civilization: "Mongols",
    build_order: [
      { age: 1, villager_count: 6, resources: { food: 6 }, time: "0:30", notes: [] },
    ],
  };
  await dialog.getByLabel("Build order JSON").fill(JSON.stringify(rts));
  await dialog.getByRole("button", { name: "Import" }).click();

  await expect(page).toHaveURL(EDITOR_URL);
});

test("create page has no critical or serious accessibility violations", async ({ page }) => {
  await page.goto("/build/new");
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(
    blocking,
    blocking.map((v) => `${v.id}: ${v.help}`).join("\n"),
  ).toEqual([]);
});
