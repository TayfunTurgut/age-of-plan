import { test, expect } from "@playwright/test";

/**
 * Live upstream-drift canary — hits the REAL aoe4guides.com API. Tagged
 * @aoe4guides-smoke so the default `test:e2e` run excludes it; run on demand
 * with `bun run test:e2e:aoe4guides-smoke`. Failures usually mean aoe4guides
 * changed its API/asset paths (refresh PATH_MIGRATION / civ-code map).
 */
test("@aoe4guides-smoke imports a live aoe4guides build", async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto("/library");
  await page.getByRole("button", { name: "Import" }).click();

  const dialog = page.getByRole("dialog");
  // Known English build id from the coverage audit list.
  await dialog
    .getByRole("textbox", { name: "aoe4guides URL or build ID" })
    .fill("0K4ymGIOg7qfPuuT2Tky");
  await dialog.getByRole("button", { name: "Import", exact: true }).click();

  // A successful live import normalizes the build and opens the editor.
  await expect(page).toHaveURL(/\/build\/[^/]+\/edit$/, { timeout: 30_000 });
});
