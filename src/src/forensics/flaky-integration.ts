/**
 * Flaky-Test Evidence Integration (CI-003).
 *
 * Extracts flaky-test evidence from a forensics report and
 * integrates it into the analysis pipeline. A test that passes
 * only on retry is not a reliable test — it is a lucky test.
 */

import type { ForensicsReport, TestVerdict } from "./types.js";

export const FLAKINESS_LEVEL = ["NONE", "SUSPECTED", "CONFIRMED"] as const;
export type FlakinessLevel = (typeof FLAKINESS_LEVEL)[number];

export interface FlakyEvidence {
  testId: string;
  retryCount: number;
  passOnRetry: boolean;
  firstFailure: string | null;
  finalOutcome: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
  flakinessLevel: FlakinessLevel;
}

export interface FlakyIntegrationResult {
  flakyTests: FlakyEvidence[];
  totalFlaky: number;
  confirmedFlaky: number;
  suspectedFlaky: number;
}

function classifyFlakiness(v: TestVerdict): FlakinessLevel {
  if (v.passedOnRetry) return "CONFIRMED";
  if (v.attempts > 1 && v.everFailed && v.finalStatus === "passed")
    return "SUSPECTED";
  return "NONE";
}

export function integrateFlakyEvidence(
  forensicsReport: ForensicsReport,
): FlakyIntegrationResult {
  const flakyTests: FlakyEvidence[] = [];

  for (const v of forensicsReport.verdicts) {
    const level = classifyFlakiness(v);
    if (level === "NONE") continue;

    const testId = `${v.file}::${v.title}`;
    const firstFailure =
      v.everFailed && v.attempts > 1
        ? `Test failed across ${v.attempts} attempts`
        : null;

    flakyTests.push({
      testId,
      retryCount: Math.max(0, v.attempts - 1),
      passOnRetry: v.passedOnRetry,
      firstFailure,
      finalOutcome: v.finalStatus,
      flakinessLevel: level,
    });
  }

  const confirmedFlaky = flakyTests.filter(
    (t) => t.flakinessLevel === "CONFIRMED",
  ).length;
  const suspectedFlaky = flakyTests.filter(
    (t) => t.flakinessLevel === "SUSPECTED",
  ).length;

  return {
    flakyTests,
    totalFlaky: flakyTests.length,
    confirmedFlaky,
    suspectedFlaky,
  };
}
