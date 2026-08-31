/**
 * E2E journeys 3+4 — the baseline loop and the fix flow, run against the
 * built binary with real git and real files.
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

import { runCli } from "./helpers.js";
import { execFileSync } from "node:child_process";

function git(args: string[]): void {
  execFileSync("git", ["-C", dir, ...args], { stdio: "ignore" });
}

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-e2e-baseline-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeSpec(name: string, body: string): void {
  mkdirSync(join(dir, "e2e"), { recursive: true });
  writeFileSync(join(dir, "e2e", name), body);
}

const ONLY = "test.only('a', () => { expect(1 + 1).toBe(2); });\n";
const FIXED = "test('a', () => { expect(1 + 1).toBe(2); });\n";
const HARD_SLEEP = [
  "import { test, expect } from '@playwright/test';",
  "test('checkout', async ({ page }) => {",
  "  await page.goto('/cart');",
  "  await page.waitForTimeout(500);",
  "  await expect(page).toHaveURL('/checkout');",
  "});",
  "",
].join("\n");

describe("E2E journey 3: baseline → resolve → diff → stats", () => {
  it("the full loop: baseline captures, resolution diff reports RESOLVED, stats increments", () => {
    writeSpec("focused.spec.ts", ONLY);
    git(["init", "-b", "main"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);

    const base = runCli(["baseline", dir]);
    expect(base.status).toBe(0);
    expect(base.stdout).toContain("Captured 2 findings");
    expect(existsSync(join(dir, ".mjolnir", "baseline.json"))).toBe(true);

    // Resolve the findings.
    writeSpec("focused.spec.ts", FIXED);

    const diff = runCli(["diff", dir]);
    expect(diff.status).toBe(0);
    expect(diff.stdout).toContain("FIXED SINCE BASELINE");

    const stats = runCli(["stats", dir]);
    expect(stats.status).toBe(0);
    expect(stats.stdout).toContain("QA-TEST-001");
  });

  it("diff reports NEW OR WORSENED DEBT for findings that appeared after the baseline", () => {
    writeSpec("focused.spec.ts", FIXED);
    git(["init", "-b", "main"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);
    const base = runCli(["baseline", dir]);
    expect(base.status).toBe(0);
    writeSpec("extra-debt.spec.ts", ONLY);
    const diff = runCli(["diff", dir]);
    expect(diff.stdout).toContain("NEW OR WORSENED DEBT");
  });

  it("diff on a repo without a baseline degrades honestly (exit 2)", () => {
    writeSpec("focused.spec.ts", ONLY);
    const diff = runCli(["diff", dir]);
    expect(diff.status).toBe(2);
    expect(diff.stdout).toContain("baseline");
  });
});

describe("E2E journey 4: fix flow", () => {
  it("fix --dry-run proves without writing; fix applies and the re-scan improves", () => {
    writeSpec("focused.spec.ts", ONLY);
    const before = runCli([dir, "--json"]);
    const beforeScore = (JSON.parse(before.stdout) as { score: number }).score;

    const dry = runCli(["fix", dir, "--dry-run"]);
    expect(dry.stdout).toContain("planned");
    expect(readFileSync(join(dir, "e2e", "focused.spec.ts"), "utf8")).toBe(
      ONLY,
    );

    const applied = runCli(["fix", dir]);
    expect(applied.stdout).toContain("applied");
    expect(readFileSync(join(dir, "e2e", "focused.spec.ts"), "utf8")).toBe(
      FIXED,
    );

    const after = runCli([dir, "--json"]);
    const afterScore = (JSON.parse(after.stdout) as { score: number }).score;
    expect(afterScore).toBeGreaterThan(beforeScore);
  });

  it("fix on a clean repo says nothing to do and exits 0", () => {
    writeSpec("focused.spec.ts", FIXED);
    const fix = runCli(["fix", dir]);
    expect(fix.status).toBe(0);
    expect(fix.stdout).toContain("No safe auto-fixes");
  });

  it("fix refuses a page.pause sharing its line and leaves the file untouched", () => {
    writeSpec(
      "pause.spec.ts",
      [
        "import { test, expect } from '@playwright/test';",
        "test('pause', async ({ page }) => {",
        "  init(); page.pause(); doThing();",
        "  await expect(page).toHaveURL('/a');",
        "});",
        "",
      ].join("\n"),
    );
    const fix = runCli(["fix", dir]);
    expect(fix.status).toBe(1);
    expect(fix.stdout).toContain("shares its line");
    expect(readFileSync(join(dir, "e2e", "pause.spec.ts"), "utf8")).toContain(
      "page.pause()",
    );
  });
});

describe("E2E journey 4b: hard-sleep fixtures stay fix-free", () => {
  it("waitForTimeout is reported by scan but has no auto-fix", () => {
    writeSpec("sleep.spec.ts", HARD_SLEEP);
    const fix = runCli(["fix", dir]);
    expect(fix.status).toBe(0);
    expect(readFileSync(join(dir, "e2e", "sleep.spec.ts"), "utf8")).toBe(
      HARD_SLEEP,
    );
  });
});
