/**
 * `mjolnir fix` safety guarantees (Test Hardening Plan).
 *
 * fix.ts already has real care built in (a verification pass per edit,
 * crash isolation on unreadable/unwritable files) — this file locks
 * those guarantees in as regression tests, plus checks the two
 * behaviors a "safe auto-fix" tool absolutely cannot get wrong:
 * dry-run must never touch disk, and running fix twice must be
 * idempotent (not double-apply or corrupt on the second pass).
 */

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runScan } from "../src/cli.js";
import { planAndApplyFixes } from "../src/commands/fix.js";

let dir: string;
const SPEC_REL = "e2e/checkout.spec.ts";
const ORIGINAL_SOURCE =
  "describe('checkout', () => {\n" +
  "  it.only('pays', () => { expect(true).toBe(true); });\n" +
  "  it('refunds', () => { expect(true).toBe(true); });\n" +
  "});\n";

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-fix-safety-"));
  mkdirSync(join(dir, "e2e"), { recursive: true });
  writeFileSync(join(dir, SPEC_REL), ORIGINAL_SOURCE);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

async function scan() {
  return runScan({
    target: dir,
    json: true,
    verbose: true,
    maxDurationMs: 10_000,
    scopeChanged: false,
    format: "json",
  });
}

describe("--dry-run never writes to disk", () => {
  it("the source file is byte-identical after a dry-run fix", async () => {
    const before = readFileSync(join(dir, SPEC_REL), "utf8");
    const results = planAndApplyFixes(await scan(), dir, { dryRun: true });
    const after = readFileSync(join(dir, SPEC_REL), "utf8");

    expect(after).toBe(before);
    // The plan should still report what WOULD have happened.
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("fix idempotency", () => {
  it("running fix twice does not corrupt the file or double-apply", async () => {
    const firstRun = planAndApplyFixes(await scan(), dir, {});
    expect(firstRun.some((r) => r.status === "applied")).toBe(true);

    const afterFirst = readFileSync(join(dir, SPEC_REL), "utf8");
    expect(afterFirst).not.toContain(".only");

    // Second run: nothing left to fix, and the file must not change.
    const secondRun = planAndApplyFixes(await scan(), dir, {});
    const afterSecond = readFileSync(join(dir, SPEC_REL), "utf8");

    expect(afterSecond).toBe(afterFirst);
    expect(secondRun.some((r) => r.status === "applied")).toBe(false);
  });

  it("the fixed file still contains the untouched, unrelated test", async () => {
    planAndApplyFixes(await scan(), dir, {});
    const after = readFileSync(join(dir, SPEC_REL), "utf8");
    expect(after).toContain("refunds");
    expect(after).toContain("expect(true).toBe(true)");
  });
});

describe("fix never touches a file it has no planned edit for", () => {
  it("a second, unrelated spec file with no fixable findings is left byte-identical", async () => {
    const cleanRel = "e2e/clean.spec.ts";
    const cleanSource =
      "it('already fine', () => { expect(1 + 1).toBe(2); });\n";
    writeFileSync(join(dir, cleanRel), cleanSource);

    planAndApplyFixes(await scan(), dir, {});

    expect(readFileSync(join(dir, cleanRel), "utf8")).toBe(cleanSource);
  });
});

describe("page.pause removal is surgical (bug-audit H1)", () => {
  const PAUSE_SOURCE =
    "import { test, expect } from '@playwright/test';\n" +
    "\n" +
    "test('pauses', async () => {\n" +
    "  init(); page.pause();\n" +
    "  await page.pause();\n" +
    "  // page.pause(); inside a comment — never a fix target\n" +
    "  expect(true).toBe(true);\n" +
    "});\n";

  async function pauseScan() {
    writeFileSync(join(dir, SPEC_REL), PAUSE_SOURCE);
    return scan();
  }

  it("a pause sharing its line with another statement is never auto-deleted — the statement survives and the fix reports a manual hint", async () => {
    // The old implementation matched /^\s*.*\bpage\.pause…/ — the leading
    // .* made `init(); page.pause();` look like a removable "pause line"
    // and silently destroyed init(). This test fails on that behavior.
    const results = planAndApplyFixes(await pauseScan(), dir, {});
    const after = readFileSync(join(dir, SPEC_REL), "utf8");

    expect(after).toContain("init(); page.pause();");
    const sharedLine = results.find((r) => r.line === 4);
    expect(sharedLine?.status).toBe("failed");
    expect(sharedLine?.description).toContain("manually");
  });

  it("only the whole-statement pause line is removed; neighboring lines — including pause mentions in comments — survive", async () => {
    const results = planAndApplyFixes(await pauseScan(), dir, {});
    const after = readFileSync(join(dir, SPEC_REL), "utf8");

    expect(after).not.toContain("await page.pause();");
    expect(after).toContain("init(); page.pause();");
    expect(after).toContain("// page.pause(); inside a comment");
    expect(after).toContain("expect(true).toBe(true);");
    expect(results.some((r) => r.status === "applied")).toBe(true);
  });
});
