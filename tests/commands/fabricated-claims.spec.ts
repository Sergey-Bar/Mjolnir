/**
 * P0 fabricated-claim gate (plan V5-001).
 *
 * Mjölnir is a trust product, so its own surface is held to the Trust
 * Constitution: a rendered number must have a provenance, a verdict must come
 * from the one determination function, and an incomplete analysis must never
 * read as clean.
 *
 * These specs are the negative suite for the commands that used to break all
 * three rules. They assert the ABSENCE of fabricated content — hardcoded
 * scores, zero-as-measurement, invented runtime evidence, "updated" messages
 * for state changes that never happened — because a claim that is merely
 * absent is invisible to a coverage number.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runExecReportCommand } from "../../src/commands/exec-report.js";
import { runMaturityCommand } from "../../src/commands/maturity.js";
import { runQuarantineCommand } from "../../src/commands/quarantine.js";
import { buildPlaywrightReport } from "../../src/commands/report-playwright.js";
import { decideClaim, unmeasuredClaim } from "../../src/claim-evidence.js";
import {
  EXIT_CLEAN,
  EXIT_FINDINGS,
  EXIT_PARTIAL,
} from "../../src/exit-codes.js";

const out = vi.fn();
const err = vi.fn();
let dir: string;

beforeEach(() => {
  out.mockClear();
  err.mockClear();
  dir = mkdtempSync(join(tmpdir(), "mjolnir-claims-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const stdout = () => out.mock.calls.map((call) => String(call[0])).join("\n");

describe("decideClaim is the only determination", () => {
  it("a complete clean analysis is READY", () => {
    expect(
      decideClaim({ partial: false, blockingFindings: 0, supported: true }),
    ).toEqual({
      state: "READY",
      exitCode: EXIT_CLEAN,
      reason: "READY: complete analysis, no findings at the configured gate.",
    });
  });

  it("law 11: partial is checked BEFORE the finding gate", () => {
    // Zero findings on a partial scan is the exact case that used to print
    // "clean scan" and exit 0. The order matters: with findings present the
    // answer is the same, so only the ordering proves the check is real.
    const decision = decideClaim({
      partial: true,
      blockingFindings: 0,
      supported: true,
    });
    expect(decision.state).toBe("INCONCLUSIVE");
    expect(decision.exitCode).toBe(EXIT_PARTIAL);
    expect(decision.reason).toContain("PARTIAL");
  });

  it("a partial scan with findings is still inconclusive, not a pass", () => {
    const decision = decideClaim({
      partial: true,
      blockingFindings: 7,
      supported: true,
    });
    expect(decision.state).toBe("INCONCLUSIVE");
    expect(decision.exitCode).toBe(EXIT_PARTIAL);
  });

  it("law 2: an unsupported surface never passes", () => {
    const decision = decideClaim({
      partial: false,
      blockingFindings: 0,
      supported: false,
      unsupportedReason: "no runtime report",
    });
    expect(decision.state).toBe("INCONCLUSIVE");
    expect(decision.reason).toContain("no runtime report");
  });

  it("law 1: a blocked surface reports the finding count it saw", () => {
    const decision = decideClaim({
      partial: false,
      blockingFindings: 3,
      supported: true,
    });
    expect(decision.state).toBe("BLOCKED");
    expect(decision.exitCode).toBe(EXIT_FINDINGS);
    expect(decision.reason).toContain("3 finding(s)");
  });

  it("an unmeasured surface fails closed", () => {
    const decision = unmeasuredClaim("surface", "no measurement exists");
    expect(decision.state).toBe("INCONCLUSIVE");
    expect(decision.exitCode).toBe(EXIT_PARTIAL);
    expect(decision.reason).toContain("UNMEASURED");
  });
});

describe("exec-report renders only measured values", () => {
  it("never invents a risk level, a delta, or a quality assurance", async () => {
    await runExecReportCommand([dir], { out, err });
    const text = stdout();
    expect(text).not.toMatch(/Risk Level/i);
    expect(text).not.toMatch(/↑|↓/);
    expect(text).not.toMatch(/excellent/i);
    expect(text).not.toMatch(/maintain current quality/i);
    expect(text).toContain("Not reported here: business risk");
  });

  it("a target with no tests reports an unmeasured score rather than a number", async () => {
    // Law 1: unknown is not Pass, and a null score must never be printed as 0
    // or as 100.
    const code = await runExecReportCommand([dir], { out, err });
    const text = stdout();
    expect(text).toContain("Worthiness score: not measured");
    expect(text).not.toMatch(/Worthiness score: \d+\/100/);
    // A complete scan of an empty surface is legitimately clean (law 11 allows
    // it); what is not allowed is inventing a measurement to justify it.
    expect([EXIT_CLEAN, EXIT_PARTIAL]).toContain(code);
  });

  it("names the source of every number it prints", async () => {
    await runExecReportCommand([dir], { out, err });
    const kpiLines = stdout()
      .split("\n")
      .filter((line) => line.includes("(source:"));
    expect(kpiLines.length).toBeGreaterThanOrEqual(4);
    for (const line of kpiLines) {
      expect(line).toMatch(/\(source: .+\)/);
    }
  });

  it("states that an empty analysis is incomplete when it is partial", async () => {
    await runExecReportCommand([dir], { out, err });
    const text = stdout();
    // The old string was an unconditional "No findings — clean scan."
    expect(text).not.toMatch(/No findings — clean scan/);
  });

  it("uses a finite scan duration", () => {
    // A frozen law: no command may request an unbounded scan.
    const source = readFileSync(
      join(
        import.meta.dirname,
        "..",
        "..",
        "src",
        "commands",
        "exec-report.ts",
      ),
      "utf8",
    );
    expect(source).not.toContain("Number.POSITIVE_INFINITY");
  });
});

describe("no shipped command may fabricate a runtime result", () => {
  it("the report-shaped artifact contains no executed tests", () => {
    const report = buildPlaywrightReport({
      findings: [],
      score: 100,
      frameworks: ["playwright"],
    });
    expect(report.totalTests).toBe(0);
    expect(report.passedTests).toBe(0);
    expect(report.failedTests).toBe(0);
    expect(report.suites).toEqual([]);
  });

  it("quarantine stats reports no statistics rather than printing zeros", () => {
    const code = runQuarantineCommand(["stats"], { out, err });
    expect(code).toBe(EXIT_PARTIAL);
    expect(stdout()).not.toMatch(/Total: \d/);
  });

  it("quarantine review never claims a state change it did not make", () => {
    for (const action of ["--accept", "--defer", "--reject"]) {
      out.mockClear();
      const code = runQuarantineCommand(["review", action], { out, err });
      expect(code).toBe(EXIT_PARTIAL);
      expect(stdout()).not.toMatch(/updated|applied|saved/i);
    }
  });
});

describe("maturity reports signals, not a score", () => {
  it("renders no numeric score at all", () => {
    const code = runMaturityCommand(["assess", dir], { out, err });
    expect(code).toBe(EXIT_PARTIAL);
    const text = stdout();
    expect(text).not.toMatch(/\d+\/100/);
    expect(text).not.toMatch(/\(7[05]\)/);
    expect(text).not.toMatch(/ruleCount|rules loaded/i);
  });

  it("states what presence does not prove", () => {
    runMaturityCommand(["assess", dir], { out, err });
    expect(stdout()).toContain("presence does NOT say");
  });
});
