/**
 * Time helpers for build-order steps. Canonical storage is integer seconds;
 * display is "m:ss".
 */

/** Format canonical seconds as "m:ss". Returns "—" for missing/invalid input. */
export function formatTime(seconds?: number): string {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) {
    return "—";
  }
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/** Parse "m:ss" or plain seconds into canonical seconds. Returns null if unparseable. */
export function parseTime(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const colon = trimmed.match(/^(\d+):([0-5]?\d)$/);
  if (colon) {
    return parseInt(colon[1], 10) * 60 + parseInt(colon[2], 10);
  }

  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  return null;
}
