/**
 * `mjolnir impact` (Master-Stabilization-Plan Sprint 6, Task 23).
 *
 * The plan's own bar: "reports UNKNOWN when data is absent — never zero,
 * never a guess. The single most important test in this sprint." Every
 * other test here exercises the comparison machinery against a real
 * fixture git repo with a known, deterministic history — no mocked git
 * output — so a regression in the actual `git` plumbing would be caught,
 * not just a regression in a mock's return value.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { computeImpact, renderImpact } from "../../src/commands/impact.js";
import { runScan } from "../../src/cli.js";

let repoDirs: string[] = [];

afterEach(() => {
  for (const dir of repoDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  }
  repoDirs = [];
});

function git(cwd: string, args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function writeSpec(dir: string, name: string, contents: string): void {
  const specDir = join(dir, "e2e");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(join(specDir, name), contents);
}

/** Builds a real, throwaway git repo with a deterministic 2-commit history. */
function makeFixtureRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-impact-fixture-"));
  repoDirs.push(dir);
  git(dir, ["init", "-q", "-b", "main"]);
  git(dir, ["config", "user.email", "test@example.com"]);
  git(dir, ["config", "user.name", "Test"]);

  // Commit 1: a test file with a real hard-sleep anti-pattern.
  writeSpec(
    dir,
    "checkout.spec.ts",
    [
      "import { test, expect } from '@playwright/test';",
      "test('checkout works', async ({ page }) => {",
      "  await page.goto('/checkout');",
      "  await page.waitForTimeout(5000);",
      "  await expect(page.locator('.total')).toBeVisible();",
      "});",
      "",
    ].join("\n"),
  );
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "commit 1: with hard sleep"]);

  // Commit 2: the hard sleep is fixed (removed); a new, unrelated finding
  // (an added it.only) is introduced so both resolved and introduced have
  // real, non-empty content to assert on.
  writeSpec(
    dir,
    "checkout.spec.ts",
    [
      "import { test, expect } from '@playwright/test';",
      "test.only('checkout works', async ({ page }) => {",
      "  await page.goto('/checkout');",
      "  await expect(page.locator('.total')).toBeVisible();",
      "});",
      "",
    ].join("\n"),
  );
  git(dir, ["add", "-A"]);
  git(dir, [
    "commit",
    "-q",
    "-m",
    "commit 2: fixed hard sleep, added focused test",
  ]);

  return dir;
}

describe("computeImpact — reports UNKNOWN when data is absent (the most important test)", () => {
  it("reports hasComparison:false with an honest reason when the target is not a git repo", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-impact-nogit-"));
    repoDirs.push(dir);
    writeSpec(dir, "a.spec.ts", "test('x', () => {});\n");

    const report = await computeImpact(dir, {
      runScan: (target) => runScan({ target, strict: true } as never),
    });

    expect(report.hasComparison).toBe(false);
    expect(report.unknownReason).toBe("not-a-git-repo");
    // Never a fabricated zero — resolved/introduced stay empty AND the
    // report explicitly says it doesn't know, rather than implying
    // "zero fixes" as a real measured fact.
    expect(report.resolved).toEqual([]);
    expect(report.introduced).toEqual([]);
    expect(report.unknownFacts.length).toBeGreaterThan(0);
  });

  it("reports hasComparison:false with an honest reason for a repo with a single commit (no prior history)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-impact-onecommit-"));
    repoDirs.push(dir);
    git(dir, ["init", "-q", "-b", "main"]);
    git(dir, ["config", "user.email", "test@example.com"]);
    git(dir, ["config", "user.name", "Test"]);
    writeSpec(dir, "a.spec.ts", "test('x', () => {});\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "only commit"]);

    const report = await computeImpact(dir, {
      runScan: (target) => runScan({ target, strict: true } as never),
    });

    expect(report.hasComparison).toBe(false);
    expect(report.unknownReason).toBe("no-prior-commit");
  });

  it("never invents an hours/CI-minutes-saved number, in any scenario", async () => {
    const dir = makeFixtureRepo();
    const report = await computeImpact(dir, {
      runScan: (target) => runScan({ target, strict: true } as never),
    });
    const joined = report.unknownFacts.join(" ").toLowerCase();
    expect(joined).toContain("not computed");
    expect(joined).not.toMatch(/\d+\s*(hours?|minutes?)\s*saved/);
  });

  it("renderImpact always prefixes unknown facts with UNKNOWN: literally, in every scenario", async () => {
    const dir = makeFixtureRepo();
    const report = await computeImpact(dir, {
      runScan: (target) => runScan({ target, strict: true } as never),
    });
    const rendered = renderImpact(report);
    expect(rendered).toContain("UNKNOWN:");
  });
});

