/**
 * P4 forensics breadth (product-gap-remediation master plan, plan
 * 1788853205786 — flag 7, decision 5): Jest + Vitest JSON parsers into
 * TestRecord, with honest degradation locked.
 *
 * The contract under test:
 *  - discovery: Jest/Vitest reports are recognized BEFORE Playwright's
 *    parser can silently swallow them (they share `testResults`);
 *  - one attempt per record — their reports carry no per-attempt
 *    history, so TRUE-FLAKE can never fire from these sources;
 *  - non-executing states (pending/todo/disabled/skipped) → skipped
 *    (a test that did not run is not a passing test);
 *  - corrupt JSON and shapeless payloads degrade to zero records, never
 *    a crash (Bug-audit M3 containment extends to the new parsers);
 *  - 1-based editor locations survive as the corroboration `line`.
 */

import { describe, expect, it } from "vitest";
import {
  looksLikeJestJson,
  parseJestJson,
} from "../../src/forensics/parse-jest-json.js";
import {
  looksLikeVitestJson,
  parseVitestJson,
} from "../../src/forensics/parse-vitest-json.js";
import { runForensics } from "../../src/forensics/run.js";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const JEST_REPORT = {
  numTotalTests: 3,
  testResults: [
    {
      testFilePath: "/repo/src/auth.spec.ts",
      testResults: [
        {
          ancestorTitles: ["auth"],
          title: "logs in",
          status: "passed",
          duration: 42,
          location: { line: 7, column: 3 },
        },
        {
          ancestorTitles: ["auth"],
          title: "legacy login",
          status: "skipped",
          duration: 0,
          location: { line: 13, column: 3 },
        },
        {
          ancestorTitles: ["api"],
          title: "fetches data",
          status: "failed",
          duration: 120,
          location: { line: 21, column: 5 },
        },
      ],
    },
  ],
};

const VITEST_REPORT = {
  numTotalTests: 2,
  testResults: [
    {
      filepath: "/repo/src/cart.spec.ts",
      status: "failed",
      assertionResults: [
        {
          ancestorTitles: ["cart"],
          title: "adds item",
          status: "passed",
          duration: 15,
          location: { line: 4, column: 3 },
        },
        {
          ancestorTitles: ["cart"],
          title: "checkout fails",
          status: "failed",
          duration: 90,
          location: { line: 11, column: 3 },
        },
      ],
    },
  ],
};

