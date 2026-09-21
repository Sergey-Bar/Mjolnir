/**
 * Trust Report hero surface (Mega MVP Master Plan v3.1 §26 WI-5, §7).
 *
 * Locks: the five questions answerable from the DEFAULT run; parity
 * (every number on the terminal exists in --json); the --classic
 * escape hatch (rendering flag only — identical semantics both ways);
 * the derived facts (trustHeadline/trustReasons/topTrustRisks/
 * nextAction) stay deterministic and canonical-derived.
 */

import { describe, expect, it } from "vitest";

import {
  nextAction,
  renderTrustReport,
  topTrustRisks,
  trustHeadline,
  trustReasons,
} from "../../src/reporter/trust-report.js";
import { renderTerminal } from "../../src/reporter/terminal.js";
import type { Finding, ScanResult } from "../../src/types.js";

function finding(overrides: Partial<Finding>): Finding {
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
    fix: "fix",
    ...overrides,
  };
}

function result(overrides: Partial<ScanResult>): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 96,
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

const STATIC_OPTS = { isTTY: false, width: 80, ascii: true };

describe("the five questions (WI-5 acceptance)", () => {
  const r = result({
    findings: [
      finding({}),
      finding({
        ruleId: "QA-PW-141",
        file: "e2e/other.spec.ts",
        line: 40,
        evidenceLevel: "E1",
        trustLevel: "L4",
        runtimeCorroboration: {
          level: "test",
          source: "playwright-json",
          testsExecuted: 3,
          matchedTest: {
            title: "t",
            finalStatus: "passed",
            attempts: 2,
            passedOnRetry: true,
            everFailed: true,
            skipped: false,
          },
        },
      }),
    ],
  });
  const out = renderTrustReport(r, STATIC_OPTS);

  it("1. what happened — TRUST VERDICT names the rung", () => {
    expect(out).toContain("TRUST VERDICT");
    // The rung line renders the SUMMARY level (L2 — the stamped summary
    // is part of the fixture); the L4 finding's corroboration surfaces
    // in WHY ("1 corroborated") and TOP TRUST RISKS ("[run executed]").
    expect(out).toContain("L2");
    expect(out).toContain("[run executed]");
  });

  it("2. can I trust it — CONFIDENCE renders the measurement", () => {
    expect(out).toContain("CONFIDENCE");
    expect(out).toContain("70%");
    expect(out).toContain("40% of analyzed declarations");
  });

  it("3. why — WHY THIS VERDICT lists evidence-backed reasons", () => {
    expect(out).toContain("WHY THIS VERDICT");
    expect(out).toContain("2 finding(s) fired; 1 corroborated");
  });

  it("4. what supports it — TOP TRUST RISKS with evidence tags", () => {
    expect(out).toContain("TOP TRUST RISKS");
    expect(out).toContain("[run executed]");
    expect(out).toContain("[deterministic]");
  });

  it("5. what next — NEXT ACTION names a concrete command", () => {
    expect(out).toContain("NEXT ACTION");
    expect(out).toContain("mjolnir explain QA-PW-141");
  });
});

describe("parity — every number rendered exists in the JSON contract", () => {
  it("no rendered metric is absent from the canonical result", () => {
    const r = result({
      partial: true,
      trustSummary: {
        level: "L3",
        confidence: 0.5,
        evidenceCoverage: 0.25,
        inconclusiveRate: 0.2,
        provisionalRuleIds: ["QA-PW-141"],
        confidenceCeiling: 0.5,
        ceilingReasons: ["partial-scan"],
      },
    });
    const out = renderTrustReport(r, STATIC_OPTS);
    // Values come from the summary fields, not parallel derivation:
    expect(out).toContain("50%");
    expect(out).toContain("ceiling 50%");
    expect(out).toContain("25% of analyzed declarations");
    expect(out).toContain("20%");
    expect(out).toContain("PROVISIONAL");
    expect(out).toContain("QA-PW-141");
    // JSON side carries the same summary:
    expect(r.trustSummary?.confidence).toBe(0.5);
    expect(r.trustSummary?.confidenceCeiling).toBe(0.5);
  });
});

describe("--classic escape hatch", () => {
  it("classic renders the pre-Trust-Report surface, same result", () => {
    const r = result({ findings: [finding({})] });
    const classic = renderTrustReport(r, { ...STATIC_OPTS, classic: true });
    const direct = renderTerminal(r, STATIC_OPTS);
    expect(classic).toBe(direct);
    expect(classic).not.toContain("TRUST VERDICT");
  });

  it("default is the Trust Report, not the classic render", () => {
    const r = result({});
    expect(renderTrustReport(r, STATIC_OPTS)).toContain("TRUST VERDICT");
    expect(renderTerminal(r, STATIC_OPTS)).not.toContain("TRUST VERDICT");
  });
});

