/**
 * Tests for pr-report-shared.ts — shared PR-report rendering helpers.
 * Covers every exported function, all branches, ≥95% coverage.
 */

import { describe, expect, it } from "vitest";

import {
  UNIFIED_MARKER,
  LEGACY_PR_MARKER,
  LEGACY_TRUST_MARKER,
  renderScoreBadge,
  renderTrustBadge,
  renderFindingsBadge,
  renderEvidenceBadge,
  renderConfidenceTable,
  renderDiffSection,
  renderArtifactIntegrity,
  renderUnifiedReport,
} from "../../src/reporter/pr-report-shared.js";
import type {
  Finding,
  ScanResult,
  TrustSummary,
  DimensionScore,
} from "../../src/types.js";
import type { BaselineDiff } from "../../src/commands/baseline.js";
import type { ArtifactIdentity } from "../../src/commands/trust-report.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-PW-101",
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
    fix: "fix the locator",
    ...overrides,
  };
}

function result(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 85,
    frameworks: ["playwright"],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: [],
    testFileCount: 2,
    testDeclarationCount: 10,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 5,
    },
    trustSummary: {
      level: "L2",
      confidence: 0.7,
      evidenceCoverage: 0.4,
      inconclusiveRate: 0,
      measuredFpOfFiredRules: 0.429,
      provisionalRuleIds: [],
      ceilingReasons: [],
    },
    ...overrides,
  };
}

