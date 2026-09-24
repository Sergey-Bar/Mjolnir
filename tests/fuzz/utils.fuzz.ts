import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { parseJsonFile, isRecord } from "../../src/lib/safe-json.js";
import { pct } from "../../src/lib/format.js";

const FUZZ_SEED = 1789486902;

describe("utility fuzz", () => {
  describe("safe-json — property-based", () => {
    it("parseJsonFile never throws on valid JSON with isRecord predicate", () => {
      fc.assert(
        fc.property(fc.oneof(fc.json(), fc.string()), (input) => {
          const text = typeof input === "string" ? input : input;
          // Either succeeds or throws with a descriptive error — never a raw crash
          try {
            const result = parseJsonFile(text, "fuzz.json", isRecord);
            expect(typeof result).toBe("object");
            expect(result).not.toBeNull();
          } catch (err) {
            expect((err as Error).message).toMatch(
              /(invalid JSON|unexpected shape)/,
            );
          }
        }),
        { seed: FUZZ_SEED, numRuns: 500 },
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
        { seed: FUZZ_SEED, numRuns: 200 },
      );
    });
  });

  describe("pct — property-based", () => {
    it("pct always ends with %", () => {
      fc.assert(
        fc.property(fc.double(), (v) => {
          expect(pct(v)).toMatch(/%$/);
        }),
        { seed: FUZZ_SEED, numRuns: 200 },
      );
    });

    it("pct output is parseable back as a percentage", () => {
      fc.assert(
        fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (v) => {
          const result = pct(v);
          const num = parseInt(result.replace("%", ""), 10);
          expect(num).toBeGreaterThanOrEqual(0);
          expect(num).toBeLessThanOrEqual(100);
        }),
        { seed: FUZZ_SEED, numRuns: 200 },
      );
    });
  });
});
