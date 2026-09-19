import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/cli.js", async () => {
  const original = await vi.importActual("../../src/cli.js");
  return {
    ...original,
    runScan: vi.fn(),
  };
});

import { runBusinessCaseCommand } from "../../src/commands/business-case.js";
import { runScan } from "../../src/cli.js";
import type { Finding, ScanResult } from "../../src/types.js";

const mockRunScan = runScan as ReturnType<typeof vi.fn>;

function finding(overrides: Partial<Finding>): Finding {
  return {
    ruleId: "QA-PW-101",
    category: "QA-PW",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FLAKY-RISK",
    detectorRevision: 1,
    file: "e2e/a.spec.ts",
    line: 4,
    column: 3,
    message: "Hard sleep detected",
    why: "Hard sleeps mask real timing issues.",
    fix: "Use a locator-based wait instead.",
    ...overrides,
  };
}

function scanResult(findings: Finding[]): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 88,
    frameworks: ["playwright"],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 10,
    },
  };
}

describe("runBusinessCaseCommand", () => {
  it("renders a business case with measured FP rates and E2 evidence", async () => {
    mockRunScan.mockResolvedValue(
      scanResult([
        finding({
          ruleId: "QA-PW-101",
          measuredFpRate: 0.2,
          evidenceLevel: "E2",
        }),
        finding({
          ruleId: "QA-PW-102",
          measuredFpRate: 0.5,
          evidenceLevel: "E1",
        }),
      ]),
    );

    const result = await runBusinessCaseCommand(["."], {
      out: vi.fn(),
      err: vi.fn(),
    });

    expect(result).toBe(0);
    expect(mockRunScan).toHaveBeenCalledWith(
      expect.objectContaining({ target: "." }),
    );
  });

  it("renders unmeasured findings without FP rate", async () => {
    mockRunScan.mockResolvedValue(
      scanResult([
        finding({
          ruleId: "QA-PW-103",
          evidenceLevel: "E0",
        }),
      ]),
    );

    const out = vi.fn();
    await runBusinessCaseCommand(["."], { out });
    expect(mockRunScan).toHaveBeenCalled();
  });

  it("renders E0 with measured FP rate → savings n/a", async () => {
    mockRunScan.mockResolvedValue(
      scanResult([
        finding({
          ruleId: "QA-PW-104",
          measuredFpRate: 0.3,
          evidenceLevel: "E0",
        }),
      ]),
    );

    const out = vi.fn();
    await runBusinessCaseCommand(["."], { out });
    expect(mockRunScan).toHaveBeenCalled();
    const allOutput = out.mock.calls.flat().join("\n");
    expect(allOutput).toContain("n/a");
  });

  it("returns EXIT_INTERNAL on scan failure", async () => {
    mockRunScan.mockRejectedValue(new Error("scan crashed"));

    const err = vi.fn();
    const result = await runBusinessCaseCommand(["."], {
      out: vi.fn(),
      err,
    });

    expect(result).toBe(20);
    expect(err).toHaveBeenCalled();
  });

  it("renders the summary header and cost assumption", async () => {
    mockRunScan.mockResolvedValue(scanResult([]));

    const out = vi.fn();
    await runBusinessCaseCommand(["."], { out });

    const allOutput = out.mock.calls.flat().join("\n");
    expect(allOutput).toContain("Business Case");
    expect(allOutput).toContain("$25000");
  });
});
