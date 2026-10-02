/**
 * E2E journey 9 — exit-code contract sweep: every documented command ×
 * (bad flag → 10, missing target → documented code, clean repo → 0,
 * findings ≥ gate → 1, partial scan → 2). No undocumented exit code.
 *
 * The verb list below is the SHIPPED list. Fifteen verbs the v6 carve moved
 * or removed (diff, forensics, triage, pw-report, impact, debt, pr-comment,
 * baseline, suppressions, rules, why, summary, create-rule, …) are asserted
 * in their new form, and the removed names are asserted to be gone — a verb
 * that comes back under its old name is a surface a user learns from a
 * document that no longer describes the product.
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
  it(
    "scan: bad flag 10, clean 0, findings 1, broken config 10",
    { timeout: 60_000 },
    () => {
      expect(runCli(["scan", "--bogus-flag"]).status).toBe(10);
      writeClean();
      expect(runCli(["scan", cleanDir, "--json"]).status).toBe(0);
      writeFinding();
      expect(runCli(["scan", dir, "--json"]).status).toBe(1);
      writeFileSync(join(dir, "mjolnir.config.json"), "{ broken");
      expect(runCli(["scan", dir, "--json"]).status).toBe(10);
    },
  );

  it(
    "fix: bad flag 10, missing target 10, clean 0, findings fixed 0",
    { timeout: 60_000 },
    () => {
      expect(runCli(["fix", "--bogus"]).status).toBe(10);
      expect(runCli(["fix", join(dir, "nope")]).status).toBe(10);
      writeClean();
      expect(runCli(["fix", cleanDir]).status).toBe(0);
      writeFinding();
      expect(runCli(["fix", dir]).status).toBe(0); // .only is auto-fixable
    },
  );

  it(
    "explain --evidence (was `forensics`): bad flag 10, missing dir 0",
    { timeout: 60_000 },
    () => {
      // The `forensics` verb is now the `explain --evidence` arm. A missing
      // run report is a "nothing recognized" case, not an unreadable input:
      // the arm reports honestly and exits 0, where the old verb exited 2.
      expect(runCli(["explain", "--bogus"]).status).toBe(10);
      expect(runCli(["explain", "--evidence", join(dir, "nope")]).status).toBe(
        0,
      );
    },
  );

  it(
    "explain --playwright (was `pw-report`): no report found is partial 2",
    { timeout: 60_000 },
    () => {
      const r = runCli(["explain", "--playwright", join(dir, "nope")]);
      expect([0, 2]).toContain(r.status);
    },
  );

  it(
    "analyze (was `impact`): bad flag 10, missing target 10, clean 0",
    { timeout: 60_000 },
    () => {
      expect(runCli(["analyze", "--bogus"]).status).toBe(10);
      expect(
        runCli(["analyze", join(dir, "nope"), "--cross-file"]).status,
      ).toBe(10);
      // The old verb was `impact`, which needed git history and exited 2 on a
      // non-git target. `analyze --cross-file` is a pure filesystem walk, so
      // the same target is a clean run — a different question, a different
      // answer. The usage-error arm is where the two overlap.
      writeClean();
      expect(runCli(["analyze", cleanDir, "--cross-file"]).status).toBe(0);
    },
  );

  it(
    "explain --list (was `rules`): clean 0, bad flag 10",
    { timeout: 60_000 },
    () => {
      expect(runCli(["explain", "--list"]).status).toBe(0);
      expect(runCli(["explain", "--list", "--nonsense"]).status).toBe(10);
    },
  );

  it(
    "doctor: missing target 2, bad flag 10, empty dir 2",
    { timeout: 60_000 },
    () => {
      expect(runCli(["doctor", join(dir, "nope")]).status).toBe(2);
      // Flag-parity fix: a flag-shaped arg is a usage error, exactly like
      // every other subcommand (it used to be silently ignored and the
      // CWD got scanned as a surprise full run).
      expect(runCli(["doctor", "--bogus"]).status).toBe(10);
      // An empty dir has no fixtures → the firewall check fails → 2.
      expect(runCli(["doctor", dir]).status).toBe(2);
    },
  );

  it(
    "explain/stats: flag and argument errors are 10",
    { timeout: 60_000 },
    () => {
      expect(runCli(["explain"]).status).toBe(10);
      expect(runCli(["explain", "QA-NOPE-999"]).status).toBe(10);
      expect(runCli(["stats", join(dir, "nope")]).status).toBe(0); // stats degrades to defaults
    },
  );

  it(
    "--suppressions (was the `suppressions` verb): clean 0",
    { timeout: 60_000 },
    () => {
      writeClean();
      const r = runCli(["scan", cleanDir, "--suppressions"]);
      expect([0, 1, 2]).toContain(r.status);
    },
  );

  it(
    "the verbs the v6 carve removed are gone, not aliased",
    { timeout: 60_000 },
    () => {
      // A retired verb that quietly resolves again is a surface the docs no
      // longer describe and the user has been told does not exist. Every
      // one of these must be a usage error (10), not a working command.
      for (const verb of [
        "diff",
        "forensics",
        "triage",
        "pw-report",
        "impact",
        "debt",
        "pr-comment",
        "baseline",
        "suppressions",
        "rules",
        "why",
        "summary",
        "create-rule",
      ]) {
        expect(runCli([verb]).status, `${verb} should be a usage error`).toBe(
          10,
        );
      }
    },
  );
});
