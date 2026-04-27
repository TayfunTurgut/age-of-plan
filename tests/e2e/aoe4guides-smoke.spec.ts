import { test, expect, type Page } from "@playwright/test";

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

const importFromUrl = async (page: Page, url: string) => {
  await page.getByRole("button", { name: "or import a build" }).click();
  // aoe4guides tab is the default; the input has this placeholder.
  const input = page.getByPlaceholder("Paste aoe4guides.com URL or build ID");
  await input.fill(url);
  await page
    .locator('[role="dialog"]')
    .getByRole("button", { name: "Import" })
    .click();
  // Successful import navigates straight to the editor.
  await expect(page).toHaveURL(/\/build\/.+\/edit$/, { timeout: 15_000 });
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
