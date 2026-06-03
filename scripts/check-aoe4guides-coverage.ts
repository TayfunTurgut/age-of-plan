#!/usr/bin/env bun
/**
 * Coverage audit for the aoe4guides.com importer. Operator tooling, not a test.
 *
 * Fetches a build per civ from the live aoe4guides API and reports any
 * `<img src>` that maps to neither an icon token nor a title/alt fallback (it
 * would render as nothing), plus any civ-code drift. Run when refreshing the
 * AOE4GUIDES_ALIASES overrides:  bun run scripts/check-aoe4guides-coverage.ts
 *
 * The HTML-scanning helpers are pure and unit-tested; only main() hits the network.
 */
import { aoe4GuidesSrcToToken } from "../src/lib/aoe4GuidesIconMap";
import { parseAoe4GuidesPayload } from "../src/lib/importAoe4Guides";

type RawStep = { description?: string; steps?: RawStep[] };
type RawBuild = { id: string; civ?: string; title?: string; steps?: RawStep[] };

const BUILD_IDS: ReadonlyArray<{ id: string; expectedCiv: string }> = [
  { id: "yeDbJIwrrgHzUdJJb7gi", expectedCiv: "JAP" },
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

/** Extract every `<img>`'s src + whether it carries a title/alt fallback. Pure. */
export function collectImgs(html: string): Array<{ src: string; hasTitle: boolean }> {
  const out: Array<{ src: string; hasTitle: boolean }> = [];
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const srcMatch = tag.match(/\bsrc="([^"]+)"/i);
    if (!srcMatch) continue;
    out.push({ src: srcMatch[1], hasTitle: /\b(?:title|alt)="[^"]+"/i.test(tag) });
  }
  return out;
}

/** Image srcs in `html` that resolve to neither a token nor a title/alt fallback. */
export function findUnmappedImgs(html: string): string[] {
  return collectImgs(html)
    .filter(({ src, hasTitle }) => !aoe4GuidesSrcToToken(src) && !hasTitle)
    .map(({ src }) => src);
}

function walkSteps(steps: RawStep[] | undefined, sink: (html: string) => void): void {
  if (!steps) return;
  for (const s of steps) {
    if (typeof s.description === "string") sink(s.description);
    walkSteps(s.steps, sink);
  }
}

async function main() {
  const gaps = new Map<string, number>();
  const civDrift: Array<{ id: string; expected: string; actual: string }> = [];
  let scanned = 0;

  for (const { id, expectedCiv } of BUILD_IDS) {
    let res: Response;
    try {
      res = await fetch(`https://aoe4guides.com/api/builds/${id}`, {
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      console.error(`  ! ${id} fetch failed: ${(err as Error).message}`);
      continue;
    }
    if (!res.ok) {
      console.error(`  ! ${id} returned ${res.status}`);
      continue;
    }
    const data = (await res.json()) as RawBuild;
    if (data.civ && data.civ !== expectedCiv) {
      civDrift.push({ id, expected: expectedCiv, actual: data.civ });
    }
    walkSteps(data.steps, (html) => {
      for (const src of findUnmappedImgs(html)) {
        scanned++;
        gaps.set(src, (gaps.get(src) ?? 0) + 1);
      }
    });
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
      console.error(`  ! ${id} parse threw: ${(err as Error).message}`);
    }
  }

  if (civDrift.length) {
    console.log("Civ code drift:");
    for (const d of civDrift) console.log(`  ${d.id}: expected ${d.expected}, payload ${d.actual}`);
  }
  if (gaps.size === 0) {
    console.log("Coverage clean — no unmapped image srcs without title/alt.");
    return;
  }
  console.log(`Unmapped <img> srcs (${scanned} occurrences, by frequency):`);
  for (const [src, count] of [...gaps.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  [${count}x] ${src}`);
  }
}

if ((import.meta as { main?: boolean }).main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
