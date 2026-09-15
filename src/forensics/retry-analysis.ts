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
  successRate: number;
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
    const successRate =
      v.attempts === 0 ? 0 : v.finalStatus === "passed" ? 1 : 0;
    const retryOnlyPass = v.passedOnRetry;

    if (retryOnlyPass) {
      maskedFailures.push({
        testId,
        retryCount,
        successRate,
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
