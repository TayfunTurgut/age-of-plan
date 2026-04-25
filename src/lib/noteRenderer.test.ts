import { describe, expect, it } from "vitest";
import { hasNoteTokens, parseNoteTokens } from "./noteRenderer";

describe("parseNoteTokens", () => {
  it("returns an empty array for empty input", () => {
    expect(parseNoteTokens("")).toEqual([]);
  });

  it("treats plain text as a single text token", () => {
    expect(parseNoteTokens("hello world")).toEqual([
      { kind: "text", value: "hello world" },
    ]);
  });

  it("recognizes {{path.png}} and {{path.webp}} tokens", () => {
    expect(parseNoteTokens("build {{unit/knight.png}} here")).toEqual([
      { kind: "text", value: "build " },
      { kind: "image", path: "unit/knight.png" },
      { kind: "text", value: " here" },
    ]);
    expect(parseNoteTokens("{{age/age-3.webp}}")).toEqual([
      { kind: "image", path: "age/age-3.webp" },
    ]);
  });

  it("handles consecutive icon tokens", () => {
    expect(parseNoteTokens("{{a.png}}{{b.png}}")).toEqual([
      { kind: "image", path: "a.png" },
      { kind: "image", path: "b.png" },
    ]);
  });

  it("ignores tokens with whitespace in their path", () => {
    expect(parseNoteTokens("{{bad path.png}}")).toEqual([
      { kind: "text", value: "{{bad path.png}}" },
    ]);
  });

  it("ignores stray braces and unclosed tokens", () => {
    expect(parseNoteTokens("{not.png} or {{half.png}")).toEqual([
      { kind: "text", value: "{not.png} or {{half.png}" },
    ]);
  });

  it("does not match the legacy @...@ syntax", () => {
    expect(parseNoteTokens("@unit/knight.png@")).toEqual([
      { kind: "text", value: "@unit/knight.png@" },
    ]);
  });

  it("returns the same (cached) array when called twice with identical input", () => {
    const a = parseNoteTokens("same input {{a.png}}");
    const b = parseNoteTokens("same input {{a.png}}");
    expect(a).toBe(b);
  });
});

describe("hasNoteTokens", () => {
  it("is false for plain text and true when at least one token is present", () => {
    expect(hasNoteTokens("plain note")).toBe(false);
    expect(hasNoteTokens("with {{unit/knight.png}}")).toBe(true);
  });

  it("is stable across repeated calls (no regex lastIndex bleed)", () => {
    const text = "{{a.png}} and {{b.png}}";
    expect(hasNoteTokens(text)).toBe(true);
    expect(hasNoteTokens(text)).toBe(true);
    expect(hasNoteTokens(text)).toBe(true);
  });
});
