import { describe, it, expect } from "vitest";
import { parseJsonFile, isRecord } from "../../src/lib/safe-json.js";

describe("isRecord", () => {
  it("returns true for a plain object", () => {
    expect(isRecord({ a: 1 })).toBe(true);
  });
  it("returns true for empty object", () => {
    expect(isRecord({})).toBe(true);
  });
  it("returns false for null", () => {
    expect(isRecord(null)).toBe(false);
  });
  it("returns false for array", () => {
    expect(isRecord([1, 2])).toBe(false);
  });
  it("returns false for string", () => {
    expect(isRecord("hello")).toBe(false);
  });
  it("returns false for number", () => {
    expect(isRecord(42)).toBe(false);
  });
  it("returns false for undefined", () => {
    expect(isRecord(undefined)).toBe(false);
  });
});

describe("parseJsonFile", () => {
  it("parses valid JSON and passes validation", () => {
    expect(parseJsonFile('{"key": "value"}', "test.json", isRecord)).toEqual({
      key: "value",
    });
  });
  it("throws descriptive error for invalid JSON", () => {
    expect(() => parseJsonFile("{invalid", "bad.json", isRecord)).toThrow(
      /invalid JSON in bad\.json/,
    );
  });
  it("throws on validation failure", () => {
    const isStringArray = (v: unknown): v is string[] =>
      Array.isArray(v) && v.every((x) => typeof x === "string");
    expect(() =>
      parseJsonFile('{"not": "array"}', "shape.json", isStringArray),
    ).toThrow(/unexpected shape in shape\.json/);
  });
  it("preserves cause on parse error", () => {
    try {
      parseJsonFile("{bad", "c.json", isRecord);
    } catch (err) {
      expect((err as Error).cause).toBeDefined();
    }
  });
  it("handles empty object", () => {
    expect(parseJsonFile("{}", "e.json", isRecord)).toEqual({});
  });
});
