/**
 * `mjolnir triage` crash on a missing target directory — precise root
 * cause (Test Hardening Plan, follow-up to readme-doctest.spec.ts's
 * broader finding).
 *
 * `runForensicsCommand` (src/cli.ts) already guards this exact scenario:
 * `runForensics()` early-returns a graceful empty report when the target
 * doesn't exist, and only attempts to write FLAKY.md afterward — which
 * never happens because of the early return.
 *
 * `runTriageCommand` gained the same `totalTests === 0` graceful check
 * forensics has — but it's placed AFTER the unconditional
 * `writeFileSync(resolve(join(targetArg, "TRIAGE.md")), ...)`, so the fix
 * only actually helps the `--no-md` path (which skips that write
 * entirely and reaches the graceful check). Without `--no-md`, the write
 * into a directory that doesn't exist still throws ENOENT before the
 * check is ever reached — so plain `mjolnir triage ./test-results/`
 * on a fresh repo still crashes (exit 20) exactly as before.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runTriageCommand, runForensicsCommand } from "../../src/cli.js";

let dir: string;
let origCwd: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-triage-missing-"));
  origCwd = process.cwd();
  process.chdir(dir);
});

afterEach(() => {
  process.chdir(origCwd);
  rmSync(dir, { recursive: true, force: true });
});

describe("`forensics` on a nonexistent target directory (baseline: this one already works)", () => {
  it("returns exit 2 (no report found), not a crash", () => {
    const code = runForensicsCommand(["./nonexistent-test-results"]);
    expect(code).toBe(2);
  });
});

describe("`triage` on a nonexistent target directory", () => {
  it("renders the triage report text without throwing internally", () => {
    // The forensics/analysis half works fine — proven by output
    // appearing before the crash in the real CLI.
    const out: string[] = [];
    runTriageCommand(["./nonexistent-test-results"], {
      out: (...a) => out.push(a.map(String).join(" ")),
      err: () => {},
    });
    expect(out.join("\n")).toMatch(/TRIAGE|Nothing to triage/i);
  });

  it("returns exit 2 (graceful no-op) without --no-md — the write is now guarded", () => {
    const code = runTriageCommand(["./nonexistent-test-results"]);
    expect(
      code,
      "TRIAGE.md is only written when there are recognized results AND " +
        "the target dir exists — a missing dir degrades to the same " +
        "graceful exit-2 path as --no-md, never a crash.",
    ).toBe(2);
  });

  it("--no-md skips the write entirely and reaches the graceful exit-2 path", () => {
    const code = runTriageCommand(["./nonexistent-test-results", "--no-md"]);
    expect(
      code,
      "with --no-md the TRIAGE.md write is skipped, so this now reaches " +
        "the same graceful totalTests === 0 handling forensics has — " +
        "confirming the write ordering, not the analysis, is the " +
        "remaining bug in the non---no-md path above.",
    ).toBe(2);
  });
});
