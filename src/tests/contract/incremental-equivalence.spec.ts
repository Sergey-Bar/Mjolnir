/**
 * TI-005 — Incremental/full scan semantic equivalence.
 *
 * Verifies the contract in src/engine/incremental-analysis.ts:
 * when `isIncrementalSafe` returns true, a re-scan of only changed
 * files MUST produce the same aggregate verdict as a full scan.
 *
 * This test locks the structural properties:
 * - Semantic input changes are detected and block incremental safety.
 * - Pure source/test file changes allow incremental safety.
 * - Content hashing is deterministic.
 * - The safety check is order-independent.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runScan } from "../../src/engine/scan-pipeline.js";

import {
  computeContentHash,
  computeChangedFiles,
  isIncrementalSafe,
  type FileSnapshot,
} from "../../src/engine/incremental-analysis.js";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("TI-005: incremental/full equivalence", () => {
  it("cached source edits, additions and deletions match a fresh full scan", async () => {
    const directory = mkdtempSync(join(process.cwd(), ".ti005-"));
    directories.push(directory);
    const bad = `import { test, expect } from '@playwright/test';\ntest('checkout', async ({ page }) => {\n  await page.waitForTimeout(3000);\n  expect(true).toBe(true);\n});\n`;
    const clean = `import { test, expect } from '@playwright/test';\ntest('checkout', async ({ page }) => {\n  await expect(page.getByRole('heading')).toBeVisible();\n});\n`;
    writeFileSync(join(directory, "stable.spec.ts"), bad);
    writeFileSync(join(directory, "edited.spec.ts"), bad);
    writeFileSync(join(directory, "deleted.spec.ts"), bad);
    const args = {
      target: directory,
      maxDurationMs: Number.POSITIVE_INFINITY,
      json: true,
      verbose: false,
      scopeChanged: false,
      format: "json" as const,
    };
    const before = await runScan({ ...args, cache: true });
    expect(before.findings.some((f) => f.file === "deleted.spec.ts")).toBe(
      true,
    );
    writeFileSync(join(directory, "edited.spec.ts"), clean);
    writeFileSync(join(directory, "added.spec.ts"), bad);
    rmSync(join(directory, "deleted.spec.ts"));
    const incremental = await runScan({ ...args, cache: true });
    const full = await runScan({ ...args, cache: false });
    expect(incremental.cache?.hits).toBe(1);
    expect(incremental.cache?.misses).toBe(2);
    expect(incremental.findings.some((f) => f.file === "added.spec.ts")).toBe(
      true,
    );
    expect(incremental.findings.some((f) => f.file === "deleted.spec.ts")).toBe(
      false,
    );
    expect(
      incremental.findings.some(
        (f) => f.file === "edited.spec.ts" && f.ruleId === "QA-PW-101",
      ),
    ).toBe(false);
    expect(incremental.findings).toEqual(full.findings);
    expect(incremental.findings).not.toEqual(before.findings);
    expect(incremental.runIdentity).toEqual(full.runIdentity);
    expect(incremental.score).toBe(full.score);
    expect(incremental.dimensions).toEqual(full.dimensions);
    expect(incremental.rawDeductions).toBe(full.rawDeductions);
    expect(incremental.effectiveDeductions).toBe(full.effectiveDeductions);
    expect(incremental.trustSummary).toEqual(full.trustSummary);
    expect(incremental.scopeIntegrity).toEqual(full.scopeIntegrity);
    expect({ ...incremental.analysisStatus, durationMs: undefined }).toEqual({
      ...full.analysisStatus,
      durationMs: undefined,
    });
    expect(incremental.testDeclarationCount).toBe(full.testDeclarationCount);
    expect(incremental.testFileCount).toBe(full.testFileCount);
    expect(incremental.partial).toBe(false);
    expect(full.partial).toBe(false);
  });
  describe("computeContentHash", () => {
    it("produces a stable sha256 hex digest", () => {
      const hash = computeContentHash("const x = 1;\n");
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces the same hash for the same input", () => {
      const a = computeContentHash("hello world");
      const b = computeContentHash("hello world");
      expect(a).toBe(b);
    });

    it("produces different hashes for different inputs", () => {
      const a = computeContentHash("hello");
      const b = computeContentHash("world");
      expect(a).not.toBe(b);
    });
  });

  describe("computeChangedFiles", () => {
    it("detects added files", () => {
      const current: FileSnapshot[] = [
        { path: "a.ts", content: "a" },
        { path: "b.ts", content: "b" },
      ];
      const previous: FileSnapshot[] = [{ path: "a.ts", content: "a" }];
      const changed = computeChangedFiles(current, previous);
      expect(changed).toHaveLength(1);
      expect(changed[0]).toMatchObject({ path: "b.ts", state: "added" });
    });

    it("detects modified files", () => {
      const current: FileSnapshot[] = [{ path: "a.ts", content: "new" }];
      const previous: FileSnapshot[] = [{ path: "a.ts", content: "old" }];
      const changed = computeChangedFiles(current, previous);
      expect(changed).toHaveLength(1);
      expect(changed[0]).toMatchObject({ path: "a.ts", state: "modified" });
    });

    it("detects deleted files", () => {
      const current: FileSnapshot[] = [];
      const previous: FileSnapshot[] = [{ path: "a.ts", content: "a" }];
      const changed = computeChangedFiles(current, previous);
      expect(changed).toHaveLength(1);
      expect(changed[0]).toMatchObject({ path: "a.ts", state: "deleted" });
    });

    it("returns empty array for identical snapshots", () => {
      const snap: FileSnapshot[] = [
        { path: "a.ts", content: "a" },
        { path: "b.ts", content: "b" },
      ];
      expect(computeChangedFiles(snap, snap)).toHaveLength(0);
    });

    it("is order-independent (same set → same result)", () => {
      const a: FileSnapshot[] = [
        { path: "b.ts", content: "b" },
        { path: "a.ts", content: "a" },
      ];
      const b: FileSnapshot[] = [
        { path: "a.ts", content: "a" },
        { path: "b.ts", content: "b" },
      ];
      expect(computeChangedFiles(a, b)).toHaveLength(0);
    });

    it("returns results sorted by path", () => {
      const current: FileSnapshot[] = [
        { path: "z.ts", content: "z" },
        { path: "a.ts", content: "a" },
      ];
      const previous: FileSnapshot[] = [];
      const changed = computeChangedFiles(current, previous);
      expect(changed.map((c) => c.path)).toEqual(["a.ts", "z.ts"]);
    });
  });

  describe("isIncrementalSafe", () => {
    it("returns safe for pure source file changes", () => {
      const changed = [
        { path: "src/foo.ts", state: "modified" as const },
        { path: "tests/bar.spec.ts", state: "added" as const },
      ];
      const result = isIncrementalSafe(changed);
      expect(result.safe).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it("blocks on mjolnir.config change", () => {
      const changed = [
        { path: "mjolnir.config.json", state: "modified" as const },
      ];
      const result = isIncrementalSafe(changed);
      expect(result.safe).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it("blocks on package.json change", () => {
      const changed = [{ path: "package.json", state: "modified" as const }];
      const result = isIncrementalSafe(changed);
      expect(result.safe).toBe(false);
    });

    it("blocks on playwright.config change", () => {
      const changed = [
        { path: "playwright.config.ts", state: "modified" as const },
      ];
      const result = isIncrementalSafe(changed);
      expect(result.safe).toBe(false);
    });

    it("blocks on tsconfig change", () => {
      const changed = [{ path: "tsconfig.json", state: "modified" as const }];
      const result = isIncrementalSafe(changed);
      expect(result.safe).toBe(false);
    });

    it("blocks on .mjolnirignore change", () => {
      const changed = [{ path: ".mjolnirignore", state: "modified" as const }];
      const result = isIncrementalSafe(changed);
      expect(result.safe).toBe(false);
    });

    it("is case-insensitive for path matching", () => {
      const changed = [
        {
          path: "src/Package.JSON",
          state: "modified" as const,
        },
      ];
      const result = isIncrementalSafe(changed);
      expect(result.safe).toBe(false);
    });

    it("normalizes backslashes in paths", () => {
      const changed = [
        {
          path: "src\\mjolnir.config.json",
          state: "modified" as const,
        },
      ];
      const result = isIncrementalSafe(changed);
      expect(result.safe).toBe(false);
    });
  });
});
