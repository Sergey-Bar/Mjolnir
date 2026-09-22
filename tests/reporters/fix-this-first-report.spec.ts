import { describe, expect, it } from "vitest";
import { renderSarif } from "../../src/reporter/sarif.js";
import { renderTerminal } from "../../src/reporter/terminal.js";
import type { Finding, ScanResult } from "../../src/types.js";

/** Creates a representative error finding with optional field overrides. */
function finding(over: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FALSE-GREEN",
    evidenceLevel: "E2",
    file: "tests/login.spec.ts",
    line: 12,
    column: 1,
    message: "Assertion is unreachable after an early return.",
    why: "The test can pass without checking the user-visible behavior.",
    fix: "Move the assertion before the return and fail the branch explicitly.",
    ...over,
  };
}

/** Creates a representative scan result with optional field overrides. */
function scan(over: Partial<ScanResult> = {}): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 72,
    frameworks: ["vitest"],
    frameworkDetectionUnknown: false,
    dimensions: [
      { category: "QA-TEST", score: 72, errors: 1, warnings: 0, infos: 0 },
    ],
    findings: [finding()],
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 7,
    },
    ...over,
  };
}

/** Extracts report landmarks used to assert section order and state guidance. */
function reportMilestones(out: string): string[] {
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.includes("WORTHINESS") ||
        line.includes("FIX THIS FIRST") ||
        line.includes("Why it matters") ||
        line.includes("Next action") ||
        line.includes("$ mjolnir") ||
        line.includes("DIAGNOSTICS BY CATEGORY") ||
        line.includes("FINDINGS") ||
        line.includes("FLAWLESS VICTORY") ||
        line.includes("zero findings") ||
        line.includes("Keep it green") ||
        line.startsWith("Analysis: PARTIAL") ||
        line.includes("NO TESTS DETECTED") ||
        line.includes("PARTIAL SCAN") ||
        line.includes("findings reflect analyzed") ||
        line.includes("scan did not analyze"),
    );
}

