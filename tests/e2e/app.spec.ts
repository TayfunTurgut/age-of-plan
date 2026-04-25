import { test, expect, type Page } from "@playwright/test";

// Each test starts on the homepage with a clean localStorage so previous tests
// don't leak builds into the library.
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

const setInline = async (page: Page, ariaLabel: string, value: string) => {
  await page.getByRole("button", { name: ariaLabel, exact: true }).click();
  const input = page.getByRole("textbox", { name: ariaLabel, exact: true });
  await input.fill(value);
  await input.press("Enter");
};

const addStep = async (page: Page) => {
  await page.getByRole("button", { name: "+ Add Step" }).first().click();
};

test.describe("smoke", () => {
  test("home page loads with civ grid + navbar", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "AoE4 Build Order Planner" }),
    ).toBeVisible();

    // 22 civ cards in the grid (12 base + 10 variants)
    const civLinks = page.locator('a[href^="/civ/"]');
    await expect(civLinks).toHaveCount(22);

    // Nav bar has Library link
    await expect(
      page.getByRole("link", { name: "Library", exact: true }),
    ).toBeVisible();
  });

  test("theme toggle flips and persists", async ({ page }) => {
    const initial = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );

    const toggle = page.getByRole("button", {
      name: /Switch to (light|dark) mode/,
    });
    await toggle.click();

    const flipped = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(flipped).toBe(!initial);

    await page.reload();
    const persisted = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(persisted).toBe(flipped);
  });

  test("404 catch-all", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    // NotFound page renders some 404 indicator
    await expect(page.getByText(/404|not found/i).first()).toBeVisible();
  });

  test("build-not-found pages render gracefully", async ({ page }) => {
    await page.goto("/build/00000000-0000-0000-0000-000000000000");
    await expect(
      page.getByRole("heading", { name: "Build order not found" }),
    ).toBeVisible();

    await page.goto("/build/00000000-0000-0000-0000-000000000000/edit");
    await expect(
      page.getByRole("heading", { name: "Build order not found" }),
    ).toBeVisible();
  });
});

