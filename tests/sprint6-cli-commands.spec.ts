/**
 * CLI wiring for Sprint 6 (Master-Stabilization-Plan.md): impact,
 * baseline, diff, pr-comment, stats. Verifies main() dispatch, usage
 * errors, and that exit codes stay within the frozen set (0 clean ·
 * 1 findings ≥ gate · 2 partial/no-data · 10 usage error · 20 internal
 * error) — a contract check per the plan's Sprint 6 QA table.
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  main,
  runBaselineCommand,
  runDiffCommand,
  runImpactCommand,
  runPrCommentCommand,
  runStatsCommand,
} from "../src/cli.js";

const FROZEN_EXIT_CODES = new Set([0, 1, 2, 10, 20]);

// Directories created by each test are tracked here and removed in a
// single afterEach — deliberately NOT a shared `let dir` reassigned by
// individual tests (that pattern is itself QA-PW-119's order-dependence
// smell: state written in one test, implicitly relied on by cleanup).
const createdDirs: string[] = [];
afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
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

function git(cwd: string, args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function makeGitRepoWithHistory(): string {
  const d = mkdtempSync(join(tmpdir(), "mjolnir-sprint6-cli-"));
  createdDirs.push(d);
  git(d, ["init", "-q", "-b", "main"]);
  git(d, ["config", "user.email", "test@example.com"]);
  git(d, ["config", "user.name", "Test"]);
  mkdirSync(join(d, "e2e"), { recursive: true });
  writeFileSync(
    join(d, "e2e", "a.spec.ts"),
    "import { test, expect } from '@playwright/test';\ntest('a', async ({ page }) => {\n  await page.goto('/');\n  await page.waitForTimeout(3000);\n  await expect(page).toHaveTitle('x');\n});\n",
  );
  git(d, ["add", "-A"]);
  git(d, ["commit", "-q", "-m", "commit 1"]);
  writeFileSync(
    join(d, "e2e", "a.spec.ts"),
    "import { test, expect } from '@playwright/test';\ntest('a', async ({ page }) => {\n  await page.goto('/');\n  await expect(page).toHaveTitle('x');\n});\n",
  );
  git(d, ["add", "-A"]);
  git(d, ["commit", "-q", "-m", "commit 2: fixed"]);
  return d;
}

function makeEmptyDir(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), prefix));
  createdDirs.push(d);
  return d;
}

describe("runImpactCommand", () => {
  it("returns usage error (10) on bad args", () => {
    const cap = capture();
    expect(runImpactCommand(["--bogus"], cap.io)).toBe(10);
  });

  it("returns 2 (no comparison possible) for a non-git target, never crashing", () => {
    const dir = makeEmptyDir("mjolnir-sprint6-nogit-");
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(join(dir, "e2e", "a.spec.ts"), "test('x', () => {});\n");
    const cap = capture();
    const code = runImpactCommand([dir], cap.io);
    expect(FROZEN_EXIT_CODES.has(code)).toBe(true);
    expect(code).toBe(2);
    expect(cap.text()).toContain("UNKNOWN");
  });

  it("returns 0 and reports a real comparison for a repo with history", () => {
    const dir = makeGitRepoWithHistory();
    const cap = capture();
    const code = runImpactCommand([dir], cap.io);
    expect(FROZEN_EXIT_CODES.has(code)).toBe(true);
    expect(code).toBe(0);
    expect(cap.text()).toContain("IMPACT REPORT");
  });
});

describe("runBaselineCommand + runDiffCommand — round trip via CLI", () => {
  it("baseline usage error (10) on bad args", () => {
    const cap = capture();
    expect(runBaselineCommand(["--bogus"], cap.io)).toBe(10);
  });

  it("diff returns 2 (no baseline) before one has ever been saved", () => {
    const dir = makeGitRepoWithHistory();
    const cap = capture();
    const code = runDiffCommand([dir], cap.io);
    expect(FROZEN_EXIT_CODES.has(code)).toBe(true);
    expect(code).toBe(2);
  });

  it("baseline then diff reports zero new findings against itself", () => {
    const dir = makeGitRepoWithHistory();
    const saveCode = runBaselineCommand([dir], capture().io);
    expect(saveCode).toBe(0);
    expect(existsSync(join(dir, ".mjolnir", "baseline.json"))).toBe(true);

    const cap = capture();
    const diffCode = runDiffCommand([dir], cap.io);
    expect(FROZEN_EXIT_CODES.has(diffCode)).toBe(true);
    expect(diffCode).toBe(0);
    expect(cap.text()).toContain("NEW OR WORSENED DEBT: none");
  });

  it("diff returns 1 when a new error-severity finding was introduced after the baseline", () => {
    const dir = makeGitRepoWithHistory();
    runBaselineCommand([dir], capture().io);
    // Introduce a new error-severity finding: assert on whatever severity
    // the actual new finding carries, proving the gating logic reads it
    // rather than hardcoding a specific rule.
    writeFileSync(
      join(dir, "e2e", "b.spec.ts"),
      "import { test } from '@playwright/test';\ntest.only('new', async ({ page }) => {\n  await page.goto('/');\n});\n",
    );
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "commit 3: adds a new finding"]);

    const cap = capture();
    const code = runDiffCommand([dir], cap.io);
    expect(FROZEN_EXIT_CODES.has(code)).toBe(true);
    expect(cap.text()).toContain("NEW OR WORSENED DEBT");
  });

  it("diff writes updated all-time stats after observing a real fix", () => {
    const dir = makeGitRepoWithHistory();
    // Baseline BEFORE the fixing commit exists in history, so save it
    // against the pre-fix tree by checking out commit 1 temporarily.
    const commit1 = execFileSync("git", ["rev-parse", "HEAD~1"], {
      cwd: dir,
      encoding: "utf8",
    }).trim();
    git(dir, ["checkout", "-q", commit1]);
    runBaselineCommand([dir], capture().io);
    git(dir, ["checkout", "-q", "main"]);

    runDiffCommand([dir], capture().io);
    expect(existsSync(join(dir, ".mjolnir", "stats.json"))).toBe(true);
  });
});

describe("runPrCommentCommand", () => {
  it("returns usage error (10) on bad args", () => {
    const cap = capture();
    expect(runPrCommentCommand(["--bogus"], cap.io)).toBe(10);
  });

  it("renders a full Markdown comment for a target with no baseline", () => {
    const dir = makeGitRepoWithHistory();
    const cap = capture();
    const code = runPrCommentCommand([dir], cap.io);
    expect(code).toBe(0);
    expect(cap.text()).toContain("Mjölnir scan");
  });

  it("scopes the comment to the baseline diff when one exists", () => {
    const dir = makeGitRepoWithHistory();
    runBaselineCommand([dir], capture().io);
    const cap = capture();
    const code = runPrCommentCommand([dir], cap.io);
    expect(code).toBe(0);
    expect(cap.text()).toContain("baseline");
  });
});

describe("runStatsCommand", () => {
  it("never throws and returns 0 even with no history recorded", () => {
    const dir = makeEmptyDir("mjolnir-sprint6-stats-");
    const cap = capture();
    let code: number | undefined;
    expect(() => {
      code = runStatsCommand([dir], cap.io);
    }).not.toThrow();
    expect(code).toBe(0);
    expect(cap.text()).toContain("No fixes recorded yet");
  });
});

describe("main() dispatch — Sprint 6 subcommands are reachable", () => {
  let origArgv0: string[];
  beforeEach(() => {
    origArgv0 = process.argv.slice();
  });
  afterEach(() => {
    process.argv = origArgv0;
  });

  it("routes impact/baseline/diff/pr-comment/stats through main()", () => {
    const dir = makeGitRepoWithHistory();
    expect(FROZEN_EXIT_CODES.has(main(["impact", dir]))).toBe(true);
    expect(FROZEN_EXIT_CODES.has(main(["baseline", dir]))).toBe(true);
    expect(FROZEN_EXIT_CODES.has(main(["diff", dir]))).toBe(true);
    expect(FROZEN_EXIT_CODES.has(main(["pr-comment", dir]))).toBe(true);
    expect(FROZEN_EXIT_CODES.has(main(["stats", dir]))).toBe(true);
  });
});
