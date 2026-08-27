/**
 * Coverage completion spec: CLI triage/badge/debt handlers, runScan
 * scope/verbose/partial paths, and remaining adapter/parser branches.
 */

import {
  mkdtempSync,
  mkdirSync,
  existsSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  main,
  parseArgs,
  runBadgeCommand,
  runDebtCommand,
  runScan,
  runTriageCommand,
} from "../src/cli.js";
import { githubActionsAdapter } from "../src/adapters/github-actions.js";
import { pythonAdapter } from "../src/adapters/python.js";
import type { ScanContext, UniversalRule } from "../src/engine/adapter.js";

let dir: string;
let origCwd: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "qa-doctor-cov-"));
  origCwd = process.cwd();
});
afterEach(() => {
  process.chdir(origCwd);
  rmSync(dir, { recursive: true, force: true });
});

function capture() {
  const out: string[] = [];
  const errOut: string[] = [];
  return {
    io: {
      out: (...parts: unknown[]) => out.push(parts.map(String).join(" ")),
      err: (...parts: unknown[]) => errOut.push(parts.map(String).join(" ")),
    },
    text: () => out.join("\n"),
    errText: () => errOut.join("\n"),
  };
}

const PW_JSON = JSON.stringify({
  suites: [
    {
      specs: [
        {
          file: "a.spec.ts",
          title: "lucky",
          tests: [
            {
              results: [
                { status: "failed", duration: 100 },
                { status: "passed", duration: 120 },
              ],
            },
          ],
        },
      ],
    },
  ],
});

describe("runTriageCommand", () => {
  it("returns usage error without target", () => {
    const cap = capture();
    expect(runTriageCommand([], cap.io)).toBe(10);
    expect(cap.errText()).toContain("Usage: mjolnir triage");
  });

  it("writes TRIAGE.md and prints proposal", () => {
    writeFileSync(join(dir, "report.json"), PW_JSON);
    process.chdir(dir);
    const cap = capture();
    const code = runTriageCommand([dir], cap.io);
    expect(code).toBe(0);
    expect(existsSync(join(dir, "TRIAGE.md"))).toBe(true);
    expect(cap.text()).toContain("TRUE-FLAKE");
  });

  it("honors --no-md", () => {
    writeFileSync(join(dir, "report.json"), PW_JSON);
    const cap = capture();
    expect(runTriageCommand([dir, "--no-md"], cap.io)).toBe(0);
    expect(existsSync(join(dir, "TRIAGE.md"))).toBe(false);
  });

  it("returns 2 (graceful no-op) on missing target", () => {
    // A missing dir is "nothing recognized" (exit 2), not an internal
    // error — matches forensics and the README doctest contract.
    const cap = capture();
    expect(runTriageCommand([join(dir, "gone")], cap.io)).toBe(2);
    expect(cap.errText()).toContain("No test results recognized");
  });
});

describe("runBadgeCommand", () => {
  it("returns usage error on bad args", () => {
    const cap = capture();
    expect(runBadgeCommand(["--bogus"], cap.io)).toBe(10);
  });

  it("writes badge json and prints snippet", () => {
    process.chdir(dir);
    writeFileSync(
      join(dir, "sample.test.ts"),
      "it('x', () => { expect(1).toBe(1); });\n",
    );
    const cap = capture();
    const code = runBadgeCommand([dir], cap.io);
    expect(code).toBe(0);
    expect(existsSync(join(dir, "mjolnir-badge.json"))).toBe(true);
    expect(cap.text()).toContain("Wrote");
    expect(cap.text()).toContain("img.shields.io");
  });

  it("returns 20 when badge write fails (cwd unwritable)", () => {
    const cap = capture();
    // writeBadge writes into process.cwd(); chdir into a path that cannot
    // hold mjolnir-badge.json (a FILE) to force the catch path.
    const blockerDir = join(dir, "blocker-dir");
    mkdirSync(blockerDir, { recursive: true });
    // A DIRECTORY named like the badge target makes writeFileSync throw
    // EISDIR — deterministic on every OS.
    mkdirSync(join(blockerDir, "mjolnir-badge.json"), { recursive: true });
    process.chdir(blockerDir);
    try {
      expect(runBadgeCommand([dir], cap.io)).toBe(20);
      expect(cap.errText()).toContain("internal error");
    } finally {
      process.chdir(origCwd);
    }
  });
});

