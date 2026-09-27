/**
 * TI-018 — the shipped PR comment renders byte-identically for the same input.
 *
 * This file previously imported `renderPrComment` from
 * `src/integrations/github/pr-comment-renderer.ts`, which had NO production
 * importer: the live renderer is `renderUnifiedReport` in
 * `src/reporter/pr-interaction`, reached through `src/commands/pr-comment.ts`.
 * So the invariant that `src/trust/invariants.ts` declares as "PR-comment
 * rendering is byte-deterministic" was verified against a function no user
 * could ever invoke — the same defect as a test asserting a deleted module's
 * behaviour, and the reason a determinism claim can sit in a registry as
 * `CURRENT` while the shipping surface is unverified.
 *
 * The dead renderer and its four specs are deleted in this release. The
 * invariant is now checked against the code that ships, and the matrix of
 * shapes is wider than the old one because the shipped renderer has more
 * branches: the old spec had one `makeModel()` and five assertions.
 */

import { describe, expect, it } from "vitest";

import { renderUnifiedReport } from "../../src/reporter/pr-report-shared.js";
import type { BaselineDiff } from "../../src/commands/baseline.js";
import type { Finding, ScanResult, TrustSummary } from "../../src/types.js";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TEST-001",
    file: "src/a.test.ts",
    line: 10,
    column: 1,
    severity: "error",
    message: "focused test: `.only` leaves the rest of the suite unrun",
    fix: "remove the .only",
    evidenceLevel: "E1",
    trustLevel: "L2",
    confidence: 0.8,
    findingType: "anti-pattern",
    qaImpact: "high",
    detectedBy: "rule",
    detectorRevision: 3,
    ...overrides,
  } as unknown as Finding;
}

function makeSummary(overrides: Partial<TrustSummary> = {}): TrustSummary {
  return {
    level: "L3",
    confidence: 0.72,
    evidenceCoverage: 0.8,
    inconclusiveRate: 0.1,
    provisionalRuleIds: [],
    ceilingReasons: [],
    ...overrides,
  };
}

function makeResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    score: 85,
    partial: false,
    findings: [makeFinding()],
    testFileCount: 10,
    testDeclarationCount: 42,
    frameworkDetectionUnknown: false,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      rulesCrashed: 0,
      parseFallbacks: 0,
      durationMs: 42,
      coverageState: "COMPLETE",
      rulesApplied: 79,
      rulesWithheld: 0,
      reasons: [],
    },
    runIdentity: {
      scanId: "abc123",
      inputFingerprint: "fp",
      rulesDigest: "d".repeat(64),
      configFingerprint: "cf",
      engineVersion: "5.0.0",
    },
    trustSummary: makeSummary(),
    ...overrides,
  } as unknown as ScanResult;
}

function makeResultWithoutTrust(): ScanResult {
  const result = makeResult();
  delete (result as { trustSummary?: TrustSummary }).trustSummary;
  return result;
}

function makeDiff(findings: Finding[]): BaselineDiff {
  return {
    hasBaseline: true,
    baselineCommit: "abc1234def",
    baselineScore: 70,
    resolvedFindings: [],
    newFindings: findings,
  } as unknown as BaselineDiff;
}

/** Every shape the shipped renderer branches on. */
const SHAPES: ReadonlyArray<{ name: string; render: () => string }> = [
  { name: "with findings", render: () => renderUnifiedReport(makeResult()) },
  {
    name: "clean",
    render: () => renderUnifiedReport(makeResult({ findings: [] })),
  },
  {
    name: "diff-scoped",
    render: () =>
      renderUnifiedReport(makeResult({ findings: [] }), {
        diff: makeDiff([makeFinding()]),
      }),
  },
  {
    name: "incomplete",
    render: () =>
      renderUnifiedReport(
        makeResult({
          partial: true,
          analysisStatus: {
            ...makeResult().analysisStatus,
            rulesCrashed: 1,
            reasons: ["rules-crashed:1"],
          },
        }),
      ),
  },
  {
    name: "coverage-PARTIAL",
    render: () =>
      renderUnifiedReport(
        makeResult({
          findings: [],
          analysisStatus: {
            ...makeResult().analysisStatus,
            coverageState: "PARTIAL",
            rulesApplied: 45,
            rulesWithheld: 34,
          },
        }),
      ),
  },
  {
    name: "no trust summary",
    // The key is DELETED, not set to undefined: `exactOptionalPropertyTypes`
    // is on, so those are different types and only the absent key is the
    // shape a pre-trustSummary producer actually emits.
    render: () => renderUnifiedReport(makeResultWithoutTrust()),
  },
  {
    name: "null score",
    render: () => renderUnifiedReport(makeResult({ score: null })),
  },
  {
    name: "score clamped",
    render: () =>
      renderUnifiedReport(
        makeResult({ score: 99, scoreClampReason: "partial-scan" }),
      ),
  },
  {
    name: "with options",
    render: () =>
      renderUnifiedReport(makeResult(), {
        repoUrl: "https://github.com/org/repo",
        version: "5.0.0",
        commit: "deadbeef",
      }),
  },
];

