import { describe, expect, it } from "vitest";

import {
  parseIstanbul,
  parseLcov,
} from "../../src/engine/coverage-ingestion.js";

describe("parseIstanbul", () => {
  it("parses a minimal Istanbul JSON report", () => {
    const json = JSON.stringify({
      "src/foo.ts": {
        s: { 1: 1, 2: 0, 3: 1 },
        b: { 1: [1, 0] },
        f: { 1: 1, 2: 0 },
        statementMap: {},
        branchMap: {},
        fnMap: {},
      },
    });
    const result = parseIstanbul(json);
    expect(result.format).toBe("istanbul");
    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.path).toBe("src/foo.ts");
    expect(result.files[0]?.lines.total).toBe(3);
    expect(result.files[0]?.lines.covered).toBe(2);
    expect(result.files[0]?.branches.total).toBe(2);
    expect(result.files[0]?.branches.covered).toBe(1);
    expect(result.files[0]?.functions.total).toBe(2);
    expect(result.files[0]?.functions.covered).toBe(1);
  });

  it("skips the total entry", () => {
    const json = JSON.stringify({
      total: { s: { 1: 1 }, b: {}, f: {} },
      "src/bar.ts": { s: { 1: 1 }, b: {}, f: { 1: 1 } },
    });
    const result = parseIstanbul(json);
    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.path).toBe("src/bar.ts");
  });

  it("computes summary percentages", () => {
    const json = JSON.stringify({
      "src/a.ts": {
        s: { 1: 1, 2: 1 },
        b: { 1: [1, 1] },
        f: { 1: 1 },
        statementMap: {},
        branchMap: {},
        fnMap: {},
      },
    });
    const result = parseIstanbul(json);
    expect(result.summary.linesPct).toBe(100);
    expect(result.summary.branchesPct).toBe(100);
    expect(result.summary.functionsPct).toBe(100);
  });

  it("throws on non-object JSON", () => {
    expect(() => parseIstanbul('"string"')).toThrow("not a valid JSON object");
  });

  it("handles empty coverage", () => {
    const json = JSON.stringify({
      "src/empty.ts": { s: {}, b: {}, f: {} },
    });
    const result = parseIstanbul(json);
    expect(result.files[0]?.lines.pct).toBe(100);
    expect(result.files[0]?.branches.pct).toBe(100);
    expect(result.files[0]?.functions.pct).toBe(100);
  });
});

describe("parseLcov", () => {
  it("parses a minimal LCOV report", () => {
    const lcov = [
      "SF:src/foo.ts",
      "FNF:3",
      "FNH:2",
      "BRF:4",
      "BRH:1",
      "LF:10",
      "LH:7",
      "end_of_record",
    ].join("\n");
    const result = parseLcov(lcov);
    expect(result.format).toBe("lcov");
    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.path).toBe("src/foo.ts");
    expect(result.files[0]?.lines.total).toBe(10);
    expect(result.files[0]?.lines.covered).toBe(7);
    expect(result.files[0]?.branches.total).toBe(4);
    expect(result.files[0]?.branches.covered).toBe(1);
    expect(result.files[0]?.functions.total).toBe(3);
    expect(result.files[0]?.functions.covered).toBe(2);
  });

  it("parses multiple entries", () => {
    const lcov = [
      "SF:src/a.ts",
      "LF:5",
      "LH:5",
      "BRF:0",
      "BRH:0",
      "FNF:1",
      "FNH:1",
      "end_of_record",
      "SF:src/b.ts",
      "LF:10",
      "LH:0",
      "BRF:2",
      "BRH:0",
      "FNF:2",
      "FNH:0",
      "end_of_record",
    ].join("\n");
    const result = parseLcov(lcov);
    expect(result.files).toHaveLength(2);
    expect(result.files[0]?.path).toBe("src/a.ts");
    expect(result.files[1]?.path).toBe("src/b.ts");
  });

  it("computes summary from all files", () => {
    const lcov = [
      "SF:src/a.ts",
      "LF:10",
      "LH:10",
      "BRF:0",
      "BRH:0",
      "FNF:0",
      "FNH:0",
      "end_of_record",
    ].join("\n");
    const result = parseLcov(lcov);
    expect(result.summary.linesPct).toBe(100);
  });

  it("returns empty files for empty input", () => {
    const result = parseLcov("");
    expect(result.files).toHaveLength(0);
  });

  it("computes percentages correctly", () => {
    const lcov = [
      "SF:src/x.ts",
      "LF:4",
      "LH:2",
      "BRF:4",
      "BRH:1",
      "FNF:4",
      "FNH:3",
      "end_of_record",
    ].join("\n");
    const result = parseLcov(lcov);
    expect(result.files[0]?.lines.pct).toBe(50);
    expect(result.files[0]?.branches.pct).toBe(25);
    expect(result.files[0]?.functions.pct).toBe(75);
  });
});
