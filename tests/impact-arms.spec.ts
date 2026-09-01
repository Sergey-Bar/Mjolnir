/**
 * Phase 1 coverage: commands/impact.ts residual arms — baseRef fallbacks
 * on degenerate repos, per-blob materialization failures, the named
 * base-tree truncation, and the honest "unknown reason" fallback in the
 * rendered report.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Each test spawns git plus the built CLI several times; Windows CI
// runners exceed vitest's 5s default under load (reproduced 2026-09-01).
vi.setConfig({ testTimeout: 30_000 });

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  const execFileSync = ((
    file: string,
    args: readonly string[],
    ...rest: unknown[]
  ) => {
    if (state.simulateBaseTree && typeof args[2] === "string") {
      if (args[2] === "ls-tree") {
        // 20_001 base paths — one over the materialization cap.
        const names: string[] = [];
        for (let i = 0; i < 20_001; i++) {
          names.push(`base-${String(i).padStart(5, "0")}.spec.ts`);
        }
        return names.join("\0");
      }
      if (args[2] === "show") {
        // Every blob fetch fails — nothing materializes, the scan of the
        // base tree is fast and empty.
        throw new Error("git show failed (simulated)");
      }
    }
    return (actual.execFileSync as unknown as (...a: unknown[]) => string)(
      file,
      args,
      ...rest,
    );
  }) as typeof actual.execFileSync;
  return { ...actual, execFileSync };
});

import { computeImpact, renderImpact } from "../src/commands/impact.js";
import type { ScanResult } from "../src/types.js";

const state = vi.hoisted(() => ({ simulateBaseTree: false }));

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-impact-arms-"));
  state.simulateBaseTree = false;
});
afterEach(() => {
  state.simulateBaseTree = false;
  rmSync(dir, { recursive: true, force: true });
});

function git(args: string[]): void {
  execFileSync("git", ["-C", dir, ...args], { stdio: "ignore" });
}

const emptyScan: ScanResult = {
  schemaVersion: 1,
  partial: false,
  score: 100,
  frameworks: [],
  frameworkDetectionUnknown: false,
  dimensions: [],
  findings: [],
  testFileCount: 0,
  testDeclarationCount: 0,
  rawDeductions: 0,
  suppressionCount: 0,
  analysisStatus: {
    discovery: "complete",
    rules: "complete",
    skippedFiles: 0,
    durationMs: 0,
    rulesCrashed: 0,
  },
};

describe("degenerate repos", () => {
  it("reports no-prior-commit for a repo with no commits", () => {
    git(["init", "-b", "main"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);
    const report = computeImpact(dir, { runScan: () => emptyScan });
    expect(report.hasComparison).toBe(false);
    expect(report.unknownReason).toBe("no-prior-commit");
  });

  it("reports tree-listing-failed when --since names an unresolvable ref", () => {
    git(["init", "-b", "main"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);
    const report = computeImpact(dir, {
      since: "HEAD~1",
      runScan: () => emptyScan,
    });
    // No commits: rev-parse HEAD~1 fails, HEAD is unresolvable, and the
    // tree listing cannot succeed — reported honestly, exit-code neutral.
    expect(report.hasComparison).toBe(false);
    expect(report.unknownReason).toBe("tree-listing-failed");
  });
});

describe("base-tree truncation (bug-audit M9)", () => {
  it("names the truncation in the report instead of misreporting new debt", () => {
    git(["init", "-b", "main"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "a.spec.ts"),
      "it('a', () => { expect(1 + 1).toBe(2); });\n",
    );
    git(["add", "."]);
    git(["commit", "-m", "base"]);
    writeFileSync(join(dir, "README.md"), "docs\n");
    git(["add", "."]);
    git(["commit", "-m", "second"]);

    state.simulateBaseTree = true;
    const report = computeImpact(dir, { runScan: () => emptyScan });
    expect(report.hasComparison).toBe(true);
    expect(report.baseTreeTruncated).toEqual({
      scanned: 20_000,
      total: 20_001,
    });
    const text = renderImpact(report);
    expect(text).toContain("base tree truncated");
    expect(text).toContain("scanned 20000 of 20001 paths");
    expect(text).toContain("misreported here as new debt");
  });
});

describe("renderImpact fallbacks", () => {
  it("renders the generic unknown-reason text when none is set", () => {
    const text = renderImpact({
      hasComparison: false,
      resolved: [],
      introduced: [],
      unknownFacts: [],
    });
    expect(text).toContain("unknown reason");
  });
});
