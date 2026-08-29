/**
 * Unit tests for the shared position helpers (Phase 6 — Tempering Plan).
 *
 * `lineAt` / `colAt` / `matchBrace` are used by every collapsed rule
 * family for finding coordinates and method-body extraction. They were
 * previously only exercised transitively through rule fixtures — this
 * pins their behavior directly, including the unmatched / nested cases.
 */

import { describe, expect, it } from "vitest";
import { lineAt, colAt, matchBrace } from "../src/rules/shared/positions.js";

const SRC = "line one\nline two\nline three";

describe("lineAt", () => {
  it("is 1-based and returns 1 for an offset on the first line", () => {
    expect(lineAt(SRC, 0)).toBe(1);
    expect(lineAt(SRC, 5)).toBe(1);
  });

  it("counts each newline before the offset", () => {
    expect(lineAt(SRC, SRC.indexOf("two"))).toBe(2);
    expect(lineAt(SRC, SRC.indexOf("three"))).toBe(3);
  });

  it("returns 1 for offset 0 of empty text", () => {
    expect(lineAt("", 0)).toBe(1);
  });
});

describe("colAt", () => {
  it("is 1-based from the start of the current line", () => {
    expect(colAt(SRC, 0)).toBe(1);
    expect(colAt(SRC, 4)).toBe(5);
  });

  it("resets to 1 immediately after a newline", () => {
    const afterFirstBreak = SRC.indexOf("\n") + 1;
    expect(colAt(SRC, afterFirstBreak)).toBe(1);
  });

  it("counts from the most recent newline on a later line", () => {
    const idx = SRC.indexOf("three");
    expect(colAt(SRC, idx)).toBe("line ".length + 1);
  });
});

describe("matchBrace", () => {
  it("returns the index of the matching close for a flat pair", () => {
    const t = "a { b } c";
    expect(matchBrace(t, t.indexOf("{"))).toBe(t.indexOf("}"));
  });

  it("skips nested pairs and matches the outermost brace", () => {
    const t = "fn() { if (x) { y(); } z(); }";
    expect(matchBrace(t, t.indexOf("{"))).toBe(t.length - 1);
  });

  it("returns -1 when the opening brace is never closed", () => {
    expect(matchBrace("fn() { open forever", 5)).toBe(-1);
  });

  it("supports custom open/close characters", () => {
    const t = "call(a, (b + c), d)";
    expect(matchBrace(t, t.indexOf("("), "(", ")")).toBe(t.length - 1);
  });
});
