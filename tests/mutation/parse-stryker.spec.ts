import { describe, it, expect } from "vitest";
import {
  looksLikeStrykerJson,
  parseStrykerJson,
} from "../../src/mutation/parse-stryker.js";

describe("parseStrykerJson", () => {
  describe("looksLikeStrykerJson", () => {
    it("returns true for a valid Stryker report shape", () => {
      expect(looksLikeStrykerJson({ files: {} })).toBe(true);
    });

    it("returns false for null", () => {
      expect(looksLikeStrykerJson(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(looksLikeStrykerJson(undefined)).toBe(false);
    });

    it("returns false for a string", () => {
      expect(looksLikeStrykerJson("not json")).toBe(false);
    });

    it("returns false for an object without files", () => {
      expect(looksLikeStrykerJson({ schemaVersion: "1" })).toBe(false);
    });

    it("returns false for an object with files: null", () => {
      expect(looksLikeStrykerJson({ files: null })).toBe(false);
    });

    it("returns true when files has entries", () => {
      expect(
        looksLikeStrykerJson({
          files: { "src/foo.ts": { mutants: [] } },
        }),
      ).toBe(true);
    });
  });

  describe("parseStrykerJson — happy path", () => {
    it("parses survived mutants with 0-based to 1-based line conversion", () => {
      const report = {
        files: {
          "src/auth.ts": {
            mutants: [
              {
                id: "1",
                mutatorName: "StringLiteral",
                status: "Survived",
                location: {
                  start: { line: 9, column: 5 },
                  end: { line: 9, column: 20 },
                },
              },
            ],
          },
        },
      };
      const result = parseStrykerJson(report);
      expect(result.tool).toBe("stryker");
      expect(result.survived).toHaveLength(1);
      expect(result.survived[0]).toEqual({
        file: "src/auth.ts",
        mutator: "StringLiteral",
        startLine: 10,
        endLine: 10,
      });
    });

    it("counts NoCoverage mutants separately", () => {
      const report = {
        files: {
          "src/foo.ts": {
            mutants: [
              { id: "1", status: "NoCoverage" },
              { id: "2", status: "NoCoverage" },
            ],
          },
        },
      };
      const result = parseStrykerJson(report);
      expect(result.noCoverage).toBe(2);
      expect(result.survived).toHaveLength(0);
    });

    it("counts Killed and Timeout mutants as killed", () => {
      const report = {
        files: {
          "src/foo.ts": {
            mutants: [
              { id: "1", status: "Killed" },
              { id: "2", status: "Timeout" },
              { id: "3", status: "Killed" },
            ],
          },
        },
      };
      const result = parseStrykerJson(report);
      expect(result.killed).toBe(3);
    });

    it("handles multi-line mutants (endLine > startLine)", () => {
      const report = {
        files: {
          "src/foo.ts": {
            mutants: [
              {
                id: "1",
                mutatorName: "BlockStatement",
                status: "Survived",
                location: {
                  start: { line: 4, column: 0 },
                  end: { line: 10, column: 1 },
                },
              },
            ],
          },
        },
      };
      const result = parseStrykerJson(report);
      expect(result.survived).toHaveLength(1);
      expect(result.survived[0]).toMatchObject({ startLine: 5, endLine: 11 });
    });

    it("normalizes Windows backslash paths to POSIX", () => {
      const report = {
        files: {
          "src\\auth\\login.ts": {
            mutants: [
              {
                id: "1",
                status: "Survived",
                location: { start: { line: 0, column: 0 } },
              },
            ],
          },
        },
      };
      const result = parseStrykerJson(report);
      expect(result.survived).toHaveLength(1);
      expect(result.survived[0]).toMatchObject({ file: "src/auth/login.ts" });
    });
  });

  describe("parseStrykerJson — defensive edges", () => {
    it("returns empty result for null input", () => {
      const result = parseStrykerJson(null);
      expect(result).toEqual({
        tool: "stryker",
        survived: [],
        noCoverage: 0,
        killed: 0,
      });
    });

    it("returns empty result for non-object input", () => {
      expect(parseStrykerJson(42)).toEqual({
        tool: "stryker",
        survived: [],
        noCoverage: 0,
        killed: 0,
      });
    });

    it("returns empty result when files is missing", () => {
      expect(parseStrykerJson({ schemaVersion: "1" })).toEqual({
        tool: "stryker",
        survived: [],
        noCoverage: 0,
        killed: 0,
      });
    });

    it("skips null/undefined mutants in the array", () => {
      const report = {
        files: {
          "src/foo.ts": {
            mutants: [null, undefined, { id: "1", status: "Killed" }],
          },
        },
      };
      const result = parseStrykerJson(report);
      expect(result.killed).toBe(1);
    });

    it("skips files with null value", () => {
      const report = {
        files: {
          "src/foo.ts": null,
          "src/bar.ts": { mutants: [{ id: "1", status: "Killed" }] },
        },
      };
      const result = parseStrykerJson(report);
      expect(result.killed).toBe(1);
    });

    it("skips mutants with missing location for Survived status", () => {
      const report = {
        files: {
          "src/foo.ts": {
            mutants: [
              { id: "1", status: "Survived" },
              {
                id: "2",
                status: "Survived",
                location: { start: { line: 0 } },
              },
            ],
          },
        },
      };
      const result = parseStrykerJson(report);
      expect(result.survived).toHaveLength(1);
      expect(result.survived[0]).toMatchObject({ startLine: 1 });
    });

    it("defaults mutatorName to 'unknown' when missing", () => {
      const report = {
        files: {
          "src/foo.ts": {
            mutants: [
              {
                id: "1",
                status: "Survived",
                location: { start: { line: 5, column: 0 } },
              },
            ],
          },
        },
      };
      const result = parseStrykerJson(report);
      expect(result.survived).toHaveLength(1);
      expect(result.survived[0]).toMatchObject({ mutator: "unknown" });
    });

    it("skips mutants with negative line numbers", () => {
      const report = {
        files: {
          "src/foo.ts": {
            mutants: [
              {
                id: "1",
                status: "Survived",
                location: { start: { line: -1, column: 0 } },
              },
            ],
          },
        },
      };
      const result = parseStrykerJson(report);
      expect(result.survived).toHaveLength(0);
    });

    it("handles empty files object", () => {
      const result = parseStrykerJson({ files: {} });
      expect(result.survived).toHaveLength(0);
      expect(result.noCoverage).toBe(0);
      expect(result.killed).toBe(0);
    });

    it("handles mutants without status field", () => {
      const report = {
        files: {
          "src/foo.ts": {
            mutants: [
              { id: "1" },
              { id: "2", status: "Survived", location: { start: { line: 0 } } },
            ],
          },
        },
      };
      const result = parseStrykerJson(report);
      expect(result.survived).toHaveLength(1);
      expect(result.killed).toBe(0);
      expect(result.noCoverage).toBe(0);
    });

    it("endLine is clamped to at least startLine", () => {
      const report = {
        files: {
          "src/foo.ts": {
            mutants: [
              {
                id: "1",
                status: "Survived",
                location: {
                  start: { line: 10, column: 0 },
                  end: { line: 5, column: 0 },
                },
              },
            ],
          },
        },
      };
      const result = parseStrykerJson(report);
      expect(result.survived).toHaveLength(1);
      expect(result.survived[0]).toMatchObject({
        endLine: result.survived[0]?.startLine,
      });
    });

    it("handles non-array mutants field", () => {
      const report = {
        files: {
          "src/foo.ts": { mutants: "not-an-array" },
        },
      };
      const result = parseStrykerJson(report);
      expect(result.killed).toBe(0);
    });
  });
});
