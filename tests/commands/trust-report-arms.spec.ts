/**
 * Small-arms coverage for the trust surfaces: the `--from` parsing arms,
 * the artifact renderers' optional-field fallbacks (a bare ScanResult
 * must render honestly — "unknown"/"PROVISIONAL", never fabricated
 * numbers), the terminal reporter's ranking/label arms, and the
 * evidence-graph's no-fabrication spreads (a link carries a ref ONLY
 * when its identity input exists).
 */

import { describe, expect, it } from "vitest";

import {
  renderTrustReportHtml,
  renderTrustReportJson,
  renderTrustReportMarkdown,
  runTrustReportCommand,
} from "../../src/commands/trust-report.js";
import {
  nextAction,
  renderTrustReport,
  topTrustRisks,
} from "../../src/reporter/trust-report.js";
import { buildEvidenceGraph } from "../../src/engine/run-identity.js";
import type { ScanResult } from "../../src/types.js";

/** A result with NO optional fields — every renderer fallback must fire. */
function bareResult(overrides: Record<string, unknown> = {}): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    frameworks: ["playwright"],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: [],
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 5,
    },
    ...overrides,
  } as unknown as ScanResult;
}

describe("--from argument arms (frozen usage errors)", () => {
  it("--from without a path ⇒ usage error 10", async () => {
    const errs: unknown[] = [];
    const code = await runTrustReportCommand(["--from"], {
      out: () => {},
      err: (m) => errs.push(m),
    });
    expect(code).toBe(10);
    expect(errs.map(String).join(" ")).toContain(
      "--from requires a saved report path",
    );
  });

  it("--commit missing its value ⇒ usage error 10", async () => {
    const errs: unknown[] = [];
    const code = await runTrustReportCommand(["--from", "x.json", "--commit"], {
      out: () => {},
      err: (m) => errs.push(m),
    });
    expect(code).toBe(10);
    expect(errs.map(String).join(" ")).toContain(
      "--commit requires the run's HEAD sha",
    );
  });

  it("--commit followed by another flag ⇒ usage error 10 (not a sha)", async () => {
    const errs: unknown[] = [];
    const code = await runTrustReportCommand(
      ["--from", "x.json", "--commit", "--stdout"],
      { out: () => {}, err: (m) => errs.push(m) },
    );
    expect(code).toBe(10);
    expect(errs.map(String).join(" ")).toContain(
      "--commit requires the run's HEAD sha",
    );
  });
});

describe("artifact renderers on a BARE result (fallbacks stay honest)", () => {
  it("md renders an unknown score and zero-count lines without fabricating", () => {
    const md = renderTrustReportMarkdown(bareResult(), "bare-repo");
    expect(md).toContain("| Score | unknown |");
    expect(md).toContain("| Tests analyzed | 0 in 0 files |");
    expect(md).toContain("## Artifact integrity");
  });

  it("md/html render the PROVISIONAL arm only when unmeasured rules actually fired", () => {
    const provisional = bareResult({
      trustSummary: {
        level: "L1",
        confidence: 0.3,
        evidenceCoverage: 0.2,
        inconclusiveRate: 0,
        provisionalRuleIds: ["QA-X-001"],
        ceilingReasons: [],
      },
    });
    const md = renderTrustReportMarkdown(provisional, "r");
    expect(md).toContain("PROVISIONAL (1 unmeasured)");
    expect(renderTrustReportHtml(provisional, "r")).toContain(
      "PROVISIONAL (1 unmeasured)",
    );

    // With NO provisional ids and no measurement: the honest "n/a".
    const empty = bareResult({
      trustSummary: {
        level: "L1",
        confidence: 0.3,
        evidenceCoverage: 0.2,
        inconclusiveRate: 0,
        provisionalRuleIds: [],
        ceilingReasons: [],
      },
    });
    expect(renderTrustReportMarkdown(empty, "r")).toContain("| n/a |");
  });

  it("html renders the ceiling and measured-FP non-fallback arms", () => {
    const full = bareResult({
      score: 88,
      testFileCount: 3,
      testDeclarationCount: 30,
      trustSummary: {
        level: "L3",
        confidence: 0.6,
        confidenceCeiling: 0.75,
        evidenceCoverage: 0.5,
        inconclusiveRate: 0.1,
        measuredFpOfFiredRules: 0.1,
        provisionalRuleIds: [],
        ceilingReasons: ["no run report"],
      },
    });
    const html = renderTrustReportHtml(full, "full-repo");
    expect(html).toContain("(ceiling 75%)");
    expect(html).toContain("10%");
    expect(html).not.toContain("PROVISIONAL");
  });

  it("the json twin renders the bare fallbacks too", () => {
    const json = JSON.parse(renderTrustReportJson(bareResult())) as {
      trust: { level: string; confidence: number };
    };
    expect(json.trust.level).toBe("L0");
    expect(json.trust.confidence).toBe(0);
  });
});

