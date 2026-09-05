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
} from "../../src/commands/pr-comment.js";
import {
  diffAgainstBaseline,
  buildBaseline,
} from "../../src/commands/baseline.js";
import type { Finding, ScanResult } from "../../src/types.js";

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

  it("renders a measured FP rate without a sample size when measuredFpN is absent", () => {
    const body = renderPrComment(
      scanResult([finding({ measuredFpRate: 0.5 })]),
    );
    expect(body).toContain("measured FP 50%\\]");
    expect(body).not.toContain("n=");
  });

  it("renders E0 advisory findings with the observation evidence tag", () => {
    const body = renderPrComment(
      scanResult([finding({ severity: "info", evidenceLevel: "E0" })]),
    );
    expect(body).toContain("\\[E0 · observation\\]");
  });

  it("renders code-looking fixes as code spans and prose fixes as italics", () => {
    const body = renderPrComment(
      scanResult([
        finding({ fix: "await expect(locator).toBeVisible()" }),
        finding({
          ruleId: "QA-PW-103",
          file: "e2e/c.spec.ts",
          message: "Prose fix",
          fix: "Just delete the unused variable.",
        }),
      ]),
    );
    // A fix with code punctuation reads as code — code span.
    expect(body).toMatch(/`await expect\\\(locator\\\)/);
    // A prose fix has no code punctuation — italic, not a code span.
    expect(body).toContain("_Just delete the unused variable._");
  });

  it("degrades the drift line to 'unknown' when the diff carries no commit", () => {
    const diff = {
      hasBaseline: true,
      baselineScore: 70,
      newFindings: [],
      resolvedFindings: [],
      unchangedCount: 0,
    };
    const body = renderPrComment(scanResult([]), { diff });
    expect(body).toContain("since baseline `unknown`");
    expect(body).toContain("**Score:** 88/100 (+18 since baseline `unknown`)");
  });

  it("buildBaseline omits the score field when the scan found no tests", () => {
    const baseline = buildBaseline({ ...scanResult([]), score: null }, "abc");
    expect("score" in baseline).toBe(false);
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
    expect(body).toContain("2 pre-existing findings fixed in this PR");
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
    expect(body).toContain("1 pre-existing finding fixed in this PR");
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

describe("renderPrComment — redesign structure (plan M5)", () => {
  it("headers the redesigned comment and carries a verdict headline", () => {
    const body = renderPrComment(scanResult([finding({})]));
    expect(body).toContain("### 🔨 Mjölnir — Verification Trust");
    expect(body).toContain("88/100");
    expect(body).toContain("WORTHY");
    expect(body).toMatch(/score is|hammer|findings/); // headline line present
  });

  it("renders the dimensions mini-table when the scan has them", () => {
    const withDims: ScanResult = {
      ...scanResult([]),
      dimensions: [
        { category: "QA-PW", score: 75, errors: 1, warnings: 0, infos: 0 },
      ],
    };
    const body2 = renderPrComment(withDims);
    expect(body2).toContain("| Category | Score |");
    expect(body2).toContain("| QA-PW | 75/100 |");
  });

  it("groups findings in collapsible details — errors open, infos collapsed", () => {
    const body = renderPrComment(
      scanResult([
        finding({}),
        finding({ severity: "info", ruleId: "QA-PW-145" }),
      ]),
    );
    expect(body).toContain("<details open>");
    expect(body).toContain("<summary>🔴 1 errors</summary>");
    expect(body).toContain("<summary>🔵 1 infos</summary>");
    expect(body).toContain("</details>");
  });

  it("every finding line carries the Fix: label and the evidence tag", () => {
    const body = renderPrComment(scanResult([finding({})]));
    expect(body).toContain("Fix: _Use a locator-based wait instead._");
    expect(body).toContain("E2");
  });

  it("ends with the what-to-run-next footer using the injected version", () => {
    const body = renderPrComment(scanResult([]), { version: "0.5.0" });
    expect(body).toContain("**What to run next:**");
    expect(body).toContain("```bash");
    expect(body).toContain("npx mjolnir-qa@0.5.0 .");
    expect(body).toContain("--verbose");
    expect(body).not.toContain("@latest");
  });

  it("keeps the 25-cap overflow count explicit", () => {
    const many = Array.from({ length: 30 }, (_, i) => finding({ line: i + 1 }));
    const body = renderPrComment(scanResult(many));
    expect(body).toContain("...and 5 more");
  });
});
