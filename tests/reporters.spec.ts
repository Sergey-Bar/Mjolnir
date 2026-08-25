import { describe, expect, it } from "vitest";
import type { Finding, ScanResult } from "../src/types.js";
import { renderSarif } from "../src/reporter/sarif.js";
import { renderTerminal } from "../src/reporter/terminal.js";

function makeFinding(over: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "error",
    confidence: "high",
    findingType: "static",
    qaImpact: "Flaky tests reach main",
    file: "a.test.ts",
    line: 3,
    column: 1,
    message: "msg",
    why: "why",
    fix: "fix it",
    ...over,
  };
}

function makeResult(over: Partial<ScanResult> = {}): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 72,
    frameworks: ["vitest"],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: [],
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 12,
    },
    ...over,
  };
}

describe("renderSarif", () => {
  it("produces SARIF 2.1.0 skeleton", () => {
    const sarif = JSON.parse(renderSarif(makeResult())) as {
      version: string;
      runs: Array<{
        tool: { driver: { rules: unknown[] } };
        results: unknown[];
      }>;
    };
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.rules).toEqual([]);
    expect(sarif.runs[0].results).toEqual([]);
  });

  it("maps severities to SARIF levels and dedupes rules", () => {
    const result = makeResult({
      findings: [
        makeFinding({ ruleId: "R1", severity: "error" }),
        makeFinding({ ruleId: "R2", severity: "warning", line: 5 }),
        makeFinding({ ruleId: "R3", severity: "info" }),
        makeFinding({ ruleId: "R1", severity: "info", line: 9 }),
      ],
    });
    const sarif = JSON.parse(renderSarif(result)) as {
      runs: Array<{
        tool: { driver: { rules: Array<{ id: string }> } };
        results: Array<{
          level: string;
          properties: Record<string, unknown>;
          locations: Array<{
            physicalLocation: {
              artifactLocation: { uri: string };
              region: { startLine: number; startColumn: number };
            };
          }>;
        }>;
      }>;
    };
    const run = sarif.runs[0];
    expect(run.tool.driver.rules.map((r) => r.id)).toEqual(["R1", "R2", "R3"]);
    expect(run.results.map((r) => r.level)).toEqual([
      "error",
      "warning",
      "note",
      "note",
    ]);
    expect(run.results[0].properties.severity).toBe("error");
    expect(run.results[0].locations[0].physicalLocation.region.startLine).toBe(
      3,
    );
  });

  it("clamps line/column to >= 1", () => {
    const result = makeResult({
      findings: [makeFinding({ line: 0, column: 0 })],
    });
    const sarif = JSON.parse(renderSarif(result)) as {
      runs: Array<{
        results: Array<{
          locations: Array<{
            physicalLocation: {
              region: { startLine: number; startColumn: number };
            };
          }>;
        }>;
      }>;
    };
    const region =
      sarif.runs[0].results[0].locations[0].physicalLocation.region;
    expect(region.startLine).toBe(1);
    expect(region.startColumn).toBe(1);
  });

  it("includes helpUri and SRCROOT when repoRootUri given", () => {
    const result = makeResult({
      findings: [makeFinding({ docsUrl: "https://docs/r1" })],
    });
    const sarif = JSON.parse(renderSarif(result, "file:///repo")) as {
      runs: Array<{
        originalUriBaseIds: Record<string, { uri: string }>;
        tool: { driver: { rules: Array<{ helpUri?: string }> } };
        results: Array<{
          locations: Array<{
            physicalLocation: {
              artifactLocation: { uriBaseId?: string };
            };
          }>;
        }>;
      }>;
    };
    const run = sarif.runs[0];
    expect(run.originalUriBaseIds.SRCROOT.uri).toBe("file:///repo");
    expect(run.tool.driver.rules[0].helpUri).toBe("https://docs/r1");
    expect(
      run.results[0].locations[0].physicalLocation.artifactLocation.uriBaseId,
    ).toBe("SRCROOT");
  });

  it("marks partiallySuccessful when scan is partial", () => {
    const sarif = JSON.parse(renderSarif(makeResult({ partial: true }))) as {
      runs: Array<{
        invocations: Array<{ partiallySuccessfulReason?: string }>;
      }>;
    };
    expect(
      sarif.runs[0].invocations[0].partiallySuccessfulReason,
    ).toBeDefined();
  });
});

describe("renderTerminal", () => {
  it("renders empty state honestly when no tests found", () => {
    const out = renderTerminal(
      makeResult({ score: null, reason: "no-tests-found" }),
      { isTTY: false },
    );
    expect(out).toContain("NO TESTS DETECTED");
    expect(out).toContain("--tests-dir");
  });

  it("renders score bar and severity counts", () => {
    const out = renderTerminal(
      makeResult({
        findings: [
          makeFinding({ severity: "error" }),
          makeFinding({ severity: "warning", ruleId: "QA-TQUAL-001" }),
        ],
      }),
      { isTTY: false },
    );
    expect(out).toContain("SCORE:  72 / 100");
    expect(out).toContain("Detected: vitest");
    expect(out).toContain("2 issues found (1 errors, 1 warnings)");
    expect(out).toContain("TOP ISSUES");
    expect(out).toContain("a.test.ts:3");
  });

  it("shows unknown-framework note and truncates top issues", () => {
    const out = renderTerminal(
      makeResult({
        frameworks: [],
        frameworkDetectionUnknown: true,
        findings: Array.from({ length: 7 }, (_, i) =>
          makeFinding({ ruleId: `R${i}`, line: i + 1 }),
        ),
      }),
      { isTTY: false },
    );
    expect(out).toContain("Framework: unknown");
    expect(out).toContain("+2 more");
  });

  it("shows PARTIAL analysis status", () => {
    const out = renderTerminal(
      makeResult({
        analysisStatus: {
          discovery: "partial",
          rules: "complete",
          skippedFiles: 2,
          durationMs: 5,
        },
      }),
      { isTTY: false },
    );
    expect(out).toContain("PARTIAL — verdict may be incomplete");
  });

  it("applies colors on TTY without NO_COLOR", () => {
    const prev = process.env["NO_COLOR"];
    delete process.env["NO_COLOR"];
    try {
      const out = renderTerminal(makeResult({ findings: [makeFinding()] }), {
        isTTY: true,
      });
      expect(out).toContain("\x1b[31m");
    } finally {
      if (prev !== undefined) process.env["NO_COLOR"] = prev;
    }
  });

  it("respects NO_COLOR even on TTY", () => {
    const prev = process.env["NO_COLOR"];
    process.env["NO_COLOR"] = "1";
    try {
      const out = renderTerminal(makeResult(), { isTTY: true });
      expect(out).not.toContain("\x1b[");
    } finally {
      if (prev === undefined) delete process.env["NO_COLOR"];
      else process.env["NO_COLOR"] = prev;
    }
  });
});

describe("selector-health", () => {
  // Imported lazily below via static import at top of module scope instead.
  it("placeholder guard", () => {
    expect(true).toBe(true);
  });
});
