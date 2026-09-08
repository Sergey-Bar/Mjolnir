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
    expect(looksLikeJestJson(null)).toBe(false);
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
