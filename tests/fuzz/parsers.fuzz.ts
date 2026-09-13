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

    it("always returns the correct tool label", () => {
      fc.assert(
        fc.property(fc.jsonValue(), (json) => {
          const result = parseStrykerJson(json);
          expect(result.tool).toBe("stryker");
        }),
        { numRuns: 200 },
      );
    });

    it("survived list contains only valid entries", () => {
      fc.assert(
        fc.property(
          fc.record({
            files: fc.dictionary(
              fc.string(),
              fc.record({
                mutants: fc.array(
                  fc.record({
                    id: fc.oneof(
                      fc.string(),
                      fc.integer(),
                      fc.constant(undefined),
                    ),
                    status: fc.oneof(
                      fc.constant("Survived"),
                      fc.constant("Killed"),
                      fc.constant("NoCoverage"),
                      fc.constant("Timeout"),
                      fc.string(),
                    ),
                    mutatorName: fc.oneof(fc.string(), fc.constant(undefined)),
                    location: fc.oneof(
                      fc.constant(undefined),
                      fc.record({
                        start: fc.record({
                          line: fc.oneof(fc.integer(), fc.constant(undefined)),
                          column: fc.oneof(
                            fc.integer(),
                            fc.constant(undefined),
                          ),
                        }),
                        end: fc.oneof(
                          fc.constant(undefined),
                          fc.record({
                            line: fc.oneof(
                              fc.integer(),
                              fc.constant(undefined),
                            ),
                            column: fc.oneof(
                              fc.integer(),
                              fc.constant(undefined),
                            ),
                          }),
                        ),
                      }),
                    ),
                  }),
                ),
              }),
            ),
          }),
          (report) => {
            const result = parseStrykerJson(report);
            for (const m of result.survived) {
              expect(typeof m.file).toBe("string");
              expect(typeof m.mutator).toBe("string");
              expect(typeof m.startLine).toBe("number");
              expect(m.startLine).toBeGreaterThan(0);
              expect(m.endLine).toBeGreaterThanOrEqual(m.startLine);
            }
          },
        ),
        { numRuns: 300 },
      );
    });

    it("non-negative counters", () => {
      fc.assert(
        fc.property(fc.jsonValue(), (json) => {
          const result = parseStrykerJson(json);
          expect(result.noCoverage).toBeGreaterThanOrEqual(0);
          expect(result.killed).toBeGreaterThanOrEqual(0);
          expect(result.survived.length).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 200 },
      );
    });

    it("looksLikeStrykerJson is consistent with parseStrykerJson results", () => {
      fc.assert(
        fc.property(fc.jsonValue(), (json) => {
          if (looksLikeStrykerJson(json)) {
            // If it looks like Stryker, parsing should not throw
            expect(() => parseStrykerJson(json)).not.toThrow();
          }
        }),
        { numRuns: 200 },
      );
    });
  });
});