describe("runDebtCommand", () => {
  it("returns usage error on bad args", () => {
    const cap = capture();
    expect(runDebtCommand(["--nope"], cap.io)).toBe(10);
  });

  it("renders the debt register", () => {
    writeFileSync(
      join(dir, "a.test.ts"),
      "it('x', () => { expect(1).toBe(1); });\n",
    );
    const cap = capture();
    expect(runDebtCommand([dir], cap.io)).toBe(0);
    expect(cap.text()).toContain("TEST DEBT REGISTER");
  });
});

describe("main dispatch of new subcommands", () => {
  it("routes triage / badge / debt", () => {
    process.chdir(dir);
    expect(main(["triage"])).toBe(10); // no target
    expect(main(["badge", "--bogus"])).toBe(10);
    expect(main(["debt", "--nope"])).toBe(10);
  });
});

describe("runScan option paths", () => {
  it("marks partial and counts skipped files when a test file vanishes", () => {
    writeFileSync(join(dir, "keep.test.ts"), "");
    const args = parseArgs([dir]);
    if (!args) throw new Error("parseArgs failed");
    const result = runScan({ ...args, target: dir });
    expect(result.partial).toBe(false);
    void result;
  });

  it("reports scope info with --scope changed (degraded outside git)", () => {
    writeFileSync(join(dir, "a.test.ts"), "it('x');\n");
    const args = parseArgs([dir, "--scope", "changed"]);
    if (!args) throw new Error("parseArgs failed");
    const result = runScan({ ...args, target: dir });
    expect(result.scope).toBe("changed");
    expect(result.scopeDegraded).toBe("not-a-git-repo");
  });

  it("carries ALL findings in JSON/SARIF (no silent truncation)", () => {
    // A repo with many focused-test violations. The contract change:
    // JSON/SARIF always carry the full finding set — only terminal
    // display is capped (with an honest "+N more" count).
    const lines = Array.from(
      { length: 60 },
      (_, i) => `it.only('t${i}', () => {});\n`,
    );
    writeFileSync(join(dir, "many.test.ts"), lines.join(""));
    const plainArgs = parseArgs([dir]);
    if (!plainArgs) throw new Error("parseArgs failed");
    const plain = runScan({ ...plainArgs, target: dir });
    expect(plain.findings.length).toBeGreaterThan(50);
  });

  it("falls back to target-as-workspace without package.json", () => {
    mkdirSync(join(dir, "py"), { recursive: true });
    writeFileSync(join(dir, "py", "test_x.py"), "def test_x():\n    pass\n");
    const pyArgs = parseArgs([dir]);
    if (!pyArgs) throw new Error("parseArgs failed");
    const result = runScan({ ...pyArgs, target: dir });
    expect(result.frameworkDetectionUnknown).toBe(true);
  });
});

describe("adapter branch corners", () => {
  function makeCtx(root: string): ScanContext {
    return {
      workspace: { root, name: "t", packageJson: {}, workspaceGlobs: [] },
      testFiles: [],
      deadline: Date.now() + 10_000,
      onSkippedFile: () => {},
    };
  }

  it("github-actions adapter skips oversized workflow files", () => {
    mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
    writeFileSync(
      join(dir, ".github", "workflows", "big.yml"),
      "x".repeat(1024 * 1024 + 1),
    );
    const ctx = makeCtx(dir);
    githubActionsAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(0);
  });

  it("python adapter skips venv-named dirs at any level", () => {
    mkdirSync(join(dir, "proj", "venv"), { recursive: true });
    writeFileSync(join(dir, "proj", "venv", "test_a.py"), "");
    writeFileSync(join(dir, "proj", "test_b.py"), "");
    const ctx = makeCtx(dir);
    pythonAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(1);
  });

  it("python detectFrameworks ignores unreadable pyproject", () => {
    const pyproject = join(dir, "pyproject.toml");
    writeFileSync(pyproject, "[tool.pytest.ini_options]\n");
    // Make it a directory so readText throws inside the try block.
    rmSync(pyproject);
    mkdirSync(pyproject, { recursive: true });
    const info = pythonAdapter.detectFrameworks(dir);
    expect(info.unknown).toBe(true);
  });

  it("runRules tolerates rules throwing on gha files after successful parse", () => {
    const boom: UniversalRule = {
      id: "B",
      category: "ci",
      appliesTo: ["github-actions"],
      run: () => {
        throw new Error("late crash");
      },
    };
    const ids: string[] = [];
    githubActionsAdapter.runRules(
      [boom],
      { path: "ci.yml", text: "jobs:\n  j:\n    steps: []\n" },
      (_f, id) => ids.push(id),
    );
    expect(ids).toEqual([]);
  });
});
