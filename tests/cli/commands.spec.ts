/**
 * Tests for Tier-1/5 quick-win commands: badge, triage, debt.
 */

import { describe, expect, it } from "vitest";
import { renderTriage, triageRows } from "../../src/forensics/triage.js";
import type {
  ForensicsReport,
  TestVerdict,
} from "../../src/forensics/types.js";

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

  it("renderTriage (terminal) renders a non-empty proposal with singular attempt wording", () => {
    const text = renderTriage(
      report([
        verdict({
          title: "lucky",
          attempts: 1,
          passedOnRetry: true,
          everFailed: true,
        }),
      ]),
    );
    expect(text).toContain("FLAKY TRIAGE");
    expect(text).toContain("TRUE-FLAKE");
    expect(text).toContain("1 attempt →"); // singular "attempt", no "s"
    expect(text).toContain("Auto-quarantine proposal: 0 tests ("); // below the quarantine floor
  });

  it("renderTriage (terminal) singular test-count wording when exactly one quarantine is proposed", () => {
    const text = renderTriage(
      report([
        verdict({
          title: "lucky",
          attempts: 2,
          passedOnRetry: true,
          everFailed: true,
        }),
      ]),
    );
    expect(text).toContain("Auto-quarantine proposal: 1 test (");
  });
});