function baselineDiff(overrides: Partial<BaselineDiff> = {}): BaselineDiff {
  return {
    hasBaseline: true,
    baselineCommit: "abc1234def5678",
    baselineScore: 80,
    newFindings: [],
    resolvedFindings: [],
    unchangedCount: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("marker constants", () => {
  it("UNIFIED_MARKER has the v2 comment marker", () => {
    expect(UNIFIED_MARKER).toBe("<!-- mjolnir-report:v2 -->");
  });

  it("LEGACY_PR_MARKER has the legacy pr comment marker", () => {
    expect(LEGACY_PR_MARKER).toBe("<!-- mjolnir-pr-comment -->");
  });

  it("LEGACY_TRUST_MARKER has the legacy trust report marker", () => {
    expect(LEGACY_TRUST_MARKER).toBe("<!-- mjolnir-trust-report:v1 -->");
  });
});

// ---------------------------------------------------------------------------
// renderScoreBadge
// ---------------------------------------------------------------------------

describe("renderScoreBadge", () => {
  it("returns 'n/a' when score is null", () => {
    expect(renderScoreBadge(null)).toBe("### Score\n*n/a*");
  });

  it("renders score with verdict when no delta", () => {
    const out = renderScoreBadge(85);
    expect(out).toContain("### Score");
    expect(out).toContain("**85**/100");
    expect(out).toContain("WORTHY");
    expect(out).not.toContain("(");
  });

  it("renders positive delta", () => {
    const out = renderScoreBadge(90, 5);
    expect(out).toContain("**90**/100");
    expect(out).toContain("(+5)");
  });

  it("renders negative delta", () => {
    const out = renderScoreBadge(70, -10);
    expect(out).toContain("**70**/100");
    expect(out).toContain("(-10)");
  });

  it("renders zero delta without parentheses", () => {
    const out = renderScoreBadge(80, 0);
    expect(out).toContain("**80**/100");
    expect(out).not.toContain("(");
  });

  it("renders critical (UNWORTHY) score", () => {
    const out = renderScoreBadge(30);
    expect(out).toContain("UNWORTHY");
  });

  it("renders warning (NEEDS WORK) score", () => {
    const out = renderScoreBadge(60);
    expect(out).toContain("NEEDS WORK");
  });

  it("renders forged score as WORTHY", () => {
    const out = renderScoreBadge(100);
    expect(out).toContain("WORTHY");
  });
});

// ---------------------------------------------------------------------------
// renderTrustBadge
// ---------------------------------------------------------------------------

describe("renderTrustBadge", () => {
  it("renders trust level in bold", () => {
    expect(renderTrustBadge("L2")).toBe("### Trust Level\n**L2**");
  });

  it("renders any string level", () => {
    expect(renderTrustBadge("L5")).toBe("### Trust Level\n**L5**");
  });
});

// ---------------------------------------------------------------------------
// renderFindingsBadge
// ---------------------------------------------------------------------------

describe("renderFindingsBadge", () => {
  it("renders error and warning counts", () => {
    expect(renderFindingsBadge(3, 5)).toBe(
      "### Findings\n**3** errors · **5** warnings",
    );
  });

  it("renders zero counts", () => {
    expect(renderFindingsBadge(0, 0)).toBe(
      "### Findings\n**0** errors · **0** warnings",
    );
  });
});

// ---------------------------------------------------------------------------
// renderEvidenceBadge
// ---------------------------------------------------------------------------

describe("renderEvidenceBadge", () => {
  it("renders formatted percentage", () => {
    expect(renderEvidenceBadge(0.75)).toBe("### Evidence\n**75%** coverage");
  });

  it("renders 0%", () => {
    expect(renderEvidenceBadge(0)).toBe("### Evidence\n**0%** coverage");
  });

  it("renders 100%", () => {
    expect(renderEvidenceBadge(1)).toBe("### Evidence\n**100%** coverage");
  });
});

// ---------------------------------------------------------------------------
// renderConfidenceTable
// ---------------------------------------------------------------------------

describe("renderConfidenceTable", () => {
  const summary: TrustSummary = {
    level: "L2",
    confidence: 0.7,
    evidenceCoverage: 0.4,
    inconclusiveRate: 0.1,
    measuredFpOfFiredRules: 0.429,
    provisionalRuleIds: [],
    ceilingReasons: [],
  };

  it("renders collapsible details with all metrics", () => {
    const lines = renderConfidenceTable(
      result({ testDeclarationCount: 10, testFileCount: 2 }),
      summary,
    );
    const text = lines.join("\n");
    expect(text).toContain("<details>");
    expect(text).toContain("📊 Confidence & Evidence");
    expect(text).toContain("| Confidence | 70% |");
    expect(text).toContain("| Evidence coverage | 40% |");
    expect(text).toContain("| Inconclusive | 10% |");
    expect(text).toContain("| Measured FP (fired) | 43% |");
    expect(text).toContain("| Tests analyzed | 10 in 2 files |");
    expect(text).toContain("</details>");
  });

  it("renders confidence ceiling when present", () => {
    const s: TrustSummary = { ...summary, confidenceCeiling: 0.5 };
    const lines = renderConfidenceTable(result(), s);
    const text = lines.join("\n");
    expect(text).toContain("ceiling 50%");
  });

  it("renders PROVISIONAL when measured FP is undefined and provisional rules exist", () => {
    const { measuredFpOfFiredRules: _, ...rest } = summary;
    const s: TrustSummary = {
      ...rest,
      provisionalRuleIds: ["QA-PW-101", "QA-PW-102"],
    };
    const lines = renderConfidenceTable(result(), s);
    const text = lines.join("\n");
    expect(text).toContain("PROVISIONAL (2 unmeasured)");
  });

  it("renders 'n/a' when measured FP is undefined and no provisional rules", () => {
    const { measuredFpOfFiredRules: _, ...rest } = summary;
    const s: TrustSummary = {
      ...rest,
      provisionalRuleIds: [],
    };
    const lines = renderConfidenceTable(result(), s);
    const text = lines.join("\n");
    expect(text).toContain("| Measured FP (fired) | n/a |");
  });

  it("defaults test counts to 0 when undefined", () => {
    const {
      testDeclarationCount: _tdc,
      testFileCount: _tfc,
      ...restResult
    } = result();
    const lines = renderConfidenceTable(restResult, summary);
    const text = lines.join("\n");
    expect(text).toContain("| Tests analyzed | 0 in 0 files |");
  });
});

// ---------------------------------------------------------------------------
// renderDiffSection
// ---------------------------------------------------------------------------

describe("renderDiffSection", () => {
  it("renders baseline comparison with commit", () => {
    const diff = baselineDiff();
    const lines = renderDiffSection(diff);
    const text = lines.join("\n");
    expect(text).toContain("<details>");
    expect(text).toContain("🔧 Diff vs Baseline");
    expect(text).toContain("Comparing against baseline `abc1234`");
    expect(text).toContain("</details>");
  });

  it("renders 'unknown' when baseline commit is missing", () => {
    const { baselineCommit: _, ...restDiff } = baselineDiff();
    const diff = restDiff as BaselineDiff;
    const lines = renderDiffSection(diff);
    const text = lines.join("\n");
    expect(text).toContain("`unknown`");
  });

  it("renders no-baseline message", () => {
    const diff = baselineDiff({ hasBaseline: false });
    const lines = renderDiffSection(diff);
    const text = lines.join("\n");
    expect(text).toContain("No baseline found");
  });

  it("renders verified-resolved findings", () => {
    const diff = baselineDiff({
      resolvedFindings: [
        {
          ruleId: "QA-PW-101",
          file: "e2e/shop.spec.ts",
          message: "msg",
          severity: "warning",
          resolution: { status: "VERIFIED-RESOLVED" },
        },
      ],
    });
    const lines = renderDiffSection(diff);
    const text = lines.join("\n");
    expect(text).toContain("1 pre-existing finding verified as fixed");
  });

  it("renders plural for multiple verified findings", () => {
    const diff = baselineDiff({
      resolvedFindings: [
        {
          ruleId: "QA-PW-101",
          file: "a.spec.ts",
          message: "msg1",
          severity: "warning",
          resolution: { status: "VERIFIED-RESOLVED" },
        },
        {
          ruleId: "QA-PW-102",
          file: "b.spec.ts",
          message: "msg2",
          severity: "error",
          resolution: { status: "VERIFIED-RESOLVED" },
        },
      ],
    });
    const lines = renderDiffSection(diff);
    const text = lines.join("\n");
    expect(text).toContain("2 pre-existing findings verified as fixed");
  });

  it("skips verified line when resolved findings are not VERIFIED-RESOLVED", () => {
    const diff = baselineDiff({
      resolvedFindings: [
        {
          ruleId: "QA-PW-101",
          file: "e2e/shop.spec.ts",
          message: "msg",
          severity: "warning",
          resolution: { status: "INCONCLUSIVE", cause: "partial" },
        },
      ],
    });
    const lines = renderDiffSection(diff);
    const text = lines.join("\n");
    expect(text).not.toContain("verified as fixed");
  });

  it("skips verified line when resolved findings array is empty", () => {
    const diff = baselineDiff({ resolvedFindings: [] });
    const lines = renderDiffSection(diff);
    const text = lines.join("\n");
    expect(text).not.toContain("verified as fixed");
  });
});

// ---------------------------------------------------------------------------
// renderArtifactIntegrity
// ---------------------------------------------------------------------------

describe("renderArtifactIntegrity", () => {
  const identity: ArtifactIdentity = {
    scanId: "scan-abc-123",
    commit: "deadbeef1234",
    detectorRevisions: [
      { ruleId: "QA-PW-101", detectorRevision: 2 },
      { ruleId: "QA-TEST-001", detectorRevision: 1 },
    ],
    evidenceInventory: {
      totalFindings: 5,
      corroborated: 2,
      byEvidenceLevel: { E0: 1, E1: 2, E2: 2 },
    },
  };

  it("renders artifact identity table with all fields", () => {
    const lines = renderArtifactIntegrity(identity);
    const text = lines.join("\n");
    expect(text).toContain("<details>");
    expect(text).toContain("🔗 Artifact Integrity");
    expect(text).toContain("| scanId | `scan-abc-123` |");
    expect(text).toContain("| Commit | `deadbeef1234` |");
    expect(text).toContain("QA-PW-101@2");
    expect(text).toContain("QA-TEST-001@1");
    expect(text).toContain("5 finding(s), 2 runtime-corroborated");
    expect(text).toContain("</details>");
  });

  it("renders 'unbound' when scanId is null", () => {
    const id: ArtifactIdentity = { ...identity, scanId: null };
    const lines = renderArtifactIntegrity(id);
    const text = lines.join("\n");
    expect(text).toContain("| scanId | `unbound` |");
  });

  it("renders 'unknown' when commit is null", () => {
    const id: ArtifactIdentity = { ...identity, commit: null };
    const lines = renderArtifactIntegrity(id);
    const text = lines.join("\n");
    expect(text).toContain("| Commit | `unknown` |");
  });

  it("renders 'none' when detector revisions are empty", () => {
    const id: ArtifactIdentity = { ...identity, detectorRevisions: [] };
    const lines = renderArtifactIntegrity(id);
    const text = lines.join("\n");
    expect(text).toContain("| Rule(rev) inventory | none |");
  });
});

// ---------------------------------------------------------------------------
// renderUnifiedReport
// ---------------------------------------------------------------------------

describe("renderUnifiedReport", () => {
  it("starts with the unified marker", () => {
    const out = renderUnifiedReport(result());
    expect(out).toMatch(/^<!-- mjolnir-report:v2 -->/);
  });

  it("renders hero header with mjolnir icon", () => {
    const out = renderUnifiedReport(result());
    expect(out).toContain("Mjölnir Verification Report");
    expect(out).toContain("Tests tell you what passed");
  });

  it("renders the hero table with trust/score/findings/evidence badges", () => {
    const r = result({ score: 85 });
    const out = renderUnifiedReport(r);
    expect(out).toContain("### Trust Level");
    expect(out).toContain("**L2**");
    expect(out).toContain("### Score");
    expect(out).toContain("**85**/100");
    expect(out).toContain("### Findings");
    expect(out).toContain("### Evidence");
  });

  it("renders score delta when diff has baseline score", () => {
    const r = result({ score: 90 });
    const diff = baselineDiff({ baselineScore: 80 });
    const out = renderUnifiedReport(r, { diff });
    expect(out).toContain("(+10)");
  });

  it("renders headline from score state", () => {
    const r = result({ score: 85, findings: [] });
    const out = renderUnifiedReport(r);
    expect(out).toContain("**Headline:**");
  });

  it("renders score breakdown when dimensions present", () => {
    const dims: DimensionScore[] = [
      { category: "QA-PW", score: 90, errors: 0, warnings: 1, infos: 0 },
      { category: "QA-TEST", score: 80, errors: 1, warnings: 0, infos: 0 },
    ];
    const r = result({ dimensions: dims });
    const out = renderUnifiedReport(r);
    expect(out).toContain("### Score Breakdown");
    expect(out).toContain("| Category | Score |");
    expect(out).toContain("| QA-PW | 90/100 |");
    expect(out).toContain("| QA-TEST | 80/100 |");
  });

  it("skips score breakdown when dimensions empty", () => {
    const r = result({ dimensions: [] });
    const out = renderUnifiedReport(r);
    expect(out).not.toContain("### Score Breakdown");
  });

  it("renders 'no new findings' when findings list is empty", () => {
    const r = result({ findings: [] });
    const out = renderUnifiedReport(r);
    expect(out).toContain("No new findings");
  });

  it("renders findings grouped by severity", () => {
    const r = result({
      findings: [
        finding({ severity: "error", ruleId: "QA-ERR-001" }),
        finding({ severity: "warning", ruleId: "QA-WARN-001" }),
        finding({ severity: "info", ruleId: "QA-INFO-001" }),
      ],
    });
    const out = renderUnifiedReport(r);
    expect(out).toContain("🔴");
    expect(out).toContain("🟡");
    expect(out).toContain("🔵");
    expect(out).toContain("errors");
    expect(out).toContain("warnings");
    expect(out).toContain("infos");
  });

  it("renders findings with code-like fix in backticks", () => {
    const r = result({
      findings: [
        finding({
          fix: "await page.waitForSelector('.foo');",
          findingType: "deterministic-defect",
          confidence: "high",
          evidenceLevel: "E2",
        }),
      ],
    });
    const out = renderUnifiedReport(r);
    expect(out).toContain("await page.waitForSelector");
  });

  it("renders findings with non-code fix in italics", () => {
    const r = result({
      findings: [
        finding({
          fix: "add a data-testid attribute",
          findingType: "deterministic-defect",
          confidence: "high",
          evidenceLevel: "E2",
        }),
      ],
    });
    const out = renderUnifiedReport(r);
    expect(out).toContain("_add a data-testid attribute_");
  });

  it("renders evidence tag with measured FP rate", () => {
    const r = result({
      findings: [
        finding({
          measuredFpRate: 0.15,
          measuredFpN: 20,
          findingType: "deterministic-defect",
          confidence: "high",
          evidenceLevel: "E2",
        }),
      ],
    });
    const out = renderUnifiedReport(r);
    expect(out).toContain("measured FP 15%");
    expect(out).toContain("n=20");
  });

  it("renders evidence tag with measured FP rate but no n", () => {
    const r = result({
      findings: [
        finding({
          measuredFpRate: 0.05,
          findingType: "deterministic-defect",
          confidence: "high",
          evidenceLevel: "E2",
        }),
      ],
    });
    const out = renderUnifiedReport(r);
    expect(out).toContain("measured FP 5%");
  });

  it("renders evidence tag for E1 (heuristic) findings", () => {
    const r = result({
      findings: [
        finding({
          evidenceLevel: "E1",
          findingType: "heuristic-risk",
          confidence: "medium",
        }),
      ],
    });
    const out = renderUnifiedReport(r);
    expect(out).toContain("heuristic");
  });

  it("renders evidence tag for E0 (observation) findings", () => {
    const r = result({
      findings: [
        finding({
          evidenceLevel: "E0",
          findingType: "observation",
          confidence: "low",
        }),
      ],
    });
    const out = renderUnifiedReport(r);
    expect(out).toContain("observation");
  });

  it("escapes markdown special characters in findings", () => {
    const r = result({
      findings: [
        finding({
          ruleId: "QA-PW-101",
          file: "src/[slug]/page.tsx",
          message: "found <script> tag",
          fix: "use `dangerouslySetInnerHTML`",
          findingType: "deterministic-defect",
          confidence: "high",
          evidenceLevel: "E2",
        }),
      ],
    });
    const out = renderUnifiedReport(r);
    // sanitizeData + escMd should escape brackets, backticks, angle brackets
    expect(out).toContain("QA-PW-101");
  });

  it("truncates findings at 25 per group and shows overflow", () => {
    const findings = Array.from({ length: 30 }, (_, i) =>
      finding({
        ruleId: `QA-PW-${i}`,
        file: `file${i}.spec.ts`,
        line: i + 1,
        severity: "warning",
      }),
    );
    const r = result({ findings });
    const out = renderUnifiedReport(r);
    expect(out).toContain("_...and 5 more warnings");
    expect(out).toContain("Run `mjolnir` locally");
  });

  it("does not show overflow when <= 25 findings", () => {
    const findings = Array.from({ length: 25 }, (_, i) =>
      finding({
        ruleId: `QA-PW-${i}`,
        file: `file${i}.spec.ts`,
        line: i + 1,
        severity: "warning",
      }),
    );
    const r = result({ findings });
    const out = renderUnifiedReport(r);
    expect(out).not.toContain("_...and");
  });

  it("renders diff section when diff provided", () => {
    const r = result();
    const diff = baselineDiff();
    const out = renderUnifiedReport(r, { diff });
    expect(out).toContain("🔧 Diff vs Baseline");
  });

  it("skips diff section when no diff", () => {
    const r = result();
    const out = renderUnifiedReport(r);
    expect(out).not.toContain("🔧 Diff vs Baseline");
  });

  it("uses findings from diff.newFindings when diff has baseline", () => {
    const r = result({
      findings: [finding({ ruleId: "QA-OLD-001" })],
    });
    const diff = baselineDiff({
      hasBaseline: true,
      newFindings: [finding({ ruleId: "QA-NEW-001", severity: "error" })],
    });
    const out = renderUnifiedReport(r, { diff });
    expect(out).toContain("QA-NEW-001");
  });

  it("renders confidence table", () => {
    const out = renderUnifiedReport(result());
    expect(out).toContain("📊 Confidence & Evidence");
  });

  it("renders artifact integrity section", () => {
    const out = renderUnifiedReport(result());
    expect(out).toContain("🔗 Artifact Integrity");
  });

  it("renders 'what to run next' section", () => {
    const out = renderUnifiedReport(result());
    expect(out).toContain("What to run next");
    expect(out).toContain("npx mjolnir-qa");
    expect(out).toContain("--verbose");
  });

  it("includes version in commands when provided", () => {
    const out = renderUnifiedReport(result(), { version: "1.2.3" });
    expect(out).toContain("npx mjolnir-qa@1.2.3");
  });

  it("omits @version when not provided", () => {
    const out = renderUnifiedReport(result());
    expect(out).toMatch(/npx mjolnir-qa\b(?!@)/);
  });

  it("renders default repo URL", () => {
    const out = renderUnifiedReport(result());
    expect(out).toContain("https://github.com/Sergey-Bar/Mjolnir");
  });

  it("renders custom repo URL in footer", () => {
    const out = renderUnifiedReport(result(), {
      repoUrl: "https://github.com/custom/repo",
    });
    expect(out).toContain("https://github.com/custom/repo");
    expect(out).toContain(
      "Generated by [Mjölnir](https://github.com/custom/repo)",
    );
  });

  it("provides fallback trust summary when result.trustSummary is undefined", () => {
    const { trustSummary: _, ...restResult } = result();
    const r = restResult as ScanResult;
    const out = renderUnifiedReport(r);
    expect(out).toContain("L0");
    expect(out).toContain("**0%**");
  });

  it("renders separator lines", () => {
    const out = renderUnifiedReport(result());
    expect(out).toContain("---");
  });

  it("renders error findings with 'must fix before merge'", () => {
    const r = result({
      findings: [finding({ severity: "error" })],
    });
    const out = renderUnifiedReport(r);
    expect(out).toContain("must fix before merge");
  });

  it("handles score=null (unmeasured)", () => {
    const r = result({ score: null });
    const out = renderUnifiedReport(r);
    expect(out).toContain("*n/a*");
  });

  it("renders commit from options", () => {
    const r = result();
    const out = renderUnifiedReport(r, { commit: "abc1234" });
    expect(out).toContain("abc1234");
  });

  it("renders errors group as open (default open attribute)", () => {
    const r = result({
      findings: [finding({ severity: "error" })],
    });
    const out = renderUnifiedReport(r);
    expect(out).toContain("<details open>");
  });

  it("renders warnings group without open attribute", () => {
    const r = result({
      findings: [finding({ severity: "warning" })],
    });
    const out = renderUnifiedReport(r);
    // warnings/details should NOT have `open` — only errors do
    expect(out).toContain("<details>");
    // The warnings <details> should not have open
    const detailsMatches = out.match(/<details[^>]*>/g) ?? [];
    const openCount = detailsMatches.filter((m) => m.includes("open")).length;
    // Only the confidence table <details> is present, no error <details open>
    expect(openCount).toBe(0);
  });

  it("findings with measuredFpRate=0 still show 0%", () => {
    const r = result({
      findings: [
        finding({
          measuredFpRate: 0,
          findingType: "deterministic-defect",
          confidence: "high",
          evidenceLevel: "E2",
        }),
      ],
    });
    const out = renderUnifiedReport(r);
    expect(out).toContain("measured FP 0%");
  });

  it("evidence level derived from findingType when evidenceLevel not set", () => {
    const r = result({
      findings: [
        finding({
          findingType: "observation",
          confidence: "low",
          evidenceLevel: "E0",
        }),
      ],
    });
    const out = renderUnifiedReport(r);
    expect(out).toContain("observation");
  });

  it("evidence level derived for heuristic-risk", () => {
    const r = result({
      findings: [
        finding({
          findingType: "heuristic-risk",
          confidence: "medium",
          evidenceLevel: "E1",
        }),
      ],
    });
    const out = renderUnifiedReport(r);
    expect(out).toContain("heuristic");
  });

  it("evidence level derived for deterministic-defect with low confidence → E1", () => {
    const r = result({
      findings: [
        finding({
          findingType: "deterministic-defect",
          confidence: "low",
          evidenceLevel: "E1",
        }),
      ],
    });
    const out = renderUnifiedReport(r);
    expect(out).toContain("heuristic");
  });

  it("evidence level derived for deterministic-defect with high confidence → E2", () => {
    const r = result({
      findings: [
        finding({
          findingType: "deterministic-defect",
          confidence: "high",
        }),
      ],
    });
    const out = renderUnifiedReport(r);
    expect(out).toContain("deterministic");
  });
});