test.describe("library empty state", () => {
  test("empty library suggests creating or importing", async ({ page }) => {
    await page.getByRole("link", { name: "Library", exact: true }).click();
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByText("No build orders saved yet.")).toBeVisible();
    await page.getByRole("link", { name: "Create one" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("civ navigation", () => {
  test("home → English civ → empty CivDetail", async ({ page }) => {
    await page.getByRole("link", { name: /^English/ }).click();
    await expect(page).toHaveURL(/\/civ\/english$/);
    await expect(page.getByRole("heading", { name: "English" })).toBeVisible();
    await expect(
      page.getByText("No build orders yet. Create your first one."),
    ).toBeVisible();
  });

  test("variant civ shows 'Variant of …' subtitle", async ({ page }) => {
    // Variants exist (10 of them) — pick a known one if it exists.
    const variantLinks = await page
      .locator('a[href^="/civ/"]')
      .filter({ hasText: /Variant of/ })
      .all();
    expect(variantLinks.length).toBeGreaterThan(0);
  });
});

test.describe("editor full flow", () => {
  test("create build → edit metadata → add step with resources/note → autosave persists", async ({
    page,
  }) => {
    // Navigate via UI: home → English → New Build Order
    await page.getByRole("link", { name: /^English/ }).click();
    await page.getByRole("link", { name: "New Build Order" }).click();
    await expect(page).toHaveURL(/\/build\/.+\/edit$/);
    const editorUrl = page.url();

    // Edit title (InlineText displays as a button with aria-label "Build name")
    await setInline(page, "Build name", "FF Knights");

    // Metadata inputs
    await page.getByPlaceholder("Author").fill("QA");
    await page.getByPlaceholder("e.g. vs French").fill("vs Mongols");
    await page.getByPlaceholder("Description").fill("Fast Castle into Knights");

    // Add a first step from the empty state CTA
    await addStep(page);

    // Step 1 visible — set Food = 10 via the resource pill
    const foodInput = page.getByLabel("Food", { exact: true }).first();
    await foodInput.fill("10");
    await foodInput.blur();

    // Villager count should auto-compute to 10
    await expect(
      page.getByLabel("Villager count (auto)").first(),
    ).toHaveText("10");

    // Add a note to the first step
    await page.getByRole("button", { name: "+ Add Note" }).first().click();
    const noteInput = page.getByRole("textbox", { name: "Note 1" }).first();
    await noteInput.fill("Send 6 villagers to wood");
    await noteInput.press("Tab");

    // Wait for the autosave indicator
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 5_000 });

    // Reload and verify everything persisted
    await page.goto(editorUrl);
    await expect(page.getByText("FF Knights")).toBeVisible();
    await expect(page.getByPlaceholder("Author")).toHaveValue("QA");
    await expect(page.getByPlaceholder("e.g. vs French")).toHaveValue(
      "vs Mongols",
    );
    await expect(page.getByPlaceholder("Description")).toHaveValue(
      "Fast Castle into Knights",
    );
    await expect(page.getByLabel("Food", { exact: true }).first()).toHaveValue(
      "10",
    );
    await expect(
      page.getByLabel("Villager count (auto)").first(),
    ).toHaveText("10");
    await expect(page.getByText("Send 6 villagers to wood")).toBeVisible();
  });

  test("typing {{ in a note opens the icon picker, Enter inserts a token, live preview renders", async ({
    page,
  }) => {
    await page.goto("/civ/english");
    await page.getByRole("link", { name: "New Build Order" }).click();
    await addStep(page);

    // Open a note input and type the trigger plus a query.
    await page.getByRole("button", { name: "+ Add Note" }).first().click();
    const noteInput = page.getByRole("textbox", { name: "Note 1" }).first();
    await noteInput.fill("build {{long");

    // Picker is open and at least one Longbowman variant matches the query.
    const picker = page.getByRole("listbox", { name: "Icon picker" });
    await expect(picker).toBeVisible();
    await expect(
      picker.getByRole("option", { name: /Longbowman/ }).first(),
    ).toBeVisible();

    // Press Enter to accept the highlighted entry.
    await noteInput.press("Enter");

    // Picker closes; the note text is rewritten with the full token.
    await expect(picker).not.toBeVisible();
    await expect(noteInput).toHaveValue(/^build \{\{[^}]+\}\}$/);

    // Re-focus the textarea so a final blur actually happens (commits draft).
    await noteInput.focus();
    await noteInput.press("Tab");

    // Live preview renders an inline image alongside the leading "build" text.
    const noteCell = noteInput.locator("../..");
    await expect(noteCell.locator("img")).toBeVisible();
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 5_000 });

    // Reload — token persists.
    await page.reload();
    const reloaded = page.getByRole("textbox", { name: "Note 1" }).first();
    await expect(reloaded).toHaveValue(/^build \{\{[^}]+\}\}$/);
  });

  test("villager lock toggles between auto and manual", async ({ page }) => {
    await page.goto("/civ/french");
    await page.getByRole("link", { name: "New Build Order" }).click();
    await addStep(page);

    // Default is unlocked/auto — should read 0
    const autoBadge = page.getByLabel("Villager count (auto)").first();
    await expect(autoBadge).toHaveText("0");

    // Lock — toggles to manual
    await page
      .getByRole("button", { name: "Lock villager count" })
      .first()
      .click();

    // Manual mode renders InlineText (button → click → number input)
    await page
      .getByRole("button", { name: "Villager count (manual)" })
      .click();
    const manualInput = page.getByLabel("Villager count (manual)");
    await manualInput.fill("13");
    await manualInput.press("Enter");

    // Setting Food shouldn't change the locked count
    const foodInput = page.getByLabel("Food", { exact: true }).first();
    await foodInput.fill("99");
    await foodInput.blur();

    // Still shows 13 (locked override)
    await expect(
      page.getByRole("button", { name: "Villager count (manual)" }),
    ).toHaveText(/13/);
  });

  test("delete step prompts when content present", async ({ page }) => {
    await page.goto("/civ/french");
    await page.getByRole("link", { name: "New Build Order" }).click();
    await addStep(page);

    // Add content so deletion will prompt
    const food = page.getByLabel("Food", { exact: true }).first();
    await food.fill("5");
    await food.blur();

    // Confirm deletion via the dialog
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Step actions" }).first().click();
    await page.getByRole("menuitem", { name: "Delete Step" }).click();

    // Empty state restored
    await expect(
      page.getByText("Add your first step to get started"),
    ).toBeVisible();
  });
});

test.describe("library after creating builds", () => {
  test("created build shows in library, search filters, civ filter narrows", async ({
    page,
  }) => {
    // Create a build for English
    await page.goto("/civ/english");
    await page.getByRole("link", { name: "New Build Order" }).click();
    await setInline(page, "Build name", "Longbow Rush");
    await page.getByPlaceholder("Author").fill("AlphaTester");
    await page.getByPlaceholder("e.g. vs French").fill("vs HRE");
    // Wait for autosave to flush
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 5_000 });

    // Create a second build for French
    await page.goto("/civ/french");
    await page.getByRole("link", { name: "New Build Order" }).click();
    await setInline(page, "Build name", "Knight Timing");
    await page.getByPlaceholder("Author").fill("AlphaTester");
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 5_000 });

    // Visit library — both builds visible
    await page.getByRole("link", { name: "Library", exact: true }).click();
    await expect(page.getByText("Longbow Rush")).toBeVisible();
    await expect(page.getByText("Knight Timing")).toBeVisible();

    // Search narrows to one
    await page
      .getByPlaceholder("Search by name, author, matchup, description")
      .fill("Longbow");
    await expect(page.getByText("Longbow Rush")).toBeVisible();
    await expect(page.getByText("Knight Timing")).not.toBeVisible();

    // Clear search
    await page
      .getByPlaceholder("Search by name, author, matchup, description")
      .fill("");

    // Civ filter narrows
    // The first Select trigger after the search input is the civ filter
    const civFilterTrigger = page.locator('button[role="combobox"]').first();
    await civFilterTrigger.click();
    await page.getByRole("option", { name: "French" }).click();
    await expect(page.getByText("Knight Timing")).toBeVisible();
    await expect(page.getByText("Longbow Rush")).not.toBeVisible();
  });

  test("delete from library card removes the build", async ({ page }) => {
    await page.goto("/civ/english");
    await page.getByRole("link", { name: "New Build Order" }).click();
    await setInline(page, "Build name", "Disposable Build");
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 5_000 });

    await page.getByRole("link", { name: "Library", exact: true }).click();
    await expect(page.getByText("Disposable Build")).toBeVisible();

    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.getByText("Disposable Build")).not.toBeVisible();
    await expect(page.getByText("No build orders saved yet.")).toBeVisible();
  });
});

