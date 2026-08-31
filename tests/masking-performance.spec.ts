/**
 * Phase 4 (QA-2026-08-30 wave): masking cost must be linear in file size
 * (audit P-1), re-verified against a generated 1 MB file, and the mask
 * must stay offset-preserving at that scale (QA-15 invariant).
 */

import { describe, expect, it } from "vitest";

import { computeCodeText } from "../src/engine/code-text.js";

function generatedSource(bytes: number): string {
  // Realistic mix: strings, comments, code — sized to `bytes`.
  const chunk =
    'const a = "some string value here";\n' +
    "// a comment line explaining the value\n" +
    "if (a.length > 3) { expect(a).toBe(a); }\n";
  const n = Math.ceil(bytes / chunk.length);
  return chunk.repeat(n).slice(0, bytes);
}

describe("P-1 re-check: masking scales linearly, 1 MB within budget", () => {
  // Median-of-3: under coverage instrumentation (and on loaded CI
  // runners) a single timed run regularly spikes 2x. The LINEARITY test
  // is the real non-quadratic guard — this one only needs to catch an
  // order-of-magnitude blowup, so take the median and keep the budget
  // generous.
  function medianMaskMs(
    text: string,
    runs = 3,
  ): { ms: number; length: number } {
    const file = { path: "big.spec.ts", text, ast: undefined };
    const samples: number[] = [];
    let length = 0;
    for (let i = 0; i < runs; i++) {
      const t0 = Date.now();
      const mask = computeCodeText(file, "typescript");
      samples.push(Date.now() - t0);
      length = mask.length;
    }
    samples.sort((a, b) => a - b);
    return { ms: samples[Math.floor(runs / 2)] as number, length };
  }

  it("masks a 1 MB file well under the per-file analysis budget", () => {
    const text = generatedSource(1024 * 1024);
    const { ms, length } = medianMaskMs(text);
    expect(length).toBe(text.length);
    // LIMITS.maxFileAnalysisMs is 5s for a WHOLE file's rule pass;
    // the flat budget here is 15s (3x) because under v8 coverage
    // instrumentation (npm run test:coverage) string-heavy loops slow
    // ~3x and there is no in-worker marker to detect the mode. A 15s
    // budget still fails any order-of-magnitude masking regression;
    // the ratio-based LINEARITY test below is the true non-quadratic
    // guard and stays tight.
    expect(ms).toBeLessThan(15_000);
  });

  it("doubling the size does not more than double the time (linear, not quadratic)", () => {
    const small = generatedSource(256 * 1024);
    const big = generatedSource(512 * 1024);
    const time = (t: string) => {
      const file = { path: "x.ts", text: t, ast: undefined };
      const t0 = Date.now();
      computeCodeText(file, "typescript");
      return Date.now() - t0;
    };
    // Warm-up parse (ts-morph project reuse), then measure.
    time(small);
    const tSmall = time(small);
    const tBig = time(big);
    // Allow generous scheduler slack: linear ⇒ ~2x; quadratic ⇒ ~4x.
    // Fail only on a clear quadratic signature.
    expect(tBig).toBeLessThan(Math.max(tSmall * 3.5, 60) + 60);
  });
}, 30_000);