describe("computeImpact — real comparison against a fixture git history", () => {
  it("finds the resolved hard-sleep finding and the newly introduced focused-test finding", async () => {
    const dir = makeFixtureRepo();
    const report = await computeImpact(dir, {
      runScan: (target) => runScan({ target, strict: true } as never),
    });

    expect(report.hasComparison).toBe(true);
    expect(report.baseRef).toBeTruthy();
    expect(report.headRef).toBeTruthy();

    const resolvedIds = report.resolved.map((f) => f.ruleId);
    const introducedIds = report.introduced.map((f) => f.ruleId);

    expect(resolvedIds).toContain("QA-PW-101"); // hard sleep, removed
    expect(introducedIds).toContain("QA-TEST-001"); // focused test, added
  });

  it("is deterministic across repeated runs against the same history", async () => {
    const dir = makeFixtureRepo();
    const runOnce = () =>
      computeImpact(dir, {
        runScan: (target) => runScan({ target, strict: true } as never),
      });
    const first = await runOnce();
    const second = await runOnce();
    expect(first.resolved).toEqual(second.resolved);
    expect(first.introduced).toEqual(second.introduced);
  });

  it("honors an explicit --since ref pointing further back", async () => {
    const dir = makeFixtureRepo();
    const firstCommit = execFileSync(
      "git",
      ["log", "--format=%H", "--reverse"],
      { cwd: dir, encoding: "utf8" },
    )
      .trim()
      .split("\n")[0];
    if (!firstCommit) throw new Error("expected at least one commit");

    const report = await computeImpact(dir, {
      since: firstCommit,
      runScan: (target) => runScan({ target, strict: true } as never),
    });
    expect(report.hasComparison).toBe(true);
    expect(report.baseRef).toBe(firstCommit);
  });

  it("reports base-equals-head honestly when --since points at HEAD itself", async () => {
    const dir = makeFixtureRepo();
    const head = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: dir,
      encoding: "utf8",
    }).trim();

    const report = await computeImpact(dir, {
      since: head,
      runScan: (target) => runScan({ target, strict: true } as never),
    });
    expect(report.hasComparison).toBe(false);
    expect(report.unknownReason).toBe("base-equals-head");
  });

  it("reports tree-listing-failed honestly for a --since ref that does not exist", async () => {
    const dir = makeFixtureRepo();
    const report = await computeImpact(dir, {
      since: "not-a-real-ref-xyz",
      runScan: (target) => runScan({ target, strict: true } as never),
    });
    expect(report.hasComparison).toBe(false);
    // git rev-parse on an unresolvable ref returns null, so the raw
    // string is kept as baseRef and ls-tree against it then fails too.
    expect(["tree-listing-failed", "no-prior-commit"]).toContain(
      report.unknownReason,
    );
  });

  it("renders 'none found' honestly, distinctly from UNKNOWN, when a real comparison found zero resolved fixes", async () => {
    const dir = makeFixtureRepo();
    // Compare HEAD against itself's own tree via an intermediate commit
    // with genuinely nothing fixed: add a third commit that changes
    // nothing rule-relevant, then compare it against the prior commit.
    writeSpec(
      dir,
      "unrelated.spec.ts",
      "import { test, expect } from '@playwright/test';\ntest('noop', async ({ page }) => {\n  await expect(page).toHaveTitle('x');\n});\n",
    );
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "commit 3: unrelated clean addition"]);

    const report = await computeImpact(dir, {
      runScan: (target) => runScan({ target, strict: true } as never),
    });
    expect(report.hasComparison).toBe(true);
    expect(report.resolved).toEqual([]);
    expect(renderImpact(report)).toContain("FIXED SINCE BASE: none found.");
  });
});
