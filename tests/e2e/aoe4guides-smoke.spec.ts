import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_JSON = resolve(HERE, "../fixtures/aoe4guides/sengoku-daimyo-racecar.json");
const FIXTURE_BO = resolve(HERE, "../fixtures/aoe4guides/sengoku-daimyo-racecar.bo");

/**
 * Optional smoke suite for the aoe4guides.com URL importer.
 *
 * Hits real aoe4guides.com — the whole point is to detect when their JSON
 * shape, asset paths, or build content drifts from what our parser expects.
 * Excluded from the default `npm run test:e2e` via `--grep-invert`. Run
 * explicitly with `npm run test:e2e:aoe4guides-smoke`.
 *
 * Coverage: at least one popular Season 12 build per civilization
 * aoe4guides exposes, plus the original Japanese build the user reported
 * the bug on. Each test asserts:
 *   - import lands on `/build/<id>/edit`,
 *   - the resolved civilization name is visible in the editor (proves
 *     CIV_CODE_MAP picked up the correct civ — no "unknown" surprises),
 *   - no `<img>` HTML survives into the first note's textarea (proves
 *     aoe4GuidesSrcToToken / title-fallback / basename-fallback covered
 *     every emitted icon).
 *
 * The first case (`@aoe4guides-smoke-headline`) additionally asserts the
 * specific tokens from the user-reported build, so a Tawara/villager-civ/
 * build-keyword regression fails loudly with a focused message rather
 * than just a generic "an img survived".
 *
 * Tag is in the describe title (`@aoe4guides-smoke`) so playwright's
 * `--grep` / `--grep-invert` can include or exclude this whole file.
 */

type SmokeCase = {
  name: string;
  url: string;
  /** What the editor's civ pill should read after import. */
  expectedCiv: string;
  /** Optional: extra tokens that must appear in the first step's note. */
  step1NoteContains?: string[];
};