describe("MVP-005 default terminal report", () => {
  it("dirty state is organized around Fix This First before diagnostics", () => {
    const out = renderTerminal(scan(), { isTTY: false, ascii: true });
    expect(out.indexOf("FIX THIS FIRST")).toBeLessThan(
      out.indexOf("DIAGNOSTICS BY CATEGORY"),
    );
    expect(out).toContain("Why it matters:");
    expect(out).toContain("Next action:");
    expect(out).toContain("$ mjolnir --scope changed");
    expect(reportMilestones(out)).toMatchInlineSnapshot(`
      [
        "WORTHINESS  72/100  NEEDS WORK",
        "= FIX THIS FIRST",
        "Why it matters: 1 error finding can let a false-green or release-blocking test",
        "Next action: fix the highest score-gain item below, then re-run the changed",
        "$ mjolnir --scope changed",
        "= DIAGNOSTICS BY CATEGORY",
        "= FINDINGS",
        "$ mjolnir explain QA-TEST-001",
        "$ mjolnir why tests/login.spec.ts:12",
        "$ mjolnir baseline",
        "$ mjolnir diff",
      ]
    `);
  });

  it("keeps full finding evidence behind --verbose", () => {
    const compact = renderTerminal(scan(), { isTTY: false, ascii: true });
    const verbose = renderTerminal(scan(), {
      isTTY: false,
      ascii: true,
      verbose: true,
    });
    expect(compact).toContain("FIX THIS FIRST");
    expect(compact).not.toContain("Impact");
    expect(compact).not.toContain("Verify");
    expect(verbose).toContain("Impact");
    expect(verbose).toContain("Verify");
  });

  it("clean state says how to keep the gate green", () => {
    const out = renderTerminal(scan({ score: 100, findings: [] }), {
      isTTY: false,
      ascii: true,
    });
    expect(reportMilestones(out)).toMatchInlineSnapshot(`
      [
        "WORTHINESS 100/100  WORTHY",
        "= DIAGNOSTICS BY CATEGORY",
        "*** FLAWLESS VICTORY ***",
        "FORGED — zero findings. The suite is clean.",
        "Keep it green: re-run Mjölnir on changed tests before merging, and keep the CI",
        "$ mjolnir --scope changed",
        "$ mjolnir ci install",
      ]
    `);
  });

  it("partial state keeps the Fix This First guidance honest", () => {
    const out = renderTerminal(
      scan({
        partial: true,
        analysisStatus: {
          discovery: "partial",
          rules: "complete",
          skippedFiles: 2,
          durationMs: 9,
        },
      }),
      { isTTY: false, ascii: true },
    );
    expect(reportMilestones(out)).toMatchInlineSnapshot(`
      [
        "WORTHINESS  72/100  NEEDS WORK",
        "Partial scan — findings reflect analyzed surface only.",
        "= FIX THIS FIRST",
        "Why it matters: this scan is partial, so fix the visible risks but do not",
        "Next action: fix the highest score-gain item below, then re-run the changed",
        "$ mjolnir --scope changed",
        "= DIAGNOSTICS BY CATEGORY",
        "= FINDINGS",
        "$ mjolnir explain QA-TEST-001",
        "$ mjolnir why tests/login.spec.ts:12",
        "$ mjolnir baseline",
        "$ mjolnir diff",
        "Analysis: PARTIAL — verdict may be incomplete · 9ms",
      ]
    `);
  });

  it("partial scan with zero findings and score 100 never renders as forged clean", () => {
    const out = renderTerminal(
      scan({
        partial: true,
        score: 100,
        findings: [],
        dimensions: [],
        analysisStatus: {
          discovery: "partial",
          rules: "complete",
          skippedFiles: 2,
          durationMs: 9,
        },
      }),
      { isTTY: false, ascii: true },
    );
    expect(reportMilestones(out)).toMatchInlineSnapshot(`
      [
        "WORTHINESS 100/100  WORTHY",
        "Partial scan — findings reflect analyzed surface only.",
        "⚠ PARTIAL SCAN — no findings, but analysis was incomplete",
        "This scan did not analyze the full test surface. Zero findings here does not",
        "Next action: fix the cause of the partial scan (timeouts, exclusions, parse",
        "$ mjolnir --scope changed",
        "$ mjolnir ci install",
        "Analysis: PARTIAL — verdict may be incomplete · 9ms",
      ]
    `);
    // Ensure the FORGED block is NOT present
    expect(out).not.toContain("FLAWLESS VICTORY");
    expect(out).not.toContain("FORGED — zero findings. The suite is clean.");
    // Ensure the partial guidance IS present
    expect(out).toContain(
      "PARTIAL SCAN — no findings, but analysis was incomplete",
    );
  });

  it("unknown/no-tests state remains beginner-safe", () => {
    const out = renderTerminal(
      scan({
        score: null,
        reason: "no-tests-found",
        frameworks: [],
        frameworkDetectionUnknown: true,
        dimensions: [],
        findings: [],
      }),
      { isTTY: false, ascii: true },
    );
    expect(reportMilestones(out)).toMatchInlineSnapshot(`
      [
        "! NO TESTS DETECTED",
        "$ mjolnir <path-to-your-tests>",
      ]
    `);
  });

  it("no-color and ASCII output keep the redesigned guidance readable", () => {
    const prev = process.env["NO_COLOR"];
    process.env["NO_COLOR"] = "1";
    try {
      const out = renderTerminal(scan(), {
        isTTY: true,
        ascii: true,
        width: 72,
      });
      expect(out).toContain("= FIX THIS FIRST");
      expect(out).toContain("X ERROR");
      expect(out).not.toContain("\x1b[");
    } finally {
      if (prev === undefined) delete process.env["NO_COLOR"];
      else process.env["NO_COLOR"] = prev;
    }
  });

  it("does not alter machine-readable JSON/SARIF surfaces", () => {
    const result = scan();
    const beforeJson = JSON.stringify(result);
    const sarif = renderSarif(result);

    renderTerminal(result, { isTTY: false, ascii: true });

    expect(JSON.stringify(result)).toBe(beforeJson);
    expect(sarif).not.toContain("FIX THIS FIRST");
    expect(JSON.parse(sarif)).toHaveProperty("version", "2.1.0");
  });
});
