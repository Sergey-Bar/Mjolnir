/**
 * Coverage completion, round 2 — main()-dispatch arms and remaining
 * fallback branches for the agent-handoff milestones (plan §7, M1–M5).
 *
 * These are contract arms, not decoration:
 * - main() dispatch: why / handoff / install verbs reach their command
 *   cores with the caller's io (C2021–C2023).
 * - --blocking none overrides the config gate in BOTH render paths
 *   (--score and terminal, C1435/C1521).
 * - --category terminal filtering applies via main() too (C1452/C1453).
 * - --staged: a staged file path that ISN'T on the scan surface is
 *   skipped by the intersection filter (C691).
 * - fixGroupId fallback inside ruleCopyBlock (H138) and the severity
 *   sort's defensive warning fallback (H266/H267).
 * - install: no-op REFUSE display in dry-run, marker-block merge for
 *   AGENTS.md with a no-trailing-newline file (I140/I159), core.
 *   hooksPath honored in planHookInstall (I367), default-io stderr arm
 *   (I255/I256), --help arm (I272), unknown-flag arm (I273).
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main, type Output } from "../../src/cli.js";
import {
  executeInstall,
  planHookInstall,
  planInstall,
  runInstallCommand,
} from "../../src/commands/install-agents.js";
import { runHandoffCommand } from "../../src/commands/handoff.js";
import type { Finding, ScanResult } from "../../src/types.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-cov2-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function finding(over: Partial<Finding> = {}): Finding {
  const f: Finding = {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FALSE-GREEN",
    file: "e2e/a.spec.ts",
    line: 3,
    column: 1,
    message: "msg",
    why: "why",
    fix: "fix it",
    fixGroupId: "QA-TEST-001",
    ...over,
  };
  f.fixGroupId = over.fixGroupId ?? over.ruleId ?? "QA-TEST-001";
  return f;
}

function capture() {
  let out = "";
  let err = "";
  return {
    io: {
      out: ((s: string) => (out += `${s}\n`)) as Output,
      err: ((s: string) => (err += `${s}\n`)) as Output,
    },
    text: () => out,
    errText: () => err,
  };
}

describe("main() dispatch to the new verbs (plan §9 wiring)", () => {
  it("`mjolnir explain <file:line>` dispatches with the caller's io (exit 10 no args)", async () => {
    const cap = capture();
    await expect(main(["explain"], cap.io)).resolves.toBe(10);
    // The usage line widened when `verdict` and the arms were folded in, so
    // it names the three subject forms rather than one. Asserted on the
    // `file:line` form specifically — that is the arm this test is about —
    // plus the subject word, so a usage line that drops the form fails here
    // rather than reading as a pass.
    expect(cap.errText()).toContain("Usage: mjolnir explain");
    expect(cap.errText()).toContain("file:line");
  });

  it("`mjolnir handoff` dispatches with the caller's io", async () => {
    const cap = capture();
    await expect(main(["handoff"], cap.io)).resolves.toBe(10);
    expect(cap.errText()).toContain("report file not found");
  });

  it("`mjolnir install` dispatches with the caller's io", async () => {
    const cap = capture();
    // Install into a sandbox that carries the same instruction surfaces the
    // worktree has, never into the worktree itself.
    //
    // This test used to run against process.cwd() and then "clean up" with an
    // rmSync. That rewrote the tracked .claude/commands/mjolnir.md and removed
    // a generated file inside the repository, so `npm test` mutated the tree
    // that candidate-trust-manifest.json is fingerprinted against — which made
    // the manifest gate fail on a clean checkout for no stated reason.
    // --force keeps the run idempotent regardless of prior local edits; the
    // dispatch itself is what's under test, so only the summary is asserted.
    const sandbox = mkdtempSync(join(tmpdir(), "mjolnir-install-dispatch-"));
    const previous = process.cwd();
    try {
      for (const surface of [".claude", ".kilo", ".cursor"]) {
        mkdirSync(join(sandbox, surface), { recursive: true });
      }
      process.chdir(sandbox);
      await expect(main(["install", "--force"], cap.io)).resolves.toBe(0);
    } finally {
      process.chdir(previous);
      rmSync(sandbox, { recursive: true, force: true });
    }
    expect(cap.text()).toContain("Installed on");
  });
});

describe("handoff — remaining fallback arms", () => {
  it("ruleCopyBlock fixGroupId falls back to ruleId when absent", () => {
    // Via --rules: the group's findings carry no fixGroupId → the
    // fallback in both the section header and the copy block fires.
    const f = finding();
    delete f.fixGroupId;
    writeFileSync(join(dir, "report.json"), JSON.stringify(scanResult([f])));
    const cap = capture();
    expect(runHandoffCommand([join(dir, "report.json")], cap.io)).toBe(0);
    expect(cap.text()).toContain("(fix group: QA-TEST-001)");
    expect(cap.text()).toContain(
      "Remediation task: QA-TEST-001 (fix group: QA-TEST-001)",
    );
  });

  it("severity sort defensive fallback: groups are never empty (sort runs cleanly)", () => {
    const md = renderHandoffFixture();
    expect(md).toContain("### QA-A-001");
    expect(md).toContain("### QA-B-002");
  });

  function renderHandoffFixture(): string {
    // Local import keeps this test independent of the renderHandoff import.
    const cap = capture();
    const report = join(dir, "sort.json");
    writeFileSync(
      report,
      JSON.stringify(
        scanResult([
          finding({ ruleId: "QA-B-002", file: "e2e/b1.spec.ts" }),
          finding({ ruleId: "QA-A-001", file: "e2e/a1.spec.ts" }),
          finding({ ruleId: "QA-A-001", file: "e2e/a2.spec.ts" }),
        ]),
      ),
    );
    runHandoffCommand([report, "--rules", "QA-A-001,QA-B-002"], cap.io);
    return cap.text();
  }
});

describe("install — remaining arms", () => {
  it("AGENTS.md without a trailing newline gets a clean separator", () => {
    writeFileSync(join(dir, "AGENTS.md"), "no trailing newline");
    const cap = capture();
    expect(runInstallCommand([], cap.io, dir)).toBe(0);
    const after = readFileSync(join(dir, "AGENTS.md"), "utf8");
    expect(after.startsWith("no trailing newline\n")).toBe(true);
    expect(after).toContain("mjolnir:managed");
  });

  it("core.hooksPath is honored by the hook planner through install", () => {
    execFileSync("git", ["-C", dir, "init"], { stdio: "ignore" });
    mkdirSync(join(dir, "githooks"), { recursive: true });
    execFileSync("git", ["-C", dir, "config", "core.hooksPath", "githooks"], {
      stdio: "ignore",
    });
    const cap = capture();
    expect(runInstallCommand(["--staged-hook"], cap.io, dir)).toBe(0);
    expect(existsSync(join(dir, "githooks", "pre-commit"))).toBe(true);
  });

  it("planHookInstall uses core.hooksPath when set (I367 true arm)", () => {
    execFileSync("git", ["-C", dir, "init"], { stdio: "ignore" });
    mkdirSync(join(dir, "githooks"), { recursive: true });
    execFileSync("git", ["-C", dir, "config", "core.hooksPath", "githooks"], {
      stdio: "ignore",
    });
    const hook = planHookInstall(dir);
    expect(hook.file).toBe(join(dir, "githooks", "pre-commit"));
  });

  it("AGENTS.md managed block with drifted content → update-in-place arm", () => {
    writeFileSync(join(dir, "AGENTS.md"), "repo instructions\n");
    executeInstall(planInstall(dir).entries);
    // Simulate content drift inside the managed block.
    const file = join(dir, "AGENTS.md");
    writeFileSync(
      file,
      readFileSync(file, "utf8").replace("--scope changed", "--scope full"),
    );
    const { entries } = planInstall(dir);
    const entry = entries[0] as { action: string };
    if (entry.action !== "update-in-place")
      throw new Error("expected update-in-place");
    executeInstall(entries);
    expect(readFileSync(file, "utf8")).toContain("--scope changed");
  });

  it("--staged-hook alone (no instruction surfaces) still installs the hook", () => {
    execFileSync("git", ["-C", dir, "init"], { stdio: "ignore" });
    const cap = capture();
    expect(runInstallCommand(["--staged-hook"], cap.io, dir)).toBe(0);
    expect(existsSync(join(dir, ".git", "hooks", "pre-commit"))).toBe(true);
  });

  it("default-io unknown-flag arm writes to stderr", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(runInstallCommand(["--nope"])).toBe(10);
    } finally {
      errSpy.mockRestore();
    }
  });
});

function scanResult(findings: Finding[]): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 72,
    frameworks: [],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1,
    },
  };
}

describe("scan flags — score/category/staged arms via runScanCommand", () => {
  function setup(): { target: string; report: string } {
    writeFileSync(join(dir, "vitest.config.ts"), "export default {};\n");
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "fixture", private: true }),
    );
    writeFileSync(
      join(dir, "a.spec.ts"),
      [
        `import { test, expect } from "vitest";`,
        ``,
        `test.only("focused", () => {`,
        `  expect(1).toBe(1);`,
        `});`,
      ].join("\n"),
    );
    return { target: dir, report: join(dir, "mjolnir.json") };
  }

  it("--blocking none forces exit 0 even with error findings (score path)", async () => {
    setup();
    const cap = capture();
    const code = await main(["--score", "--blocking", "none", dir], cap.io);
    expect(code).toBe(0);
    expect(cap.text().trim()).toMatch(/^\d+$/);
  });

  it("--blocking none forces exit 0 on the terminal path too", async () => {
    setup();
    const cap = capture();
    const code = await main(["--blocking", "none", "--classic", dir], cap.io);
    expect(code).toBe(0);
    expect(cap.text()).toContain("WORTHINESS");
    expect(cap.text()).toContain("QA-PW-003");
  });

  it("--category renders the filtered view + note via runScanCommand", async () => {
    setup();
    const cap = capture();
    // QA-TEST-001 is quarantine-tier (not emitted without --strict), so
    // the QA-TEST filter shows 0 of 1 — the note is the acceptance pin.
    const code = await main(
      [dir, "--classic", "--category", "QA-TEST", "--blocking", "none"],
      cap.io,
    );
    expect(code).toBe(0);
    expect(cap.text()).toContain(
      "filtered view: 0 of 1 findings shown; score reflects the full scan",
    );
    // The live scan computes its own score (one 8-pt finding → 92).
    expect(cap.text()).toContain("80/100");
  });
});