describe("derived facts — deterministic, canonical-derived", () => {
  it("trustHeadline bands are deterministic over (level, confidence)", () => {
    const s = result({}).trustSummary;
    if (s === undefined) throw new Error("fixture missing summary");
    expect(trustHeadline({ ...s, level: "L5", confidence: 0.9 })).toContain(
      "trust them",
    );
    expect(trustHeadline({ ...s, level: "L5", confidence: 0.3 })).toContain(
      "incomplete",
    );
    expect(trustHeadline({ ...s, level: "L3", confidence: 0.9 })).toContain(
      "solid",
    );
    expect(trustHeadline({ ...s, level: "L2", confidence: 0.9 })).toContain(
      "uncorroborated",
    );
    expect(trustHeadline({ ...s, level: "L1", confidence: 0.2 })).toContain(
      "leads, not verdicts",
    );
  });

  it("topTrustRisks: corroborated > deterministic > advisory-excluded, deterministic order", () => {
    const findings = [
      finding({ ruleId: "QA-A", line: 1, evidenceLevel: "E1" }),
      finding({
        ruleId: "QA-B",
        line: 2,
        trustLevel: "L5",
        runtimeCorroboration: {
          level: "defect",
          source: "junit-xml",
          testsExecuted: 2,
          matchedTest: {
            title: "t",
            finalStatus: "failed",
            attempts: 1,
            passedOnRetry: false,
            everFailed: true,
            skipped: false,
          },
        },
      }),
      finding({
        ruleId: "QA-C",
        line: 3,
        evidenceLevel: "E0",
        findingType: "observation",
      }),
      finding({ ruleId: "QA-D", line: 4 }),
    ];
    const risks = topTrustRisks(findings, 3);
    expect(risks.map((f) => f.ruleId)).toEqual(["QA-B", "QA-D", "QA-A"]);
    // deterministic: same input, same order
    expect(topTrustRisks(findings, 3).map((f) => f.ruleId)).toEqual(
      risks.map((f) => f.ruleId),
    );
  });

  it("nextAction: partial → widen the surface; clean → keep the gate; findings → explain top risk", () => {
    expect(nextAction(result({ partial: true }))).toContain("--max-duration");
    expect(nextAction(result({}))).toContain("ci install");
    expect(
      nextAction(result({ findings: [finding({ ruleId: "QA-PW-101" })] })),
    ).toContain("mjolnir explain QA-PW-101");
  });

  it("trustReasons: ceiling + provisional + unknown disclosures", () => {
    const r = result({
      partial: true,
      frameworkDetectionUnknown: true,
      trustSummary: {
        level: "L2",
        confidence: 0.3,
        evidenceCoverage: 0.1,
        inconclusiveRate: 0.5,
        provisionalRuleIds: ["QA-X-001"],
        confidenceCeiling: 0.5,
        ceilingReasons: ["partial-scan"],
      },
    });
    const s2 = r.trustSummary;
    if (s2 === undefined) throw new Error("fixture missing summary");
    const reasons = trustReasons(r, s2);
    expect(reasons.some((x) => x.includes("capped at 50%"))).toBe(true);
    expect(reasons.some((x) => x.includes("unmeasured"))).toBe(true);
    expect(reasons.some((x) => x.includes("framework detection"))).toBe(true);
  });
});

describe("P8 coverage — the remaining arms of the hero render", () => {
  it("PROVISIONAL fired-rules line renders with the >3 truncation", () => {
    const out = renderTrustReport(
      result({
        trustSummary: {
          level: "L2",
          confidence: 0.5,
          evidenceCoverage: 0.3,
          inconclusiveRate: 0,
          provisionalRuleIds: [
            "QA-PY-008",
            "QA-PY-010",
            "QA-PW-122",
            "QA-PW-004",
            "QA-PW-123",
          ],
          ceilingReasons: ["provisional-rules"],
        },
      }),
      STATIC_OPTS,
    );
    expect(out).toContain("PROVISIONAL — unmeasured rules fired:");
    expect(out).toContain("+2 more");
  });

  it("no measured-FP line when nothing fired and no provisional rules", () => {
    const out = renderTrustReport(
      result({
        trustSummary: {
          level: "L2",
          confidence: 0.5,
          evidenceCoverage: 0.4,
          inconclusiveRate: 0,
          provisionalRuleIds: [],
          ceilingReasons: [],
        },
      }),
      STATIC_OPTS,
    );
    expect(out).toContain("none fired — nothing to weight");
  });

  it("a >3-risk eligible list renders the overflow line", () => {
    const out = renderTrustReport(
      result({
        findings: [
          finding({ ruleId: "QA-TEST-901", file: "a.spec.ts", line: 1 }),
          finding({ ruleId: "QA-TEST-902", file: "b.spec.ts", line: 2 }),
          finding({ ruleId: "QA-TEST-903", file: "c.spec.ts", line: 3 }),
          finding({ ruleId: "QA-TEST-904", file: "d.spec.ts", line: 4 }),
        ],
      }),
      STATIC_OPTS,
    );
    expect(out).toContain("more in --json / --verbose");
  });

  it("deterministic-evidence tag renders for non-corroborated E2 findings", () => {
    const out = renderTrustReport(
      result({
        findings: [
          finding({ ruleId: "QA-TEST-905", file: "a.spec.ts", line: 1 }),
        ],
      }),
      STATIC_OPTS,
    );
    expect(out).toContain("[deterministic]");
  });

  it("pattern tag renders for E1 non-corroborated findings", () => {
    const out = renderTrustReport(
      result({
        findings: [
          finding({
            ruleId: "QA-TEST-906",
            file: "a.spec.ts",
            line: 1,
            evidenceLevel: "E1",
          }),
        ],
      }),
      STATIC_OPTS,
    );
    expect(out).toContain("[pattern]");
  });

  it("run-executed tag renders for file/test-level corroboration", () => {
    const out = renderTrustReport(
      result({
        findings: [
          finding({
            ruleId: "QA-TEST-907",
            file: "a.spec.ts",
            line: 1,
            runtimeCorroboration: {
              level: "test",
              source: "junit-xml",
              testsExecuted: 2,
            },
          }),
        ],
      }),
      STATIC_OPTS,
    );
    expect(out).toContain("[run executed]");
  });
});
