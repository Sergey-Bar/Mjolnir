/**
 * Milestones (Sprint 9 Task 39, Master-Stabilization-Plan.md).
 *
 * A milestone is a real event `runScanCommand`/`runDiffCommand` already
 * witnesses (a flawless scan, a fix recorded by `diff`) — never a guess,
 * never fabricated. Announced exactly once per repo+machine via the same
 * `.mjolnir/stats.json` file Sprint 6 introduced. Display-only: must
 * never appear in `--json`/`--format sarif`/`--format mermaid` (machine
 * contracts) and must never change score or exit code.
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
import { afterEach, describe, expect, it } from "vitest";

import {
  main,
  runBaselineCommand,
  runDiffCommand,
  runScanCommand,
} from "../src/cli.js";
import type { StatsFile } from "../src/commands/stats.js";

const createdDirs: string[] = [];
afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function capture() {
  const out: string[] = [];
  return {
    io: {
      out: (...parts: unknown[]) => out.push(parts.map(String).join(" ")),
      err: () => {},
    },
    text: () => out.join("\n"),
  };
}

function makeCleanRepo(): string {
  const d = mkdtempSync(join(tmpdir(), "mjolnir-milestones-clean-"));
  createdDirs.push(d);
  mkdirSync(join(d, "test"), { recursive: true });
  // A genuinely clean unit test: no UI interaction (so accessibility/
  // goto-timeout rules never apply), no hard sleeps, no .only, a real
  // assertion — should score 100 with zero findings across every rule.
  writeFileSync(
    join(d, "test", "math.spec.ts"),
    "import { describe, expect, it } from 'vitest';\n\n" +
      "function add(a: number, b: number): number {\n  return a + b;\n}\n\n" +
      "describe('add', () => {\n" +
      "  it('sums two numbers', () => {\n" +
      "    expect(add(2, 3)).toBe(5);\n" +
      "  });\n" +
      "});\n",
  );
  return d;
}

function git(cwd: string, args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function makeGitRepoWithRealFix(): string {
  const d = mkdtempSync(join(tmpdir(), "mjolnir-milestones-fix-"));
  createdDirs.push(d);
  git(d, ["init", "-q", "-b", "main"]);
  git(d, ["config", "user.email", "test@example.com"]);
  git(d, ["config", "user.name", "Test"]);
  mkdirSync(join(d, "e2e"), { recursive: true });
  writeFileSync(
    join(d, "e2e", "a.spec.ts"),
    "import { test, expect } from '@playwright/test';\n" +
      "test('a', async ({ page }) => {\n" +
      "  await page.goto('/');\n" +
      "  await page.waitForTimeout(3000);\n" +
      "  await expect(page).toHaveTitle('x');\n" +
      "});\n",
  );
  git(d, ["add", "-A"]);
  git(d, ["commit", "-q", "-m", "commit 1"]);
  writeFileSync(
    join(d, "e2e", "a.spec.ts"),
    "import { test, expect } from '@playwright/test';\n" +
      "test('a', async ({ page }) => {\n" +
      "  await page.goto('/');\n" +
      "  await expect(page).toHaveTitle('x');\n" +
      "});\n",
  );
  git(d, ["add", "-A"]);
  git(d, ["commit", "-q", "-m", "commit 2: fixed the hard sleep"]);
  return d;
}

function readStats(dir: string): StatsFile {
  return JSON.parse(
    readFileSync(join(dir, ".mjolnir", "stats.json"), "utf8"),
  ) as StatsFile;
}

describe("first-clean-scan milestone", () => {
  it("does NOT write stats on an ordinary scan — read-only scans stay read-only (audit R-1)", async () => {
    const dir = makeCleanRepo();
    const cap = capture();
    const code = await runScanCommand([dir], cap.io);
    expect(code).toBe(0);
    expect(cap.text()).not.toContain("MILESTONE");
    expect(existsSync(join(dir, ".mjolnir", "stats.json"))).toBe(false);
  });

  it("announces the milestone on a genuinely flawless scan with --record-milestones", async () => {
    const dir = makeCleanRepo();
    const cap = capture();
    const code = await runScanCommand([dir, "--record-milestones"], cap.io);
    expect(code).toBe(0);
    expect(cap.text()).toContain("MILESTONE: first flawless scan");
    expect(existsSync(join(dir, ".mjolnir", "stats.json"))).toBe(true);
    expect(readStats(dir).milestonesAnnounced).toEqual(["first-clean-scan"]);
  });

  it("never re-announces the same milestone on a second recording scan", async () => {
    const dir = makeCleanRepo();
    await runScanCommand([dir, "--record-milestones"], capture().io);
    const cap = capture();
    await runScanCommand([dir, "--record-milestones"], cap.io);
    expect(cap.text()).not.toContain("MILESTONE");
  });

  it("never appears in --json output — machine contract stays exactly the schema", async () => {
    const dir = makeCleanRepo();
    const cap = capture();
    await runScanCommand([dir, "--json"], cap.io);
    expect(() => {
      JSON.parse(cap.text());
    }).not.toThrow();
    expect(cap.text()).not.toContain("MILESTONE");
  });

  it("never appears in --format sarif output", async () => {
    const dir = makeCleanRepo();
    const cap = capture();
    await runScanCommand([dir, "--format", "sarif"], cap.io);
    expect(JSON.parse(cap.text())).toHaveProperty("version", "2.1.0");
    expect(cap.text()).not.toContain("MILESTONE");
  });

  it("never appears in --format mermaid output", async () => {
    const dir = makeCleanRepo();
    const cap = capture();
    await runScanCommand([dir, "--format", "mermaid"], cap.io);
    expect(cap.text()).toMatch(/^flowchart TD/);
    expect(cap.text()).not.toContain("MILESTONE");
  });

  it("does not change the exit code for an otherwise-clean scan", async () => {
    const dir = makeCleanRepo();
    const code = await runScanCommand([dir], capture().io);
    expect(code).toBe(0);
  });
});

describe("first-debt-reduction milestone", () => {
  it("announces the milestone the first time diff witnesses a real fix", async () => {
    const dir = makeGitRepoWithRealFix();
    const commit1 = execFileSync("git", ["rev-parse", "HEAD~1"], {
      cwd: dir,
      encoding: "utf8",
    }).trim();
    git(dir, ["checkout", "-q", commit1]);
    await runBaselineCommand([dir], capture().io);
    git(dir, ["checkout", "-q", "main"]);

    const cap = capture();
    const code = await runDiffCommand([dir], cap.io);
    expect(code).toBe(0);
    expect(cap.text()).toContain("MILESTONE: first debt reduction");
    expect(readStats(dir).milestonesAnnounced).toEqual([
      "first-debt-reduction",
    ]);
  });

  it("never announces the milestone when diff has a baseline but nothing was resolved", async () => {
    const dir = makeGitRepoWithRealFix();
    await runBaselineCommand([dir], capture().io); // baseline against current (already-fixed) tree
    const cap = capture();
    await runDiffCommand([dir], cap.io);
    expect(cap.text()).not.toContain("MILESTONE");
  });

  it("does not change diff's exit code", async () => {
    const dir = makeGitRepoWithRealFix();
    const commit1 = execFileSync("git", ["rev-parse", "HEAD~1"], {
      cwd: dir,
      encoding: "utf8",
    }).trim();
    git(dir, ["checkout", "-q", commit1]);
    await runBaselineCommand([dir], capture().io);
    git(dir, ["checkout", "-q", "main"]);
    const code = await runDiffCommand([dir], capture().io);
    expect(code).toBe(0);
  });
});

describe("milestones reachable through main() dispatch", () => {
  it("a scan through main() for a flawless repo still exits clean", async () => {
    const dir = makeCleanRepo();
    const origCwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await main([])).toBe(0);
    } finally {
      process.chdir(origCwd);
    }
  });
});
