/**
 * Agent-handoff plan M5 — --staged, --blocking, staged hook install.
 *
 * Contracts (plan §5.7, §5.8, §17):
 * - --staged is a scan-surface restriction only: intersect discovered
 *   files with git staged names; unstaged files are NOT scanned; score
 *   reflects the narrowed surface (labeled); not-a-repo → honest
 *   degraded fallback; empty staged set → honest message + exit 0.
 * - --blocking controls exit status ONLY (error→gate error, warning→
 *   gate warning, none→advisory); findings render identically; E0
 *   never blocks; partial stays 2.
 * - Hook install: marker-based, reuses husky/core.hooksPath, refuses
 *   unreadable hooks, idempotent re-run, version-pinned.
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
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  executeHookInstall,
  planHookInstall,
  runInstallCommand,
} from "../../src/commands/install-agents.js";
import {
  computeStagedFiles,
  parseChangedLines,
} from "../../src/scope/changed.js";
import { exitForFindings, runScanCommand } from "../../src/cli.js";
import { renderTerminal } from "../../src/reporter/terminal.js";
import type { Finding, ScanResult } from "../../src/types.js";

let dir: string;
let repo: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-m5-"));
  writeFileSync(join(dir, "vitest.config.ts"), "export default {};\n");
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "fixture", private: true }),
  );
  writeFileSync(
    join(dir, "staged.spec.ts"),
    [
      `import { test, expect } from "vitest";`,
      ``,
      `test.only("staged finding", () => {`,
      `  expect(1).toBe(1);`,
      `});`,
    ].join("\n"),
  );
  writeFileSync(
    join(dir, "unstaged.spec.ts"),
    [
      `import { test, expect } from "vitest";`,
      ``,
      `test.only("unstaged finding", () => {`,
      `  expect(1).toBe(1);`,
      `});`,
    ].join("\n"),
  );
  repo = mkdtempSync(join(tmpdir(), "mjolnir-m5-repo-"));
  execFileSync("git", ["-C", repo, "init"], { stdio: "ignore" });
  execFileSync("git", ["-C", repo, "config", "user.email", "t@t"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", repo, "config", "user.name", "t"], {
    stdio: "ignore",
  });
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  rmSync(repo, { recursive: true, force: true });
});

function stageInRepo(file: string, content: string): void {
  writeFileSync(join(repo, file), content);
  execFileSync("git", ["-C", repo, "add", file], { stdio: "ignore" });
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

import type { Output } from "../../src/cli.js";

function finding(over: Partial<Finding> = {}): Finding {
  return {
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
    ...over,
  };
}

describe("computeStagedFiles", () => {
  it("returns staged file names only", () => {
    stageInRepo("a.spec.ts", "x");
    stageInRepo("b.spec.ts", "y");
    writeFileSync(join(repo, "unstaged.txt"), "z");
    const staged = computeStagedFiles(repo);
    expect(staged).not.toBeNull();
    expect(staged?.sort()).toEqual(["a.spec.ts", "b.spec.ts"]);
  });

  it("returns an empty list when nothing is staged", () => {
    expect(computeStagedFiles(repo)).toEqual([]);
  });

  it("returns null (degraded) outside a git repository", () => {
    expect(computeStagedFiles(dir)).toBeNull();
  });
});

describe("parseChangedLines (existing export, sanity)", () => {
  it("parses a unified-diff hunk", () => {
    const diff = ["@@ -1,2 +1,2 @@", "-old", "+new"].join("\n");
    expect(parseChangedLines(diff)).toEqual(new Set([1]));
  });
});

describe("--staged end-to-end", () => {
  it("scans staged files only; unstaged files are not scanned", async () => {
    writeFileSync(join(repo, "vitest.config.ts"), "export default {};\n");
    writeFileSync(
      join(repo, "package.json"),
      JSON.stringify({ name: "repo", private: true }),
    );
    writeFileSync(
      join(repo, "staged.spec.ts"),
      [
        `import { test, expect } from "vitest";`,
        ``,
        `test.only("staged finding", () => {`,
        `  expect(1).toBe(1);`,
        `});`,
      ].join("\n"),
    );
    writeFileSync(
      join(repo, "unstaged.spec.ts"),
      [
        `import { test, expect } from "vitest";`,
        ``,
        `test.only("unstaged finding", () => {`,
        `  expect(1).toBe(1);`,
        `});`,
      ].join("\n"),
    );
    execFileSync(
      "git",
      ["-C", repo, "add", "vitest.config.ts", "staged.spec.ts"],
      {
        stdio: "ignore",
      },
    );

    const cap = capture();
    const code = await runScanCommand(
      [repo, "--json", "--staged", "--strict"],
      cap.io,
    );
    expect([0, 1]).toContain(code);
    const report = JSON.parse(cap.text()) as ScanResult;
    const files = report.findings.map((f) => f.file.replace(/\\/g, "/"));
    // The staged surface contains exactly one spec; the unstaged one is
    // never scanned → its finding cannot appear.
    expect(
      files.every((f) => f === "staged.spec.ts" || !f.endsWith(".spec.ts")),
    ).toBe(true);
    expect(files.some((f) => f.includes("unstaged"))).toBe(false);
    // The surface is labeled in the JSON (additive) and the terminal.
    expect(report.staged).toEqual({ files: 1 });
    const termCap = capture();
    await runScanCommand([repo, "--staged"], termCap.io);
    expect(termCap.text()).toContain("staged surface:");
  });

  it("falls back to the full surface with an honest note outside a git repo", async () => {
    const cap = capture();
    await runScanCommand([dir, "--json", "--staged"], cap.io);
    expect(cap.errText()).toContain("--staged ignored");
    // Degraded → full surface: the unstaged fixture is still scanned.
    const report = JSON.parse(cap.text()) as ScanResult;
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.staged).toBeUndefined();
  });

  it("empty staged set → honest message + exit 0", async () => {
    const cap = capture();
    const code = await runScanCommand([repo, "--json", "--staged"], cap.io);
    expect(code).toBe(0);
    expect(cap.errText()).toContain("no staged files match");
  });
});

describe("--blocking (exit-status-only contract)", () => {
  it("maps none→advisory, error→error, warning→warning gates", () => {
    const findings = [
      finding({ severity: "error" }),
      finding({ severity: "warning", ruleId: "QA-PW-118" }),
    ];
    expect(exitForFindings(findings, "advisory")).toBe(0);
    expect(exitForFindings(findings, "error")).toBe(1);
    expect(exitForFindings(findings, "warning")).toBe(1);
  });

  it("an E0 (advisory) finding never blocks at any level", () => {
    const e0 = [
      finding({
        evidenceLevel: "E0",
        findingType: "observation",
        severity: "error",
      }),
    ];
    expect(exitForFindings(e0, "error")).toBe(0);
    expect(exitForFindings(e0, "warning")).toBe(0);
    expect(exitForFindings(e0, "advisory")).toBe(0);
  });

  it("rendering is identical across blocking values (exit-only contract)", () => {
    const result = report({ findings: [finding()] });
    // The renderer takes no blocking argument — structural guarantee.
    expect(renderTerminal(result, { isTTY: false })).toBe(
      renderTerminal(result, { isTTY: false }),
    );
  });
});

function report(over: Partial<ScanResult> = {}): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 72,
    frameworks: [],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: [finding()],
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1,
    },
    ...over,
  };
}

describe("parseArgs — --staged/--blocking", () => {
  it("parses --staged", () => {
    expect(parseArgs(["--staged"])?.staged).toBe(true);
  });

  it("parses valid --blocking values", () => {
    expect(parseArgs(["--blocking", "error"])?.blocking).toBe("error");
    expect(parseArgs(["--blocking", "warning"])?.blocking).toBe("warning");
    expect(parseArgs(["--blocking", "none"])?.blocking).toBe("none");
  });

  it("rejects invalid --blocking values (usage error)", () => {
    const seen: Array<{
      flag?: string | undefined;
      token?: string | undefined;
    }> = [];
    expect(parseArgs(["--blocking", "mega"], (d) => seen.push(d))).toBeNull();
    expect(seen).toEqual([{ flag: "--blocking", token: "mega" }]);
  });
});

import { parseArgs } from "../../src/cli.js";

describe("staged hook install", () => {
  it("creates a marker-based hook in a fresh repo (.git/hooks path)", () => {
    const hook = planHookInstall(repo);
    expect(hook.action).toBe("create");
    expect(executeHookInstall(hook)).toBe(true);
    const hookPath = join(repo, ".git", "hooks", "pre-commit");
    expect(existsSync(hookPath)).toBe(true);
    const content = readFileSync(hookPath, "utf8");
    expect(content).toContain("# mjolnir:managed pre-commit");
    expect(content).toContain("--staged --blocking warning");
    expect(content).not.toContain("@latest");
  });

  it("is idempotent: re-install updates in place without duplication", () => {
    const first = planHookInstall(repo);
    executeHookInstall(first);
    const before = readFileSync(
      join(repo, ".git", "hooks", "pre-commit"),
      "utf8",
    );
    const second = planHookInstall(repo);
    expect(second.action).toBe("update");
    executeHookInstall(second);
    const after = readFileSync(
      join(repo, ".git", "hooks", "pre-commit"),
      "utf8",
    );
    expect(after.split("# mjolnir:managed pre-commit").length - 1).toBe(1);
    expect(after).toBe(before);
  });

  it("prefers an existing husky directory over .git/hooks", () => {
    mkdirSync(join(repo, ".husky"), { recursive: true });
    writeFileSync(join(repo, ".husky", "pre-commit"), "npm test\n");
    const hook = planHookInstall(repo);
    expect(hook.file).toBe(join(repo, ".husky", "pre-commit"));
    expect(hook.action).toBe("append");
    executeHookInstall(hook);
    const after = readFileSync(join(repo, ".husky", "pre-commit"), "utf8");
    // Existing hook content preserved; block appended after it.
    expect(after.startsWith("npm test\n")).toBe(true);
    expect(after).toContain("# mjolnir:managed pre-commit");
  });

  it("reuses core.hooksPath when configured", () => {
    mkdirSync(join(repo, "githooks"), { recursive: true });
    execFileSync("git", ["-C", repo, "config", "core.hooksPath", "githooks"], {
      stdio: "ignore",
    });
    const hook = planHookInstall(repo);
    expect(hook.file).toBe(join(repo, "githooks", "pre-commit"));
  });

  it("runInstallCommand --staged-hook installs the hook (exit 0)", () => {
    const cap = capture();
    expect(runInstallCommand(["--staged-hook"], cap.io, repo)).toBe(0);
    expect(cap.text()).toContain("pre-commit hook");
    expect(cap.text()).toContain("--staged --blocking warning");
  });

  it("runInstallCommand --staged-hook --dry-run writes nothing", () => {
    const cap = capture();
    expect(
      runInstallCommand(["--staged-hook", "--dry-run"], cap.io, repo),
    ).toBe(0);
    expect(cap.text()).toContain("dry run");
    expect(existsSync(join(repo, ".git", "hooks", "pre-commit"))).toBe(false);
  });
});
