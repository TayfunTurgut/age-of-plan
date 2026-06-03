import { test, expect, type Page } from "@playwright/test";

function twoStepBuild(id: string) {
  const step = (sid: string, food: number) => ({
    id: sid,
    age: 1 as const,
    villagerCount: 0,
    villagerCountManual: false,
    resources: { food, wood: 0, gold: 0, stone: 0, builder: 0 },
    notes: [],
  });
  return {
    id,
    name: "Drag Build",
    civilization: "french",
    author: "",
    source: "",
    description: "",
    matchup: "",
    createdAt: 1,
    updatedAt: 1,
    // Distinguish steps by their food value (shown in the first pill).
    steps: [step("s-a", 5), step("s-b", 9)],
  };
}

async function seed(page: Page, payload: object) {
  await page.addInitScript(
    ([key, value]) => {
      if (!localStorage.getItem(key as string)) {
        localStorage.setItem(key as string, value as string);
      }
    },
    [`aoe4bo:bo:${(payload as { id: string }).id}`, JSON.stringify(payload)],
  );
}

async function dragHandle(page: Page, from: number, to: number) {
  const handles = page.getByRole("button", { name: "Drag step" });
  const src = await handles.nth(from).boundingBox();
  const dst = await handles.nth(to).boundingBox();
  if (!src || !dst) throw new Error("drag handles not found");
  await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
  await page.mouse.down();
  // Exceed the 5px PointerSensor activation distance, then move to target.
  await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2 + 8);
  await page.mouse.move(dst.x + dst.width / 2, dst.y + dst.height / 2 - 6, { steps: 12 });
  await page.mouse.move(dst.x + dst.width / 2, dst.y + dst.height / 2 - 4, { steps: 4 });
  await page.mouse.up();
}

test("reordering steps via drag persists across reload", async ({ page }) => {
  await seed(page, twoStepBuild("drag-1"));
  await page.goto("/build/drag-1/edit");

  const firstFood = page.getByRole("spinbutton", { name: "Food" }).first();
  await expect(firstFood).toHaveValue("5");

  // Drag step 2 (index 1) up onto step 1 (index 0).
  await dragHandle(page, 1, 0);

  await expect(firstFood).toHaveValue("9");
  await expect(page.getByText("Saved")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("spinbutton", { name: "Food" }).first()).toHaveValue("9");
});

test("typing {{ opens the icon picker and inserts a token", async ({ page }) => {
  await seed(page, twoStepBuild("drag-2"));
  await page.goto("/build/drag-2/edit");

  // Add a note to the first step.
  await page.getByRole("button", { name: "+ Add note" }).first().click();
  const note = page.getByRole("textbox", { name: "Note 1" });
  await note.pressSequentially("{{food");

  await expect(page.getByRole("listbox", { name: "Icon picker" })).toBeVisible();
  await note.press("Enter");

  await expect(note).toHaveValue(/\{\{resources\/food\.webp\}\}/);
  // The inline note preview renders the icon (h-6, vs the h-5 resource pills).
  await expect(
    page.locator('img.h-6[src="/aoe4/resources/food.webp"]'),
  ).toBeVisible();
});
