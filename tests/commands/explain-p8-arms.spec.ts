/**
 * P8 coverage completion (rebase residue): the remaining uncovered arms
 * of the 0.6.x wave's explain/trust-report/prioritize/discovery code —
 * behavior-locked, never fabricated.
 */

import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  explainVerdict,
  renderVerdictExplain,
  verdictCorrelation,
  verdictEvidenceChecklist,
  verdictWhatWouldChange,
} from "../../src/commands/explain.js";
import type { ScanResult } from "../../src/types.js";

function scan(overrides: Partial<ScanResult>): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 92,
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

describe("explain verdict — uncovered 0.6.x arms (P8 completion)", () => {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mjolnir-p8-explain-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("parseScanJson: valid scan with analysisStatus + partial loads (ok arm)", () => {
    const p = join(dir, "good.json");
    writeFileSync(p, JSON.stringify(scan({ findings: [] })));
    const r = explainVerdict(p);
    expect(r.ok).toBe(true);
  });

  it("parseScanJson: schemaVersion 1 + findings but NO analysisStatus → rejected", () => {
    const p = join(dir, "no-status.json");
    const body = scan({ findings: [] });
    delete (body as { analysisStatus?: unknown }).analysisStatus;
    writeFileSync(p, JSON.stringify(body));
    const r = explainVerdict(p);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("schemaVersion 1");
  });

  it("verdictWhatWouldChange: framework-unknown arm fires", () => {
    const s = scan({ frameworkDetectionUnknown: true, findings: [] });
    expect(
      verdictWhatWouldChange(s).some((c) =>
        c.includes("recognizable test-runner config"),
      ),
    ).toBe(true);
  });

  it("verdictCorrelation: file/test-level corroboration arm (no defect level)", () => {
    const s = scan({
      findings: [
        {
          ruleId: "QA-PW-004",
          category: "QA-PW",
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "HYGIENE",
          evidenceLevel: "E2",
          file: "e2e/a.spec.ts",
          line: 1,
          column: 1,
          message: "m",
          why: "w",
          fix: "f",
          runtimeCorroboration: {
            level: "file",
            source: "junit-xml",
            testsExecuted: 3,
          },
        },
      ],
    });
    expect(verdictCorrelation(s)).toContain("corroborated at file/test level");
  });

  it("verdictEvidenceChecklist: framework-unknown renders the ⚠ arm", () => {
    const s = scan({ frameworkDetectionUnknown: true, findings: [] });
    expect(
      verdictEvidenceChecklist(s).some((i) =>
        i.includes("framework detection could not decide"),
      ),
    ).toBe(true);
  });

  it("render: PROVISIONAL fired rules line + no-error next action", () => {
    const s = scan({
      findings: [],
      trustSummary: {
        level: "L2",
        confidence: 0.5,
        evidenceCoverage: 0.4,
        inconclusiveRate: 0,
        provisionalRuleIds: ["QA-PY-008"],
        ceilingReasons: [],
      },
    });
    const out = renderVerdictExplain({ ok: true, scan: s });
    expect(out).toContain("1 fired rule(s) are PROVISIONAL");
    expect(out).toContain("no error-severity findings");
    expect(out).toContain("keep the gate green");
  });

  it("render: no-tests-found annotates the unknown score", () => {
    const s = scan({ findings: [], score: null, reason: "no-tests-found" });
    const out = renderVerdictExplain({ ok: true, scan: s });
    expect(out).toContain("Score:       unknown (no tests found)");
  });
});
