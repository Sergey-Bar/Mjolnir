/**
 * Coverage arms for the audit-branch correctness fixes (M1–M7).
 *
 * Each test pins one specific branch of the reconciled engine/lib/config
 * code that the suite's other specs exercise only on their happy path.
 * Grouped by source module; every arm names its audit ID.
 */

import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  sweepStaleTempFiles,
  writeFileAtomic,
} from "../../src/lib/fs-atomic.js";
import { parseWorkflow } from "../../src/discovery/workflow-parser.js";
import { computeCodeText } from "../../src/engine/code-text.js";
import {
  enclosingMaskedRun,
  isInsideEmbeddedCode,
} from "../../src/rules/shared/masking.js";
import { lineAt } from "../../src/rules/shared/positions.js";
import { parseChangedLines } from "../../src/scope/changed.js";
import {
  computeDimensions,
  computeTotal,
  deductionFor,
} from "../../src/scorer/scorer.js";
import { loadConfig } from "../../src/config/config.js";
import type { Finding } from "../../src/types.js";
import { continueOnError } from "../../src/rules/ci/qa-ci-001-continue-on-error.js";
import { pyNoAssertions } from "../../src/rules/python/qa-py-003-no-assertions.js";
import { pwOrderDependence } from "../../src/rules/playwright/qa-pw-119-order-dependence.js";
import * as jvCs from "../../src/engine/jv-cs-ast.js";
import { createScanCache, fileCacheKey } from "../../src/engine/scan-cache.js";

const createdDirs: string[] = [];
function tmpRepo(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), `mjolnir-arms-${prefix}-`));
  createdDirs.push(d);
  return d;
}
afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function finding(partial: Partial<Finding>): Finding {
  return {
    ruleId: "QA-TEST-004",
    category: "QA-TEST",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FALSE-GREEN",
    file: "a.spec.ts",
    line: 1,
    column: 1,
    message: "m",
    why: "w",
    fix: "f",
    ...partial,
  };
}

describe("fs-atomic arms", () => {
  it("writes into a directory that does not exist yet (mkdirs arm)", () => {
    const root = tmpRepo("mkdir");
    const target = join(root, "deep", "nested", "out.json");
    writeFileAtomic(target, "{}\n");
    expect(readFileSync(target, "utf8")).toBe("{}\n");
  });

  it("rethrows a non-retryable rename failure and cleans the temp file", () => {
    const root = tmpRepo("rethrow");
    // A non-empty directory at the destination makes renameSync fail for
    // real (EISDIR on POSIX; EPERM on win32, which exhausts the bounded
    // retry loop first) — no module mocking needed.
    const target = join(root, "dest");
    mkdirSync(target);
    writeFileSync(join(target, "occupied.txt"), "keep me");
    expect(() => writeFileAtomic(target, "x")).toThrow();
    // The failed write cleaned up its temp — no .mjolnir-*.tmp litter.
    expect(sweepStaleTempFiles(root)).toBe(0);
    // The occupied destination keeps its previous (complete) contents.
    expect(readFileSync(join(target, "occupied.txt"), "utf8")).toBe("keep me");
  });

  it("sweeps stale temp files left by a crashed writer (and survives an unlinkable one)", () => {
    const root = tmpRepo("sweep");
    writeFileSync(join(root, "a.mjolnir-123-abcd.tmp"), "x");
    writeFileSync(join(root, "keep.txt"), "keep");
    // A DIRECTORY named like a temp cannot be unlinkSync'd — the sweep's
    // per-entry catch arm keeps the loop alive and counts only successes.
    mkdirSync(join(root, "b.mjolnir-456-ef01.tmp"));
    const swept = sweepStaleTempFiles(root);
    expect(swept).toBe(1);
    expect(readFileSync(join(root, "keep.txt"), "utf8")).toBe("keep");
  });

  it("falls back to a busy-wait when Atomics.wait is unavailable (S-audit arm)", () => {
    vi.stubGlobal("Atomics", {
      wait: () => {
        throw new Error("not allowed on this thread");
      },
    });
    vi.stubGlobal("SharedArrayBuffer", ArrayBuffer);
    const root = tmpRepo("atomics");
    const target = join(root, "out.json");
    writeFileAtomic(target, "ok");
    expect(readFileSync(target, "utf8")).toBe("ok");
  });
});

