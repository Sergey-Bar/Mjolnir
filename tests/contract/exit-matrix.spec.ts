/**
 * The exit-code matrix (plan V5-002).
 *
 * Exit codes are a frozen public contract: `0` clean, `1` findings at/above
 * gate, `2` partial, `10` usage, `20` internal. The NUMBERS are immutable.
 * What this suite pins is the SEMANTICS, because the semantics were where the
 * false greens lived:
 *
 *   - `--score` never checked `partial`, so a truncated scan with zero
 *     findings exited 0. `--score` is the flag badge and baseline tooling
 *     read, so a green there was a green that shipped.
 *   - `docs/VERSIONING.md` documented exit 2 as "never blocks", which licensed
 *     every downstream pipeline to ignore it.
 *
 * Every case below is a matrix cell, asserted against the same function the
 * code calls. A hand-copied expected table would drift, so the table is
 * exported from the module and the test walks it.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EXIT_MATRIX,
  decideClaim,
  scanExitCode,
  unmeasuredClaim,
} from "../../src/claim-evidence.js";
import { exitForFindings } from "../../src/cli.js";
import type { Finding } from "../../src/types.js";
import {
  EXIT_CLEAN,
  EXIT_FINDINGS,
  EXIT_PARTIAL,
} from "../../src/exit-codes.js";

const finding = (severity: string) => ({ severity }) as unknown as Finding;

describe("the exit matrix is the only determination", () => {
  it("every matrix cell is satisfied by scanExitCode", () => {
    for (const row of EXIT_MATRIX) {
      const findings =
        row.findings === "none"
          ? []
          : [finding(row.findings === "error" ? "error" : "warning")];
      expect(
        scanExitCode({
          partial: row.partial,
          findings,
          gate: row.gate,
        }),
        `${row.partial ? "partial" : "complete"} / ${row.gate} / ${row.findings}`,
      ).toBe(row.exitCode);
    }
  });

  it("partial is INCONCLUSIVE at every gate, including advisory", () => {
    // There is no flag that turns "we did not finish" into a pass.
    // `--blocking none` suppresses findings; it does not suppress the fact
    // that the analysis was incomplete.
    for (const gate of ["advisory", "error", "warning"] as const) {
      expect(
        scanExitCode({ partial: true, findings: [], gate }),
        `gate ${gate}`,
      ).toBe(EXIT_PARTIAL);
    }
  });

  it("an advisory (E0) finding never gates at any level", () => {
    const advisory = {
      severity: "error",
      evidenceLevel: "E0",
      confidence: "low",
      findingType: "heuristic",
    } as never;
    for (const gate of ["error", "warning", "advisory"] as const) {
      expect(
        scanExitCode({
          partial: false,
          findings: [advisory],
          gate,
          isAdvisory: () => true,
        }),
        `gate ${gate}`,
      ).toBe(EXIT_CLEAN);
    }
  });

  it("the gate level still selects which severities block", () => {
    const warningOnly = [finding("warning")];
    expect(
      scanExitCode({ partial: false, findings: warningOnly, gate: "error" }),
    ).toBe(EXIT_CLEAN);
    expect(
      scanExitCode({ partial: false, findings: warningOnly, gate: "warning" }),
    ).toBe(EXIT_FINDINGS);
  });

  it("the complete-empty case is the only way to reach clean without findings", () => {
    expect(scanExitCode({ partial: false, findings: [], gate: "error" })).toBe(
      EXIT_CLEAN,
    );
    expect(
      decideClaim({ partial: true, blockingFindings: 0, supported: true })
        .state,
    ).toBe("INCONCLUSIVE");
  });
});

describe("exitForFindings cannot see partial — that is its documented limit", () => {
  it("still delegates to the one matrix for findings", () => {
    expect(exitForFindings([finding("error")], "error")).toBe(EXIT_FINDINGS);
    expect(exitForFindings([finding("error")], "advisory")).toBe(EXIT_CLEAN);
    expect(exitForFindings([], "error")).toBe(EXIT_CLEAN);
  });

  it("is documented as findings-only so callers cannot use it on a finished scan", () => {
    // If this starts failing, someone widened the function's contract. That is
    // the moment the partial check could be bypassed again.
    expect(exitForFindings.length).toBe(2);
  });
});

describe("the unmeasured surface fails closed", () => {
  it("unmeasuredClaim never returns clean", () => {
    const decision = unmeasuredClaim("some surface", "no measurement exists");
    expect(decision.exitCode).toBe(EXIT_PARTIAL);
    expect(decision.state).toBe("INCONCLUSIVE");
  });
});

describe("--score on a partial scan", () => {
  // The V5-002 acceptance case. The old implementation called
  // exitForFindings with no `partial` input, so `--score` on a truncated scan
  // whose findings did not gate exited 0. `--score` is the flag badge and
  // baseline tooling read, so that green shipped.
  //
  // A real scan cannot be forced partial on demand, so the pipeline is mocked
  // at the one seam the handler uses. What is under test is the HANDLER's
  // wiring, not the scanner.
  const partialResult = {
    schemaVersion: 1,
    partial: true,
    score: null,
    frameworks: [],
    frameworkDetectionUnknown: true,
    dimensions: [],
    findings: [],
    analysisStatus: {
      discovery: "partial",
      rules: "partial",
      skippedFiles: 3,
      durationMs: 1,
      reasons: ["truncated:budget"],
    },
  };

  // loadConfig runs before the exit decision, so the target has to exist.
  let target: string;
  beforeEach(() => {
    target = mkdtempSync(join(tmpdir(), "mj-exit-matrix-"));
  });
  afterEach(() => {
    rmSync(target, { recursive: true, force: true });
  });

  it("exits 2 rather than 0", async () => {
    const { runScanCommand } = await import("../../src/cli-handlers.js");
    const pipeline = await import("../../src/engine/scan-pipeline.js");
    const spy = vi
      .spyOn(pipeline, "runScan")
      .mockResolvedValue(partialResult as never);

    const lines: string[] = [];
    const code = await runScanCommand([target, "--score"], {
      out: (...parts: unknown[]) => {
        lines.push(parts.map(String).join(""));
      },
      err: () => {},
    });
    spy.mockRestore();

    expect(code).toBe(EXIT_PARTIAL);
    expect(code).not.toBe(EXIT_CLEAN);
  });

  it("the same result with the analysis marked complete is clean", async () => {
    const { runScanCommand } = await import("../../src/cli-handlers.js");
    const pipeline = await import("../../src/engine/scan-pipeline.js");
    const spy = vi.spyOn(pipeline, "runScan").mockResolvedValue({
      ...partialResult,
      partial: false,
      analysisStatus: {
        ...partialResult.analysisStatus,
        discovery: "complete",
        rules: "complete",
      },
    } as never);

    const code = await runScanCommand([target, "--score"], {
      out: () => {},
      err: () => {},
    });
    spy.mockRestore();

    // The contrast is the test: identical findings, opposite determination.
    // If `partial` were ignored anywhere, these two would agree.
    expect(code).toBe(EXIT_CLEAN);
  });

  it("a bad path is never a clean result", async () => {
    const { runScanCommand } = await import("../../src/cli-handlers.js");
    const code = await runScanCommand(
      ["/nonexistent-partial-target", "--score"],
      {
        out: () => {},
        err: () => {},
      },
    );
    expect(code).not.toBe(EXIT_CLEAN);
  });
});
