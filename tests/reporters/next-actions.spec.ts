import { describe, expect, it } from "vitest";
import { renderTerminal } from "../../src/reporter/terminal.js";
import type { Finding, ScanResult } from "../../src/types.js";

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

function scan(over: Partial<ScanResult> = {}): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 72,
    frameworks: ["vitest"],
    frameworkDetectionUnknown: false,
    dimensions: [],
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

function nextActionLines(out: string): string[] {
  // Scope to the NEXT ACTIONS block only. The reporter also emits
  // `$ mjolnir --scope changed` in the earlier Fix-This-First section,
  // and filtering the whole output for `$ mjolnir` lines drags that
  // command into every NEXT ACTIONS assertion — which is why the
  // expected arrays start with `= NEXT ACTIONS`, not with a command.
  const lines = out.split("\n").map((line) => line.trim());
  const start = lines.findIndex((line) => line === "= NEXT ACTIONS");
  const block = start === -1 ? lines : lines.slice(start);
  return block.filter(
    (line) =>
      line === "= NEXT ACTIONS" ||
      line.startsWith("$ mjolnir") ||
      line.startsWith("Partial scan:") ||
      line.startsWith("Existing debt path:") ||
      line.startsWith("Clean path:"),
  );
}

describe("beginner-safe scan next actions", () => {
  it("findings state points at explain, why, and baseline adoption", () => {
    const out = renderTerminal(scan(), { isTTY: false, ascii: true });
    expect(nextActionLines(out)).toEqual([
      "= NEXT ACTIONS",
      "$ mjolnir explain QA-TEST-001",
      "$ mjolnir why tests/login.spec.ts:12",
      "Existing debt path: capture the current state once, then review only new or",
      "$ mjolnir baseline",
      "$ mjolnir diff",
    ]);
  });

  it("clean state points at advisory CI install", () => {
    const out = renderTerminal(scan({ score: 100, findings: [] }), {
      isTTY: false,
      ascii: true,
    });
    expect(nextActionLines(out)).toEqual([
      "= NEXT ACTIONS",
      "Clean path: install the advisory PR workflow so new trust debt is caught",
      "$ mjolnir ci install",
    ]);
  });

  it("partial state explains that the gate should not be trusted yet", () => {
    const out = renderTerminal(
      scan({
        partial: true,
        analysisStatus: {
          discovery: "partial",
          rules: "complete",
          skippedFiles: 3,
          durationMs: 9,
        },
      }),
      { isTTY: false, ascii: true },
    );
    expect(nextActionLines(out)).toEqual([
      "= NEXT ACTIONS",
      "Partial scan: do not trust this as a release gate yet. Fix scan coverage or",
      "$ mjolnir explain QA-TEST-001",
      "$ mjolnir why tests/login.spec.ts:12",
      "Existing debt path: capture the current state once, then review only new or",
      "$ mjolnir baseline",
      "$ mjolnir diff",
    ]);
  });

  it("partial state with no visible findings still suggests a safe next command", () => {
    const out = renderTerminal(
      scan({
        score: 95,
        findings: [],
        partial: true,
        analysisStatus: {
          discovery: "complete",
          rules: "partial",
          skippedFiles: 0,
          durationMs: 9,
        },
      }),
      { isTTY: false, ascii: true },
    );
    expect(nextActionLines(out)).toEqual([
      "= NEXT ACTIONS",
      "Partial scan: do not trust this as a release gate yet. Fix scan coverage or",
      "$ mjolnir --verbose",
    ]);
  });

  it("does not reference unavailable commands", () => {
    const out = [
      renderTerminal(scan(), { isTTY: false, ascii: true }),
      renderTerminal(scan({ score: 100, findings: [] }), {
        isTTY: false,
        ascii: true,
      }),
      renderTerminal(scan({ partial: true }), { isTTY: false, ascii: true }),
    ].join("\n");
    const commands = [...out.matchAll(/^\s*\$ (mjolnir[^\n]*)/gm)].map(
      (match) => {
        const command = match[1];
        if (command === undefined) throw new Error("missing command capture");
        return command;
      },
    );
    const available = [
      /^mjolnir explain \S+$/,
      /^mjolnir why \S+:\d+$/,
      /^mjolnir baseline$/,
      /^mjolnir diff$/,
      /^mjolnir ci install$/,
      /^mjolnir --verbose$/,
      // --scope changed is the canonical "re-run on the changed scope"
      // beginner command; the Fix-This-First section emits it and the
      // NEXT ACTIONS block references it. It is not a placeholder.
      /^mjolnir --scope changed$/,
      /^mjolnir <path-to-your-tests>$/,
    ];
    expect(commands.length).toBeGreaterThan(0);
    for (const command of commands) {
      expect(
        available.some((pattern) => pattern.test(command)),
        `${command} should be an available beginner-safe command`,
      ).toBe(true);
    }
  });
});