describe("Jest JSON parser (P4)", () => {
  it("maps testResults → one TestRecord per assertion with 1 attempt", () => {
    const records = parseJestJson(JEST_REPORT);
    expect(records).toHaveLength(3);
    expect(records.every((r) => r.attempts.length === 1)).toBe(true);
    expect(records[0]).toMatchObject({
      file: "/repo/src/auth.spec.ts",
      title: "logs in",
      attempts: [{ index: 1, status: "passed", durationMs: 42 }],
    });
  });

  it("carries 1-based editor lines for corroboration", () => {
    const records = parseJestJson(JEST_REPORT);
    expect(records[0]?.line).toBe(7);
    expect(records[2]?.line).toBe(21);
  });

  it("non-executing statuses (pending/todo/disabled) → skipped", () => {
    const records = parseJestJson({
      testResults: [
        {
          testResults: [
            { title: "a", status: "pending" },
            { title: "b", status: "todo" },
            { title: "c", status: "disabled" },
          ],
        },
      ],
    });
    expect(records.every((r) => r.attempts[0]?.status === "skipped")).toBe(
      true,
    );
  });

  it("an unknown status degrades to interrupted, never to passed", () => {
    const records = parseJestJson({
      testResults: [{ testResults: [{ title: "x", status: "wat" }] }],
    });
    expect(records[0]?.attempts[0]?.status).toBe("interrupted");
  });

  it("defensive edges: missing duration/location, negative duration, missing path", () => {
    const records = parseJestJson({
      testResults: [
        {
          testResults: [
            { title: "no duration", status: "passed" },
            { title: "negative", status: "passed", duration: -5 },
            { title: "no location", status: "failed", duration: 10 },
            {
              title: "zero line",
              status: "passed",
              duration: 10,
              location: { line: 0, column: 1 },
            },
          ],
        },
        { testResults: [{ title: "no path test", status: "passed" }] },
      ],
    });
    expect(records).toHaveLength(5);
    expect(records.every((r) => (r.attempts[0]?.durationMs ?? 0) >= 0)).toBe(
      true,
    );
    expect(records.every((r) => r.line === undefined)).toBe(true);
    // The second file entry carried no testFilePath → the honest
    // "unknown" identity, never a crash.
    expect(records[4]?.file).toBe("unknown");
  });

  it("corrupt/shapeless payloads degrade to zero records (M3 containment)", () => {
    expect(parseJestJson(null)).toEqual([]);
    expect(parseJestJson("nope")).toEqual([]);
    expect(parseJestJson({ testResults: [null, 5, {}] })).toEqual([]);
    expect(
      parseJestJson({ testResults: [{ testResults: "not-an-array" }] }),
    ).toEqual([]);
  });

  it("looksLikeJestJson: true for the Jest shape, false for Vitest/Playwright/garbage", () => {
    expect(looksLikeJestJson(JEST_REPORT)).toBe(true);
    expect(looksLikeJestJson(VITEST_REPORT)).toBe(false); // assertionResults, not testResults
    expect(looksLikeJestJson({ suites: [] })).toBe(false);
    expect(looksLikeJestJson({})).toBe(false);
    expect(looksLikeJestJson({ testResults: [] })).toBe(false);
    expect(looksLikeJestJson(null)).toBe(false);
  });

  it("an empty testResults array and a missing title degrade honestly", () => {
    expect(parseJestJson({})).toEqual([]);
    const records = parseJestJson({
      testResults: [
        // Assertion ELEMENTS from a corrupt report can be primitives:
        // contained, never crashed on (same discipline as Playwright's).
        {
          testResults: [null, { status: "passed", duration: 1 }],
        },
      ],
    });
    expect(records).toHaveLength(1);
    expect(records[0]?.title).toBe("(unnamed)");
    expect(records[0]?.attempts[0]?.status).toBe("passed");
  });
});

