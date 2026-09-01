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
    // ScoreState bands: 82 is the trusted band → shields `important`
    // (threshold drift fix — was 90/75/50 with `green` at 82).
    expect(badge.color).toBe("important");
    expect(badge.schemaVersion).toBe(1);
  });

  it("the forged state reads 100/100 · forged", () => {
    const badge = buildBadge(fakeScan({ score: 100 }));
    expect(badge.message).toBe("100/100 · forged");
    expect(badge.color).toBe("success");
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

  it("renderTriage pluralizes attempts and test counts correctly", () => {
    const text = renderTriage(
      report([
        verdict({
          title: "a",
          attempts: 3,
          passedOnRetry: true,
          everFailed: true,
        }),
        verdict({
          title: "b",
          attempts: 3,
          passedOnRetry: true,
          everFailed: true,
        }),
      ]),
    );
    expect(text).toContain("3 attempts →");
    expect(text).toContain("Auto-quarantine proposal: 2 tests (");
  });

  it("suggestAction: a hard failure with no retry success suggests 'fix now'", () => {
    const rows = triageRows(
      report([
        verdict({ title: "dead", finalStatus: "failed", everFailed: true }),
      ]),
    );
    expect(rows[0]?.suggestedAction).toBe("fix now — failing");
    expect(rows[0]?.finalStatus).toBe("failed");
  });

  it("suggestAction: timedOut with no retry success also suggests 'fix now'", () => {
    const rows = triageRows(
      report([
        verdict({
          title: "slow",
          finalStatus: "timedOut",
          everFailed: true,
        }),
      ]),
    );
    expect(rows[0]?.suggestedAction).toBe("fix now — failing");
  });

  it("suggestAction: passed on retry below the quarantine attempt floor suggests fixing nondeterminism", () => {
    const rows = triageRows(
      report([
        verdict({
          title: "flakyOnce",
          attempts: 1,
          passedOnRetry: true,
          everFailed: true,
        }),
      ]),
    );
    expect(rows[0]?.suggestedAction).toBe("fix nondeterminism");
    expect(rows[0]?.proposedQuarantine).toBe(false);
  });

  it("suggestAction: everFailed but passed on retry, neither failed/timedOut nor retry-eligible falls through to investigate", () => {
    const rows = triageRows(
      report([
        verdict({
          title: "weird",
          finalStatus: "passed",
          everFailed: true,
          passedOnRetry: false,
          attempts: 1,
        }),
      ]),
    );
    expect(rows[0]?.suggestedAction).toBe("investigate");
  });

  it("sorts TRUE-FLAKE (passedOnRetry) before hard failures", () => {
    const rows = triageRows(
      report([
        verdict({
          title: "hardfail",
          finalStatus: "failed",
          everFailed: true,
        }),
        verdict({
          title: "flaky",
          attempts: 2,
          passedOnRetry: true,
          everFailed: true,
        }),
      ]),
    );
    expect(rows.map((r) => r.title)).toEqual(["flaky", "hardfail"]);
  });

  it("breaks a passedOnRetry tie by attempt count (more attempts first)", () => {
    const rows = triageRows(
      report([
        verdict({
          title: "fewer",
          attempts: 2,
          passedOnRetry: true,
          everFailed: true,
        }),
        verdict({
          title: "more",
          attempts: 5,
          passedOnRetry: true,
          everFailed: true,
        }),
      ]),
    );
    expect(rows.map((r) => r.title)).toEqual(["more", "fewer"]);
  });

  it("breaks an attempts tie by total duration (slower first)", () => {
    const rows = triageRows(
      report([
        verdict({
          title: "fast",
          attempts: 2,
          passedOnRetry: true,
          everFailed: true,
          totalDurationMs: 100,
        }),
        verdict({
          title: "slow",
          attempts: 2,
          passedOnRetry: true,
          everFailed: true,
          totalDurationMs: 9000,
        }),
      ]),
    );
    expect(rows.map((r) => r.title)).toEqual(["slow", "fast"]);
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
