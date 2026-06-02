import { formatTime } from "@/lib/time";
import { NOTE_TOKEN_RE } from "@/lib/noteToken";
import type { BuildOrder } from "@/types/buildOrder";
import { civIdToDisplayName } from "./importRtsOverlay";

function triggerDownload(filename: string, contents: string, mime: string): void {
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
}

function safeFilename(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "build_order"
  );
}

/** Our internal `{{path.ext}}` → RTS_Overlay's `@path.ext@`. */
function toRtsTokens(text: string): string {
  return text.includes("{{") ? text.replace(NOTE_TOKEN_RE, "@$1@") : text;
}

/** Pure serializer for the RTS_Overlay payload shape — exposed so tests and
 *  non-DOM consumers can use it without triggering a download. */
export function toRtsOverlayPayload(bo: BuildOrder) {
  return {
    name: bo.name,
    civilization: civIdToDisplayName(bo.civilization),
    author: bo.author ?? "",
    source: bo.source ?? "",
    description: bo.description ?? "",
    build_order: bo.steps.map((s) => ({
      age: s.age,
      villager_count: s.villagerCount,
      resources: { ...s.resources },
      time: s.timeSeconds !== undefined ? formatTime(s.timeSeconds) : "",
      notes: s.notes.map((n) => toRtsTokens(n.text)),
    })),
  };
}

/** Native lossless export — preserves internal civ ids and the full schema. */
export function exportAsJson(bo: BuildOrder): void {
  const json = JSON.stringify(bo, null, 2);
  triggerDownload(`${safeFilename(bo.name)}.json`, json, "application/json");
}

/** RTS_Overlay-shaped export. Civ id maps to the canonical display name so
 *  rts-overlay.github.io recognizes it on re-import. */
export function exportAsRtsOverlay(bo: BuildOrder): void {
  const json = JSON.stringify(toRtsOverlayPayload(bo), null, 2);
  triggerDownload(
    `${safeFilename(bo.name)}_rts_overlay.json`,
    json,
    "application/json",
  );
}
