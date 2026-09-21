/**
 * Forensics arms coverage — the directory-walk trace branch, the
 * empty-actions honest-undefined path, artifact naming, the decompressed
 * cap, the triage workflow sort, and the runtime-reconciliation hygiene
 * arms (static claims are never downgraded by the runtime).
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runForensics } from "../../src/forensics/run.js";
import { LIMITS, parseTraceNdjson } from "../../src/forensics/trace.js";
import { workflowRows } from "../../src/forensics/triage.js";
import { reconcileStaticWithRuntime } from "../../src/forensics/classify.js";
import type { ForensicsReport } from "../../src/forensics/types.js";

const createdDirs: string[] = [];
function tmpRepo(): string {
  const d = mkdtempSync(join(tmpdir(), "mjolnir-forensics-arms-"));
  createdDirs.push(d);
  return d;
}
afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

const VALID_TRACE =
  JSON.stringify({ type: "before", callId: "c1", apiName: "page.goto" }) +
  "\n" +
  JSON.stringify({ type: "after", callId: "c1", startTime: 1, endTime: 2 }) +
  "\n";

describe("runForensics — the directory trace walk", () => {
  it("a directory containing a .trace file walks the byte path and labels the source", () => {
    const dir = tmpRepo();
    writeFileSync(join(dir, "x.trace"), VALID_TRACE, "utf8");
    const { report } = runForensics(dir, { writeFlakyMd: false });
    expect(report.source).toBe("playwright-trace");
    expect(report.totalTests).toBe(1);
  });

  it("a trace whose stream carries no actions contributes nothing (continue arm)", () => {
    const dir = tmpRepo();
    writeFileSync(
      join(dir, "empty.trace"),
      JSON.stringify({ type: "version", version: 1 }) + "\n",
      "utf8",
    );
    const { report } = runForensics(dir, { writeFlakyMd: false });
    expect(report.totalTests).toBe(0);
  });

  it("a single-file trace with no actions degrades to an honest zero-record report", () => {
    const dir = tmpRepo();
    const file = join(dir, "empty.trace");
    writeFileSync(
      file,
      JSON.stringify({ type: "version", version: 1 }) + "\n",
      "utf8",
    );
    const { report } = runForensics(file, { writeFlakyMd: false });
    expect(report.totalTests).toBe(0);
    expect(report.source).toBe("playwright-trace");
  });

  it("a trace whose parent directory carries the test name is named by it", () => {
    // The walk is FLAT (forensics reads one directory level): the parent
    // directory supplies the artifact identity.
    const dir = mkdtempSync(join(tmpdir(), "checkout-spec-"));
    createdDirs.push(dir);
    writeFileSync(join(dir, "trace.trace"), VALID_TRACE, "utf8");
    const { report } = runForensics(dir, { writeFlakyMd: false });
    expect(report.totalTests).toBe(1);
    expect(report.verdicts[0]?.file).toContain("checkout-spec");
  });

  it("the decompressed-bytes cap rejects oversized streams (unbounded)", () => {
    const huge = "x".repeat(LIMITS.maxDecompressedBytes + 1);
    expect(() => parseTraceNdjson(huge)).toThrow(/decompressed bytes/);
  });
});

describe("workflowRows — the triage sort contract", () => {
  const verdict = (
    over: Record<string, unknown>,
  ): ForensicsReport["verdicts"][number] => ({
    title: "t",
    file: "e2e/a.spec.ts",
    attempts: 1,
    finalStatus: "failed",
    totalDurationMs: 100,
    passedOnRetry: false,
    everFailed: true,
    skipped: false,
    ...over,
  });

  it("passedOnRetry first, then attempts desc, then duration desc; excluded shapes dropped", () => {
    const report = {
      source: "playwright-json",
      totalTests: 5,
      verdicts: [
        verdict({ title: "plain-fail", attempts: 1 }),
        verdict({
          title: "retry",
          passedOnRetry: true,
          everFailed: true,
          attempts: 1,
          finalStatus: "passed",
        }),
        verdict({
          title: "skip",
          skipped: true,
          everFailed: false,
          finalStatus: "skipped",
        }),
        verdict({ title: "fail-3-attempts", attempts: 3, totalDurationMs: 50 }),
        verdict({
          title: "fail-2-attempts-long",
          attempts: 2,
          totalDurationMs: 500,
        }),
        verdict({
          title: "clean-pass",
          everFailed: false,
          finalStatus: "passed",
        }),
      ],
    } as unknown as ForensicsReport;
    const rows = workflowRows(report);
    expect(rows.map((r) => r.test)).toEqual([
      "retry",
      "fail-3-attempts",
      "fail-2-attempts-long",
      "plain-fail",
      "skip",
    ]);
  });
});

describe("reconcileStaticWithRuntime — hygiene-claim arms", () => {
  it("a hygiene claim (predictsFailure=false) corroborated by a passing run", () => {
    const r = reconcileStaticWithRuntime(false, "passed");
    expect(r.outcome).toBe("corroborates");
    expect(r.reconciledClassification).toBeNull();
    expect(r.staticClaimPreserved).toBe(true);
  });

  it("a failed run neither proves nor disproves a hygiene claim — insufficient", () => {
    for (const outcome of ["failed", "timedOut", "flaky"] as const) {
      const r = reconcileStaticWithRuntime(false, outcome);
      expect(r.outcome, outcome).toBe("insufficient");
      expect(r.reconciledClassification).toBeNull();
    }
  });
});
