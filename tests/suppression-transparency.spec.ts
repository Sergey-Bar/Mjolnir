/**
 * Bug Condition Exploration Test — Suppression Transparency
 *
 * Property 1: When suppressionCount > 0, the terminal output SHALL contain
 * "(N finding(s) suppressed by config)" — confirming transparency to the user.
 *
 * EXPECTED: This test FAILS on unfixed code because:
 *   1. `ScanResult` has no `suppressionCount` field
 *   2. `appendScoreSection` has no suppression rendering logic
 *
 * Failure here CONFIRMS the bug exists and validates our root cause analysis.
 *
 * Validates: Requirements 1.3, 2.3
 */

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import type { ScanResult } from "../src/types.js";
import { renderTerminal } from "../src/reporter/terminal.js";

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

describe("Bug Condition: Suppression Transparency Missing", () => {
  /**
   * **Validates: Requirements 1.3, 2.3**
   *
   * Property: For all suppressionCount values > 0 (1–100), the rendered
   * terminal output MUST contain a line matching
   * "(N finding(s) suppressed by config)" where N equals the suppressionCount.
   */
  it("property: renderTerminal includes suppression line when suppressionCount > 0", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (suppressionCount) => {
        const result = makeResult({
          suppressionCount,
        });

        const output = renderTerminal(result, { isTTY: false });

        // The expected behavior: output SHALL contain the suppression
        // transparency line with the exact count
        expect(output).toContain(
          `(${suppressionCount} finding(s) suppressed by config)`,
        );
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Concrete example: suppressionCount = 5
   * Demonstrates the bug with a specific, easy-to-understand case.
   */
  it("concrete: renderTerminal with suppressionCount=5 shows suppression line", () => {
    const result = makeResult({
      suppressionCount: 5,
    });

    const output = renderTerminal(result, { isTTY: false });

    expect(output).toContain("(5 finding(s) suppressed by config)");
  });

  /**
   * Concrete example: suppressionCount = 1 (singular edge case)
   */
  it("concrete: renderTerminal with suppressionCount=1 shows suppression line", () => {
    const result = makeResult({
      suppressionCount: 1,
    });

    const output = renderTerminal(result, { isTTY: false });

    expect(output).toContain("(1 finding(s) suppressed by config)");
  });
});