describe("terminal reporter ranking and label arms", () => {
  const mk = (
    ruleId: string,
    corroboration: { level: string } | undefined,
    evidenceLevel: string | undefined,
  ): ScanResult["findings"][number] =>
    ({
      ruleId,
      category: "QA-PW",
      severity: "warning",
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: "FLAKY-RISK",
      file: "e2e/a.spec.ts",
      line: 1,
      column: 1,
      message: `msg ${ruleId}`,
      why: "w",
      fix: "f",
      ...(corroboration !== undefined
        ? { runtimeCorroboration: corroboration }
        : {}),
      ...(evidenceLevel !== undefined ? { evidenceLevel } : {}),
    }) as ScanResult["findings"][number];

  it("topTrustRisks: corroboration dominates evidence level dominates severity; default n=3", () => {
    const findings = [
      mk("QA-PW-001", undefined, "E2"), // 0*100 + 2*10 + 1 = 21
      mk("QA-PW-002", { level: "file" }, "E1"), // 1*100 + 1*10 + 1 = 111
      mk("QA-PW-003", { level: "defect" }, "E0"), // E0 ⇒ ADVISORY ⇒ filtered entirely
      mk("QA-PW-004", undefined, undefined), // 0 + 0 + 1 = 1
      mk("QA-PW-105", { level: "defect" }, "E1"), // 2*100 + 1*10 + 1 = 211 ⇒ top
    ];
    const top = topTrustRisks(findings);
    expect(top.map((f) => f.ruleId)).toEqual([
      "QA-PW-105",
      "QA-PW-002",
      "QA-PW-001",
    ]);
  });

  it("nextAction derives one canonical command per state", () => {
    expect(nextAction({ ...bareResult(), partial: true })).toContain(
      "re-run with a higher --max-duration",
    );
    // "add tests" fires ONLY on an explicit zero declaration count — an
    // ABSENT count is unknown, not zero (no fabricated conclusions).
    expect(nextAction(bareResult({ testDeclarationCount: 0 }))).toContain(
      "add tests",
    );
    const withDeclarations = bareResult({
      testDeclarationCount: 5,
      testFileCount: 1,
    });
    expect(nextAction(withDeclarations)).toContain("nothing to triage");
    const withRisk = bareResult({
      testDeclarationCount: 5,
      testFileCount: 1,
      findings: [mk("QA-PW-009", undefined, "E2")],
    });
    expect(nextAction(withRisk)).toContain("mjolnir explain QA-PW-009");
  });

  it("renderTrustReport: bare result ⇒ L2 fallback label, none-fired arm, zero counts", () => {
    const text = renderTrustReport(bareResult(), {
      isTTY: false,
      verbose: false,
      width: 80,
      ascii: true,
    });
    expect(text).toContain("L2 ·");
    expect(text).toContain("none fired — nothing to weight");
    expect(text).toContain("tests analyzed      0 declaration(s) in 0 file(s)");
    expect(text).toContain("none — no non-advisory findings fired");
  });

  it("renderTrustReport: evidence labels cover every arm (run corroborated / executed / deterministic / pattern)", () => {
    const result = bareResult({
      findings: [
        mk("QA-PW-101", { level: "defect" }, "E2"),
        mk("QA-PW-102", { level: "file" }, "E1"),
        mk("QA-PW-103", undefined, "E2"),
        mk("QA-PW-104", undefined, "E1"),
      ],
    });
    const text = renderTrustReport(result, {
      isTTY: false,
      verbose: true,
      width: 80,
      ascii: true,
    });
    expect(text).toContain("[run corroborated]");
    expect(text).toContain("[run executed]");
    expect(text).toContain("[deterministic]");
    expect(text).toContain("[pattern]");
  });

  it("renderTrustReport: an out-of-table level renders its raw value (label fallback)", () => {
    const odd = bareResult({
      trustSummary: {
        level: "L9",
        confidence: 0.5,
        evidenceCoverage: 0.5,
        inconclusiveRate: 0,
        provisionalRuleIds: [],
        ceilingReasons: [],
      },
    });
    expect(renderTrustReport(odd, { isTTY: false, ascii: true })).toContain(
      "L9",
    );
  });
});

describe("buildEvidenceGraph — the no-fabrication spreads", () => {
  it("absent identity inputs leave their links unbound (no ref key)", () => {
    const graph = buildEvidenceGraph({});
    const byLink = new Map(graph.chain.map((n) => [n.link as string, n]));
    // The chain itself is ALWAYS emitted — an unbound verdict link is
    // visible as a node without a ref, never omitted.
    expect(byLink.get("verdict")).toBeDefined();
    for (const link of [
      "evidence",
      "execution",
      "scope",
      "source",
      "rule",
      "fixture",
      "reproduction",
    ]) {
      expect(byLink.get(link)?.ref, link).toBeUndefined();
    }
  });

  it("present identity inputs bind exactly their own links", () => {
    const graph = buildEvidenceGraph({
      runId: {
        scanId: "a".repeat(64),
        inputFingerprint: "b".repeat(64),
        rulesDigest: "c".repeat(64),
        configFingerprint: "d".repeat(64),
        engineVersion: "test",
      },
      source: "jest-json",
      fixture: "verdict-set-digest",
      reproduction: "commit-1234",
    });
    const byLink = new Map(graph.chain.map((n) => [n.link as string, n.ref]));
    expect(byLink.get("execution")).toBe("a".repeat(64));
    expect(byLink.get("scope")).toBe("b".repeat(64));
    expect(byLink.get("rule")).toBe("c".repeat(64));
    expect(byLink.get("source")).toBe("jest-json");
    expect(byLink.get("fixture")).toBe("verdict-set-digest");
    expect(byLink.get("reproduction")).toBe("commit-1234");
  });
});