describe("TI-018: PR comment rendering determinism", () => {
  it("the same input produces byte-identical output, for every shape", () => {
    for (const shape of SHAPES) {
      const first = shape.render();
      expect(shape.render(), shape.name).toBe(first);
    }
  });

  it("soak: 50 renders of each shape are identical", () => {
    for (const shape of SHAPES) {
      const first = shape.render();
      for (let i = 0; i < 50; i += 1) {
        expect(shape.render(), `${shape.name} render ${i}`).toBe(first);
      }
    }
  });

  it("a different input produces different output", () => {
    const worthy = renderUnifiedReport(makeResult({ score: 100 }));
    const unworthy = renderUnifiedReport(makeResult({ score: 10 }));
    expect(worthy).not.toBe(unworthy);

    const withFinding = renderUnifiedReport(makeResult());
    const without = renderUnifiedReport(makeResult({ findings: [] }));
    expect(withFinding).not.toBe(without);

    const withheld = renderUnifiedReport(
      makeResult({
        findings: [],
        analysisStatus: {
          ...makeResult().analysisStatus,
          coverageState: "PARTIAL",
          rulesApplied: 45,
          rulesWithheld: 34,
        },
      }),
    );
    const complete = renderUnifiedReport(
      makeResult({
        findings: [],
        analysisStatus: { ...makeResult().analysisStatus },
      }),
    );
    expect(withheld).not.toBe(complete);
  });

  it("output carries the shipped structural markers", () => {
    const output = renderUnifiedReport(makeResult());
    expect(output).toContain("<!-- mjolnir-report:v2 -->");
    expect(output).toContain("Mjölnir Verification Report");
    expect(output).toContain("L3");
  });

  it("the same identity always sorts its rule inventory the same way", () => {
    // The one place order could drift: the fired-rule inventory is built from
    // a Map and sorted with a code-point comparator, not `.sort()` on a
    // default-comparator array.
    //
    // Scoped to the inventory row deliberately. Each rule id appears TWICE in
    // the comment — once in the findings list, in input order, and once in the
    // Fired rules inventory, sorted — so a whole-document `indexOf` measures
    // the findings list and would pass or fail for the wrong reason.
    const findings = [
      makeFinding({ ruleId: "QA-ZZ-001", detectorRevision: 2 }),
      makeFinding({ ruleId: "QA-AA-001", detectorRevision: 1 }),
      makeFinding({ ruleId: "QA-MM-001", detectorRevision: 7 }),
    ];
    const first = renderUnifiedReport(makeResult({ findings }));
    expect(renderUnifiedReport(makeResult({ findings: [...findings] }))).toBe(
      first,
    );

    const row = first
      .split("\n")
      .find((line) => line.startsWith("| Fired rules |"));
    if (row === undefined) throw new Error("the Fired rules row is missing");
    expect(row).toContain("QA-AA-001@1");
    expect(row).toContain("QA-MM-001@7");
    expect(row).toContain("QA-ZZ-001@2");
    expect(row.indexOf("QA-AA-001")).toBeLessThan(row.indexOf("QA-MM-001"));
    expect(row.indexOf("QA-MM-001")).toBeLessThan(row.indexOf("QA-ZZ-001"));
  });
});