const cases: SmokeCase[] = [
  {
    // First case = the URL the user reported the bug on. Exercises the
    // civ-suffixed villager fallback (villager-japanese.webp), the towara→tawara
    // alias, the bare-word `build` substitution, and the Sheep title fallback.
    name: "Japanese — Fast Castle (2026) [headline]",
    url: "https://aoe4guides.com/builds/yeDbJIwrrgHzUdJJb7gi",
    expectedCiv: "Japanese",
    step1NoteContains: [
      "Sheep",
      "{{images/units/villager-1.png}}",
      "{{general/build.webp}}",
      "{{images/buildings/farmhouse-1.png}}",
      "{{images/technologies/tawara-1.png}}",
    ],
  },
  // One top-rated Season 12 build per civilization (selected via the
  // aoe4guides public API: ?civ=<code>&orderBy=score&season=Season+12).
  // SEN/Sengoku Daimyo had no S12 builds at curation time → using a
  // pre-S12 build that exercises the same paths.
  { name: "English — DEFENSIVE (Swaggy Professor)", url: "https://aoe4guides.com/builds/0K4ymGIOg7qfPuuT2Tky", expectedCiv: "English" },
  { name: "French — AGGRESSIVE (Swaggy Professor)", url: "https://aoe4guides.com/builds/vN0hRZoFURrzaiiUXBt8", expectedCiv: "French" },
  { name: "HRE — Feudal Aggro Into Castle (2026)", url: "https://aoe4guides.com/builds/PZycr2KliA5cvZCB5gWI", expectedCiv: "Holy Roman Empire" },
  { name: "Mongols — New Player Guide", url: "https://aoe4guides.com/builds/YOcdrRav7QTIlwa6QGrJ", expectedCiv: "Mongols" },
  { name: "Rus — pro scout (Swaggy P)", url: "https://aoe4guides.com/builds/S83qPaQ6iROrSEe7BOss", expectedCiv: "Rus" },
  { name: "Chinese — gigachad song dynasty", url: "https://aoe4guides.com/builds/v5zSt2V2sba4D3bIGYQ8", expectedCiv: "Chinese" },
  { name: "Delhi — Ghazi aggression / Fast Castle", url: "https://aoe4guides.com/builds/lqCTiEwm9Awa7szrZFig", expectedCiv: "Delhi Sultanate" },
  { name: "Abbasid — 4TC Fast Imperial", url: "https://aoe4guides.com/builds/xxyf9mkIQYpFZHShrW4l", expectedCiv: "Abbasid Dynasty" },
  { name: "Ottomans — The Only OTTOMAN Build (Swaggy)", url: "https://aoe4guides.com/builds/JNcXCY99t4rcIAQIUnfu", expectedCiv: "Ottomans" },
  { name: "Malians — Vortix's Cow Boom", url: "https://aoe4guides.com/builds/NMRXBRDXxdlq5lRtI1Nl", expectedCiv: "Malians" },
  { name: "Byzantines — Grand Winery Timing Attack", url: "https://aoe4guides.com/builds/D3HCxOQNgLFzfStodpI0", expectedCiv: "Byzantines" },
  { name: "Ayyubids — feudal all in", url: "https://aoe4guides.com/builds/LGyCOru1QpvGy54xao7h", expectedCiv: "Ayyubids" },
  { name: "Zhu Xi — Fast Castle (Aussie Drongo)", url: "https://aoe4guides.com/builds/2qwfjWzoRDErbDvNGIui", expectedCiv: "Zhu Xi's Legacy" },
  { name: "Jeanne d'Arc — Aggression (2026)", url: "https://aoe4guides.com/builds/ss0UMX3M9DRmkcPLRvk5", expectedCiv: "Jeanne d'Arc" },
  { name: "Order of the Dragon — Aggressive Dragon Rush", url: "https://aoe4guides.com/builds/iVgmYdWfoSAqBCtAQ82t", expectedCiv: "Order of the Dragon" },
  { name: "Knights Templar — 1TC Fast 2x Pilgrim", url: "https://aoe4guides.com/builds/lZ5EiqDVzQmIQDLkrfSr", expectedCiv: "Knights Templar" },
  { name: "House of Lancaster — 2TC+Manor", url: "https://aoe4guides.com/builds/tcpduIMa2FUmXpgzLpHv", expectedCiv: "House of Lancaster" },
  { name: "Golden Horde — Keshik + Torguuds", url: "https://aoe4guides.com/builds/InVCf1SztRCvgzi1gEFf", expectedCiv: "Golden Horde" },
  { name: "Macedonian Dynasty — Best BO (Beasty)", url: "https://aoe4guides.com/builds/12dVnw8yBYpwfYpc15i4", expectedCiv: "Macedonian Dynasty" },
  { name: "Sengoku Daimyo — Fast Daimyo (2026)", url: "https://aoe4guides.com/builds/1RhBij4kaJESj1anpCIC", expectedCiv: "Sengoku Daimyo" },
  { name: "Tughluqid — Unlimited Elephant", url: "https://aoe4guides.com/builds/0gvNQ9UtKN6kIbs9O85Y", expectedCiv: "Tughluqid Dynasty" },
];

const openImportDialog = async (page: Page) => {
  await page.getByRole("button", { name: "or import a build" }).click();
};

const submitImport = async (page: Page) => {
  await page
    .locator('[role="dialog"]')
    .getByRole("button", { name: "Import" })
    .click();
  // Successful import navigates straight to the editor.
  await expect(page).toHaveURL(/\/build\/.+\/edit$/, { timeout: 15_000 });
};

const importFromUrl = async (page: Page, url: string) => {
  await openImportDialog(page);
  // aoe4guides tab is the default; the input has this placeholder.
  await page
    .getByPlaceholder("Paste aoe4guides.com URL or build ID")
    .fill(url);
  await submitImport(page);
};

const switchToJsonTab = async (page: Page) => {
  await page.locator('[role="dialog"]').getByRole("tab", { name: "From JSON" }).click();
};

const importFromPaste = async (page: Page, jsonText: string) => {
  await openImportDialog(page);
  await switchToJsonTab(page);
  await page
    .getByPlaceholder("Paste RTS_Overlay or exported JSON here")
    .fill(jsonText);
  await submitImport(page);
};

const importFromUpload = async (page: Page, filePath: string) => {
  await openImportDialog(page);
  await switchToJsonTab(page);
  // The picker is a hidden <input type="file"> — drive it directly via
  // setInputFiles so we don't have to open a system file dialog.
  await page.locator('[role="dialog"] input[type="file"]').setInputFiles(filePath);
  await submitImport(page);
};

