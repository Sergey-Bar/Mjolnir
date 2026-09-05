/**
 * E2E journey 2 — CI PR flow: workflow install, changed-scope attribution
 * against a real git fixture, degraded attribution, --base override.
 */

import {
  mkdirSync,
  mkdtempSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";

import { runCli } from "./helpers.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-e2e-ci-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function git(args: string[]): void {
  execFileSync("git", ["-C", dir, ...args], { stdio: "ignore" });
}

function commitAll(message: string): void {
  git(["add", "."]);
  git(["commit", "-m", message]);
}

function writeSpec(name: string, body: string): void {
  mkdirSync(join(dir, "e2e"), { recursive: true });
  writeFileSync(join(dir, "e2e", name), body);
}

const CLEAN = "it('a', () => { expect(1 + 1).toBe(2); });\n";
// QA-TEST-002 (it.skip) was measured 65% FP and demoted to quarantine
// (docs/FP-AUDIT.md 2026-08-31); the journey uses a core-tier debt probe.
const DEBT = "it.only('a', () => {});\n";

describe("E2E journey 2: CI PR flow", () => {
  it("ci install writes a valid workflow file", () => {
    const { stdout, status } = runCli(["ci", "install"], dir);
    expect(status).toBe(0);
    expect(stdout).toContain("ci");
    const wf = join(dir, ".github", "workflows", "mjolnir.yml");
    expect(existsSync(wf)).toBe(true);
    const text = readFileSync(wf, "utf8");
    expect(text).toContain("jobs:");
    expect(text).toContain("on:");
    // Template v2: the summary step is the `mjolnir summary` command,
    // not an inline script (plan M4 — one emitter, one code path).
    expect(text).toContain("summary mjolnir.json");
  });

  it("summary turns a saved --json report into a step summary (CI flow tail)", () => {
    writeSpec("clean.spec.ts", CLEAN);
    writeSpec("debt.spec.ts", DEBT);
    const scan = runCli([dir, "--json", "--strict"]);
    expect(scan.status).toBe(0);
    const reportPath = join(dir, "mjolnir.json");
    writeFileSync(reportPath, scan.stdout);
    // Neutralize the Actions-runner env: this test pins the documented
    // "outside GitHub Actions" behavior (summary on stdout, no
    // annotations); the annotations flow is covered in summary.spec.
    const { stdout, status } = runCli(["summary", "mjolnir.json"], dir, {
      GITHUB_ACTIONS: undefined,
      GITHUB_STEP_SUMMARY: undefined,
    });
    expect(status).toBe(0);
    // Step summary markdown: score + verdict band + deduction context.
    expect(stdout).toContain("Verification Trust");
    expect(stdout).toMatch(/Score: \*\*\d+\/100\*\*/);
    expect(stdout).toContain("QA-TEST-001");
    expect(stdout).toContain("- Fix:");
    // Outside GITHUB_ACTIONS there are no annotation lines.
    expect(stdout).not.toContain("::error");
  });

  it("--scope changed attributes findings only to changed lines on a branch", () => {
    git(["init", "-b", "main"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);
    writeSpec("clean.spec.ts", CLEAN);
    writeFileSync(join(dir, "README.md"), "docs\n");
    commitAll("clean base");
    git(["checkout", "-b", "feat"]);
    writeSpec("new-debt.spec.ts", DEBT);
    commitAll("add debt");

    // --strict: the debt probe is a quarantine-tier rule (QA-TEST-001,
    // demoted in Phase 2) — strict is the mode where it actually runs.
    // The tier cap makes its findings advisory (info + E0), so the scan
    // exits 0: visible, not gating.
    const full = runCli([dir, "--json", "--strict"]);
    const changed = runCli([dir, "--json", "--scope", "changed", "--strict"]);
    expect(full.status).toBe(0);
    expect(changed.status).toBe(0);
    const fullResult = JSON.parse(full.stdout) as {
      testDeclarationCount: number;
      scope?: string;
      findings: Array<{ ruleId: string; file: string }>;
    };
    expect(
      fullResult.findings.some(
        (f) => f.ruleId === "QA-TEST-001" && f.file.startsWith("e2e/new-debt"),
      ),
      "the debt probe must be detected under --strict",
    ).toBe(true);
    const changedResult = JSON.parse(changed.stdout) as {
      testDeclarationCount: number;
      scope?: string;
      scopeDegraded?: string;
      findings: Array<{ file: string }>;
    };
    expect(fullResult.scope).toBeUndefined(); // full scan: no scope field
    expect(changedResult.scope).toBe("changed");
    expect(changedResult.scopeDegraded).toBeUndefined();
    // The changed set contains only the new spec (README has no tests).
    expect(changedResult.testDeclarationCount).toBeLessThan(
      fullResult.testDeclarationCount,
    );
    for (const f of changedResult.findings) {
      expect(f.file.startsWith("e2e/new-debt")).toBe(true);
    }
  });

  it("degrades to full-file attribution when merge-base is unresolvable (detached HEAD)", () => {
    git(["init", "-b", "main"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);
    writeSpec("clean.spec.ts", CLEAN);
    commitAll("base");
    git(["checkout", "--detach", "HEAD"]);
    // Leave no default branch behind: the merge-base becomes unresolvable.
    git(["branch", "-D", "main"]);
    const changed = runCli([dir, "--json", "--scope", "changed", "--strict"]);
    const result = JSON.parse(changed.stdout) as { scopeDegraded?: string };
    expect(result.scopeDegraded).toBe("no-merge-base");
  });

  it("reports not-a-git-repo degradation for a plain directory", () => {
    writeSpec("clean.spec.ts", CLEAN);
    const changed = runCli([dir, "--json", "--scope", "changed"]);
    const result = JSON.parse(changed.stdout) as { scopeDegraded?: string };
    expect(result.scopeDegraded).toBe("not-a-git-repo");
  });

  it("--base overrides the default base branch", () => {
    git(["init", "-b", "develop"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);
    writeSpec("clean.spec.ts", CLEAN);
    commitAll("develop base");
    git(["checkout", "-b", "feat"]);
    writeSpec("new-debt.spec.ts", DEBT);
    commitAll("debt on feat");
    const changed = runCli([
      dir,
      "--json",
      "--scope",
      "changed",
      "--base",
      "develop",
    ]);
    const result = JSON.parse(changed.stdout) as { scopeDegraded?: string };
    expect(result.scopeDegraded).toBeUndefined();
  });
});
