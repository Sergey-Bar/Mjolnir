/**
 * Explain v2 (Mega MVP Master Plan v3.1 §26 WI-7, §8).
 *
 * The command answers, for every mode, the §8 checklist: VERDICT ·
 * EVIDENCE (✓/⚠ checklist) · CORRELATION · CONFIDENCE · WHY ·
 * WHAT WOULD CHANGE THE VERDICT · NEXT ACTION · evidence level ·
 * trust rung. Locks: hostile JSON inputs fail safely with the honest
 * message; every render derives from the canonical result; the
 * rule-mode additions keep the original rule explanation intact.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  explainVerdict,
  renderVerdictExplain,
  verdictEvidenceChecklist,
  verdictCorrelation,
  verdictWhatWouldChange,
  whatWouldChangeTheVerdict,
  explainRule,
  renderExplain,
} from "../../src/commands/explain.js";
import type { ScanResult } from "../../src/types.js";
import { RULES } from "../../src/rules/index.js";
import { MEASURED_FP } from "../../src/rules/measured-fp.generated.js";
import { effectiveTier } from "../../src/rules/measurement.js";
import { runExplainCommand } from "../../src/cli.js";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

describe("verdict mode — §8 checklist", () => {
  const r = scan({
    findings: [
      {
        ruleId: "QA-PW-101",
        category: "QA-PW",
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FLAKY-RISK",
        evidenceLevel: "E2",
        trustLevel: "L5",
        file: "e2e/a.spec.ts",
        line: 3,
        column: 1,
        message: "m",
        why: "w",
        fix: "f",
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
      },
    ],
  });
  const out = renderVerdictExplain({ ok: true, scan: r });

  it("names verdict facts: score, trust level, confidence, coverage", () => {
    expect(out).toContain("Score:       92");
    expect(out).toContain("Trust level: L0"); // no trustSummary in this fixture
    expect(out).toContain("EVIDENCE");
    expect(out).toContain("CORRELATION");
    expect(out).toContain("WHY THIS VERDICT");
    expect(out).toContain("WHAT WOULD CHANGE THE VERDICT");
    expect(out).toContain("NEXT ACTION");
  });

  it("evidence checklist: every item is ✓ or ⚠ and re-derivable", () => {
    const items = verdictEvidenceChecklist(r);
    expect(items.length).toBeGreaterThanOrEqual(4);
    for (const item of items) {
      expect(item.startsWith("✓") || item.startsWith("⚠")).toBe(true);
    }
    expect(items.some((i) => i.includes("runtime corroboration"))).toBe(true);
  });

  it("correlation names the L5 defect-class corroboration", () => {
    expect(verdictCorrelation(r)).toContain("L5");
  });

  it("error-severity findings are named as the exit-code driver", () => {
    expect(out).toContain("1 error-severity finding(s)");
  });

  it("partial scans surface the ceiling + the widening next action", () => {
    const p = scan({
      partial: true,
      frameworkDetectionUnknown: true,
      trustSummary: {
        level: "L2",
        confidence: 0.3,
        evidenceCoverage: 0.1,
        inconclusiveRate: 0.5,
        provisionalRuleIds: [],
        confidenceCeiling: 0.5,
        ceilingReasons: ["partial-scan"],
      },
    });
    const po = renderVerdictExplain({ ok: true, scan: p });
    expect(po).toContain("PARTIAL");
    expect(po).toContain("capped by: partial-scan");
    expect(po).toContain("--max-duration");
    expect(verdictWhatWouldChange(p).some((c) => c.includes("ceiling"))).toBe(
      true,
    );
  });
});

describe("verdict mode — hostile inputs fail safely", () => {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-explain-v2-"));

  it("invalid JSON → honest error, exit-safe", () => {
    const p = join(dir, "garbage.json");
    writeFileSync(p, "{not json");
    const r = explainVerdict(p);
    expect(r.ok).toBe(false);
    expect(renderVerdictExplain(r)).toContain("explain failed");
  });

  it("wrong schema → named, actionable error", () => {
    const p = join(dir, "other.json");
    writeFileSync(p, JSON.stringify({ hello: 1 }));
    const r = explainVerdict(p);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("schemaVersion 1");
    expect(r.error).toContain("mjolnir <target> --json");
  });

  it("missing file → honest error", () => {
    const r = explainVerdict(join(dir, "missing.json"));
    expect(r.ok).toBe(false);
    expect(r.error).toContain("cannot read");
  });

  it("JSON with hostile findings array still fails safe", () => {
    const p = join(dir, "hostile.json");
    writeFileSync(
      p,
      JSON.stringify({ schemaVersion: 1, findings: "all of them", partial: 3 }),
    );
    expect(explainVerdict(p).ok).toBe(false);
  });
});

describe("rule mode — WI-7 additions keep the original explanation intact", () => {
  it("every render names evidence level + tier + WHAT WOULD CHANGE + NEXT ACTION", () => {
    for (const rule of RULES.slice(0, 10)) {
      const r = explainRule(rule.id, "tests/fixtures");
      const out = renderExplain(r);
      expect(out).toContain("Evidence:");
      expect(out).toContain("Tier:");
      expect(out).toContain("WHAT WOULD CHANGE THE VERDICT");
      expect(out).toContain("NEXT ACTION");
    }
  });

  it("whatWouldChangeTheVerdict: measured rule skips the measurement line", () => {
    // The 1.0.0 registry is fully measured (77/77) - the unmeasured
    // branch in the implementation is retained for future rules but has
    // no live exemplar to test against.
    const measured = RULES.find((r) => MEASURED_FP[r.id] !== undefined);
    expect(measured).toBeDefined();
    if (measured) {
      const changes = whatWouldChangeTheVerdict(measured);
      expect(changes.some((c) => c.includes("run report"))).toBe(true);
      expect(changes.some((c) => c.includes("corpus measurement"))).toBe(false);
    }
  });

  it("quarantine rules disclose the --strict-only advisory semantics", () => {
    const q = RULES.find((r) => effectiveTier(r) === "quarantine");
    expect(q).toBeDefined();
    if (q) {
      expect(
        whatWouldChangeTheVerdict(q).some((c) => c.includes("--strict")),
      ).toBe(true);
    }
  });
});

describe("explain verdict — CLI-handler arms (P8 coverage)", () => {
  let dir2 = "";
  beforeEach(() => {
    dir2 = mkdtempSync(join(tmpdir(), "mjolnir-p8-explain-cli-"));
  });
  afterEach(() => rmSync(dir2, { recursive: true, force: true }));

  it("verdict with a --json flag but no path → usage error (exit 10)", async () => {
    let errOut = "";
    const code = await runExplainCommand(["verdict", "--json"], {
      out: () => {},
      err: (s) => {
        errOut += String(s);
      },
    });
    expect(code).toBe(10);
    expect(errOut).toContain("explain verdict requires a saved scan");
  });

  it("verdict --json <file> that is not a scan → render of the failure (exit 10)", async () => {
    const p = join(dir2, "bad.json");
    writeFileSync(p, JSON.stringify({ hello: 1 }));
    let out2 = "";
    const code = await runExplainCommand(["verdict", "--json", p], {
      out: (s) => {
        out2 += String(s);
      },
      err: () => {},
    });
    expect(code).toBe(10);
    expect(out2).toContain("schemaVersion 1");
  });

  it("file:line subject delegates to the why surface (no crash, exit recorded)", async () => {
    // The delegation arm (cli.ts 621–622): exit value is whatever the why
    // surface returns for an unknown finding — the lock here is that the
    // arm EXECUTES and does not crash with exit 20.
    const code = await runExplainCommand(
      [
        "e2e/shop.spec.ts:1",
        "--fixtures-root",
        join(import.meta.dirname, "..", "fixtures"),
      ],
      { out: () => {}, err: () => {} },
    );
    expect([0, 1, 10]).toContain(code);
  });

  it("verdict --json <valid scan> renders the report (exit 0)", async () => {
    const p = join(dir2, "good.json");
    writeFileSync(
      p,
      JSON.stringify(
        scan({
          findings: [
            {
              ruleId: "QA-TEST-004",
              category: "QA-TEST",
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
        }),
      ),
    );
    let out = "";
    const code = await runExplainCommand(["verdict", "--json", p], {
      out: (s) => {
        out += String(s);
      },
      err: () => {},
    });
    expect(code).toBe(0);
    expect(out).toContain("SCAN VERDICT");
  });
});
