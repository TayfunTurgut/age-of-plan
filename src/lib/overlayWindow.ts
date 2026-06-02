import { toast } from "sonner";

/**
 * Open the overlay runner for a build in a chrome-less popup. Shared by the
 * editor, build landing, and library card so they use identical dimensions and
 * the same popup-blocked fallback. Must be called from a user gesture so the
 * browser allows the popup.
 */
const OVERLAY_FEATURES =
  "popup=yes,width=380,height=240,menubar=no,toolbar=no,location=no,status=no,resizable=yes";

const OVERLAY_TARGET = "aoe4-overlay";

export function openOverlayFor(id: string): void {
  const url = `/build/${id}/run`;
  const win = window.open(url, OVERLAY_TARGET, OVERLAY_FEATURES);
  if (win) return;
  // Popup blocked: fall back to a regular tab so the runner is still usable,
  // and explain why the layout differs.
  toast.message("Popup blocked — opening overlay in a new tab.", {
    description: "Allow popups for this site to use the chrome-less window.",
  });
  window.open(url, "_blank", "noopener");
}
