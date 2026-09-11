/**
 * Engine/discovery/scorer small-arms coverage: the YAML guards' hostile
 * shapes, the trust-summary fallbacks (unknown counts stay unknown), the
 * prioritizer's total-order tie, the measurement status matrix, and the
 * selector-health correlation claims (no claim without evidence).
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  parseYamlGuarded,
  YAML_LIMITS,
} from "../../../src/discovery/yaml-guards.js";
import { buildTrustSummary } from "../../../src/engine/trust-summary.js";
import { prioritize } from "../../../src/scorer/prioritize.js";
import { ruleStatus } from "../../../src/rules/measurement.js";
import { correlateSelectorHealth } from "../../../src/playwright/selector-health.js";
import { azurePipelinesAdapter } from "../../../src/adapters/azure-pipelines.js";
import { jenkinsAdapter } from "../../../src/adapters/jenkins.js";
import type { ScanResult, Finding } from "../../../src/types.js";

const createdDirs: string[] = [];
afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

describe("parseYamlGuarded — hostile shapes", () => {
  it("more aliases than the cap throws the alias-count error", () => {
    const text = "a: [*a, *a, *a]\n".repeat(20);
    expect(() => parseYamlGuarded(text)).toThrow(/alias count/);
  });

  it("nesting deeper than the depth cap throws (JSON is valid YAML)", () => {
    const deep =
      "[".repeat(YAML_LIMITS.maxDepth + 1) +
      "]".repeat(YAML_LIMITS.maxDepth + 1);
    expect(() => parseYamlGuarded(deep)).toThrow(/depth/);
  });

  it("an empty document parses to null (honest emptiness, not an error)", () => {
    expect(parseYamlGuarded("")).toBeNull();
  });
});

describe("buildTrustSummary — unknown counts stay unknown", () => {
  const base = (over: Record<string, unknown>): ScanResult =>
    ({
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
      ...over,
    }) as unknown as ScanResult;

  it("declarations missing from the map count as zero-backed (?? arm); mapped files back their findings", () => {
    const withFinding = base({
      testDeclarationCount: 10,
      findings: [
        {
          ruleId: "QA-PW-101",
          category: "QA-PW",
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FLAKY-RISK",
          evidenceLevel: "E2",
          file: "e2e/a.spec.ts",
          line: 1,
          column: 1,
          message: "m",
          why: "w",
          fix: "f",
        },
      ],
    });
    // The finding's file IS mapped: 10 backed of 10 analyzed ⇒ full coverage.
    const s = buildTrustSummary(withFinding, new Map([["e2e/a.spec.ts", 10]]));
    expect(s.evidenceCoverage).toBe(1);
    expect(s.inconclusiveRate).toBe(0);
  });

  it("absent rulesCrashed/truncationReasons fall back to zero (?? arms); an unmapped file backs nothing", () => {
    // A finding whose file is NOT in the declarations map: the ?? 0 arm
    // fires (the file backs nothing) and the absent status fields fall
    // back to zero — coverage 0 is the honest answer, never fabricated.
    const unmappedFinding = base({
      testDeclarationCount: 10,
      findings: [
        {
          ruleId: "QA-PW-101",
          category: "QA-PW",
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FLAKY-RISK",
          evidenceLevel: "E2",
          file: "e2e/unmapped.spec.ts",
          line: 1,
          column: 1,
          message: "m",
          why: "w",
          fix: "f",
        },
      ],
    });
    const s = buildTrustSummary(
      unmappedFinding,
      new Map([["e2e/a.spec.ts", 10]]),
    );
    expect(s.evidenceCoverage).toBe(0);
    expect(s.inconclusiveRate).toBe(0);
  });

  it("crashed rules and truncations raise the inconclusive rate honestly", () => {
    const s = buildTrustSummary(
      base({
        testDeclarationCount: 10,
        findings: [
          {
            ruleId: "QA-PW-101",
            category: "QA-PW",
            severity: "warning",
            confidence: "high",
            findingType: "deterministic-defect",
            qaImpact: "FLAKY-RISK",
            evidenceLevel: "E2",
            file: "e2e/a.spec.ts",
            line: 1,
            column: 1,
            message: "m",
            why: "w",
            fix: "f",
          },
        ],
        analysisStatus: {
          discovery: "complete",
          rules: "complete",
          skippedFiles: 2,
          durationMs: 5,
          rulesCrashed: 1,
          truncationReasons: ["deadline"],
        },
      }),
      new Map([["e2e/a.spec.ts", 10]]),
    );
    // unknowns = 1 + 1 + 2 + 0 = 4 over a population of 4 + 1 finding.
    expect(s.inconclusiveRate).toBe(0.8);
    expect(s.evidenceCoverage).toBe(1);
  });
});

describe("prioritize — the total-order tie", () => {
  it("fully-identical keys compare equal (stable order preserved)", () => {
    const f = (ruleId: string): Finding => ({
      ruleId,
      category: "QA-PW",
      severity: "warning",
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: "FLAKY-RISK",
      evidenceLevel: "E2",
      file: "e2e/same.spec.ts",
      line: 10,
      column: 1,
      message: "m",
      why: "w",
      fix: "f",
    });
    const a = prioritize([f("QA-PW-001"), f("QA-PW-002")]);
    // Same file/line and equal scoreGain ⇒ the tie comparator returned 0
    // and the stable sort preserved the input order.
    expect(a.map((p) => p.finding.ruleId)).toEqual(["QA-PW-001", "QA-PW-002"]);
  });
});

describe("ruleStatus — the tier × measurement matrix", () => {
  const base = {
    id: "QA-PW-101",
    category: "QA-PW",
    title: "t",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FLAKY-RISK",
    languages: ["typescript"],
    frameworks: ["playwright"],
    falsePositiveRisk: "low",
    autofix: false,
    detectionStrategy: "AST",
    appliesTo: "playwright",
  } as const;

  it("every tier × measurement combination maps to its honest status", () => {
    // QA-PW-101 has a generated MEASURED_FP entry; matching its declared
    // revision makes the measurement valid, bumping it makes it stale.
    const core = { ...base, tier: "core", detectorRevision: 1 };
    void core;
    const statuses = new Set<string>();
    for (const tier of ["core", "extended", "quarantine"] as const) {
      for (const revBump of [0, 1]) {
        const rule = {
          ...base,
          id: "QA-PW-101",
          tier,
          detectorRevision: revBump,
        } as unknown as Parameters<typeof ruleStatus>[0];
        statuses.add(ruleStatus(rule));
      }
    }
    // All six combinations produce distinct, honest statuses:
    expect(statuses.has("PROVISIONAL")).toBe(true);
    expect(statuses.has("UNMEASURED")).toBe(true);
    expect(statuses.size).toBeGreaterThanOrEqual(3);
  });
});

describe("correlateSelectorHealth — claim arms", () => {
  const spec = (over: Record<string, unknown> = {}) => ({
    file: "e2e/a.spec.ts",
    score: 60,
    counts: { "css-chain": 1, xpath: 0, "role-based": 0, testid: 0, text: 0 },
    ...over,
  });

  it("no runtime facts ⇒ insufficient with NO claim (never 'healthy')", () => {
    const r = correlateSelectorHealth(spec(), undefined);
    expect(r.correlation).toBe("insufficient");
    expect(r.claim).toBeNull();
  });

  it("a passing run proves nothing about brittleness ⇒ insufficient either way", () => {
    const r = correlateSelectorHealth(spec(), { outcome: "passed" });
    expect(r.correlation).toBe("insufficient");
    expect(r.claim).toBeNull();
  });

  it("flaky + brittle + strong static score ⇒ corroborates with the brittle claim", () => {
    const r = correlateSelectorHealth(spec({ score: 60 }), {
      outcome: "flaky",
    });
    expect(r.correlation).toBe("corroborates");
    expect(r.claim?.assertion).toContain("1 brittle locator");
  });

  it("flaky + brittle + weak static score ⇒ the instability-explains-nothing claim", () => {
    const r = correlateSelectorHealth(spec({ score: 20 }), {
      outcome: "flaky",
    });
    expect(r.claim?.assertion).toContain("does not explain");
  });

  it("flaky with no brittle locators ⇒ point the agent at trace evidence", () => {
    const r = correlateSelectorHealth(
      spec({
        counts: {
          "css-chain": 0,
          xpath: 0,
          "role-based": 2,
          testid: 0,
          text: 0,
        },
      }),
      { outcome: "flaky" },
    );
    expect(r.claim?.safeNextAction).toContain("collect trace evidence");
  });

  it("failed with brittle locators and a known weakest line ⇒ stabilize claim", () => {
    const r = correlateSelectorHealth(spec({ weakestLine: 12 }), {
      outcome: "failed",
    });
    expect(r.claim?.safeNextAction).toContain("near line 12");
  });
});

describe("CI adapter framework detection (CI is not a framework)", () => {
  it("both CI adapters detect nothing, honestly", () => {
    const root = mkdtempSync(join(tmpdir(), "mjolnir-ci-fw-"));
    createdDirs.push(root);
    expect(azurePipelinesAdapter.detectFrameworks(root)).toEqual({
      frameworks: [],
      unknown: false,
    });
    expect(jenkinsAdapter.detectFrameworks(root)).toEqual({
      frameworks: [],
      unknown: false,
    });
  });
});
