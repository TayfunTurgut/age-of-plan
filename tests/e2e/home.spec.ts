import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

test("home renders the civilization picker grid", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Age of Plan" }),
  ).toBeVisible();

  // 22 civilizations, each linking to its detail page.
  const civLinks = page.locator('a[href^="/civ/"]');
  await expect(civLinks).toHaveCount(22);

  await expect(page.getByRole("link", { name: "Browse the library" })).toBeVisible();
});

test("home sets SEO head tags", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Age of Plan");
  // react-helmet-async marks the per-route tags it manages with data-rh,
  // distinguishing them from the static base meta in index.html (SPEC §11).
  await expect(page.locator('link[rel="canonical"][data-rh="true"]')).toHaveAttribute(
    "href",
    "https://ageofplan.com/",
  );
  await expect(
    page.locator('meta[property="og:title"][data-rh="true"]'),
  ).toHaveAttribute("content", "Age of Plan");
});

test("home has no critical or serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(
    blocking,
    blocking.map((v) => `${v.id}: ${v.help}`).join("\n"),
  ).toEqual([]);
});
