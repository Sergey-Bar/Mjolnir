/**
 * Trust summary formula suite (Mega MVP Master Plan v3.1 §26 WI-3).
 *
 * Locks: formula tables incl. empty/partial/hostile inputs, the
 * incompleteness-ceiling law ("no confidence > ceiling on partial
 * scans"), the PROVISIONAL disclosure rule, and determinism.
 * Formulas live in docs/SCORING.md §Trust summary formulas v1 — this
 * suite is the executable form of those tables.
 */

import { describe, expect, it } from "vitest";

import {
  buildTrustSummary,
  INCOMPLETENESS_CEILINGS,
  incompletenessCeilingFor,
  summaryTrustLevel,
} from "../../src/engine/trust-summary.js";
import type { Finding, ScanResult } from "../../src/types.js";

function finding(
  overrides: Omit<Partial<Finding>, "trustLevel" | "runtimeCorroboration"> & {
    trustLevel?: Finding["trustLevel"] | undefined;
    runtimeCorroboration?: Finding["runtimeCorroboration"] | undefined;
  },
): Finding {
  const { trustLevel, runtimeCorroboration, ...rest } = overrides;
  const base: Finding = {
    ruleId: "QA-PW-102",
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
    ...rest,
  };
  if (trustLevel !== undefined) base.trustLevel = trustLevel;
  if (runtimeCorroboration !== undefined) {
    base.runtimeCorroboration = runtimeCorroboration;
  }
  return base;
}

function result(overrides: Partial<ScanResult>): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 100,
    frameworks: ["playwright"],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: [],
    testDeclarationCount: 10,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 5,
    },
    ...overrides,
  };
}

const E2_STATIC: Finding = finding({
  trustLevel: "L2",
  runtimeCorroboration: undefined,
});

