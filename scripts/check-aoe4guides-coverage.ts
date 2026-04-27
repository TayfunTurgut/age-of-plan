#!/usr/bin/env bun
/**
 * Coverage check for the aoe4guides.com importer.
 *
 * Pulls the build IDs listed below (covering every civ aoe4guides actually
 * exposes), fetches each via the public API, and reports:
 *   - any `<img src="…">` URL whose path produces neither an icon token
 *     nor a title/alt fallback (= the icon would silently disappear), and
 *   - the civilization code from the payload (so we can verify the
 *     CIV_CODE_MAP keeps up with aoe4guides drift).
 *
 * Run with:  bun run scripts/check-aoe4guides-coverage.ts
 *
 * This is a developer tool, not a test. It hits the live aoe4guides API
 * and is intended for a one-shot audit when refreshing PATH_MIGRATION or
 * AOE4GUIDES_ALIASES.
 */

import { aoe4GuidesSrcToToken } from "../src/lib/aoe4GuidesIconMap";
import { parseAoe4GuidesPayload } from "../src/lib/importAoe4Guides";

type RawStep = {
  description?: string;
  steps?: RawStep[];
};

type RawBuild = {
  id: string;
  civ?: string;
  title?: string;
  steps?: RawStep[];
};

const BUILD_IDS: ReadonlyArray<{ id: string; expectedCiv: string }> = [
  { id: "yeDbJIwrrgHzUdJJb7gi", expectedCiv: "JAP" }, // user-reported (Japanese, S12+)
  { id: "12dVnw8yBYpwfYpc15i4", expectedCiv: "MAC" },
  { id: "PZycr2KliA5cvZCB5gWI", expectedCiv: "HRE" },
  { id: "lZ5EiqDVzQmIQDLkrfSr", expectedCiv: "KTE" },
  { id: "vN0hRZoFURrzaiiUXBt8", expectedCiv: "FRE" },
  { id: "0K4ymGIOg7qfPuuT2Tky", expectedCiv: "ENG" },
  { id: "InVCf1SztRCvgzi1gEFf", expectedCiv: "GOH" },
  { id: "NMRXBRDXxdlq5lRtI1Nl", expectedCiv: "MAL" },
  { id: "0gvNQ9UtKN6kIbs9O85Y", expectedCiv: "TUG" },
  { id: "iVgmYdWfoSAqBCtAQ82t", expectedCiv: "DRA" },
  { id: "YOcdrRav7QTIlwa6QGrJ", expectedCiv: "MON" },
  { id: "S83qPaQ6iROrSEe7BOss", expectedCiv: "RUS" },
  { id: "v5zSt2V2sba4D3bIGYQ8", expectedCiv: "CHI" },
  { id: "lqCTiEwm9Awa7szrZFig", expectedCiv: "DEL" },
  { id: "xxyf9mkIQYpFZHShrW4l", expectedCiv: "ABB" },
  { id: "JNcXCY99t4rcIAQIUnfu", expectedCiv: "OTT" },
  { id: "D3HCxOQNgLFzfStodpI0", expectedCiv: "BYZ" },
  { id: "LGyCOru1QpvGy54xao7h", expectedCiv: "AYY" },
  { id: "2qwfjWzoRDErbDvNGIui", expectedCiv: "ZXL" },
  { id: "ss0UMX3M9DRmkcPLRvk5", expectedCiv: "JDA" },
  { id: "1RhBij4kaJESj1anpCIC", expectedCiv: "SEN" },
  { id: "tcpduIMa2FUmXpgzLpHv", expectedCiv: "HOL" },
];

const collectImgs = (html: string): Array<{ src: string; hasTitle: boolean }> => {
  const out: Array<{ src: string; hasTitle: boolean }> = [];
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const srcMatch = tag.match(/\bsrc="([^"]+)"/i);
    if (!srcMatch) continue;
    const hasTitle = /\b(?:title|alt)="[^"]+"/i.test(tag);
    out.push({ src: srcMatch[1], hasTitle });
  }
  return out;
};

const walkSteps = (steps: RawStep[] | undefined, sink: (html: string) => void): void => {
  if (!steps) return;
  for (const s of steps) {
    if (typeof s.description === "string") sink(s.description);
    walkSteps(s.steps, sink);
  }
};

const main = async () => {
  const gaps = new Map<string, number>(); // src → seen count
  const civDrift: Array<{ id: string; expected: string; actual: string }> = [];
  let scannedImgs = 0;

  for (const { id, expectedCiv } of BUILD_IDS) {
    const res = await fetch(`https://aoe4guides.com/api/builds/${id}`);
    if (!res.ok) {
      console.error(`  ! ${id} returned ${res.status}`);
      continue;
    }
    const data = (await res.json()) as RawBuild;
    if (data.civ && data.civ !== expectedCiv) {
      civDrift.push({ id, expected: expectedCiv, actual: data.civ });
    }
    walkSteps(data.steps, (html) => {
      for (const { src, hasTitle } of collectImgs(html)) {
        scannedImgs++;
        const token = aoe4GuidesSrcToToken(src);
        if (token) continue;
        if (hasTitle) continue; // title/alt fallback covers it
        gaps.set(src, (gaps.get(src) ?? 0) + 1);
      }
    });

    // End-to-end check: run through parseAoe4GuidesPayload and confirm no
    // `<img>` tags survive into note text. The htmlToText basename
    // fallback should turn every aoe4guides img into either a token or
    // capitalized text — anything else is a true gap.
    try {
      const bo = parseAoe4GuidesPayload(data, id);
      for (const step of bo.steps) {
        for (const note of step.notes) {
          if (/<img\b/i.test(note.text)) {
            console.error(`  ! ${id} note still contains <img>: ${note.text.slice(0, 200)}`);
          }
        }
      }
    } catch (err) {
      console.error(`  ! ${id} parseAoe4GuidesPayload threw: ${(err as Error).message}`);
    }
  }

  console.log(
    `\nScanned ${scannedImgs} <img> tags across ${BUILD_IDS.length} builds.\n`,
  );
  if (civDrift.length) {
    console.log("Civ code drift:");
    for (const d of civDrift) {
      console.log(`  ${d.id}: expected ${d.expected}, payload says ${d.actual}`);
    }
    console.log();
  }
  if (gaps.size === 0) {
    console.log("No unmapped image srcs without title/alt — coverage clean.");
    return;
  }
  console.log("Unmapped <img> srcs (would render as nothing — sorted by frequency):");
  const sorted = [...gaps.entries()].sort((a, b) => b[1] - a[1]);
  for (const [src, count] of sorted) {
    console.log(`  [${count}x] ${src}`);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
