import { toast } from "sonner";

/**
 * Open the overlay runner for a given build in a chrome-less popup window.
 * Shared by the editor, build placeholder, and library card so they all use
 * the same dimensions and the same popup-blocked fallback.
 */
const OVERLAY_FEATURES =
  "popup=yes,width=380,height=240,menubar=no,toolbar=no,location=no,status=no,resizable=yes";

const OVERLAY_TARGET = "aoe4-overlay";

export const openOverlayFor = (id: string): void => {
  const url = `/build/${id}/run`;
  const win = window.open(url, OVERLAY_TARGET, OVERLAY_FEATURES);
  if (win) return;
  // Popup blocked. Fall back to a regular tab so the user still gets a
  // usable runner; tell them why the layout looks different.
  toast.message("Popup blocked — opening overlay in a new tab.", {
    description: "Allow popups for this site to use the chrome-less window.",
  });
  window.open(url, "_blank", "noopener");
};
