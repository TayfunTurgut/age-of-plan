import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * Drag-and-drop coverage for the editor.
 *
 * The editor uses `@dnd-kit/core` with `PointerSensor` and a 5-px activation
 * distance, so we drive the drag with a manual pointer sequence (move →
 * down → small move to activate → multi-step move to target → up). A
 * single move to the target won't trigger a drag because dnd-kit needs an
 * intermediate event past the activation threshold.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

const dragFromTo = async (
  page: Page,
  source: Locator,
  target: Locator,
): Promise<void> => {
  const sBox = await source.boundingBox();
  const tBox = await target.boundingBox();
  if (!sBox || !tBox) throw new Error("drag handles must be visible");

  const sx = sBox.x + sBox.width / 2;
  const sy = sBox.y + sBox.height / 2;
  const tx = tBox.x + tBox.width / 2;
  const ty = tBox.y + tBox.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  // Cross the activation threshold (5 px).
  await page.mouse.move(sx + 8, sy + 8, { steps: 4 });
  // Move smoothly to the target so dnd-kit fires onDragOver intermediate
  // events — important for cross-step note moves which mutate state mid-drag.
  await page.mouse.move(tx, ty, { steps: 12 });
  await page.mouse.up();
};

const addStep = async (page: Page) => {
  await page.getByRole("button", { name: "+ Add Step" }).first().click();
};

const setFoodOnStep = async (page: Page, stepIndex: number, value: string) => {
  const food = page.getByLabel("Food", { exact: true }).nth(stepIndex);
  await food.fill(value);
  await food.blur();
};

test.describe("editor drag-and-drop", () => {
  test("drag step reorders the list", async ({ page }) => {
    await page.goto("/civ/english");
    await page.getByRole("link", { name: "New Build Order" }).click();

    // Two steps with distinguishable food values.
    await addStep(page);
    await page.getByRole("button", { name: "+ Add Step" }).click();
    await setFoodOnStep(page, 0, "10");
    await setFoodOnStep(page, 1, "20");

    await expect(page.getByText("Saved")).toBeVisible({ timeout: 5_000 });

    // Initial order: [10, 20].
    await expect(page.getByLabel("Food", { exact: true }).nth(0)).toHaveValue("10");
    await expect(page.getByLabel("Food", { exact: true }).nth(1)).toHaveValue("20");

    // Drag step 1's handle past step 2's handle.
    const handles = page.getByRole("button", { name: "Drag step" });
    await dragFromTo(page, handles.nth(0), handles.nth(1));

    // Order is now [20, 10].
    await expect(page.getByLabel("Food", { exact: true }).nth(0)).toHaveValue("20");
    await expect(page.getByLabel("Food", { exact: true }).nth(1)).toHaveValue("10");
  });

  test("drag note across steps moves the note to the target step", async ({ page }) => {
    await page.goto("/civ/english");
    await page.getByRole("link", { name: "New Build Order" }).click();

    await addStep(page);
    await page.getByRole("button", { name: "+ Add Step" }).click();

    // Two steps. Add a note to step 1 only — step 2 starts empty.
    await page.getByRole("button", { name: "+ Add Note" }).first().click();
    const note = page.getByRole("textbox", { name: "Note 1" }).first();
    await note.fill("Migrate me");
    await note.press("Tab");

    await expect(page.getByText("Saved")).toBeVisible({ timeout: 5_000 });

    // Note exists in step 1.
    const noteHandles = page.getByRole("button", { name: "Drag note" });
    await expect(noteHandles).toHaveCount(1);

    // Step 2's empty notes container exposes a "Drop notes here" target.
    const dropTarget = page.getByText("Drop notes here").first();
    await dragFromTo(page, noteHandles.first(), dropTarget);

    // Note moved: step 2 now has the textarea, step 1 shows the empty state.
    await expect(page.getByText("Drop notes here")).toHaveCount(1);
    const movedNote = page.getByRole("textbox", { name: "Note 1" });
    await expect(movedNote).toHaveValue("Migrate me");
  });
});
