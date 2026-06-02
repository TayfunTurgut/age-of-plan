import { describe, expect, it } from "vitest";

import { formatTime, parseTime } from "@/lib/time";

describe("formatTime", () => {
  it("formats seconds as m:ss with zero-padding", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(600)).toBe("10:00");
  });

  it("floors fractional seconds and clamps negatives", () => {
    expect(formatTime(65.9)).toBe("1:05");
    expect(formatTime(-10)).toBe("0:00");
  });

  it("returns an em dash for missing/invalid input", () => {
    expect(formatTime(undefined)).toBe("—");
    expect(formatTime(NaN)).toBe("—");
  });
});

describe("parseTime", () => {
  it("parses m:ss into seconds", () => {
    expect(parseTime("1:05")).toBe(65);
    expect(parseTime("10:00")).toBe(600);
    expect(parseTime("0:09")).toBe(9);
  });

  it("parses plain seconds", () => {
    expect(parseTime("90")).toBe(90);
  });

  it("round-trips with formatTime", () => {
    for (const s of [0, 5, 65, 125, 600, 3599]) {
      expect(parseTime(formatTime(s))).toBe(s);
    }
  });

  it("rejects malformed input", () => {
    expect(parseTime("")).toBeNull();
    expect(parseTime("  ")).toBeNull();
    expect(parseTime("1:60")).toBeNull();
    expect(parseTime("abc")).toBeNull();
    expect(parseTime("1:2:3")).toBeNull();
  });
});
