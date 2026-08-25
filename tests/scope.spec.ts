/**
 * Changed-scope engine tests (Sprint-Plan W6).
 * Uses a REAL git repo in a temp dir — merge-base logic cannot be faked.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  computeChangedScope,
  filterToChanged,
  parseChangedLines,
} from "../src/scope/changed.js";
import type { Finding } from "../src/types.js";

let dir: string;

function git(args: string[], opts: { cwd?: string } = {}): void {
  execFileSync("git", ["-C", opts.cwd ?? dir, ...args], {
    stdio: "ignore",
  });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "qa-doctor-scope-"));
  git(["init", "-b", "main"]);
  git(["config", "user.email", "t@t"]);
  git(["config", "user.name", "t"]);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function commit(files: Record<string, string>, message: string): void {
  for (const [name, text] of Object.entries(files)) {
    const full = join(dir, name);
    mkdirSync(full.slice(0, full.lastIndexOf(join("")) || full.length), {
      recursive: true,
    });
    writeFileSync(full, text);
  }
  git(["add", "."]);
  git(["commit", "-m", message]);
}

describe("computeChangedScope", () => {
  it("degrades honestly outside a git repo", () => {
    const plain = mkdtempSync(join(tmpdir(), "qa-doctor-nogit-"));
    try {
      expect(computeChangedScope(plain)).toEqual({
        changed: {},
        degraded: true,
        reason: "not-a-git-repo",
      });
    } finally {
      rmSync(plain, { recursive: true, force: true });
    }
  });

  it("degrades when base branch does not exist", () => {
    commit({ "a.test.ts": "it('x');\n" }, "init");
    expect(computeChangedScope(dir, "no-such-branch")).toMatchObject({
      degraded: true,
      reason: "no-merge-base",
    });
  });

  it("attributes added lines of changed test files", () => {
    commit(
      { "old.test.ts": "it('a', () => { expect(1).toBe(1); });\n" },
      "init",
    );
    // Change HEAD away from main so merge-base differs.
    git(["checkout", "-b", "feature"]);
    writeFileSync(
      join(dir, "new.test.ts"),
      "it('b', () => {\n  expect(2).toBe(2);\n});\n",
    );
    writeFileSync(
      join(dir, "old.test.ts"),
      "it('a', () => {\n  expect(1).toBe(1);\n});\n",
    );
    git(["add", "."]);
    git(["commit", "-m", "change"]);

    const diff = computeChangedScope(dir, "main");
    expect(diff.degraded).toBe(false);
    expect(Object.keys(diff.changed).sort()).toEqual([
      "new.test.ts",
      "old.test.ts",
    ]);
    expect(diff.changed["new.test.ts"]?.size).toBeGreaterThan(0);
  });

  it("ignores non-test files entirely", () => {
    commit({ "README.md": "v1\n" }, "init");
    git(["checkout", "-b", "feature"]);
    writeFileSync(join(dir, "README.md"), "v2\n");
    writeFileSync(join(dir, "helper.ts"), "export {};\n");
    git(["add", "."]);
    git(["commit", "-m", "docs"]);

    const diff = computeChangedScope(dir, "main");
    expect(diff.degraded).toBe(false);
    expect(diff.changed).toEqual({});
  });

  it("falls back to origin/<base> then rev-parse", () => {
    commit({ "a.test.ts": "x\n" }, "init");
    git(["checkout", "-b", "feature"]);
    writeFileSync(join(dir, "b.test.ts"), "y\n");
    git(["add", "."]);
    git(["commit", "-m", "wip"]);
    // No origin remote exists → merge-base origin/main fails → rev-parse main.
    const diff = computeChangedScope(dir, "main");
    expect(diff.degraded).toBe(false);
  });

  it("handles renames as modified files", () => {
    commit({ "before.test.ts": "it('a');\n" }, "init");
    git(["checkout", "-b", "feature"]);
    git(["mv", "before.test.ts", "after.test.ts"]);
    git(["commit", "-m", "rename"]);
    const diff = computeChangedScope(dir, "main");
    expect(diff.degraded).toBe(false);
    expect(Object.keys(diff.changed)).toContain("after.test.ts");
  });
});

describe("filterToChanged", () => {
  const finding = (file: string, line: number): Finding => ({
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FALSE-GREEN",
    file,
    line,
    column: 1,
    message: "m",
    why: "w",
    fix: "f",
  });

  it("passes everything through when degraded", () => {
    const findings = [finding("a.test.ts", 1)];
    expect(filterToChanged(findings, { changed: {}, degraded: true })).toBe(
      findings,
    );
  });

  it("drops findings in unchanged files and unchanged lines", () => {
    const diff = {
      degraded: false,
      changed: { "a.test.ts": new Set([10]) },
    };
    const kept = filterToChanged(
      [finding("a.test.ts", 12), finding("b.test.ts", 5)],
      diff,
    );
    // line 12 is within the 3-line context window above? No: window is
    // [line-3, line] → 9..12 contains 10 → kept.
    expect(kept.map((f) => f.line)).toContain(12);
    expect(kept.every((f) => f.file === "a.test.ts")).toBe(true);
  });

  it("keeps findings whose exact line changed", () => {
    const diff = {
      degraded: false,
      changed: { "a.test.ts": new Set([7]) },
    };
    expect(filterToChanged([finding("a.test.ts", 7)], diff)).toHaveLength(1);
  });

  it("drops findings far below any changed line", () => {
    const diff = {
      degraded: false,
      changed: { "a.test.ts": new Set([50]) },
    };
    expect(filterToChanged([finding("a.test.ts", 3)], diff)).toHaveLength(0);
  });
});

describe("parseChangedLines", () => {
  it("extracts added line numbers from unified diffs", () => {
    const diff = [
      "--- a/f.ts",
      "+++ b/f.ts",
      "@@ -1,3 +1,4 @@",
      " context",
      "+added-1",
      "-removed",
      "+added-2",
      " context",
    ].join("\n");
    expect([...parseChangedLines(diff)].sort((a, b) => a - b)).toEqual([2, 3]);
  });

  it("returns empty set for header-only diffs", () => {
    expect(parseChangedLines("--- a\n+++ b\n")).toEqual(new Set());
  });

  it("handles hunk without count", () => {
    const out = parseChangedLines("@@ -1 +1 @@\n+only\n");
    expect([...out]).toEqual([1]);
  });
});
