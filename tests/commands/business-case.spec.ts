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
  it("prints NO dollar figure unless the reader supplies an incident cost", async () => {
    // BW-110. This command used to multiply a measured FP rate by a table
    // of invented industry costs and print the product as "Expected
    // Savings". A dollar figure with no provenance is worse than none:
    // someone puts it in a business case and defends it in a room.
    mockRunScan.mockResolvedValue(
      scanResult([
        finding({
          ruleId: "QA-PW-101",
          measuredFpRate: 0.2,
          evidenceLevel: "E2",
        }),
      ]),
    );

    const out = vi.fn();
    const result = await runBusinessCaseCommand(["."], {
      out,
      err: vi.fn(),
    });

    expect(result).toBe(0);
    const output = out.mock.calls.flat().join("\n");
    expect(output).toContain("NO DOLLAR FIGURES ARE SHOWN");
    // The measured rate is still reported — that number has a source.
    expect(output).toContain("20%");
    // No invented total anywhere.
    expect(output).not.toContain("$20000");
    expect(output).not.toContain("$25000");
  });

  it("computes the arithmetic when --incident-cost is supplied", async () => {
    mockRunScan.mockResolvedValue(
      scanResult([
        finding({
          ruleId: "QA-PW-101",
          measuredFpRate: 0.2,
          evidenceLevel: "E2",
          measuredFpN: 14,
        }),
        finding({
          ruleId: "QA-PW-102",
          measuredFpRate: 0.5,
          evidenceLevel: "E1",
        }),
      ]),
    );

    const out = vi.fn();
    await runBusinessCaseCommand([".", "--incident-cost", "25000"], {
      out,
      err: vi.fn(),
    });
    const output = out.mock.calls.flat().join("\n");
    // 25000 * (1 - 0.2) * 1.0  and  25000 * (1 - 0.5) * 0.5
    expect(output).toContain("| QA-PW-101 | 20% | 14 | E2 | $20,000 |");
    expect(output).toContain("| QA-PW-102 | 50% | — | E1 | $6,250 |");
    expect(output).toContain("your figure, from --incident-cost");
  });

  it("rejects a non-positive or missing --incident-cost rather than guessing", async () => {
    mockRunScan.mockResolvedValue(scanResult([]));
    const err = vi.fn();
    expect(
      await runBusinessCaseCommand([".", "--incident-cost", "0"], {
        out: vi.fn(),
        err,
      }),
    ).toBe(10);
    expect(
      await runBusinessCaseCommand([".", "--incident-cost"], {
        out: vi.fn(),
        err,
      }),
    ).toBe(10);
    expect(mockRunScan).not.toHaveBeenCalled();
  });

  it("rejects the flags that used to promise arithmetic it never did", async () => {
    mockRunScan.mockResolvedValue(scanResult([]));
    const err = vi.fn();
    // `--history` claimed to estimate from actual scan improvements while
    // reading no history; `--projected` divided the total by six and
    // called the quotient a monthly rate; `--industry` selected from the
    // invented cost table. A flag that does not do what its help says is
    // worse than no flag, because the help is the promise.
    for (const flag of ["--history", "--projected", "--industry"]) {
      expect(
        await runBusinessCaseCommand([".", flag, "6"], { out: vi.fn(), err }),
        flag,
      ).toBe(10);
    }
    expect(mockRunScan).not.toHaveBeenCalled();
  });

  it("renders an unmeasured rule as not measured, never as $0", async () => {
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
    const output = out.mock.calls.flat().join("\n");
    expect(output).toContain("| QA-PW-103 | not measured | — | E0 |");
    // A rule with no measured rate is not assumed safe, and it is not
    // rendered as a zero-value row either.
    expect(output).toContain("NOT assumed safe");
  });

  it("counts an E0 observation at nothing even with a measured rate", async () => {
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
    await runBusinessCaseCommand(["."], { out, err: vi.fn() });
    const output = out.mock.calls.flat().join("\n");
    // The rate is shown; the cost is not, because E0 is an observation.
    expect(output).toContain("| QA-PW-104 | 30% | — | E0 | — |");
  });

  it("passes --strict through to the scan", async () => {
    mockRunScan.mockResolvedValue(scanResult([]));

    await runBusinessCaseCommand([".", "--strict"], { out: vi.fn() });

    expect(mockRunScan).toHaveBeenCalledWith(
      expect.objectContaining({ strict: true }),
    );
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

  it("defaults to the current directory when no target is provided", async () => {
    mockRunScan.mockResolvedValue(scanResult([]));

    const out = vi.fn();
    const result = await runBusinessCaseCommand([], { out });

    expect(result).toBe(0);
    expect(mockRunScan).toHaveBeenCalledWith(
      expect.objectContaining({ target: "." }),
    );
    expect(out.mock.calls.flat().join("\n")).toContain("Scanning . ...");
  });
});
