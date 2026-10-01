/**
 * Tests for Tier-2/5 commands added post-0.2: handover, init, pw-report,
 * and the QA-PW-140 placeholder rule.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildHandover, renderHandover } from "../../src/commands/handover.js";
import {} from "../../src/commands/pw-report.js";
import { qaPw140 } from "../../src/rules/playwright/qa-pw-140.js";
import type { Finding, ScanResult } from "../../src/types.js";
import type {
  ForensicsReport,
  TestVerdict,
} from "../../src/forensics/types.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-new-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function finding(ruleId: string, file = "a.spec.ts", line = 1): Finding {
  return {
    ruleId,
    category: "QA-TEST",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FALSE-GREEN",
    file,
    line,
    column: 1,
    message: `msg ${ruleId}`,
    why: "why",
    fix: "fix",
  };
}

function scan(findings: Finding[], score: number | null = 80): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score,
    frameworks: [],
    frameworkDetectionUnknown: true,
    dimensions: [],
    findings,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1,
    },
  };
}

function verdict(partial: Partial<TestVerdict> = {}): TestVerdict {
  return {
    file: "a.spec.ts",
    title: "t",
    attempts: 1,
    finalStatus: "passed",
    totalDurationMs: 100,
    passedOnRetry: false,
    everFailed: false,
    skipped: false,
    ...partial,
  };
}

function report(verdicts: TestVerdict[]): ForensicsReport {
  return {
    forensicsSchemaVersion: 1,
    source: "junit-xml",
    totalTests: verdicts.length,
    failed: verdicts.filter((v) => v.everFailed && !v.passedOnRetry).length,
    skipped: 0,
    retriedTests: verdicts.filter((v) => v.attempts >= 2).length,
    flakyTests: verdicts.filter((v) => v.passedOnRetry).length,
    totalDurationMs: verdicts.reduce((s, v) => s + v.totalDurationMs, 0),
    verdicts,
    analysisComplete: true,
    skippedReports: 0,
    incompleteReasons: [],
  };
}

describe("buildHandover", () => {
  it("groups findings into fake-green / flaky / CI-trust sections", () => {
    const map = buildHandover(
      scan([
        finding("QA-TEST-003", "x/a.spec.ts"),
        finding("QA-TEST-004", "y/b.spec.ts", 5),
        finding("QA-CI-001", ".github/workflows/ci.yml", 9),
      ]),
      null,
    );
    const headings = map.sections.map((s) => s.heading);
    expect(headings.some((h) => h.includes("Fake-green"))).toBe(true);
    expect(headings.some((h) => h.includes("flaky"))).toBe(true);
    expect(headings.some((h) => h.includes("CI trust"))).toBe(true);
    expect(map.summaryLine).toContain("3 things");
  });

  it("includes TRUE-FLAKE entries from forensics run data", () => {
    const map = buildHandover(
      scan([]),
      report([
        verdict({
          title: "lucky",
          attempts: 2,
          passedOnRetry: true,
          everFailed: true,
        }),
      ]),
    );
    const flakySection = map.sections.find((s) => s.heading.includes("flaky"));
    expect(flakySection?.items[0]).toContain("lucky");
    expect(flakySection?.items[0]).toContain("TRUE-FLAKE");
  });

  it("renders solid-foundation section for clean scans", () => {
    const map = buildHandover(scan([], 95), null);
    expect(map.sections[0]?.heading).toContain("Solid foundation");
    expect(renderHandover(map)).toContain("WELCOME TO THE TEST SUITE");
    expect(map.summaryLine).toContain("good shape");
  });

  it("caps section items at documented limits", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      finding("QA-TEST-003", `f${i}.spec.ts`, i + 1),
    );
    const map = buildHandover(scan(many), null);
    const fg = map.sections.find((s) => s.heading.includes("Fake-green"));
    expect(fg?.items.length).toBeLessThanOrEqual(5);
  });
});

describe("summarizePwRun / renderPwRunSummary", () => {
  describe("QA-PW-140 placeholder rule", () => {
    it("is registered with correct metadata and stays silent (placeholder)", () => {
      expect(qaPw140.id).toBe("QA-PW-140");
      expect(qaPw140.severity).toBe("warning");
      expect(
        qaPw140.run({ path: "a.spec.ts", text: "page.screenshot()" }),
      ).toEqual([]);
    });
  });
});