test.describe("import modal", () => {
  test("invalid JSON shows error, native JSON imports successfully", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "or import a build" }).click();
    await page.getByRole("tab", { name: "From JSON" }).click();

    const textarea = page.getByPlaceholder(
      "Paste RTS_Overlay or exported JSON here",
    );
    await textarea.fill("{ not valid json");
    await page
      .locator('[role="dialog"]')
      .getByRole("button", { name: "Import" })
      .click();
    await expect(
      page.getByText(/Couldn't import this/),
    ).toBeVisible();

    // Now paste a valid native export shape
    const valid = JSON.stringify({
      id: "src-id-will-be-replaced",
      name: "Imported Build",
      civilization: "english",
      author: "Importer",
      createdAt: 0,
      updatedAt: 0,
      steps: [
        {
          id: "s1",
          age: 1,
          villagerCount: 0,
          resources: {
            food: 0,
            wood: 0,
            gold: 0,
            stone: 0,
            builder: 0,
          },
          notes: [],
          tags: [],
        },
      ],
    });
    await textarea.fill(valid);
    await page
      .locator('[role="dialog"]')
      .getByRole("button", { name: "Import" })
      .click();

    // Successful import navigates to the editor
    await expect(page).toHaveURL(/\/build\/.+\/edit$/, { timeout: 5_000 });
    await expect(page.getByText("Imported Build")).toBeVisible();
  });
});

test.describe("editor exports", () => {
  test("export JSON triggers a download with the safe filename", async ({
    page,
  }) => {
    await page.goto("/civ/english");
    await page.getByRole("link", { name: "New Build Order" }).click();
    await setInline(page, "Build name", "Export Test");
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 5_000 });

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export" }).click();
    await page.getByRole("menuitem", { name: "Export JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("Export_Test.json");
  });
});

test.describe("runner / overlay", () => {
  test("keyboard shortcuts: arrow advances step, space toggles play, R resets, M toggles mode", async ({
    page,
  }) => {
    // Build with two steps
    await page.goto("/civ/english");
    await page.getByRole("link", { name: "New Build Order" }).click();
    const editorUrl = page.url();
    await addStep(page);
    // Add second step via the bottom button
    await page.getByRole("button", { name: "+ Add Step" }).click();

    await expect(page.getByText("Saved")).toBeVisible({ timeout: 5_000 });

    // Pull the build id from the URL and navigate to /run
    const id = editorUrl.match(/\/build\/([^/]+)\/edit/)?.[1];
    expect(id).toBeTruthy();
    await page.goto(`/build/${id}/run`);

    // Step 1 / 2 initially
    await expect(page.getByText(/Step\s+1\s+\/\s+2/)).toBeVisible();

    // Right arrow advances to step 2
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText(/Step\s+2\s+\/\s+2/)).toBeVisible();

    // Left arrow goes back to step 1
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText(/Step\s+1\s+\/\s+2/)).toBeVisible();

    // Space starts the timer (Play button becomes Pause)
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    // R resets and pauses
    await page.keyboard.press("KeyR");
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();

    // M toggles auto/manual mode (icon swap → aria-label change)
    const initialModeBtn = page.getByRole("button", {
      name: /Switch to (manual|auto-advance) mode/,
    });
    const initialLabel = await initialModeBtn.getAttribute("aria-label");
    await page.keyboard.press("KeyM");
    const flippedModeBtn = page.getByRole("button", {
      name: /Switch to (manual|auto-advance) mode/,
    });
    const flippedLabel = await flippedModeBtn.getAttribute("aria-label");
    expect(flippedLabel).not.toBe(initialLabel);
  });

  test("runner with missing build shows 'Build not found'", async ({ page }) => {
    await page.goto("/build/00000000-0000-0000-0000-000000000000/run");
    await expect(
      page.getByRole("heading", { name: "Build not found" }),
    ).toBeVisible();
  });
});
