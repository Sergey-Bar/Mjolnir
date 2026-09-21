/**
 * Trust Artifact foundations (Mega MVP Master Plan v3.1 §26 WI-6, §18).
 *
 * Locks: byte-identical reproducibility (same ScanResult → same bytes),
 * hostile inputs degrade honestly, the JSON twin mirrors the MD, the
 * artifact is self-contained (no timestamps, no machine paths beyond
 * the scanned surface label), and `mjolnir triage`-style consumption
 * stays possible (structured, not prose).
 */

import { describe, expect, it } from "vitest";

import {
  renderTrustReportJson,
  renderTrustReportMarkdown,
  TRUST_REPORT_JSON,
  TRUST_REPORT_MD,
} from "../../src/commands/trust-report.js";
import type { ScanResult } from "../../src/types.js";

function result(
  overrides: Omit<Partial<ScanResult>, "trustSummary"> & {
    trustSummary?: ScanResult["trustSummary"] | undefined;
  },
): ScanResult {
  const { trustSummary, ...rest } = overrides;
  return {
    schemaVersion: 1,
    partial: false,
    score: 96,
    frameworks: ["playwright"],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: [
      {
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
        message: "hard sleep | with a pipe",
        why: "why",
        fix: "fix",
      },
    ],
    testFileCount: 2,
    testDeclarationCount: 10,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 5,
    },
    trustSummary:
      trustSummary === undefined
        ? {
            level: "L2",
            confidence: 0.7,
            evidenceCoverage: 0.4,
            inconclusiveRate: 0,
            measuredFpOfFiredRules: 0.429,
            provisionalRuleIds: [],
            ceilingReasons: [],
          }
        : trustSummary,
    ...rest,
  };
}

describe("reproducibility contract (§18/§21)", () => {
  it("same ScanResult → byte-identical MD, twice", () => {
    const r = result({});
    expect(renderTrustReportMarkdown(r, "my-repo")).toBe(
      renderTrustReportMarkdown(r, "my-repo"),
    );
  });

  it("same ScanResult → byte-identical JSON, twice", () => {
    const r = result({});
    expect(renderTrustReportJson(r)).toBe(renderTrustReportJson(r));
  });

  it("no wall-clock, no absolute paths in the artifact body", () => {
    const md = renderTrustReportMarkdown(result({}), "my-repo");
    expect(md).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(md).not.toMatch(/[A-Z]:\\\\|\/Users\/|\/home\//);
    const json = renderTrustReportJson(result({}));
    expect(json).not.toMatch(/[A-Z]:\\\\|\/Users\/|\/home\//);
  });
});

describe("content locks", () => {
  it("MD: five-question structure + measured-FP table + advisory honesty", () => {
    const md = renderTrustReportMarkdown(result({}), "my-repo");
    for (const section of [
      "## Trust verdict",
      "## Confidence",
      "## Top trust risks",
      "## Next action",
    ]) {
      expect(md).toContain(section);
    }
    expect(md).toContain("43%"); // measured FP 0.429
    expect(md).toContain("0 advisory"); // fixture has one E2 finding only
    // pipe in a finding message must be escaped in the table row
    expect(md).toContain("hard sleep \\| with a pipe");
  });

  it("JSON twin mirrors the MD numbers + stays structured (agent-consumable)", () => {
    const r = result({});
    const j = JSON.parse(renderTrustReportJson(r)) as {
      artifact: string;
      trust: {
        level: string;
        confidence: number;
        measuredFpOfFiredRules: number;
      };
      topTrustRisks: Array<{ ruleId: string; message: string }>;
    };
    expect(j.artifact).toBe("mjolnir-trust-report");
    expect(j.trust.level).toBe("L2");
    expect(j.trust.confidence).toBe(0.7);
    expect(j.trust.measuredFpOfFiredRules).toBe(0.429);
    expect(j.topTrustRisks[0]?.ruleId).toBe("QA-PW-101");
    expect(j.topTrustRisks[0]?.message).toContain("hard sleep | with a pipe");
  });

  it("provisional disclosure renders when unmeasured rules fired", () => {
    const r = result({
      trustSummary: {
        level: "L1",
        confidence: 0.2,
        evidenceCoverage: 0,
        inconclusiveRate: 0,
        provisionalRuleIds: ["QA-X-001", "QA-Y-002"],
        ceilingReasons: ["partial-scan"],
        confidenceCeiling: 0.5,
      },
    });
    const md = renderTrustReportMarkdown(r, "my-repo");
    expect(md).toContain("PROVISIONAL (2 unmeasured)");
    expect(md).toContain("Incompleteness factors: partial-scan.");
  });
});

describe("hostile inputs degrade honestly", () => {
  it("missing trustSummary (pre-WI-3 producer) falls back to L0 without throwing", () => {
    // Simulate a pre-WI-3 producer: round-trip JSON drops the field.
    const noSummary = JSON.parse(JSON.stringify(result({}))) as ScanResult;
    delete (noSummary as { trustSummary?: unknown }).trustSummary;
    const md = renderTrustReportMarkdown(noSummary, "x");
    expect(md).toContain("**Level**: L0");
    const j = JSON.parse(renderTrustReportJson(noSummary)) as {
      trust: { confidence: number };
    };
    expect(j.trust.confidence).toBe(0);
  });

  it("partial scan: next action closes the gap, verdict stays honest", () => {
    const r = result({ partial: true });
    const md = renderTrustReportMarkdown(r, "x");
    expect(md).toContain("--max-duration");
  });
});

describe("artifact naming", () => {
  it("fixed filenames per §18 (PR-attachable, Pages-publishable)", () => {
    expect(TRUST_REPORT_MD).toBe("mjolnir-trust-report.md");
    expect(TRUST_REPORT_JSON).toBe("mjolnir-trust-report.json");
  });
});
