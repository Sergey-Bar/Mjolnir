/**
 * Tests for Tier-1/5 quick-win commands: badge, triage, debt.
 */

import { describe, expect, it } from "vitest";
import { buildBadge, renderBadgeSnippet } from "../src/commands/badge.js";
import { computeDebt, renderDebt } from "../src/commands/debt.js";
import {
  renderTriage,
  renderTriageMd,
  triageRows,
} from "../src/forensics/triage.js";
import type { ScanResult } from "../src/types.js";
import type { ForensicsReport, TestVerdict } from "../src/forensics/types.js";

function fakeScan(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 82,
    frameworks: ["vitest"],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: [],
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 10,
    },
    ...overrides,
  };
}

describe("badge", () => {
  it("builds shields endpoint JSON with score and error count", () => {
    const badge = buildBadge(
      fakeScan({
        findings: [
          {
            ruleId: "X",
            category: "QA-TEST",
            severity: "error",
            confidence: "high",
            findingType: "deterministic-defect",
            qaImpact: "FALSE-GREEN",
            file: "a.ts",
            line: 1,
            column: 1,
            message: "",
            why: "",
            fix: "",
          },
        ],
      }),
    );
    expect(badge.message).toBe("82/100 · 1 error");
    expect(badge.color).toBe("green");
    expect(badge.schemaVersion).toBe(1);
  });

  it("honest empty state when no tests found", () => {
    const badge = buildBadge(fakeScan({ score: null }));
    expect(badge.message).toBe("no tests found");
    expect(badge.color).toBe("lightgrey");
  });

  it("snippet contains commit-bound verification comment", () => {
    const md = renderBadgeSnippet(fakeScan());
    expect(md).toContain("verified at commit");
    expect(md).toContain("82/100");
  });
});

function verdict(partial: Partial<TestVerdict>): TestVerdict {
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
    source: "junit-xml",
    totalTests: verdicts.length,
    failed: verdicts.filter((v) => v.everFailed && !v.passedOnRetry).length,
    skipped: 0,
    retriedTests: verdicts.filter((v) => v.attempts >= 2).length,
    flakyTests: verdicts.filter((v) => v.passedOnRetry).length,
    totalDurationMs: verdicts.reduce((s, v) => s + v.totalDurationMs, 0),
    verdicts,
  };
}

describe("triage", () => {
  it("proposes quarantine for retried-and-failed tests", () => {
    const rep = report([
      verdict({
        title: "lucky",
        attempts: 2,
        passedOnRetry: true,
        everFailed: true,
      }),
      verdict({ title: "solid" }),
      verdict({ title: "dead", finalStatus: "failed", everFailed: true }),
    ]);
    const rows = triageRows(rep);
    expect(rows).toHaveLength(2);
    const lucky = rows.find((r) => r.title === "lucky");
    expect(lucky?.proposedQuarantine).toBe(true);
    expect(lucky?.suggestedAction).toBe("quarantine + ticket");
  });

  it("renders TRIAGE.md with table and proposal count", () => {
    const md = renderTriageMd(
      report([
        verdict({
          title: "lucky",
          attempts: 3,
          passedOnRetry: true,
          everFailed: true,
        }),
      ]),
    );
    expect(md.startsWith("# TRIAGE.md")).toBe(true);
    expect(md).toContain("TRUE-FLAKE");
    expect(md).toContain("**Auto-quarantine proposal: 1**");
  });

  it("empty state is celebratory not shaming", () => {
    const text = renderTriage(report([]));
    expect(text).toContain("Nothing to triage");
  });
});

describe("debt register", () => {
  function finding(ruleId: string): ScanResult["findings"][number] {
    return {
      ruleId,
      category: "QA-TEST",
      severity: "warning",
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: "FLAKY-RISK",
      file: "a.ts",
      line: 1,
      column: 1,
      message: "",
      why: "",
      fix: "",
    };
  }

  it("aggregates findings into costed debt classes", () => {
    const result = fakeScan({
      findings: [
        finding("QA-TEST-004"),
        finding("QA-TEST-004"),
        finding("QA-TEST-002"),
      ],
    });
    const { classes, totalHours } = computeDebt(result);
    const sleeps = classes.find((c) => c.label === "Hard sleeps");
    expect(sleeps?.count).toBe(2);
    expect(classes.find((c) => c.label === "Skipped tests")?.count).toBe(1);
    // 2 × 0.4 + 1 × 0.2 = 1.0
    expect(totalHours).toBeCloseTo(1.0, 5);
  });

  it("renders the register with totals", () => {
    const text = renderDebt(fakeScan({ findings: [finding("QA-PW-004")] }));
    expect(text).toContain("TEST DEBT REGISTER");
    expect(text).toContain("Brittle selectors");
    expect(text).toContain("TOTAL ESTIMATED DRAG");
  });

  it("clean suite renders honest clean state", () => {
    expect(renderDebt(fakeScan())).toContain("the suite is clean");
  });
});
