/**
 * P0-1 · P0-5 — the coverage ratchet must fail on an incomplete run.
 *
 * `scripts/check-coverage-ratchet.mjs` read only `summary.total` and never
 * counted files. A summary covering two of 292 files reports the same
 * percentages as a complete one — in practice *higher*, because the files
 * that survive a truncated run are the easy ones — so every ratchet check
 * passed. A truncated coverage run was indistinguishable from a clean one.
 *
 * This is a gate that had never been observed red. The gate is spawned as a
 * real child process against a synthetic tree, because the defect is about
 * what the process does with the summary on disk; an in-process import would
 * not exercise `process.exit` or `process.cwd()`.
 */

import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const GATE = join(ROOT, "scripts", "check-coverage-ratchet.mjs");

const workspaces: string[] = [];

afterAll(() => {
  for (const dir of workspaces) rmSync(dir, { recursive: true, force: true });
});

/**
 * A miniature repository: `sourceCount` files under `src/`, and a coverage
 * summary covering `measuredCount` of them, all reported as fully covered.
 */
function makeTree(
  sourceCount: number,
  measuredCount: number,
  statementTotal: number,
) {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-coverage-ratchet-"));
  workspaces.push(dir);
  mkdirSync(join(dir, "src", "lib"), { recursive: true });
  mkdirSync(join(dir, "coverage"), { recursive: true });
  for (let i = 0; i < sourceCount; i += 1) {
    writeFileSync(
      join(dir, "src", "lib", `mod-${i}.ts`),
      `export const value${i} = ${i};\n`.repeat(40),
      "utf8",
    );
  }

  const covered = (statements: number) => ({
    statements: {
      total: statements,
      covered: statements,
      skipped: 0,
      pct: 100,
    },
    branches: { total: 4, covered: 4, skipped: 0, pct: 100 },
    functions: { total: 4, covered: 4, skipped: 0, pct: 100 },
    lines: { total: statements, covered: statements, skipped: 0, pct: 100 },
  });

  const summary: Record<string, unknown> = { total: covered(statementTotal) };
  const perFile = Math.max(
    1,
    Math.floor(statementTotal / Math.max(1, measuredCount)),
  );
  for (let i = 0; i < measuredCount; i += 1) {
    summary[join(dir, "src", "lib", `mod-${i}.ts`).replace(/\\/g, "/")] =
      covered(perFile);
  }
  writeFileSync(
    join(dir, "coverage", "coverage-summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );
  return dir;
}

function runGate(dir: string) {
  return spawnSync(process.execPath, [GATE], { cwd: dir, encoding: "utf8" });
}

describe("the coverage ratchet refuses a summary that measured almost nothing", () => {
  it("a two-file summary of a forty-file tree is not a pass", () => {
    const dir = makeTree(40, 2, 4000);
    const run = runGate(dir);
    expect(run.status, run.stdout + run.stderr).not.toBe(0);
    expect(run.stderr).toMatch(/incomplete/i);
    expect(run.stderr).toMatch(/file-count/);
  });

  it("the percentages are the ones a clean run would report", () => {
    // The whole point: the summary is at 100% on every axis. Only the
    // completeness guard can tell it from a real measurement.
    const dir = makeTree(40, 2, 4000);
    const summary = JSON.parse(
      readFileSync(join(dir, "coverage", "coverage-summary.json"), "utf8"),
    ) as { total: { statements: { pct: number } } };
    expect(summary.total.statements.pct).toBe(100);
    expect(runGate(dir).status).not.toBe(0);
  });

  it("a non-trivial file count is not enough when the denominator is tiny", () => {
    // 20 of 20 files measured, but 12 statements in total: the ratio arm
    // passes and the denominator arm is the only thing standing between a
    // summary of two functions and a green gate.
    const dir = makeTree(20, 20, 12);
    const run = runGate(dir);
    expect(run.status, run.stdout + run.stderr).not.toBe(0);
    expect(run.stderr).toMatch(/denominator/);
  });

  it("a complete run still passes", () => {
    const dir = makeTree(20, 20, 6000);
    const run = runGate(dir);
    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(run.stdout).toMatch(/\| file-count \| .*\| PASS \|/);
  });

  it("a missing summary fails closed rather than reporting nothing", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-coverage-empty-"));
    workspaces.push(dir);
    mkdirSync(join(dir, "src"), { recursive: true });
    mkdirSync(join(dir, "coverage"), { recursive: true });
    const run = runGate(dir);
    expect(run.status).not.toBe(0);
    expect(run.stderr).toMatch(/missing/i);
  });

  it("an unwalkable src/ is a failure, not an exemption", () => {
    const dir = makeTree(20, 20, 6000);
    rmSync(join(dir, "src"), { recursive: true, force: true });
    const run = runGate(dir);
    expect(run.status, run.stdout + run.stderr).not.toBe(0);
    expect(run.stderr).toMatch(/incomplete/i);
  });
});
