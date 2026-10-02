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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Each journey step spawns the built CLI (scan/ci verify/fix); Windows
// CI runners exceed vitest's 5s default under load (reproduced
// 2026-09-01).
vi.setConfig({ testTimeout: 30_000 });

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

describe("E2E journey 3: baseline → resolve → ci verify", () => {
  it(
    "the full loop: --save-baseline captures, ci verify reports RESOLVED",
    { timeout: 60_000 },
    () => {
      writeSpec("focused.spec.ts", ONLY);
      git(["init", "-b", "main"]);
      git(["config", "user.email", "t@t"]);
      git(["config", "user.name", "t"]);

      // --strict: the debt probes are quarantine-tier (QA-TEST-001 since
      // Phase 2, QA-PW-003 core) — strict is where all tiers run.
      //
      // The exit code is the SCAN's, not the save's. The old `baseline` verb
      // returned 0 unconditionally after capturing, which meant a repo full
      // of error findings exited clean as long as you snapshotted it. A flag
      // on the scan keeps the one exit code a reader already knows: capture
      // the debt and still be told about it.
      const base = runCli([dir, "--save-baseline", "--strict"]);
      expect(base.status).toBe(1); // the .only is an error-tier finding
      expect(base.stdout).toContain("Captured");
      expect(existsSync(join(dir, ".mjolnir", "baseline.json"))).toBe(true);

      // Resolve the findings.
      writeSpec("focused.spec.ts", FIXED);

      const verify = runCli(["ci", "verify", dir, "--strict"]);
      expect(verify.status).toBe(0);
      expect(verify.stdout).toContain("VERIFY — before/after digest");
      expect(verify.stdout).toContain("RESOLVED");
      expect(verify.stdout).toContain("0 new");
    },
  );

  it(
    "ci verify reports NEW findings for debt that appeared after the baseline",
    { timeout: 60_000 },
    () => {
      writeSpec("focused.spec.ts", FIXED);
      git(["init", "-b", "main"]);
      git(["config", "user.email", "t@t"]);
      git(["config", "user.name", "t"]);
      runCli([dir, "--save-baseline", "--strict"]);
      expect(existsSync(join(dir, ".mjolnir", "baseline.json"))).toBe(true);
      writeSpec("extra-debt.spec.ts", ONLY);
      const verify = runCli(["ci", "verify", dir, "--strict"]);
      expect(verify.stdout).toContain(
        "NEW (introduced by the change under verification)",
      );
    },
  );

  it(
    "ci verify on a repo without a baseline degrades honestly (exit 2)",
    { timeout: 60_000 },
    () => {
      writeSpec("focused.spec.ts", ONLY);
      const verify = runCli(["ci", "verify", dir]);
      expect(verify.status).toBe(2);
      // The degradation must name the command that FIXES it. It used to say
      // `mjolnir baseline` — a verb removed in the v6 carve, so the recovery
      // instruction led nowhere. A degradation that cannot be recovered from
      // is a dead end dressed as an explanation.
      expect(verify.stdout).toContain("--save-baseline");
    },
  );
});

describe("E2E journey 4: fix flow", () => {
  it(
    "fix --dry-run proves without writing; fix applies and the re-scan improves",
    { timeout: 60_000 },
    () => {
      writeSpec("focused.spec.ts", ONLY);
      const before = runCli([dir, "--json"]);
      const beforeScore = (JSON.parse(before.stdout) as { score: number })
        .score;

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
    },
  );

  it(
    "fix on a clean repo says nothing to do and exits 0",
    { timeout: 60_000 },
    () => {
      writeSpec("focused.spec.ts", FIXED);
      const fix = runCli(["fix", dir]);
      expect(fix.status).toBe(0);
      expect(fix.stdout).toContain("No safe auto-fixes");
    },
  );

  it(
    "fix refuses a page.pause sharing its line and leaves the file untouched",
    { timeout: 60_000 },
    () => {
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
    },
  );
});

describe("E2E journey 4b: hard-sleep fixtures stay fix-free", () => {
  it(
    "waitForTimeout is reported by scan but has no auto-fix",
    { timeout: 60_000 },
    () => {
      writeSpec("sleep.spec.ts", HARD_SLEEP);
      const fix = runCli(["fix", dir]);
      expect(fix.status).toBe(0);
      expect(readFileSync(join(dir, "e2e", "sleep.spec.ts"), "utf8")).toBe(
        HARD_SLEEP,
      );
    },
  );
});
