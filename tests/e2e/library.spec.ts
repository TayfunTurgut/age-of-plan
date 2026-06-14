import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";

type SeedBuild = {
  id: string;
  name: string;
  civilization: string;
  updatedAt: number;
  createdAt: number;
};

function build(b: SeedBuild) {
  return {
    id: b.id,
    name: b.name,
    civilization: b.civilization,
    author: "",
    source: "",
    description: "",
    matchup: "",
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    steps: [],
  };
}

async function seed(page: Page, builds: SeedBuild[]) {
  const payloads = builds.map(build);
  await page.addInitScript((items: ReturnType<typeof build>[]) => {
    for (const b of items) {
      localStorage.setItem(`aoe4bo:bo:${b.id}`, JSON.stringify(b));
    }
  }, payloads);
}

// "Zebra" is the most recently edited; "Alpha" sorts first by name.
const BUILDS: SeedBuild[] = [
  { id: "a", name: "Zebra", civilization: "french", updatedAt: 3000, createdAt: 1000 },
  { id: "b", name: "Alpha", civilization: "english", updatedAt: 2000, createdAt: 2000 },
];

test("library lists seeded builds and sorts by last edited by default", async ({ page }) => {
  await seed(page, BUILDS);
  await page.goto("/library");

  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(2);
  await expect(page.getByRole("heading", { level: 3 }).first()).toHaveText("Zebra");
});

test("library re-sorts by name", async ({ page }) => {
  await seed(page, BUILDS);
  await page.goto("/library");

  await page.getByRole("combobox", { name: "Sort builds" }).click();
  await page.getByRole("option", { name: "Name A–Z" }).click();

  await expect(page.getByRole("heading", { level: 3 }).first()).toHaveText("Alpha");
});

test("library filters by civilization", async ({ page }) => {
  await seed(page, BUILDS);
  await page.goto("/library");

  await page.getByRole("combobox", { name: "Filter by civilization" }).click();
  await page.getByRole("option", { name: "French" }).click();

  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 3 }).first()).toHaveText("Zebra");
});

test("civ detail shows only that civ's builds", async ({ page }) => {
  await seed(page, BUILDS);

  await page.goto("/civ/french");
  await expect(page.getByRole("heading", { level: 3 })).toHaveText("Zebra");

  await page.goto("/civ/english");
  await expect(page.getByRole("heading", { level: 3 })).toHaveText("Alpha");
});

test("library has no critical or serious accessibility violations", async ({ page }) => {
  await seed(page, BUILDS);
  await page.goto("/library");

  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(
    blocking,
    blocking.map((v) => `${v.id}: ${v.help}`).join("\n"),
  ).toEqual([]);
});