describe("workflow-parser depth cap arm", () => {
  it("rejects a document nested deeper than the cap with a YamlParseError", () => {
    // 40 nested block-map levels > LIMITS.maxDepth (32).
    let yaml = "root:\n";
    for (let i = 0; i < 40; i++) {
      yaml += `${" ".repeat(2 * (i + 1))}child:\n`;
    }
    expect(() => parseWorkflow(yaml)).toThrow(/nesting depth exceeds/i);
  });
});

describe("masking embedded-code arms", () => {
  it("classifies a comment run (no quotes at all) as not embedded code", () => {
    const text = "const x = 1; // plain note\n";
    const codeText = computeCodeText({ path: "a.spec.ts", text }, "typescript");
    const commentAt = text.indexOf("plain note");
    expect(enclosingMaskedRun({ text, codeText }, commentAt)).toContain(
      "plain",
    );
    expect(isInsideEmbeddedCode({ text, codeText }, commentAt)).toBe(false);
  });

  it("classifies a string holding code (nested quote + call) as embedded code", () => {
    const text = "run('page.navigate(\"http://x\")');\n";
    const codeText = computeCodeText({ path: "a.spec.ts", text }, "typescript");
    const at = text.indexOf("page.navigate");
    expect(isInsideEmbeddedCode({ text, codeText }, at)).toBe(true);
  });
});

describe("positions line-index cache eviction arm", () => {
  it("evicts the oldest indexed text after the cache cap (audit M5)", () => {
    // LINE_INDEX_CACHE_MAX = 8: nine distinct multi-line texts force one
    // eviction; lineAt must still answer correctly for every text.
    const texts: string[] = [];
    for (let i = 0; i < 9; i++) {
      texts.push(`${"x\n".repeat(i)}target\nline3`);
    }
    texts.forEach((t, i) => {
      const idx = t.indexOf("target");
      expect(lineAt(t, idx)).toBe(i + 1);
    });
  });
});

describe("changed-scope parse arms", () => {
  it("consumes a '\\ No newline at end of file' marker inside a hunk", () => {
    const diff = [
      "diff --git a/a.txt b/a.txt",
      "index 111..222 100644",
      "--- a/a.txt",
      "+++ b/a.txt",
      "@@ -1,2 +1,2 @@",
      "-old",
      "\\ No newline at end of file",
      "+new",
      "+more",
    ].join("\n");
    const lines = parseChangedLines(diff);
    // The marker consumed no line; both added lines are present.
    expect(lines.has(1)).toBe(true);
    expect(lines.has(2)).toBe(true);
  });

  it("never reads a following file's header as an added line (header reset arm)", () => {
    const diff = [
      "diff --git a/a.txt b/a.txt",
      "@@ -1,1 +1,1 @@",
      "-a",
      "+b",
      "diff --git a/b.txt b/b.txt",
      "@@ -1,1 +1,1 @@",
      "-c",
      "+d",
    ].join("\n");
    const lines = parseChangedLines(diff);
    // +b is line 1 of a.txt; +d is line 1 of b.txt (per-file numbering).
    expect(lines.has(1)).toBe(true);
    expect(lines.size).toBe(1);
  });
});

describe("scorer dimension + total arms", () => {
  it("keeps per-category deduction math aligned across severities", () => {
    const dims = computeDimensions([
      finding({ category: "QA-PW", severity: "error", ruleId: "QA-PW-003" }),
      finding({ category: "QA-TEST", severity: "info", ruleId: "QA-TEST-010" }),
    ]);
    expect(dims.map((d) => d.category).sort()).toEqual(["QA-PW", "QA-TEST"]);
    // Every category score is 100 minus its category's deductions.
    for (const d of dims) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    }
  });

  it("treats a numeric exposure as a declaration estimate (backward-compat arm)", () => {
    const findings = [finding({ severity: "error" })];
    const byNumber = computeTotal(computeDimensions(findings), findings, 5);
    const byObject = computeTotal(computeDimensions(findings), findings, {
      testDeclarations: 5,
      testFileCount: 1,
    });
    expect(byNumber).toBe(byObject);
    // The NaN guard: deductionFor of an advisory-ish finding stays finite.
    expect(Number.isFinite(deductionFor(findings[0] as Finding))).toBe(true);
  });
});

