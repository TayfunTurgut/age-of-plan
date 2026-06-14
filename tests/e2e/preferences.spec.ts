import { test, expect } from "@playwright/test";

test("theme toggle flips and persists across reload", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");

  // Default is dark (applied pre-hydration by the inline script).
  await expect(html).toHaveClass(/dark/);

  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(html).not.toHaveClass(/dark/);

  await page.reload();
  await expect(html).not.toHaveClass(/dark/);
});

test("font-size picker changes the root size and persists", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");

  // Default 17px from the pre-hydration script.
  await expect(html).toHaveCSS("font-size", "17px");

  await page.getByRole("button", { name: "Text size" }).click();
  await page.getByRole("menuitemradio", { name: /^Large/ }).click();
  await expect(html).toHaveCSS("font-size", "18px");

  await page.reload();
  await expect(html).toHaveCSS("font-size", "18px");
});
