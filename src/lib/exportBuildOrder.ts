import type { BuildOrder } from "@/types/buildOrder";
import { formatTime } from "@/lib/time";
import { civIdToDisplayName } from "./importRtsOverlay";

const triggerDownload = (filename: string, contents: string, mime: string): void => {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so the click finishes in all browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const safeFilename = (name: string): string =>
  name.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "build_order";

/** Native lossless export — preserves our internal civ ids and full schema. */
export const exportAsJson = (bo: BuildOrder): void => {
  const json = JSON.stringify(bo, null, 2);
  triggerDownload(`${safeFilename(bo.name)}.json`, json, "application/json");
};

/** RTS_Overlay-shaped export. Civ id is mapped to the canonical display name
 *  so rts-overlay.github.io recognizes it on re-import. */
export const exportAsRtsOverlay = (bo: BuildOrder): void => {
  const payload = {
    name: bo.name,
    civilization: civIdToDisplayName(bo.civilization),
    author: bo.author ?? "",
    source: bo.source ?? "",
    description: bo.description ?? "",
    build_order: bo.steps.map((s) => ({
      age: s.age,
      villager_count: s.villagerCount,
      population_count: s.populationCount ?? -1,
      resources: { ...s.resources },
      time: s.timeSeconds !== undefined ? formatTime(s.timeSeconds) : "",
      notes: s.notes.map((n) => n.text),
    })),
  };
  const json = JSON.stringify(payload, null, 2);
  triggerDownload(`${safeFilename(bo.name)}_rts_overlay.json`, json, "application/json");
};
