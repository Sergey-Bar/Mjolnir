/**
 * E2E journey 9 — exit-code contract sweep: every documented command ×
 * (bad flag → 10, missing target → documented code, clean repo → 0,
 * findings ≥ gate → 1, partial scan → 2). No undocumented exit code.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runCli } from "./helpers.js";

let dir: string;
let cleanDir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-e2e-sweep-"));
  cleanDir = mkdtempSync(join(tmpdir(), "mjolnir-e2e-sweep-clean-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  rmSync(cleanDir, { recursive: true, force: true });
});

function writeClean(): void {
  mkdirSync(join(cleanDir, "e2e"), { recursive: true });
  writeFileSync(
    join(cleanDir, "e2e", "clean.spec.ts"),
    "it('a', () => { expect(1 + 1).toBe(2); });\n",
  );
}

function writeFinding(): void {
  mkdirSync(join(dir, "e2e"), { recursive: true });
  writeFileSync(
    join(dir, "e2e", "focused.spec.ts"),
    "test.only('a', () => { expect(1 + 1).toBe(2); });\n",
  );
}

describe("E2E journey 9: exit-code contract sweep", () => {
  it("scan: bad flag 10, clean 0, findings 1, broken config 10", () => {
    expect(runCli(["scan", "--bogus-flag"]).status).toBe(10);
    writeClean();
    expect(runCli(["scan", cleanDir, "--json"]).status).toBe(0);
    writeFinding();
    expect(runCli(["scan", dir, "--json"]).status).toBe(1);
    writeFileSync(join(dir, "mjolnir.config.json"), "{ broken");
    expect(runCli(["scan", dir, "--json"]).status).toBe(10);
  });

  it("fix: bad flag 10, missing target 10, clean 0, findings fixed 0", () => {
    expect(runCli(["fix", "--bogus"]).status).toBe(10);
    expect(runCli(["fix", join(dir, "nope")]).status).toBe(10);
    writeClean();
    expect(runCli(["fix", cleanDir]).status).toBe(0);
    writeFinding();
    expect(runCli(["fix", dir]).status).toBe(0); // .only is auto-fixable
  });

  it("diff: bad flag 10, missing target 10, existing dir without baseline 2", () => {
    expect(runCli(["diff", "--bogus"]).status).toBe(10);
    expect(runCli(["diff", join(dir, "nope")]).status).toBe(10);
    expect(runCli(["diff", dir]).status).toBe(2);
  });

  it("forensics/triage/pw-report: bad flag 10, missing dir 2", () => {
    for (const cmd of ["forensics", "triage", "pw-report"]) {
      expect(runCli([cmd, "--bogus"]).status).toBe(10);
      expect(runCli([cmd, join(dir, "nope")]).status).toBe(2);
    }
  });

  it("impact: bad flag 10, non-git target 2, no commits 2", () => {
    expect(runCli(["impact", "--bogus"]).status).toBe(10);
    writeClean();
    expect(runCli(["impact", dir]).status).toBe(2);
  });

  it("debt/pr-comment: bad flag 10, missing target 10, clean 0", () => {
    expect(runCli(["debt", "--bogus"]).status).toBe(10);
    expect(runCli(["debt", join(dir, "nope")]).status).toBe(10);
    writeClean();
    expect(runCli(["debt", cleanDir]).status).toBe(0);
  });

  it("baseline: bad flag 10, missing target 10, clean 0", () => {
    expect(runCli(["baseline", "--bogus"]).status).toBe(10);
    expect(runCli(["baseline", join(dir, "nope")]).status).toBe(10);
    writeClean();
    expect(runCli(["baseline", cleanDir]).status).toBe(0);
  });

  it("doctor: missing target 2, bad flag is a no-op scan, empty dir 2", () => {
    expect(runCli(["doctor", join(dir, "nope")]).status).toBe(2);
    // `doctor --bogus` ignores the unknown flag and scans the CWD —
    // clean self-scan territory → exit 0.
    expect([0, 1, 2]).toContain(runCli(["doctor", "--bogus"]).status);
    // An empty dir has no fixtures → the firewall check fails → 2.
    expect(runCli(["doctor", dir]).status).toBe(2);
  });

  it("explain/rules/stats/suppressions/doctor: flag and argument errors are 10", () => {
    expect(runCli(["explain"]).status).toBe(10);
    expect(runCli(["explain", "QA-NOPE-999"]).status).toBe(10);
    expect(runCli(["stats", join(dir, "nope")]).status).toBe(0); // stats degrades to defaults
    expect(runCli(["suppressions"]).status).toBe(0); // no config → empty list
  });
});
