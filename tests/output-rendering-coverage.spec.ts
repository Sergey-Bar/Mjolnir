/**
 * Terminal renderer color-path coverage (Test Hardening Plan).
 *
 * durability-audit.spec.ts already proved color is present/absent
 * correctly at the isTTY/NO_COLOR boundary using the `bold` wrapper as
 * a proxy. It never actually exercised the `error`/`warning`/`info`
 * color functions specifically — a scan whose only finding is a
 * warning, for instance, never touches `colors.error` at all. This
 * closes that gap directly, one severity at a time.
 */

import { describe, expect, it } from "vitest";
import { renderTerminal } from "../src/reporter/terminal.js";
import type { Finding, ScanResult } from "../src/types.js";

function findingOf(severity: Finding["severity"]): Finding {
  return {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity,
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    file: "e2e/x.spec.ts",
    line: 1,
    column: 1,
    message: `${severity} finding`,
    why: "why",
    fix: "fix",
  };
}

function resultWith(severity: Finding["severity"]): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 80,
    frameworks: [],
    frameworkDetectionUnknown: true,
    dimensions: [
      { category: "QA-TEST", score: 80, errors: 0, warnings: 0, infos: 0 },
    ],
    findings: [findingOf(severity)],
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1,
    },
  };
}

// eslint-disable-next-line no-control-regex -- ANSI escape is the thing being detected
const ANSI = /\x1b\[[0-9;]*m/;

describe("each severity's own color path renders when isTTY is true", () => {
  const severities: Finding["severity"][] = ["error", "warning", "info"];
  for (const severity of severities) {
    it(`${severity} finding produces colored output`, () => {
      const before = process.env["NO_COLOR"];
      delete process.env["NO_COLOR"];
      try {
        const out = renderTerminal(resultWith(severity), { isTTY: true });
        expect(ANSI.test(out)).toBe(true);
        const label = severity === "warning" ? "WARN" : severity.toUpperCase();
        expect(out).toContain(label);
      } finally {
        if (before !== undefined) process.env["NO_COLOR"] = before;
      }
    });
  }
});

describe("empty-state (no tests found) renders without a score banner", () => {
  it("score: null produces the honest 'no tests detected' message, not a fake 0 or crash", () => {
    const result: ScanResult = {
      schemaVersion: 1,
      partial: false,
      score: null,
      frameworks: [],
      frameworkDetectionUnknown: true,
      dimensions: [],
      findings: [],
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1,
      },
    };
    const out = renderTerminal(result, { isTTY: false });
    expect(out).toMatch(/NO TESTS DETECTED/i);
    expect(out).not.toMatch(/SCORE:\s*0/);
  });
});
