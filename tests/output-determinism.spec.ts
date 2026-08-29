/**
 * Output path normalization & determinism (Test Hardening Plan).
 *
 * Two separate, market-standard guarantees for a tool whose JSON output
 * gets diffed, cached, and committed (badges, SARIF) by other systems:
 *
 *  1. `Finding.file` is documented ("Repo-relative path with forward
 *     slashes, regardless of OS") — verified for real on this actual
 *     Windows machine, not assumed from reading the type comment.
 *  2. Findings are sorted deterministically (file → line → column →
 *     ruleId per `compareFindings`) in the REAL output, not just
 *     available as an unused comparator function.
 *  3. Scanning the identical input twice produces byte-identical JSON
 *     (module load order / Map iteration order / Date.now() creeping
 *     into output would all break this).
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runScan } from "../src/cli.js";
import { compareFindings } from "../src/types.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-determinism-"));
  mkdirSync(join(dir, "e2e", "nested"), { recursive: true });
  // Multiple files/findings, deliberately created in an order that
  // differs from sorted order, so a passing test proves real sorting
  // happened rather than accidentally matching creation order.
  writeFileSync(
    join(dir, "e2e", "z-last.spec.ts"),
    "it.only('a', () => { expect(true).toBe(true); });\n",
  );
  writeFileSync(
    join(dir, "e2e", "a-first.spec.ts"),
    "it.only('b', () => { expect(true).toBe(true); });\n" +
      "it.only('c', () => { expect(true).toBe(true); });\n",
  );
  writeFileSync(
    join(dir, "e2e", "nested", "m-middle.spec.ts"),
    "it.only('d', () => { expect(true).toBe(true); });\n",
  );
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function scan() {
  return runScan({
    target: dir,
    json: true,
    verbose: true,
    maxDurationMs: 10_000,
    scopeChanged: false,
    format: "json",
  });
}

describe("Finding.file path normalization", () => {
  it("never contains a backslash, even on Windows", () => {
    const result = scan();
    expect(result.findings.length).toBeGreaterThan(0);
    for (const f of result.findings) {
      expect(f.file, `${f.file} contains a backslash`).not.toMatch(/\\/);
    }
  });

  it("is repo-relative, not an absolute path", () => {
    const result = scan();
    for (const f of result.findings) {
      expect(f.file.startsWith("/")).toBe(false);
      expect(/^[A-Za-z]:/.test(f.file)).toBe(false);
    }
  });
});

describe("finding order is deterministically sorted, not incidental", () => {
  it("real scan output is already sorted per compareFindings", () => {
    const result = scan();
    const sorted = [...result.findings].sort(compareFindings);
    expect(
      result.findings.map((f) => `${f.file}:${f.line}:${f.column}:${f.ruleId}`),
      "findings are not in compareFindings order — either the sort call " +
        "in cli.ts was removed, or something re-orders the array after " +
        "sorting.",
    ).toEqual(sorted.map((f) => `${f.file}:${f.line}:${f.column}:${f.ruleId}`));
  });
});

describe("scan determinism", () => {
  it("scanning the same input twice produces byte-identical JSON (minus timing)", () => {
    const a = scan();
    const b = scan();
    // durationMs is legitimately non-deterministic wall-clock; strip it
    // before comparing everything else byte-for-byte.
    const strip = (r: typeof a) => ({
      ...r,
      analysisStatus: { ...r.analysisStatus, durationMs: 0 },
    });
    expect(JSON.stringify(strip(a))).toBe(JSON.stringify(strip(b)));
  });
});
