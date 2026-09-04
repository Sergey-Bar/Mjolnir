/** Degraded-path coverage: explain crash, impact I/O failure, ts-ast crash. */
import { execFileSync } from "node:child_process";

const osState = vi.hoisted(() => ({ breakTmp: false }));

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return {
    ...actual,
    tmpdir: () =>
      osState.breakTmp
        ? join(actual.tmpdir(), "mjolnir-missing-root")
        : actual.tmpdir(),
  };
});
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("ts-morph", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ts-morph")>();
  return {
    ...actual,
    Project: class {
      getSourceFile(): undefined {
        return undefined;
      }
      createSourceFile(): object {
        // A parsed-looking file whose descendant walk explodes —
        // getCodeOnlyText must degrade to the raw text.
        return {
          getFilePath: () => "a.spec.ts",
          getDescendantsOfKind: () => {
            throw new Error("ts-morph exploded (simulated)");
          },
        };
      }
    },
  };
});

vi.mock("../src/engine/ts-ast.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/engine/ts-ast.js")>();
  return {
    ...actual,
    commentAndStringRanges: vi.fn(() => {
      throw new Error("comment scan exploded (simulated)");
    }),
  };
});

import { getCodeOnlyText } from "../src/engine/ts-ast.js";
import { computeImpact } from "../src/commands/impact.js";
import type { ScanResult } from "../src/types.js";

describe("ts-ast crash degradation", () => {
  it("returns the raw text when the AST pass throws", () => {
    const text = "const s = 'kept raw';";
    expect(getCodeOnlyText({ path: "a.spec.ts", text })).toBe(text);
  });
});

describe("impact degraded paths", () => {
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

  it("reports tree-materialize-failed when the base scan throws", async () => {
    const { execFileSync } = await import("node:child_process");
    const dir = realGitRepo(execFileSync);
    const report = await computeImpact(dir, {
      // Contract is async (impact.ts awaits runScan); the throwing stub
      // rejects the returned promise directly — no await-less async fn.
      runScan: () => Promise.reject(new Error("scan exploded (simulated)")),
    });
    expect(report.hasComparison).toBe(false);
    expect(report.unknownReason).toBe("tree-materialize-failed");
  });

  it("reports tree-materialize-failed when the temp dir cannot be created", async () => {
    const os = await import("node:os");
    const orig = os.tmpdir;
    const { execFileSync } = await import("node:child_process");
    const dir = realGitRepo(execFileSync);
    // Point the OS temp dir at a nonexistent root so mkdtempSync fails.
    (os as { tmpdir: () => string }).tmpdir = () => join(dir, "does-not-exist");
    try {
      const report = await computeImpact(dir, {
        runScan: () => Promise.resolve(emptyScan),
      });
      expect(report.hasComparison).toBe(false);
      expect(report.unknownReason).toBe("tree-materialize-failed");
    } finally {
      (os as { tmpdir: () => string }).tmpdir = orig;
    }
  });
});

function realGitRepo(exec: typeof execFileSync): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-impact-degraded-"));
  const git = (args: string[]) =>
    exec("git", ["-C", dir, ...args], { stdio: "ignore" });
  git(["init", "-b", "main"]);
  git(["config", "user.email", "t@t"]);
  git(["config", "user.name", "t"]);
  writeFileSync(join(dir, "a.spec.ts"), "it('a', () => {});\n");
  git(["add", "."]);
  git(["commit", "-m", "base"]);
  writeFileSync(join(dir, "b.txt"), "docs\n");
  git(["add", "."]);
  git(["commit", "-m", "second"]);
  rmSyncOnExit(dir);
  return dir;
}

const cleanupDirs: string[] = [];
function rmSyncOnExit(dir: string): void {
  cleanupDirs.push(dir);
}
process.on("exit", () => {
  for (const d of cleanupDirs) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
});
