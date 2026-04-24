import { describe, expect, it } from "vitest";
import { parseNoteTokens } from "./noteRenderer";

describe("parseNoteTokens", () => {
  it("returns an empty array for empty input", () => {
    expect(parseNoteTokens("")).toEqual([]);
  });

  it("treats plain text as a single text token", () => {
    expect(parseNoteTokens("hello world")).toEqual([
      { kind: "text", value: "hello world" },
    ]);
  });

  it("recognizes @path.png@ and @path.webp@ tokens", () => {
    expect(parseNoteTokens("build @unit/knight.png@ here")).toEqual([
      { kind: "text", value: "build " },
      { kind: "image", path: "unit/knight.png" },
      { kind: "text", value: " here" },
    ]);
    expect(parseNoteTokens("@age/age_3.webp@")).toEqual([
      { kind: "image", path: "age/age_3.webp" },
    ]);
  });

  it("handles consecutive icon tokens", () => {
    expect(parseNoteTokens("@a.png@@b.png@")).toEqual([
      { kind: "image", path: "a.png" },
      { kind: "image", path: "b.png" },
    ]);
  });

  it("ignores tokens with whitespace in their path", () => {
    expect(parseNoteTokens("@bad path.png@")).toEqual([
      { kind: "text", value: "@bad path.png@" },
    ]);
  });

  it("returns the same (cached) array when called twice with identical input", () => {
    const a = parseNoteTokens("same input @a.png@");
    const b = parseNoteTokens("same input @a.png@");
    expect(a).toBe(b);
  });
});
