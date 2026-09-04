/**
 * Preservation Property Tests — Terminal Output Unchanged for Non-Suppression Cases
 *
 * Property 2: For all inputs where none of the suppression bug conditions hold,
 * the system SHALL produce exactly the same behavior as the original system.
 *
 * These tests run on UNFIXED code and capture existing behavior to prevent regressions.
 *
 * **Validates: Requirements 3.1, 3.2, 3.5, 3.7**
 */

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import type { ScanResult } from "../../src/types.js";
import { renderTerminal } from "../../src/reporter/terminal.js";

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

describe("Preservation: Terminal Output Unchanged for Non-Suppression Cases", () => {
  /**
   * **Validates: Requirements 3.1, 3.5**
   *
   * Property: For all random ScanResult objects with suppressionCount either 0
   * or undefined, the rendered terminal output must NOT contain any suppression
   * transparency line ("suppressed by config").
   */
  it("property: no suppression line appears when suppressionCount is 0 or undefined", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(undefined), fc.constant(0)),
        fc.integer({ min: 0, max: 100 }),
        (suppressionCount, score) => {
          const overrides: Partial<ScanResult> =
            suppressionCount === undefined
              ? { score }
              : { score, suppressionCount };

          const result = makeResult(overrides);
          const output = renderTerminal(result, { isTTY: false });

          // Preservation: no suppression line should ever appear
          expect(output).not.toContain("suppressed by config");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.7**
   *
   * Property: For all score values 0–100, verdictFor returns the correct verdict:
   *   - WORTHY when score >= 80
   *   - NEEDS WORK when 50 <= score < 80
   *   - UNWORTHY when score < 50
   */
  it("property: verdicts render correctly for all scores 0-100", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (score) => {
        const result = makeResult({ score });
        const output = renderTerminal(result, { isTTY: false });

        if (score >= 80) {
          expect(output).toContain("WORTHY");
          expect(output).not.toContain("NEEDS WORK");
          expect(output).not.toContain("UNWORTHY");
        } else if (score >= 50) {
          expect(output).toContain("NEEDS WORK");
          expect(output).not.toContain("UNWORTHY");
        } else {
          expect(output).toContain("UNWORTHY");
          expect(output).not.toContain("NEEDS WORK");
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.2**
   *
   * Property: When score=100, findings=[], and no suppressions, the victory
   * state appears in the output. The render mode is pinned because the
   * victory message is mode-specific (the ASCII contract string survives in
   * ASCII mode; unicode mode renders the FORGED wordmark block — both
   * test-locked in terminal-render.spec.ts). Relying on shouldUseAscii()
   * made this platform-dependent: win32 defaults to ASCII, Linux CI does not.
   */
  it("property: FLAWLESS VICTORY appears for score=100 with zero findings and no suppressions", () => {
    // Test with undefined suppressionCount
    const resultUndefined = makeResult({ score: 100, findings: [] });
    const outputUndefined = renderTerminal(resultUndefined, {
      isTTY: false,
      ascii: true,
    });
    expect(outputUndefined).toContain("*** FLAWLESS VICTORY ***");

    // Test with suppressionCount = 0
    const resultZero = makeResult({
      score: 100,
      findings: [],
      suppressionCount: 0,
    });
    const outputZero = renderTerminal(resultZero, {
      isTTY: false,
      ascii: true,
    });
    expect(outputZero).toContain("*** FLAWLESS VICTORY ***");

    // Unicode mode: the FORGED wordmark block replaces the bare line —
    // the victory state must appear in BOTH modes.
    const outputUnicode = renderTerminal(resultUndefined, {
      isTTY: false,
      ascii: false,
    });
    expect(outputUnicode).toContain("F O R G E D");
    expect(outputUnicode).toContain("FORGED — zero findings");
  });

  /**
   * **Validates: Requirements 3.1**
   *
   * Property: The score section always contains the WORTHINESS label and the
   * score value in N/100 format for any non-null score, regardless of
   * suppressionCount being 0 or undefined.
   */
  it("property: score section format is preserved (WORTHINESS N/100)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.oneof(fc.constant(undefined), fc.constant(0)),
        (score, suppressionCount) => {
          const overrides: Partial<ScanResult> =
            suppressionCount === undefined
              ? { score }
              : { score, suppressionCount };

          const result = makeResult(overrides);
          const output = renderTerminal(result, { isTTY: false });

          expect(output).toContain("WORTHINESS");
          expect(output).toContain(`${score}/100`);
        },
      ),
      { numRuns: 100 },
    );
  });
});
