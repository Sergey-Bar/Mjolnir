import { describe, expect, it } from "vitest";

import {
  detectRetryMasking,
} from "../../src/forensics/retry-analysis.js";
import type { Finding } from "../../src/types.js";
import type { TestVerdict } from "../../src/forensics/types.js";

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

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-PW-102",
    category: "QA-PW",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FLAKY-RISK",
    evidenceLevel: "E2",
    file: "e2e/shop.spec.ts",
    line: 12,
    column: 3,
    message: "msg",
    why: "why",
    fix: "fix",
    ...overrides,
  };
}

describe("detectRetryMasking", () => {
  it("detects retry-only passes as masked failures", () => {
    const findings: Finding[] = [];
    const evidence: TestVerdict[] = [
      verdict({
        attempts: 2,
        finalStatus: "passed",
        passedOnRetry: true,
        everFailed: true,
      }),
    ];
    const result = detectRetryMasking(findings, evidence);
    expect(result.maskedFailures).toHaveLength(1);
    expect(result.maskedFailures[0]?.retryOnlyPass).toBe(true);
    expect(result.totalRetried).toBe(1);
    expect(result.maskingRate).toBe(1);
  });

  it("does not flag non-masked retried tests", () => {
    const findings: Finding[] = [];
    const evidence: TestVerdict[] = [
      verdict({ attempts: 2, finalStatus: "passed", everFailed: false }),
    ];
    const result = detectRetryMasking(findings, evidence);
    expect(result.maskedFailures).toHaveLength(0);
  });

  it("quarantine candidates for high retry count", () => {
    const findings = [finding()];
    const evidence: TestVerdict[] = [
      verdict({
        attempts: 4,
        finalStatus: "passed",
        passedOnRetry: true,
        everFailed: true,
      }),
    ];
    const result = detectRetryMasking(findings, evidence);
    expect(result.quarantineCandidates).toHaveLength(1);
    expect(result.quarantineCandidates[0]?.reason).toContain("QA-PW-102");
  });

  it("does not quarantine for low retry count", () => {
    const findings = [finding()];
    const evidence: TestVerdict[] = [
      verdict({
        attempts: 2,
        finalStatus: "passed",
        passedOnRetry: true,
        everFailed: true,
      }),
    ];
    const result = detectRetryMasking(findings, evidence);
    expect(result.quarantineCandidates).toHaveLength(0);
  });

  it("returns zero masking rate when no retries", () => {
    const result = detectRetryMasking([], [verdict()]);
    expect(result.maskingRate).toBe(0);
    expect(result.totalRetried).toBe(0);
  });

  it("handles empty inputs", () => {
    const result = detectRetryMasking([], []);
    expect(result.maskedFailures).toHaveLength(0);
    expect(result.quarantineCandidates).toHaveLength(0);
    expect(result.totalRetried).toBe(0);
    expect(result.maskingRate).toBe(0);
  });
});
