import { afterEach, describe, expect, it, vi } from "vitest";

import { newId } from "@/lib/id";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("newId", () => {
  it("produces a valid v4 UUID", () => {
    expect(newId()).toMatch(UUID_RE);
  });

  it("produces unique ids", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId()));
    expect(ids.size).toBe(1000);
  });

  it("falls back to getRandomValues when randomUUID is unavailable (non-secure context)", () => {
    // Simulate plain-http LAN access where crypto.randomUUID is undefined.
    vi.spyOn(crypto, "randomUUID").mockImplementation(() => {
      throw new TypeError("crypto.randomUUID is not a function");
    });
    // Force the typeof-function check to fail by removing the method.
    const original = crypto.randomUUID;
    // @ts-expect-error intentionally removing for the test
    crypto.randomUUID = undefined;
    try {
      expect(newId()).toMatch(UUID_RE);
    } finally {
      crypto.randomUUID = original;
    }
  });
});
