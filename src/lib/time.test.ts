import { describe, expect, it } from "vitest";
import { formatTime, parseTime } from "./time";

describe("formatTime", () => {
  it("returns '—' for undefined / null / NaN input", () => {
    expect(formatTime(undefined)).toBe("—");
    expect(formatTime(NaN)).toBe("—");
  });

  it("pads seconds to two digits", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(59)).toBe("0:59");
  });

  it("formats minutes without padding and seconds with padding", () => {
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(725)).toBe("12:05");
  });

  it("clamps negatives to zero", () => {
    expect(formatTime(-10)).toBe("0:00");
  });

  it("floors fractional seconds", () => {
    expect(formatTime(65.9)).toBe("1:05");
  });
});

describe("parseTime", () => {
  it("parses 'm:ss' forms", () => {
    expect(parseTime("0:00")).toBe(0);
    expect(parseTime("1:05")).toBe(65);
    expect(parseTime("12:05")).toBe(725);
  });

  it("parses bare integer seconds", () => {
    expect(parseTime("0")).toBe(0);
    expect(parseTime("725")).toBe(725);
  });

  it("trims surrounding whitespace", () => {
    expect(parseTime("  1:05  ")).toBe(65);
    expect(parseTime(" 30 ")).toBe(30);
  });

  it("returns null for empty or malformed input", () => {
    expect(parseTime("")).toBeNull();
    expect(parseTime("   ")).toBeNull();
    expect(parseTime("abc")).toBeNull();
    expect(parseTime("1:60")).toBeNull(); // seconds ≥ 60 rejected
    expect(parseTime("1:aa")).toBeNull();
    expect(parseTime("-5")).toBeNull();
  });

  it("round-trips with formatTime for representable values", () => {
    for (const s of [0, 5, 59, 60, 65, 125, 725, 3600]) {
      expect(parseTime(formatTime(s))).toBe(s);
    }
  });
});