describe("level", () => {
  it("a findings-free scan is L0 — an observation, not a proof", () => {
    expect(buildTrustSummary(result({}), new Map()).level).toBe("L0");
  });

  it("static-only findings cap the level at L2", () => {
    const s = buildTrustSummary(
      result({ findings: [finding({ trustLevel: undefined })] }),
      new Map(),
    );
    expect(s.level).toBe("L2");
  });

  it("runtime corroboration lifts the level to the best stamped rung", () => {
    const s = buildTrustSummary(
      result({
        findings: [
          E2_STATIC,
          finding({
            trustLevel: "L5",
            runtimeCorroboration: {
              level: "defect",
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
      }),
      new Map(),
    );
    expect(s.level).toBe("L5");
  });

  it("summaryTrustLevel alone mirrors the stamped best rung", () => {
    expect(summaryTrustLevel([finding({ trustLevel: "L3" })])).toBe("L3");
    expect(summaryTrustLevel([])).toBe("L0");
  });
});

describe("confidence — composite + ceiling law (the WI-3 acceptance)", () => {
  it("all-E2 static findings: 0.5×evidence mass + 0.5×mean rung = 0.7", () => {
    // Evidence mass 1 each; rung L2 = 2/5 → (1 + 0.4) / 2 = 0.7.
    const s = buildTrustSummary(
      result({ findings: [finding({ trustLevel: undefined }), E2_STATIC] }),
      new Map(),
    );
    expect(s.confidence).toBeCloseTo(0.7, 5);
    expect(s.confidenceCeiling).toBeUndefined();
    expect(s.ceilingReasons).toEqual([]);
  });

  it("L5 findings reach 1.0 on a whole scan", () => {
    const s = buildTrustSummary(
      result({
        findings: [
          finding({
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
        ],
      }),
      new Map(),
    );
    expect(s.confidence).toBe(1);
  });

  it("E0-only findings read low — observations are not proof", () => {
    const s = buildTrustSummary(
      result({
        findings: [
          finding({
            trustLevel: undefined,
            evidenceLevel: "E0",
            findingType: "observation",
          }),
        ],
      }),
      new Map(),
    );
    expect(s.confidence).toBeLessThanOrEqual(0.2);
  });

  it("CEILING LAW: a partial scan can never exceed its ceiling, even with L5 findings", () => {
    const s = buildTrustSummary(
      result({
        partial: true,
        findings: [
          finding({
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
        ],
      }),
      new Map(),
    );
    expect(s.confidenceCeiling).toBe(INCOMPLETENESS_CEILINGS.partial);
    expect(s.confidence).toBeLessThanOrEqual(INCOMPLETENESS_CEILINGS.partial);
    expect(s.ceilingReasons).toContain("partial-scan");
  });

  it("the binding ceiling is the MINIMUM of applicable factors", () => {
    const c = incompletenessCeilingFor(
      result({
        partial: true,
        frameworkDetectionUnknown: true,
        analysisStatus: {
          discovery: "partial",
          rules: "complete",
          skippedFiles: 2,
          durationMs: 1,
          rulesCrashed: 3,
        },
      }),
    );
    expect(c.ceiling).toBe(INCOMPLETENESS_CEILINGS.partial);
    expect(c.reasons).toEqual([
      "partial-scan",
      "truncated-analysis",
      "rules-crashed:3",
      "framework-detection-unknown",
    ]);
  });

  it("a findings-free whole scan reads 1; a findings-free partial scan reads only its ceiling", () => {
    expect(buildTrustSummary(result({}), new Map()).confidence).toBe(1);
    const s = buildTrustSummary(result({ partial: true }), new Map());
    expect(s.confidence).toBe(INCOMPLETENESS_CEILINGS.partial);
  });
});

describe("evidenceCoverage — evidenceBackedDeclarations / analyzedDeclarations", () => {
  it("declarations in files with a non-advisory finding are evidence-backed", () => {
    // 4 of 10 declarations live in the file the scan has E1+ evidence for.
    const s = buildTrustSummary(
      result({ findings: [finding({ file: "e2e/shop.spec.ts" })] }),
      new Map([["e2e/shop.spec.ts", 4]]),
    );
    expect(s.evidenceCoverage).toBe(0.4);
  });

  it("advisory-only files back nothing — E0 is not evidence of coverage", () => {
    const s = buildTrustSummary(
      result({
        findings: [
          finding({
            file: "e2e/shop.spec.ts",
            evidenceLevel: "E0",
            findingType: "observation",
          }),
        ],
      }),
      new Map([["e2e/shop.spec.ts", 4]]),
    );
    expect(s.evidenceCoverage).toBe(0);
  });

  it("zero analyzed declarations → coverage 0 (never NaN)", () => {
    const s = buildTrustSummary(
      result({ testDeclarationCount: 0, reason: "no-tests-found" }),
      new Map(),
    );
    expect(s.evidenceCoverage).toBe(0);
  });
});

describe("inconclusiveRate — scan-level unknowns over the judged population", () => {
  it("a whole scan with no unknowns reads 0 — conclusive, honestly", () => {
    expect(buildTrustSummary(result({}), new Map()).inconclusiveRate).toBe(0);
  });

  it("hostile/partial inputs surface as the unknown share", () => {
    const s = buildTrustSummary(
      result({
        findings: [finding({})],
        frameworkDetectionUnknown: true,
        analysisStatus: {
          discovery: "partial",
          rules: "partial",
          skippedFiles: 2,
          durationMs: 1,
          rulesCrashed: 1,
          truncationReasons: ["deadline", "file-cap:typescript"],
        },
      }),
      new Map(),
    );
    // unknowns = 1 crash + 2 truncation reasons + 2 skipped + 1 framework
    const expected = Math.round((6 / 7) * 100) / 100;
    expect(s.inconclusiveRate).toBe(expected);
  });
});

describe("measuredFpOfFiredRules — evidence-weighted, PROVISIONAL disclosure", () => {
  it("measured-only fired set: evidence-weighted mean of measured FP rates", () => {
    // QA-PW-004 (E2, weight 1) + QA-PW-141 (E1, weight 0.5): both measured.
    const s = buildTrustSummary(
      result({
        findings: [
          finding({ ruleId: "QA-PW-004" }),
          finding({ ruleId: "QA-PW-141", evidenceLevel: "E1" }),
        ],
      }),
      new Map(),
    );
    const m004 = 0.429; // QA-PW-004's measured rate
    const m141 = 0.091; // QA-PW-141's measured rate
    const expected = Math.round(((m004 * 1 + m141 * 0.5) / 1.5) * 1000) / 1000;
    expect(s.measuredFpOfFiredRules).toBeCloseTo(expected, 5);
    expect(s.provisionalRuleIds).toEqual([]);
  });

  it("any unmeasured fired rule flips the set PROVISIONAL — the rate disappears, the disclosure appears", () => {
    const s = buildTrustSummary(
      result({
        findings: [
          finding({ ruleId: "QA-PW-004" }),
          finding({ ruleId: "QA-PW-102", evidenceLevel: "E1" }),
        ],
      }),
      new Map(),
    );
    expect(s.measuredFpOfFiredRules).toBeUndefined();
    expect(s.provisionalRuleIds).toEqual(["QA-PW-102"]);
  });

  it("nothing fired → no rate, no provisional disclosure", () => {
    const s = buildTrustSummary(result({}), new Map());
    expect(s.measuredFpOfFiredRules).toBeUndefined();
    expect(s.provisionalRuleIds).toEqual([]);
  });
});

describe("determinism + hostile inputs", () => {
  it("same result → same summary, twice", () => {
    const r = result({
      findings: [finding({}), finding({ ruleId: "QA-PW-004", line: 40 })],
      frameworkDetectionUnknown: true,
    });
    const decls = new Map([["e2e/shop.spec.ts", 3]]);
    expect(buildTrustSummary(r, decls)).toEqual(buildTrustSummary(r, decls));
  });

  it("hostile: crashed rules + skipped files + no declarations never NaN", () => {
    const s = buildTrustSummary(
      result({
        partial: true,
        testDeclarationCount: 0,
        reason: "no-tests-found",
        score: null,
        findings: [],
        frameworkDetectionUnknown: true,
        analysisStatus: {
          discovery: "partial",
          rules: "partial",
          skippedFiles: 7,
          durationMs: 1,
          rulesCrashed: 2,
          truncationReasons: ["deadline"],
        },
      }),
      new Map(),
    );
    for (const v of [s.confidence, s.evidenceCoverage, s.inconclusiveRate]) {
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(s.confidence).toBeLessThanOrEqual(INCOMPLETENESS_CEILINGS.partial);
  });
});
