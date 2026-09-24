import { describe, it, expect } from "vitest";
import { parseJsonFile, isRecord } from "../../src/lib/safe-json.js";

describe("isRecord", () => {
  it("returns true for a plain object", () => {
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it("returns true for an empty object", () => {
    expect(isRecord({})).toBe(true);
  });

  it("returns false for null", () => {
    expect(isRecord(null)).toBe(false);
  });

  it("returns false for an array", () => {
    expect(isRecord([1, 2, 3])).toBe(false);
  });

  it("returns false for a string", () => {
    expect(isRecord("hello")).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isRecord(42)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isRecord(undefined)).toBe(false);
  });

  it("returns true for object with nested values", () => {
    expect(isRecord({ nested: { deep: true } })).toBe(true);
  });
});

describe("parseJsonFile", () => {
  it("parses valid JSON and passes validation", () => {
    const result = parseJsonFile('{"key": "value"}', "test.json", isRecord);
    expect(result).toEqual({ key: "value" });
  });

  it("throws descriptive error for invalid JSON", () => {
    expect(() => parseJsonFile("{invalid", "bad.json", isRecord)).toThrow(
      /invalid JSON in bad\.json/,
    );
  });

  it("throws error including source name on validation failure", () => {
    const isStringArray = (v: unknown): v is string[] =>
      Array.isArray(v) && v.every((x) => typeof x === "string");

    expect(() =>
      parseJsonFile('{"not": "array"}', "shape.json", isStringArray),
    ).toThrow(/unexpected shape in shape\.json/);
  });

  it("preserves cause on parse error", () => {
    try {
      parseJsonFile("{bad", "cause-test.json", isRecord);
    } catch (err) {
      expect((err as Error).cause).toBeDefined();
    }
  });

  it("preserves cause on validation error", () => {
    const isString = (v: unknown): v is string => typeof v === "string";
    try {
      parseJsonFile("42", "cause-test.json", isString);
    } catch (err) {
      expect((err as Error).cause).toBe(42);
    }
  });

  it("handles nested JSON structures", () => {
    const isConfig = (v: unknown): v is { name: string; version: number } =>
      typeof v === "object" &&
      v !== null &&
      typeof (v as { name?: unknown }).name === "string" &&
      typeof (v as { version?: unknown }).version === "number";

    const result = parseJsonFile(
      '{"name": "test", "version": 1}',
      "config.json",
      isConfig,
    );
    expect(result.name).toBe("test");
    expect(result.version).toBe(1);
  });

  it("handles empty object JSON", () => {
    const result = parseJsonFile("{}", "empty.json", isRecord);
    expect(result).toEqual({});
  });

  it("rejects oversized JSON before parsing", () => {
    expect(() =>
      parseJsonFile(
        `"${"x".repeat(16 * 1024 * 1024)}"`,
        "large.json",
        isRecord,
      ),
    ).toThrow(/exceeds the 16777216-byte limit/);
  });

  it("handles whitespace-only JSON object", () => {
    const result = parseJsonFile("  { }  ", "ws.json", isRecord);
    expect(result).toEqual({});
  });
});
