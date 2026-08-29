/**
 * Output durability & terminal-safety audit (Test Hardening Plan, P0/P1
 * additions — market-standard checks for a CLI that (a) mutates a user's
 * own source files and (b) is piped into other tools by scripts).
 *
 * Two concerns, neither exercised anywhere else in the suite:
 *
 *  1. Crash-safety of file writes. `writeFileSync(path, content)` is NOT
 *     atomic — if the process dies mid-write (OOM kill, Ctrl-C, power
 *     loss), the target is left truncated/corrupted. For most of
 *     mjolnir's outputs (FLAKY.md, badge JSON) that's merely annoying
 *     to regenerate. For `mjolnir fix`, the target is the USER'S OWN
 *     TEST FILE — a truncated write there is data loss in code the user
 *     did not ask to have touched destructively. This is checked
 *     structurally (does the write path go through a temp-file + rename,
 *     the standard safe pattern) rather than by actually killing a
 *     process mid-syscall, which isn't portably testable.
 *
 *  2. NO_COLOR / non-TTY output hygiene. Findings get piped into other
 *     tools (`| tee`, CI log capture, `grep`) constantly — raw ANSI
 *     escape codes leaking into a non-interactive stream is a classic
 *     "works on my machine, garbage in CI logs" bug.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { renderTerminal } from "../src/reporter/terminal.js";
import type { ScanResult } from "../src/types.js";

// eslint-disable-next-line no-control-regex -- ANSI escape is the thing being detected
const ANSI_ESCAPE_RE = /\x1b\[[0-9;]*m/;

function sampleResult(): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 72,
    frameworks: ["playwright"],
    frameworkDetectionUnknown: false,
    dimensions: [
      { category: "QA-PW", score: 84, errors: 1, warnings: 0, infos: 0 },
    ],
    findings: [
      {
        ruleId: "QA-PW-003",
        category: "QA-PW",
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FALSE-GREEN",
        file: "e2e/checkout.spec.ts",
        line: 2,
        column: 1,
        message: "test.only() committed.",
        why: "Skips the rest of the suite while CI reports green.",
        fix: "Remove .only.",
      },
    ],
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 5,
    },
  };
}

describe("terminal output: NO_COLOR and non-TTY hygiene", () => {
  const originalNoColor = process.env["NO_COLOR"];

  afterEach(() => {
    if (originalNoColor === undefined) delete process.env["NO_COLOR"];
    else process.env["NO_COLOR"] = originalNoColor;
  });

  it("emits raw ANSI escapes when isTTY is true and NO_COLOR is unset", () => {
    delete process.env["NO_COLOR"];
    const out = renderTerminal(sampleResult(), { isTTY: true });
    expect(ANSI_ESCAPE_RE.test(out)).toBe(true);
  });

  it("never emits ANSI escapes when isTTY is false (piped/CI)", () => {
    delete process.env["NO_COLOR"];
    const out = renderTerminal(sampleResult(), { isTTY: false });
    expect(
      ANSI_ESCAPE_RE.test(out),
      "piped output contains raw ANSI escape codes — this corrupts logs " +
        "in CI systems and breaks naive `grep`/`tee` pipelines.",
    ).toBe(false);
  });

  it("never emits ANSI escapes when NO_COLOR is set, even with isTTY true", () => {
    process.env["NO_COLOR"] = "1";
    const out = renderTerminal(sampleResult(), { isTTY: true });
    expect(ANSI_ESCAPE_RE.test(out)).toBe(false);
  });

  it("severity is still distinguishable by text/symbol when color is off", () => {
    // Color-blind-safe design claim (file's own header comment: "Symbols
    // accompany color") — verify the symbol/word actually survives
    // independent of color, not just that color is absent.
    delete process.env["NO_COLOR"];
    const out = renderTerminal(sampleResult(), { isTTY: false });
    expect(out).toMatch(/error|ERROR|✗|✖/);
  });
});

describe("crash-safety of destructive file writes", () => {
  const fixSource = readFileSync(
    join(import.meta.dirname, "..", "src", "commands", "fix.ts"),
    "utf8",
  );

  it("`mjolnir fix` writes through a temp-file + rename, not a direct in-place write", () => {
    // The safe pattern: write to a sibling temp path, then renameSync
    // over the original — rename is atomic on the same filesystem, so a
    // mid-write crash leaves either the old file or the new one intact,
    // never a truncated hybrid. A direct writeFileSync(originalPath, ...)
    // has no such guarantee.
    const usesRenamePattern = /renameSync|writeFileSync\([^,]+\.tmp/i.test(
      fixSource,
    );
    expect(
      usesRenamePattern,
      "src/commands/fix.ts writes directly to the target file with " +
        "writeFileSync and no temp-file+rename step. `mjolnir fix` " +
        "rewrites the USER'S OWN test file — if the process is killed " +
        "mid-write (Ctrl-C, OOM, power loss), that file is left " +
        "truncated. This is real, uncommitted user data, not a " +
        "regenerable artifact like FLAKY.md or the badge JSON.",
    ).toBe(true);
  });
});
