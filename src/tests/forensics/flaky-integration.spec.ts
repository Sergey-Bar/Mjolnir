import { describe, expect, it } from "vitest";

import { integrateFlakyEvidence } from "../../src/forensics/flaky-integration.js";
import type {
  ForensicsReport,
  TestVerdict,
} from "../../src/forensics/types.js";

function verdict(overrides: Partial<TestVerdict> = {}): TestVerdict {
  return {
    file: "e2e/shop.spec.ts",
    title: "checkout",
    attempts: 1,
    finalStatus: "passed",
    totalDurationMs: 100,
    passedOnRetry: false,
    everFailed: false,
    skipped: false,
    ...overrides,
  };
}

function report(
  verdicts: TestVerdict[],
  overrides: Partial<ForensicsReport> = {},
): ForensicsReport {
  return {
    forensicsSchemaVersion: 1,
    source: "playwright-json",
    totalTests: verdicts.length,
    failed: verdicts.filter((v) => v.finalStatus === "failed").length,
    skipped: verdicts.filter((v) => v.skipped).length,
    retriedTests: verdicts.filter((v) => v.attempts > 1).length,
    flakyTests: verdicts.filter((v) => v.passedOnRetry).length,
    totalDurationMs: verdicts.reduce((s, v) => s + v.totalDurationMs, 0),
    verdicts,
    analysisComplete: true,
    skippedReports: 0,
    incompleteReasons: [],
    ...overrides,
  };
}

describe("integrateFlakyEvidence", () => {
  it("returns empty result for no flaky tests", () => {
    const result = integrateFlakyEvidence(report([verdict()]));
    expect(result.flakyTests).toHaveLength(0);
    expect(result.totalFlaky).toBe(0);
    expect(result.confirmedFlaky).toBe(0);
    expect(result.suspectedFlaky).toBe(0);
  });

  it("identifies confirmed flaky (passedOnRetry)", () => {
    const r = report([
      verdict({
        attempts: 2,
        finalStatus: "passed",
        passedOnRetry: true,
        everFailed: true,
      }),
    ]);
    const result = integrateFlakyEvidence(r);
    expect(result.totalFlaky).toBe(1);
    expect(result.confirmedFlaky).toBe(1);
    expect(result.suspectedFlaky).toBe(0);
    expect(result.flakyTests[0]?.flakinessLevel).toBe("CONFIRMED");
    expect(result.flakyTests[0]?.retryCount).toBe(1);
    expect(result.flakyTests[0]?.passOnRetry).toBe(true);
  });

  it("identifies suspected flaky (retried, failed, then passed)", () => {
    const r = report([
      verdict({
        attempts: 3,
        finalStatus: "passed",
        passedOnRetry: false,
        everFailed: true,
      }),
    ]);
    const result = integrateFlakyEvidence(r);
    expect(result.totalFlaky).toBe(1);
    expect(result.suspectedFlaky).toBe(1);
    expect(result.flakyTests[0]?.flakinessLevel).toBe("SUSPECTED");
  });

  it("ignores single-attempt passes", () => {
    const r = report([verdict()]);
    const result = integrateFlakyEvidence(r);
    expect(result.totalFlaky).toBe(0);
  });

  it("ignores non-flaky retried tests", () => {
    const r = report([
      verdict({ attempts: 2, finalStatus: "passed", everFailed: false }),
    ]);
    const result = integrateFlakyEvidence(r);
    expect(result.totalFlaky).toBe(0);
  });

  it("generates testId as file::title", () => {
    const r = report([
      verdict({
        file: "tests/login.spec.ts",
        title: "login flow",
        attempts: 2,
        passedOnRetry: true,
        everFailed: true,
      }),
    ]);
    const result = integrateFlakyEvidence(r);
    expect(result.flakyTests[0]?.testId).toBe(
      "tests/login.spec.ts::login flow",
    );
  });

  it("handles multiple verdicts with mixed flakiness", () => {
    const r = report([
      verdict({ attempts: 1, finalStatus: "passed" }),
      verdict({
        attempts: 2,
        finalStatus: "passed",
        passedOnRetry: true,
        everFailed: true,
      }),
      verdict({
        attempts: 3,
        finalStatus: "passed",
        passedOnRetry: false,
        everFailed: true,
      }),
      verdict({ attempts: 1, finalStatus: "failed" }),
    ]);
    const result = integrateFlakyEvidence(r);
    expect(result.totalFlaky).toBe(2);
    expect(result.confirmedFlaky).toBe(1);
    expect(result.suspectedFlaky).toBe(1);
  });
});
