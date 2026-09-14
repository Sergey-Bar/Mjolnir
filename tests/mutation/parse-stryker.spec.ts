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
        looksLikeStrykerJson({ files: { "src/foo.ts": { mutants: [] } } }),
      ).toBe(true);
    });
  });

  describe("happy path", () => {
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
      expect(parseStrykerJson(report).noCoverage).toBe(2);
    });
    it("counts Killed and Timeout as killed", () => {
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
      expect(parseStrykerJson(report).killed).toBe(3);
    });
    it("handles multi-line mutants", () => {
      const report = {
        files: {
          "src/foo.ts": {
            mutants: [
              {
                id: "1",
                mutatorName: "Block",
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
      expect(result.survived[0]?.startLine).toBe(5);
      expect(result.survived[0]?.endLine).toBe(11);
    });
    it("normalizes Windows backslash paths", () => {
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
      expect(parseStrykerJson(report).survived[0]?.file).toBe(
        "src/auth/login.ts",
      );
    });
  });

  describe("defensive edges", () => {
    it("returns empty for null", () => {
      expect(parseStrykerJson(null)).toEqual({
        tool: "stryker",
        survived: [],
        noCoverage: 0,
        killed: 0,
      });
    });
    it("returns empty for non-object", () => {
      expect(parseStrykerJson(42)).toEqual({
        tool: "stryker",
        survived: [],
        noCoverage: 0,
        killed: 0,
      });
    });
    it("returns empty when files missing", () => {
      expect(parseStrykerJson({ schemaVersion: "1" })).toEqual({
        tool: "stryker",
        survived: [],
        noCoverage: 0,
        killed: 0,
      });
    });
    it("skips null/undefined mutants", () => {
      const report = {
        files: {
          "src/foo.ts": {
            mutants: [null, undefined, { id: "1", status: "Killed" }],
          },
        },
      };
      expect(parseStrykerJson(report).killed).toBe(1);
    });
    it("skips files with null value", () => {
      const report = {
        files: {
          "src/foo.ts": null,
          "src/bar.ts": { mutants: [{ id: "1", status: "Killed" }] },
        },
      };
      expect(parseStrykerJson(report).killed).toBe(1);
    });
    it("defaults mutatorName to unknown", () => {
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
      expect(parseStrykerJson(report).survived[0]?.mutator).toBe("unknown");
    });
    it("skips negative line numbers", () => {
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
      expect(parseStrykerJson(report).survived).toHaveLength(0);
    });
    it("endLine clamped to at least startLine", () => {
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
      const r = parseStrykerJson(report);
      expect(r.survived[0]?.endLine).toBe(r.survived[0]?.startLine);
    });
    it("handles non-array mutants", () => {
      const report = { files: { "src/foo.ts": { mutants: "not-an-array" } } };
      expect(parseStrykerJson(report).killed).toBe(0);
    });
  });
});
