/**
 * Retry/Quarantine Pattern Analysis (CI-005).
 *
 * Detects when retries mask real failures. A test that passes
 * only on retry is a flaky test, not a reliable test — the retry
 * is a bandaid, not a cure.
 */

import type { Finding } from "../types.js";
import type { TestVerdict } from "../forensics/types.js";

export interface RetryPattern {
  testId: string;
  retryCount: number;
  /**
   * The test's FINAL status as a binary — 1 if it passed on the last attempt,
   * 0 if it did not. NOT a rate.
   *
   * This was `successRate`, and the name was the defect: a rate is a fraction
   * over attempts, and nothing here computes one. The expression behind it was
   * `attempts === 0 ? 0 : finalStatus === "passed" ? 1 : 0`, which can only ever
   * produce 0 or 1. Worse, this object is only constructed when
   * `retryOnlyPass` is true — a test that passed on retry — so within
   * `maskedFailures` the field was invariably 1.
   *
   * A reader seeing "success rate: 1" in a forensics report would reasonably
   * conclude the test succeeded on every attempt, which is the opposite of what
   * the entry means: it succeeded only because it was allowed to retry.
   */
  finalPassBinary: 0 | 1;
  retryOnlyPass: boolean;
}

export interface QuarantinePattern {
  testId: string;
  quarantineDate: string | null;
  reason: string;
}

export interface RetryMaskingResult {
  maskedFailures: RetryPattern[];
  quarantineCandidates: QuarantinePattern[];
  totalRetried: number;
  maskingRate: number;
}

export function detectRetryMasking(
  findings: readonly Finding[],
  runtimeEvidence: readonly TestVerdict[],
): RetryMaskingResult {
  const maskedFailures: RetryPattern[] = [];
  const quarantineCandidates: QuarantinePattern[] = [];

  const retriedTests = runtimeEvidence.filter((v) => v.attempts > 1);
  const totalRetried = retriedTests.length;

  for (const v of retriedTests) {
    const testId = `${v.file}::${v.title}`;
    const retryCount = v.attempts - 1;
    // No `attempts === 0` arm: `retriedTests` is filtered to `attempts > 1`, so
    // it cannot be reached here. It was a guard against a condition the
    // enclosing filter had already excluded, which reads as "zero attempts is
    // handled" when nothing handles it.
    const finalPassBinary: 0 | 1 = v.finalStatus === "passed" ? 1 : 0;
    const retryOnlyPass = v.passedOnRetry;

    if (retryOnlyPass) {
      maskedFailures.push({
        testId,
        retryCount,
        finalPassBinary,
        retryOnlyPass,
      });
    }

    if (retryCount >= 3 && v.everFailed) {
      const relatedFinding = findings.find(
        (f) => f.file === v.file && f.qaImpact === "FLAKY-RISK",
      );
      quarantineCandidates.push({
        testId,
        quarantineDate: null,
        reason: relatedFinding
          ? `High retry count (${retryCount}) with FLAKY-RISK finding: ${relatedFinding.ruleId}`
          : `High retry count (${retryCount}) with repeated failures.`,
      });
    }
  }

  const maskingRate =
    totalRetried === 0 ? 0 : maskedFailures.length / totalRetried;

  return {
    maskedFailures,
    quarantineCandidates,
    totalRetried,
    maskingRate,
  };
}
