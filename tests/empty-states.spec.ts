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
import { renderTerminal } from "../src/reporter/terminal.js";
import { renderTriage } from "../src/forensics/triage.js";
import {
  runForensicsCommand,
  runTriageCommand,
  runPwReportCommand,
} from "../src/cli.js";
import {
  createRuleScaffold,
  renderScaffoldReport,
} from "../src/commands/create-rule.js";
import type { ScanResult } from "../src/types.js";
import type { ForensicsReport } from "../src/forensics/types.js";

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

function emptyForensicsReport(): ForensicsReport {
  return {
    source: "junit-xml",
    totalTests: 0,
    failed: 0,
    skipped: 0,
    retriedTests: 0,
    flakyTests: 0,
    totalDurationMs: 0,
    verdicts: [],
  };
}

describe("dead end: no tests found", () => {
  it("explains what happened and what to do next (terminal)", () => {
    const out = renderTerminal(scanResult(), { isTTY: false });
    expect(out).toContain("NO TESTS DETECTED");
    expect(out).toContain("No Jest/Vitest/Playwright test files were found");
    // "what to do next", not just a diagnosis:
    expect(out).toContain("--tests-dir");
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

describe("dead end: no test-results/ for forensics", () => {
  it("explains what was expected, exits the documented code 2", () => {
    let errText = "";
    const code = runForensicsCommand([join(dir, "does-not-exist")], {
      out: () => {},
      err: (...parts) => (errText += parts.join(" ")),
    });
    expect(code).toBe(2);
    expect(errText).toContain("No test results recognized");
    // "what to do next":
    expect(errText).toMatch(/Playwright JSON report|JUnit XML/);
  });
});

describe("dead end: no test-results/ for triage", () => {
  it("explains what was expected, exits the documented code 2", () => {
    let errText = "";
    const code = runTriageCommand([join(dir, "does-not-exist")], {
      out: () => {},
      err: (...parts) => (errText += parts.join(" ")),
    });
    expect(code).toBe(2);
    expect(errText).toContain("No test results recognized");
  });

  it("celebrates rather than shames when there really is nothing to triage", () => {
    const text = renderTriage(emptyForensicsReport());
    expect(text).toContain("Nothing to triage");
    // Factual ("no failures") is fine; accusatory language is not.
    expect(text).not.toMatch(/you (broke|failed)|blame|bad job/i);
  });
});

describe("dead end: no report for pw-report", () => {
  it("explains what was expected, exits the documented code 2", () => {
    let errText = "";
    const code = runPwReportCommand([join(dir, "does-not-exist")], {
      out: () => {},
      err: (...parts) => (errText += parts.join(" ")),
    });
    expect(code).toBe(2);
    expect(errText).toContain("No Playwright JSON report");
    // "what to do next" — the exact config line to add:
    expect(errText).toContain("reporter:");
  });
});

describe("dead end: zero findings (flawless victory)", () => {
  it("renders a positive, explanatory state rather than silence", () => {
    const out = renderTerminal(scanResult({ score: 100, findings: [] }), {
      isTTY: false,
    });
    expect(out).toMatch(/FLAWLESS VICTORY|zero findings/i);
  });
});

describe("dead end: create-rule's deliberately-failing stub", () => {
  it("explains why the fixtures fail immediately, not just that they do", () => {
    const result = createRuleScaffold(
      { id: "QA-TEST-901", title: "Empty-states test rule" },
      dir,
    );
    expect(result.ok).toBe(true);
    const text = renderScaffoldReport(result);
    expect(text).toContain("intentional");
    expect(text).toMatch(/FAILING|fail/i);
    expect(text).toContain("fixture-firewall");
  });
});