describe("Vitest JSON parser (P4)", () => {
  it("maps assertionResults → TestRecords with 1 attempt", () => {
    const records = parseVitestJson(VITEST_REPORT);
    expect(records).toHaveLength(2);
    expect(records.every((r) => r.attempts.length === 1)).toBe(true);
    expect(records[0]).toMatchObject({
      file: "/repo/src/cart.spec.ts",
      title: "adds item",
      attempts: [{ index: 1, status: "passed", durationMs: 15 }],
      line: 4,
    });
  });

  it("looksLikeVitestJson discriminates the Vitest variant", () => {
    expect(looksLikeVitestJson(VITEST_REPORT)).toBe(true);
    expect(looksLikeVitestJson(JEST_REPORT)).toBe(false);
    expect(looksLikeVitestJson({ testResults: [{}] })).toBe(false);
  });

  it("defensive edges: missing duration/location, negative duration, missing path", () => {
    const records = parseVitestJson({
      testResults: [
        {
          assertionResults: [
            { title: "no duration", status: "passed" },
            { title: "negative", status: "passed", duration: -1 },
            { title: "no location", status: "failed", duration: 3 },
            {
              title: "zero line",
              status: "passed",
              duration: 3,
              location: { line: 0, column: 2 },
            },
          ],
        },
        { assertionResults: [{ title: "no path", status: "passed" }] },
      ],
    });
    expect(records).toHaveLength(5);
    expect(records.every((r) => (r.attempts[0]?.durationMs ?? 0) >= 0)).toBe(
      true,
    );
    expect(records.every((r) => r.line === undefined)).toBe(true);
    expect(records[4]?.file).toBe("unknown");
  });

  it("non-executing statuses (pending/todo/disabled) → skipped, unknown → interrupted", () => {
    const records = parseVitestJson({
      testResults: [
        {
          assertionResults: [
            { title: "a", status: "pending" },
            { title: "b", status: "todo" },
            { title: "c", status: "disabled" },
            { title: "d", status: "skipped" },
            { title: "e", status: "wat" },
          ],
        },
      ],
    });
    expect(
      records.slice(0, 4).every((r) => r.attempts[0]?.status === "skipped"),
    ).toBe(true);
    expect(records[4]?.attempts[0]?.status).toBe("interrupted");
  });

  it("corrupt/shapeless payloads degrade to zero records (M3 containment)", () => {
    expect(parseVitestJson(null)).toEqual([]);
    expect(parseVitestJson("nope")).toEqual([]);
    expect(parseVitestJson({})).toEqual([]);
    expect(parseVitestJson({ testResults: [null, 7, {}] })).toEqual([]);
    const records = parseVitestJson({
      testResults: [
        // Assertion elements can be primitives in a corrupt report —
        // contained, never crashed on.
        { assertionResults: [null, { status: "passed", duration: 2 }] },
      ],
    });
    expect(records).toHaveLength(1);
    expect(records[0]?.title).toBe("(unnamed)");
    expect(looksLikeVitestJson({ testResults: [] })).toBe(false);
    expect(looksLikeVitestJson(null)).toBe(false);
  });

  it("HONEST DEGRADATION locked: TRUE-FLAKE cannot fire from Jest/Vitest sources", () => {
    // The one-attempt contract is not an implementation detail — it is
    // the flake-truth guarantee. verify through the full pipeline:
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-p4-"));
    try {
      writeFileSync(join(dir, "jest-report.json"), JSON.stringify(JEST_REPORT));
      const { report } = runForensics(join(dir, "jest-report.json"));
      expect(report.source).toBe("jest-json");
      expect(report.totalTests).toBe(3);
      expect(report.flakyTests).toBe(0);
      expect(report.retriedTests).toBe(0);
      expect(report.verdicts.every((v) => v.attempts === 1)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("discovery: forensics directory picks the right parser (P4)", () => {
  it("recognizes jest-report.json / vitest-report.json alongside Playwright's", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-p4-discovery-"));
    try {
      writeFileSync(
        join(dir, "vitest-report.json"),
        JSON.stringify(VITEST_REPORT),
      );
      const { report: vitestReport } = runForensics(dir);
      expect(vitestReport.source).toBe("vitest-json");
      expect(vitestReport.totalTests).toBe(2);

      rmSync(join(dir, "vitest-report.json"));
      writeFileSync(join(dir, "jest-report.json"), JSON.stringify(JEST_REPORT));
      const { report: jestReport } = runForensics(dir);
      expect(jestReport.source).toBe("jest-json");
      expect(jestReport.totalTests).toBe(3);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("a corrupt Jest report is contained — zero records, no crash (M3)", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-p4-corrupt-"));
    try {
      writeFileSync(
        join(dir, "jest-report.json"),
        '{"testResults": [{"testFilePath": "/x", "testResults": [',
      );
      const { report } = runForensics(dir);
      expect(report.totalTests).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("a hostile JSON payload cannot crash the discovery path", () => {
    // Not Jest/Vitest-shaped, valid JSON — the Playwright walk is total
    // over arbitrary JSON (M3 guards), so this degrades to zero records
    // on the honest exit-2 path instead of a crash.
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-p4-hostile-"));
    try {
      writeFileSync(join(dir, "report.json"), '{"suites": {"not": "array"}}');
      const { report } = runForensics(dir);
      expect(report.totalTests).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("mixed-corrupt directory: valid reports survive corrupt siblings", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-p4-mixed-"));
    try {
      mkdirSync(join(dir, "nested"), { recursive: true });
      writeFileSync(join(dir, "broken.json"), "{ oops");
      writeFileSync(
        join(dir, "nested", "vitest-report.json"),
        JSON.stringify(VITEST_REPORT),
      );
      const { report } = runForensics(dir);
      expect(report.source).toBe("vitest-json");
      expect(report.totalTests).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
