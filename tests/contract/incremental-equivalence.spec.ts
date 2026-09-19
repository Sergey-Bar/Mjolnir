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

import { describe, expect, it } from "vitest";

import {
  computeContentHash,
  computeChangedFiles,
  isIncrementalSafe,
  type FileSnapshot,
} from "../../src/engine/incremental-analysis.js";

describe("TI-005: incremental/full equivalence", () => {
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

    it("blocks on qa-doctor.config change", () => {
      const changed = [
        { path: "qa-doctor.config.json", state: "modified" as const },
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

    it("blocks on .qa-doctorignore change", () => {
      const changed = [
        { path: ".qa-doctorignore", state: "modified" as const },
      ];
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
          path: "src\\qa-doctor.config.json",
          state: "modified" as const,
        },
      ];
      const result = isIncrementalSafe(changed);
      expect(result.safe).toBe(false);
    });
  });
});
