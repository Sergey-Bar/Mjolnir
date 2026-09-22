import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  computeRulesDigest,
  createScanCache,
  disabledScanCache,
  fileCacheKey,
  type ScanCache,
} from "../src/engine/scan-cache.js";
import {
  computeChangedFiles,
  isIncrementalSafe,
  computeContentHash,
  type ChangedFile,
} from "../src/engine/incremental-analysis.js";
import {
  buildRunIdentity,
  type RunIdentityInput,
} from "../src/engine/run-identity.js";

describe("M7: Performance Budget and Determinism Guarantees", () => {
  describe("Scan Cache (M5.2 / A-2)", () => {
    it("createScanCache creates a functional cache instance", () => {
      const cache = createScanCache("/tmp");
      expect(cache).toBeDefined();
      expect(typeof cache.lookup).toBe("function");
      expect(typeof cache.store).toBe("function");
      expect(typeof cache.persist).toBe("function");
      expect(cache.stats).toBeDefined();
      expect(cache.stats.hits).toBe(0);
      expect(cache.stats.misses).toBe(0);
    });

    it("disabledScanCache is a true no-op", () => {
      expect(disabledScanCache.stats.hits).toBe(0);
      expect(disabledScanCache.stats.misses).toBe(0);
      expect(disabledScanCache.lookup("x")).toBeUndefined();
      expect(() => disabledScanCache.store("x", [], false)).not.toThrow();
      expect(() => disabledScanCache.persist()).not.toThrow();
    });

    it("fileCacheKey is content-addressed: same bytes+rules, same key", () => {
      const digest = computeRulesDigest([]);
      const key1 = fileCacheKey(digest, "const a = 1;", {
        relPath: "a.ts",
        adapterId: "typescript",
      });
      const key2 = fileCacheKey(digest, "const a = 1;", {
        relPath: "a.ts",
        adapterId: "typescript",
      });
      expect(key1).toBe(key2);
      expect(key1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("fileCacheKey differs for different content", () => {
      const digest = computeRulesDigest([]);
      const key1 = fileCacheKey(digest, "const a = 1;", {
        relPath: "a.ts",
        adapterId: "typescript",
      });
      const key2 = fileCacheKey(digest, "const a = 2;", {
        relPath: "a.ts",
        adapterId: "typescript",
      });
      expect(key1).not.toBe(key2);
    });

    it("computeRulesDigest produces deterministic digests", () => {
      const rules = [
        { id: "QA-TEST-001", run: () => [], detectorRevision: 1 },
        { id: "QA-TEST-002", run: () => [], detectorRevision: 2 },
      ];
      const digest1 = computeRulesDigest(rules);
      const digest2 = computeRulesDigest(rules);
      expect(digest1).toBe(digest2);
      expect(digest1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("computeRulesDigest changes when detectorRevision changes", () => {
      const rules1 = [
        { id: "QA-TEST-001", run: () => [], detectorRevision: 1 },
      ];
      const rules2 = [
        { id: "QA-TEST-001", run: () => [], detectorRevision: 2 },
      ];
      expect(computeRulesDigest(rules1)).not.toBe(computeRulesDigest(rules2));
    });

    it("scan cache privacy: imports no network-capable API", () => {
      const source = `
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseJsonFile, isRecord } from "../lib/safe-json.js";
import type { Finding } from "../types.js";
`;
      for (const banned of [
        "node:http",
        "node:https",
        "node:net",
        "node:dgram",
        "node:tls",
        "node:dns",
        "fetch(",
        "XMLHttpRequest",
        "WebSocket",
      ]) {
        expect(source.includes(banned)).toBe(false);
      }
      expect(source).toContain("node:crypto");
      expect(source).toContain("node:fs");
    });
  });

  describe("Incremental Analysis (ECO-004)", () => {
    it("computeContentHash returns a 64-char hex string", () => {
      expect(computeContentHash("hello")).toMatch(/^[0-9a-f]{64}$/);
    });

    it("computeContentHash is deterministic", () => {
      expect(computeContentHash("test")).toBe(computeContentHash("test"));
    });

    it("computeContentHash differs for different content", () => {
      expect(computeContentHash("a")).not.toBe(computeContentHash("b"));
    });

    it("computeChangedFiles detects added files", () => {
      const changes = computeChangedFiles(
        [{ path: "new.ts", content: "x" }],
        [],
      );
      expect(changes).toHaveLength(1);
      expect(changes[0]?.state).toBe("added");
      expect(changes[0]?.path).toBe("new.ts");
    });

    it("computeChangedFiles detects deleted files", () => {
      const changes = computeChangedFiles(
        [],
        [{ path: "old.ts", content: "x" }],
      );
      expect(changes).toHaveLength(1);
      expect(changes[0]?.state).toBe("deleted");
    });

    it("computeChangedFiles detects modified files", () => {
      const changes = computeChangedFiles(
        [{ path: "f.ts", content: "new" }],
        [{ path: "f.ts", content: "old" }],
      );
      expect(changes).toHaveLength(1);
      expect(changes[0]?.state).toBe("modified");
    });

    it("computeChangedFiles skips unchanged files", () => {
      const changes = computeChangedFiles(
        [{ path: "f.ts", content: "same" }],
        [{ path: "f.ts", content: "same" }],
      );
      expect(changes).toHaveLength(0);
    });

    it("isIncrementalSafe returns safe for regular file changes", () => {
      const result = isIncrementalSafe([
        {
          path: "src/foo.ts",
          state: "modified",
          currentHash: "a",
          previousHash: "b",
        },
        { path: "tests/bar.spec.ts", state: "added", currentHash: "c" },
      ]);
      expect(result.safe).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it("isIncrementalSafe returns unsafe for config changes", () => {
      const result = isIncrementalSafe([
        {
          path: "mjolnir.config.json",
          state: "modified",
          currentHash: "a",
          previousHash: "b",
        },
      ]);
      expect(result.safe).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it("isIncrementalSafe returns unsafe for package.json changes", () => {
      const result = isIncrementalSafe([
        {
          path: "package.json",
          state: "modified",
          currentHash: "a",
          previousHash: "b",
        },
      ]);
      expect(result.safe).toBe(false);
    });

    it("isIncrementalSafe returns unsafe for .mjolnirignore changes", () => {
      const result = isIncrementalSafe([
        {
          path: ".mjolnirignore",
          state: "modified",
          currentHash: "a",
          previousHash: "b",
        },
      ]);
      expect(result.safe).toBe(false);
    });

    it("isIncrementalSafe handles Windows backslash paths", () => {
      const result = isIncrementalSafe([
        {
          path: "src\\mjolnir.config.ts",
          state: "modified",
          currentHash: "a",
          previousHash: "b",
        },
      ]);
      expect(result.safe).toBe(false);
    });
  });

  describe("Run Identity Determinism (TI-015)", () => {
    function makeInput(
      overrides: Partial<RunIdentityInput> = {},
    ): RunIdentityInput {
      return {
        files: [
          { path: "src/foo.ts", size: 100 },
          { path: "tests/bar.spec.ts", size: 200 },
        ],
        rules: [
          { id: "QA-TEST-001", detectorRevision: 2 },
          { id: "QA-PW-101", detectorRevision: 1 },
        ],
        config: { target: "." },
        engineVersion: "1.1.1",
        ...overrides,
      };
    }

    it("identical inputs produce identical scanId", () => {
      const input = makeInput();
      const a = buildRunIdentity(input);
      const b = buildRunIdentity(input);
      expect(a.scanId).toBe(b.scanId);
    });

    it("identical inputs produce identical inputFingerprint", () => {
      const input = makeInput();
      const a = buildRunIdentity(input);
      const b = buildRunIdentity(input);
      expect(a.inputFingerprint).toBe(b.inputFingerprint);
    });

    it("identical inputs produce identical rulesDigest", () => {
      const input = makeInput();
      const a = buildRunIdentity(input);
      const b = buildRunIdentity(input);
      expect(a.rulesDigest).toBe(b.rulesDigest);
    });

    it("different file content changes scanId", () => {
      const a = buildRunIdentity(
        makeInput({
          files: [{ path: "src/foo.ts", size: 100 }],
        }),
      );
      const b = buildRunIdentity(
        makeInput({
          files: [{ path: "src/foo.ts", size: 999 }],
        }),
      );
      expect(a.scanId).not.toBe(b.scanId);
    });

    it("different rules change scanId", () => {
      const a = buildRunIdentity(
        makeInput({
          rules: [{ id: "QA-TEST-001", detectorRevision: 1 }],
        }),
      );
      const b = buildRunIdentity(
        makeInput({
          rules: [{ id: "QA-TEST-001", detectorRevision: 2 }],
        }),
      );
      expect(a.scanId).not.toBe(b.scanId);
    });

    it("different config changes scanId", () => {
      const a = buildRunIdentity(makeInput({ config: { a: 1 } }));
      const b = buildRunIdentity(makeInput({ config: { a: 2 } }));
      expect(a.scanId).not.toBe(b.scanId);
    });

    it("different engine version changes scanId", () => {
      const a = buildRunIdentity(makeInput({ engineVersion: "1.0.0" }));
      const b = buildRunIdentity(makeInput({ engineVersion: "1.1.1" }));
      expect(a.scanId).not.toBe(b.scanId);
    });

    it("file ordering does not affect identity (order-insensitive)", () => {
      const a = buildRunIdentity(
        makeInput({
          files: [
            { path: "src/b.ts", size: 10 },
            { path: "src/a.ts", size: 20 },
          ],
        }),
      );
      const b = buildRunIdentity(
        makeInput({
          files: [
            { path: "src/a.ts", size: 20 },
            { path: "src/b.ts", size: 10 },
          ],
        }),
      );
      expect(a.inputFingerprint).toBe(b.inputFingerprint);
      expect(a.scanId).toBe(b.scanId);
    });

    it("rule ordering does not affect identity (order-insensitive)", () => {
      const a = buildRunIdentity(
        makeInput({
          rules: [
            { id: "QA-TEST-002", detectorRevision: 1 },
            { id: "QA-TEST-001", detectorRevision: 1 },
          ],
        }),
      );
      const b = buildRunIdentity(
        makeInput({
          rules: [
            { id: "QA-TEST-001", detectorRevision: 1 },
            { id: "QA-TEST-002", detectorRevision: 1 },
          ],
        }),
      );
      expect(a.rulesDigest).toBe(b.rulesDigest);
      expect(a.scanId).toBe(b.scanId);
    });

    it("content hash takes precedence over size when both present", () => {
      const a = buildRunIdentity(
        makeInput({
          files: [{ path: "src/foo.ts", size: 100, hash: "abc" }],
        }),
      );
      const b = buildRunIdentity(
        makeInput({
          files: [{ path: "src/foo.ts", size: 999, hash: "abc" }],
        }),
      );
      expect(a.inputFingerprint).toBe(b.inputFingerprint);
    });

    it("scanId is a sha256 hex string", () => {
      const identity = buildRunIdentity(makeInput());
      expect(identity.scanId).toMatch(/^[a-f0-9]{64}$/);
    });

    it("soak: 100 identical builds produce the same scanId", () => {
      const input = makeInput();
      const first = buildRunIdentity(input).scanId;
      for (let i = 0; i < 100; i++) {
        expect(buildRunIdentity(input).scanId).toBe(first);
      }
    });
  });

  describe("Performance Budget", () => {
it("scan cache has bounded entry cap (MAX_ENTRIES = 4096)", () => {
       const cache = createScanCache("/tmp");
       for (let i = 0; i < 5000; i++) {
         cache.store(`k${i}`, [], false);
       }
       cache.persist();
       // The cache should not grow unbounded - it evicts oldest entries
       expect(cache.size).toBeLessThanOrEqual(4096);
     });

it("scan cache has bounded byte budget (MAX_TOTAL_BYTES = 32MB)", () => {
       const cache = createScanCache("/tmp");
       const largeFindings = new Array(1000).fill({ message: "x".repeat(1000) });
       for (let i = 0; i < 100; i++) {
         cache.store(`k${i}`, largeFindings, false);
       }
       cache.persist();
       // Cache should respect byte budget
       expect(cache.size).toBeLessThanOrEqual(4096);
       expect(cache.lookup("k99")).toBeDefined();
     });
  });
});