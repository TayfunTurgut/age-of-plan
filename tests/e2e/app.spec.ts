import { test, expect } from "@playwright/test";

test("home renders the app shell", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Age of Plan/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Age of Plan" }),
  ).toBeVisible();
  // Nav chrome is present on layout routes.
  await expect(page.getByRole("link", { name: "Library" })).toBeVisible();
});

test("unknown route renders 404", async ({ page }) => {
  await page.goto("/this-route-does-not-exist");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back home" })).toBeVisible();
});
