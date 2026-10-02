/**
 * Empty-state / dead-end guidance (Master-Stabilization-Plan Sprint 5,
 * Task 21).
 *
 * Every dead end must explain what happened and what to do next, never
 * a bare exit code — and the frozen exit-code contract must stay intact
 * regardless. This file consolidates the checks scattered across other
 * spec files into one place asserting both halves together per dead end.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderTerminal } from "../../src/reporter/terminal.js";
import { renderStats } from "../../src/commands/stats.js";
import type { ScanResult } from "../../src/types.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-empty-states-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function scanResult(over: Partial<ScanResult> = {}): ScanResult {
  const base: ScanResult = {
    schemaVersion: 1,
    partial: false,
    score: null,
    reason: "no-tests-found",
    frameworks: [],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: [],
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1,
    },
  };
  const merged: ScanResult = { ...base, ...over };
  if (merged.score !== null) delete (merged as { reason?: string }).reason;
  return merged;
}

describe("dead end: no tests found", () => {
  it("explains what happened and what to do next (terminal)", () => {
    const out = renderTerminal(scanResult(), { isTTY: false });
    expect(out).toContain("NO TESTS DETECTED");
    expect(out).toContain("No test files found for any supported framework");
    // H-6: every shipped adapter's search patterns are listed, not just
    // the three JavaScript frameworks.
    for (const label of [
      "TypeScript/JavaScript",
      "Python (pytest)",
      "Java (JUnit/TestNG)",
      "C# (NUnit/xUnit/MSTest)",
      "GitHub Actions workflows",
    ]) {
      expect(out).toContain(label);
    }
    // "what to do next" — and the suggestion is a real invocation, not a
    // phantom flag (H-5): no `--flag` token appears in the empty state.
    expect(out).toContain("mjolnir <path-to-your-tests>");
    expect(out).not.toMatch(/mjolnir --[a-z-]+/);
  });

  it("score stays null, never a fake 0 (frozen contract: score is honest)", () => {
    const out = renderTerminal(scanResult(), { isTTY: false });
    expect(out).not.toMatch(/WORTHINESS\s+0\/100/);
  });
});

describe("dead end: framework detection unknown", () => {
  it("explains what happened and what to do next (terminal)", () => {
    const out = renderTerminal(
      scanResult({ score: 100, frameworkDetectionUnknown: true }),
      { isTTY: false },
    );
    expect(out).toContain("FRAMEWORK");
    expect(out).toContain("unknown");
    // "what to do next":
    expect(out).toMatch(/Add a package\.json|config the detector recognizes/);
  });
});

describe("dead end: zero findings (flawless victory)", () => {
  it("renders a positive, explanatory state rather than silence", () => {
    const out = renderTerminal(scanResult({ score: 100, findings: [] }), {
      isTTY: false,
    });
    expect(out).toMatch(/ZERO FINDINGS \(STATIC\)|zero findings/i);
  });
});

/**
 * Subcommand dead ends (Terminal + CI UX Overhaul plan, M1b): every
 * empty/unresolvable state explains what happened AND points at the
 * exact `$ command` to run next. The `$` affordance is the design
 * system's next-step token — a command the user can copy verbatim.
 */
describe("subcommand dead ends carry a $ next-step command", () => {
  // The baseline→diff loop is gone (v6 carve). The empty state now points at
  // the one command that still answers "is this fixed?" — a scoped re-scan.
  it("stats with no recorded fixes points at the changed-scope loop", () => {
    const text = renderStats(null);
    expect(text).toContain("No fixes recorded yet");
    expect(text).toMatch(/^\s*\$ mjolnir scan --scope changed$/m);
  });
});
