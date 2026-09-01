/**
 * `mjolnir pr-comment` (Master-Stabilization-Plan Sprint 6, Task 25).
 *
 * Findings must arrive where the work happens, not just a terminal
 * nobody re-runs — this renders the actual comment body against fixture
 * scan results, independent of any real GitHub PR or network call.
 */

import { describe, expect, it } from "vitest";
import {
  renderPrComment,
  PR_COMMENT_MARKER,
} from "../src/commands/pr-comment.js";
import {
  diffAgainstBaseline,
  buildBaseline,
} from "../src/commands/baseline.js";
import type { Finding, ScanResult } from "../src/types.js";

function finding(overrides: Partial<Finding>): Finding {
  return {
    ruleId: "QA-PW-101",
    category: "QA-PW",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FLAKY-RISK",
    evidenceLevel: "E2",
    file: "e2e/a.spec.ts",
    line: 4,
    column: 3,
    message: "Hard sleep detected",
    why: "Hard sleeps mask real timing issues.",
    fix: "Use a locator-based wait instead.",
    ...overrides,
  };
}

function scanResult(
  findings: Finding[],
  scope?: "all" | "changed",
): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 88,
    ...(scope ? { scope } : {}),
    frameworks: ["playwright"],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 10,
    },
  };
}

describe("renderPrComment — rendering against fixture scan results", () => {
  it("includes the idempotency marker so a workflow can find/update its own comment", () => {
    const body = renderPrComment(scanResult([]));
    expect(body.startsWith(PR_COMMENT_MARKER)).toBe(true);
  });

  it("renders a clean-scan comment when there are no findings", () => {
    const body = renderPrComment(scanResult([]));
    expect(body).toContain("No new issues found");
  });

  it("renders every finding with rule id, file:line, message, and fix", () => {
    const result = scanResult([finding({})]);
    const body = renderPrComment(result);
    expect(body).toContain("QA-PW-101");
    expect(body).toContain("e2e/a.spec.ts:4");
    expect(body).toContain("Hard sleep detected");
    expect(body).toContain("Use a locator-based wait instead.");
  });

  it("uses the info-severity icon for info findings, distinct from error/warning", () => {
    const body = renderPrComment(
      scanResult([finding({ severity: "info", ruleId: "QA-PW-145" })]),
    );
    expect(body).toContain("🔵");
    expect(body).toContain("QA-PW-145");
  });

  it("omits the score line entirely when score is null (no tests found)", () => {
    const result = { ...scanResult([finding({})]), score: null };
    const body = renderPrComment(result);
    expect(body).not.toContain("**Score:**");
  });

  it("shows the plain score when no baseline score exists (older baselines)", () => {
    const body = renderPrComment(scanResult([finding({})]));
    expect(body).toContain("**Score:** 88/100");
    expect(body).not.toContain("since baseline");
  });

  it("shows the score delta when the baseline carries the additive score field", () => {
    const before = { ...scanResult([finding({})]), score: 83 };
    const baseline = buildBaseline(before, "abc12345");
    expect(baseline.score).toBe(83); // additive field written
    const after = { ...scanResult([finding({})]), score: 88 };
    const diff = diffAgainstBaseline(after, baseline);
    const body = renderPrComment(after, { diff });
    expect(body).toContain("**Score:** 88/100 (+5 since baseline `abc1234`)");
  });

  it("renders a negative delta without a plus sign", () => {
    const before = { ...scanResult([finding({})]), score: 90 };
    const baseline = buildBaseline(before, "abc1234");
    const after = { ...scanResult([finding({})]), score: 72 };
    const diff = diffAgainstBaseline(after, baseline);
    const body = renderPrComment(after, { diff });
    expect(body).toContain("**Score:** 72/100 (-18 since baseline `abc1234`)");
  });

  it("evidence tags appear on finding lines, with measured FP when present", () => {
    const body = renderPrComment(
      scanResult([
        finding({}),
        finding({
          ruleId: "QA-PW-102",
          file: "e2e/b.spec.ts",
          evidenceLevel: "E1",
          findingType: "heuristic-risk",
          measuredFpRate: 1,
          measuredFpN: 38,
        }),
      ]),
    );
    // Brackets are markdown-escaped by the QA-10 escaping contract.
    expect(body).toContain("\\[E2 · deterministic\\]");
    expect(body).toContain("\\[E1 · heuristic · measured FP 100% · n=38\\]");
  });

  it("uses plural grammar for multiple resolved findings", () => {
    const before = scanResult([
      finding({}),
      finding({ ruleId: "QA-TEST-001", file: "e2e/b.spec.ts" }),
    ]);
    const baseline = buildBaseline(before, "abc123");
    const after = scanResult([]);
    const diff = diffAgainstBaseline(after, baseline);

    const body = renderPrComment(after, { diff });
    expect(body).toContain("fixed 2 pre-existing findings");
  });

  it("caps the listed findings and notes how many more exist", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      finding({ file: `e2e/f${i}.spec.ts`, message: `Finding ${i}` }),
    );
    const body = renderPrComment(scanResult(many));
    expect(body).toContain("...and 5 more");
  });

  it("scopes to only the baseline diff's new findings when a baseline is provided", () => {
    const before = scanResult([finding({})]);
    const baseline = buildBaseline(before, "abc123");
    const after = scanResult([
      finding({}), // pre-existing, carried over
      finding({
        ruleId: "QA-TEST-001",
        file: "e2e/new.spec.ts",
        message: "Focused test",
      }),
    ]);
    const diff = diffAgainstBaseline(after, baseline);

    const body = renderPrComment(after, { diff });
    expect(body).toContain("QA-TEST-001");
    expect(body).not.toContain("Hard sleep detected"); // pre-existing, not new — must not appear
    expect(body).toContain("baseline");
  });

  it("mentions resolved findings from the baseline diff as a positive callout", () => {
    const before = scanResult([finding({})]);
    const baseline = buildBaseline(before, "abc123");
    const after = scanResult([]); // fixed
    const diff = diffAgainstBaseline(after, baseline);

    const body = renderPrComment(after, { diff });
    expect(body).toContain("fixed 1 pre-existing finding");
  });

  it("falls back to the full scope when no baseline exists, and says so honestly", () => {
    const body = renderPrComment(scanResult([finding({})]));
    expect(body).toContain("No baseline was found");
  });

  it("mentions changed-scope explicitly when the scan itself was scoped", () => {
    const body = renderPrComment(scanResult([finding({})], "changed"));
    expect(body).toContain("lines this PR changed");
  });

  it("always states the comment is advisory-only and never blocks merging", () => {
    const body = renderPrComment(scanResult([finding({})]));
    expect(body.toLowerCase()).toContain("advisory only");
    expect(body.toLowerCase()).toContain("never blocks merging");
  });
});
