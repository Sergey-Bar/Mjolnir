import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  parseStrykerJson,
  looksLikeStrykerJson,
} from "../../src/mutation/parse-stryker.js";

describe("parsers fuzz", () => {
  describe("Stryker JSON parser — property-based", () => {
    it("never throws on arbitrary JSON-shaped input", () => {
      fc.assert(
        fc.property(fc.jsonValue(), (json) => {
          expect(() => parseStrykerJson(json)).not.toThrow();
        }),
        { numRuns: 500 },
      );
    });
    it("always returns correct tool label", () => {
      fc.assert(
        fc.property(fc.jsonValue(), (json) => {
          expect(parseStrykerJson(json).tool).toBe("stryker");
        }),
        { numRuns: 200 },
      );
    });
    it("non-negative counters", () => {
      fc.assert(
        fc.property(fc.jsonValue(), (json) => {
          const r = parseStrykerJson(json);
          expect(r.noCoverage).toBeGreaterThanOrEqual(0);
          expect(r.killed).toBeGreaterThanOrEqual(0);
          expect(r.survived.length).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 200 },
      );
    });
    it("looksLikeStrykerJson is consistent with parseStrykerJson", () => {
      fc.assert(
        fc.property(fc.jsonValue(), (json) => {
          if (looksLikeStrykerJson(json))
            expect(() => parseStrykerJson(json)).not.toThrow();
        }),
        { numRuns: 200 },
      );
    });
  });
});