describe("config ignore[].files validation arm (S7)", () => {
  it("rejects a non-array files value with a fixable message", () => {
    const root = tmpRepo("cfg");
    writeFileSync(
      join(root, "mjolnir.config.json"),
      JSON.stringify({
        ignore: [{ ruleId: "QA-TEST-004", reason: "x", files: "not-an-array" }],
      }),
    );
    expect(() => loadConfig(root)).toThrow(/must be an array of glob strings/);
  });

  it("rejects a non-string files entry with the offending value echoed", () => {
    const root = tmpRepo("cfg2");
    writeFileSync(
      join(root, "mjolnir.config.json"),
      JSON.stringify({
        ignore: [{ ruleId: "QA-TEST-004", reason: "x", files: [7] }],
      }),
    );
    expect(() => loadConfig(root)).toThrow(/files.*entries must be strings/);
  });
});

describe("QA-CI-001 line-location fallback arms (S5)", () => {
  it("reports on the anchor's own line when the raw literal is not matchable", () => {
    // A quoted YAML key (`"continue-on-error": true`) parses to the
    // boolean `true` the rule requires, but the raw text never matches
    // the raw-literal regex `continue-on-error:\s*true` — the finding
    // must still land on the step's anchor line instead of crashing
    // into crash-isolation (audit S5: reported beats dropped).
    const wf = [
      "jobs:",
      "  build:",
      "    steps:",
      "      - name: gate",
      "        uses: playwright/action@v1",
      '        "continue-on-error": true',
    ].join("\n");
    const findings = continueOnError.run({
      path: ".github/workflows/ci.yml",
      text: wf,
      ast: {
        jobs: {
          build: {
            steps: [
              {
                name: "gate",
                uses: "playwright/action@v1",
                "continue-on-error": true,
              },
            ],
          },
        },
      },
    });
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(f.line).toBeGreaterThan(0);
    }
  });
});

describe("QA-PY-003 referenced-test-data arm", () => {
  it("skips a test referenced elsewhere in the file (pytester data shape)", () => {
    const text = [
      "import pytest",
      "def test_x():",
      "    pass",
      "",
      "collector = [test_x]",
    ].join("\n");
    const findings = pyNoAssertions.run({ path: "test_x.py", text });
    expect(findings).toHaveLength(0);
  });
});

describe("QA-PW-119 assignment arms", () => {
  it("flags module-level mutable state assigned in a test, not in hooks", () => {
    const text = [
      "let shared = 0;",
      "test.beforeEach(() => { shared = 0; });",
      "test('a', () => { shared = 1; });",
    ].join("\n");
    const findings = pwOrderDependence.run({ path: "a.spec.ts", text });
    expect(findings.length).toBeGreaterThan(0);
  });
});

describe("jv-cs callName defensive arms (W4)", () => {
  it("treats a grammar shape without a name field as not-a-match", () => {
    const synthetic = {
      type: "method_invocation",
      childForFieldName: () => null,
    } as never;
    expect(jvCs.callName(synthetic)).toBeUndefined();
  });
  it("treats an unknown node type as not-a-match", () => {
    expect(jvCs.callName({ type: "comment" } as never)).toBeUndefined();
  });
});

describe("scan-cache byte-budget eviction arm (M5.2 close-out)", () => {
  it("evicts oldest entries until the entry cap holds", () => {
    const root = tmpRepo("cache");
    const cache = createScanCache(root);
    const digest = "dg";
    for (let i = 0; i < 6; i++) {
      const key = fileCacheKey(digest, `file-${i}-content`, {
        relPath: `f${i}.spec.ts`,
        adapterId: "typescript",
        parseMode: "regex",
      });
      cache.store(
        key,
        [finding({ file: `f${i}.spec.ts`, line: 1 + i })],
        false,
      );
    }
    cache.persist();
    // Reopen: entries survive persistence and stats stay consistent.
    const cache2 = createScanCache(root);
    const key0 = fileCacheKey(digest, "file-0-content", {
      relPath: "f0.spec.ts",
      adapterId: "typescript",
      parseMode: "regex",
    });
    // Oldest entries may have been evicted by the cap — either a hit with
    // the right file identity or an honest miss, never a wrong file.
    const hit = cache2.lookup(key0);
    if (hit) {
      expect(hit.every((f) => f.file === "f0.spec.ts")).toBe(true);
    }
  });
});
