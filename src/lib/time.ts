/**
 * Time helpers for build-order steps.
 * Canonical storage is integer seconds; display is "m:ss".
 */

export const formatTime = (seconds?: number): string => {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) return "—";
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const parseTime = (input: string): number | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Accept "m:ss" or plain seconds.
  const colon = trimmed.match(/^(\d+):([0-5]?\d)$/);
  if (colon) {
    const m = parseInt(colon[1], 10);
    const s = parseInt(colon[2], 10);
    return m * 60 + s;
  }
  const plain = trimmed.match(/^\d+$/);
  if (plain) return parseInt(trimmed, 10);
  return null;
};
