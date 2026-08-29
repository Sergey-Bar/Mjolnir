/**
 * Scale / performance floor (Test Hardening Plan, P2).
 *
 * Nothing before this asserted a ceiling on scan time for a large repo.
 * A tool marketed on "runs locally in seconds" that chokes on a
 * multi-thousand-file monorepo will get exactly that complaint as its
 * first GitHub issue. This isn't a micro-benchmark — it's a generous,
 * intentionally non-flaky regression gate: generate a synthetic repo at
 * a size a real monorepo could plausibly have, and fail only if a scan
 * takes long enough to suggest an accidental non-linear blowup (e.g. an
 * O(n²) file-list scan, or reading whole files into memory repeatedly)
 * rather than normal per-file linear work.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runScan } from "../src/cli.js";

const FILE_COUNT = 3_000;
// Generous: linear per-file work over 3k small files should land well
// under a second on CI hardware; this only trips on real superlinear
// blowups, not machine-speed variance.
const TIME_BUDGET_MS = 20_000;

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-scale-"));
  mkdirSync(join(dir, "e2e"), { recursive: true });
  for (let i = 0; i < FILE_COUNT; i++) {
    // Every 10th file carries a real finding — proves the scan isn't
    // just fast because it's finding (and doing) nothing.
    const body =
      i % 10 === 0
        ? `it.only('case ${i}', () => { expect(true).toBe(true); });\n`
        : `it('case ${i}', () => { expect(1 + ${i}).toBe(${1 + i}); });\n`;
    writeFileSync(join(dir, "e2e", `case-${i}.spec.ts`), body);
  }
}, 30_000);

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe(`scanning a synthetic ${FILE_COUNT}-file repo`, () => {
  it(
    `completes within the time budget (${TIME_BUDGET_MS}ms)`,
    () => {
      const start = performance.now();
      const result = runScan({
        target: dir,
        json: true,
        verbose: true,
        maxDurationMs: TIME_BUDGET_MS,
        scopeChanged: false,
        format: "json",
      });
      const elapsed = performance.now() - start;

      expect(
        elapsed,
        `scanning ${FILE_COUNT} files took ${elapsed.toFixed(0)}ms — ` +
          `consistent with non-linear behavior in discovery or rule ` +
          `execution, not normal per-file work.`,
      ).toBeLessThan(TIME_BUDGET_MS);
      expect(result.partial, "scan hit its own deadline and had to bail").toBe(
        false,
      );
      expect(
        result.findings.length,
        "expected real findings from the .only() files — a 0-finding fast " +
          "scan could mean discovery silently found nothing, not that it " +
          "was genuinely fast",
      ).toBeGreaterThan(0);
    },
    // Vitest's default 5000ms per-test timeout is shorter than this
    // test's own documented TIME_BUDGET_MS assertion — under CPU
    // contention (e.g. running alongside the full suite, or on a
    // loaded CI runner) the test was being killed by Vitest's timeout
    // before its own budget assertion ever ran, producing a flaky
    // "Test timed out" failure that has nothing to do with the scan
    // performance this test actually verifies. Give it real headroom
    // above its own budget instead.
    TIME_BUDGET_MS + 10_000,
  );

  it(
    "wall-clock time scales roughly linearly, not quadratically, with file count",
    () => {
      // Compare a 10% slice against the full set. Quadratic behavior
      // (e.g. re-listing the whole tree per file) shows up as the full
      // set taking dramatically more than 10x the slice's time; linear
      // behavior keeps the ratio close to the size ratio.
      const smallDir = mkdtempSync(join(tmpdir(), "mjolnir-scale-small-"));
      try {
        mkdirSync(join(smallDir, "e2e"), { recursive: true });
        const smallCount = Math.floor(FILE_COUNT / 10);
        for (let i = 0; i < smallCount; i++) {
          writeFileSync(
            join(smallDir, "e2e", `case-${i}.spec.ts`),
            `it('case ${i}', () => { expect(1).toBe(1); });\n`,
          );
        }

        const t0 = performance.now();
        runScan({
          target: smallDir,
          json: true,
          verbose: false,
          maxDurationMs: TIME_BUDGET_MS,
          scopeChanged: false,
          format: "json",
        });
        const smallElapsed = performance.now() - t0;

        const t1 = performance.now();
        runScan({
          target: dir,
          json: true,
          verbose: false,
          maxDurationMs: TIME_BUDGET_MS,
          scopeChanged: false,
          format: "json",
        });
        const fullElapsed = performance.now() - t1;

        // 10x the files should cost roughly 10x the time, not 50x+.
        // Floor the denominator so a near-instant small scan can't make
        // the ratio explode on noise alone.
        const ratio = fullElapsed / Math.max(smallElapsed, 5);
        expect(
          ratio,
          `full scan (${fullElapsed.toFixed(0)}ms) is ${ratio.toFixed(1)}x ` +
            `the 10%-slice scan (${smallElapsed.toFixed(0)}ms) — expected ` +
            `roughly linear (~10x), this ratio suggests superlinear cost.`,
        ).toBeLessThan(50);
      } finally {
        rmSync(smallDir, { recursive: true, force: true });
      }
    },
    // Same rationale as the test above: two full runScan calls under
    // contention can exceed Vitest's 5000ms default before either
    // assertion runs.
    TIME_BUDGET_MS + 10_000,
  );
});
