import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatRelativeTime } from "@/lib/relativeTime";

const NOW = 1_700_000_000_000;
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("formatRelativeTime", () => {
  it("reports recent times in words", () => {
    expect(formatRelativeTime(NOW - 30 * SEC)).toBe("just now");
    expect(formatRelativeTime(NOW - 5 * MIN)).toBe("5 min ago");
    expect(formatRelativeTime(NOW - 1 * MIN)).toBe("1 min ago");
    expect(formatRelativeTime(NOW - 1 * HOUR)).toBe("1 hour ago");
    expect(formatRelativeTime(NOW - 3 * HOUR)).toBe("3 hours ago");
    expect(formatRelativeTime(NOW - 30 * HOUR)).toBe("yesterday");
    expect(formatRelativeTime(NOW - 5 * DAY)).toBe("5 days ago");
  });

  it("falls back to a locale date beyond 30 days", () => {
    const old = NOW - 60 * DAY;
    expect(formatRelativeTime(old)).toBe(new Date(old).toLocaleDateString());
  });
});
