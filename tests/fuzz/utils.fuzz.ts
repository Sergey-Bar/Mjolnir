import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { parseJsonFile, isRecord } from "../../src/lib/safe-json.js";
import { pct } from "../../src/lib/format.js";

describe("utility fuzz", () => {
  describe("safe-json — property-based", () => {
    it("parseJsonFile never crashes on arbitrary input", () => {
      fc.assert(
        fc.property(fc.oneof(fc.json(), fc.string()), (input) => {
          const text = typeof input === "string" ? input : input;
          try {
            const result = parseJsonFile(text, "fuzz.json", isRecord);
            expect(typeof result).toBe("object");
          } catch (err) {
            expect((err as Error).message).toMatch(
              /(invalid JSON|unexpected shape)/,
            );
          }
        }),
        { numRuns: 500 },
      );
    });
    it("isRecord returns false for non-objects", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer(),
            fc.boolean(),
            fc.constant(null),
            fc.constant(undefined),
            fc.array(fc.anything()),
          ),
          (v) => {
            expect(isRecord(v)).toBe(false);
          },
        ),
        { numRuns: 200 },
      );
    });
  });
  describe("pct — property-based", () => {
    it("always ends with %", () => {
      fc.assert(
        fc.property(fc.double(), (v) => {
          expect(pct(v)).toMatch(/%$/);
        }),
        { numRuns: 200 },
      );
    });
    it("output is parseable as percentage for [0,1]", () => {
      fc.assert(
        fc.property(fc.double({ min: 0, max: 1 }), (v) => {
          const num = parseInt(pct(v).replace("%", ""), 10);
          expect(num).toBeGreaterThanOrEqual(0);
          expect(num).toBeLessThanOrEqual(100);
        }),
        { numRuns: 200 },
      );
    });
  });
});