test.describe("@aoe4guides-smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  for (const c of cases) {
    test(c.name, async ({ page }) => {
      await importFromUrl(page, c.url);

      // Civ pill in the editor shows the resolved civ name. If
      // CIV_CODE_MAP missed this build's code, this would be "Unknown".
      await expect(page.getByText(c.expectedCiv).first()).toBeVisible({
        timeout: 5_000,
      });

      // Headline build: assert the bug-fix tokens explicitly.
      if (c.step1NoteContains) {
        const note1 = page.getByRole("textbox", { name: "Note 1" }).first();
        await expect(note1).toBeVisible();
        const text = (await note1.inputValue()) ?? "";
        for (const needle of c.step1NoteContains) {
          expect(
            text,
            `step-1 note text was: ${JSON.stringify(text)}`,
          ).toContain(needle);
        }
      }

      // Universal coverage check: no `<img>` HTML survived into any note.
      // If aoe4guides ships a new asset path we can't tokenize and that
      // has no title/alt, the basename text fallback must still strip
      // the `<img>` tag — anything else is a regression.
      const survivors = await page.evaluate(() => {
        const tas = Array.from(
          document.querySelectorAll<HTMLTextAreaElement>(
            "textarea[aria-label^='Note']",
          ),
        );
        return tas.map((t) => t.value).filter((v) => /<img\b/i.test(v));
      });
      expect(
        survivors,
        `notes still contain raw <img> markup: ${JSON.stringify(survivors)}`,
      ).toEqual([]);
    });
  }
});

/**
 * aoe4guides exposes three import paths for the same build (URL/API,
 * "Copy as JSON" clipboard, ".bo" download). The download is byte-identical
 * to the clipboard JSON, but they exercise different UX paths and a
 * different icon-token syntax (`@<path>@`) than the URL/API HTML descriptions.
 *
 * This block re-imports one curated build (Sengoku Daimyo Racecar) via all
 * three modalities and asserts that each yields the same civ + the same
 * concrete icon tokens — including the very ones the user originally
 * reported as broken on the JSON / .bo paths (Tawara, civ-suffixed villager,
 * the "build" UI marker, farmhouse).
 */
test.describe("@aoe4guides-smoke Racecar three-modality import", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  const RACECAR_URL = "https://aoe4guides.com/builds/yWFJNLAsfTKGCKfC1awK";
  const EXPECTED_TOKENS = [
    "{{images/units/villager-1.png}}",
    "{{images/buildings/farmhouse-1.png}}",
    "{{images/technologies/tawara-1.png}}",
    "{{general/build.webp}}",
  ];

  const assertRacecarImported = async (page: Page) => {
    await expect(page.getByText("Sengoku Daimyo").first()).toBeVisible({
      timeout: 5_000,
    });

    // All four expected icon tokens should appear *somewhere* in the
    // build's notes. The Racecar build distributes them across step 1's
    // "5 to Sheep / 1 villager to build farmhouse" line and step 3's
    // "Queue tawara from farmhouse".
    const allText = await page.evaluate(() => {
      const tas = Array.from(
        document.querySelectorAll<HTMLTextAreaElement>(
          "textarea[aria-label^='Note']",
        ),
      );
      return tas.map((t) => t.value).join("\n");
    });
    for (const token of EXPECTED_TOKENS) {
      expect(
        allText,
        `expected token ${token} not found in any note. notes were:\n${allText}`,
      ).toContain(token);
    }

    const survivors = await page.evaluate(() => {
      const tas = Array.from(
        document.querySelectorAll<HTMLTextAreaElement>(
          "textarea[aria-label^='Note']",
        ),
      );
      return tas.map((t) => t.value).filter((v) => /<img\b/i.test(v));
    });
    expect(
      survivors,
      `notes still contain raw <img> markup: ${JSON.stringify(survivors)}`,
    ).toEqual([]);
  };

  test("URL import", async ({ page }) => {
    await importFromUrl(page, RACECAR_URL);
    await assertRacecarImported(page);
  });

  test("clipboard JSON paste", async ({ page }) => {
    const json = readFileSync(FIXTURE_JSON, "utf8");
    await importFromPaste(page, json);
    await assertRacecarImported(page);
  });

  test(".bo file upload", async ({ page }) => {
    await importFromUpload(page, FIXTURE_BO);
    await assertRacecarImported(page);
  });
});
