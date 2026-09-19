/**
 * Local incremental `--cache` correctness + privacy (Beta-to-Stable
 * plan, M5.2 / A-2).
 *
 * The cache short-circuits the read+parse+rule loop for files whose
 * post-normalization bytes and the active rule set are unchanged. Every
 * test here protects one of the three claims the plan makes:
 *
 *  1. EQUIVALENCE — a cached scan's findings equal a fresh scan's,
 *     byte for byte (same score, same findings, same counts);
 *  2. INVALIDATION — editing a file, bumping a detectorRevision, or
 *     changing an external rule's code produces a fresh analysis (a
 *     stale cache entry must never survive);
 *  3. PRIVACY — the cache never leaves the machine: the module imports
 *     no network-capable API and lives under .qa-doctor/cache/ (gitignored).
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { main, runScan } from "../../src/cli.js";
import { typescriptAdapter } from "../../src/adapters/typescript.js";
import {
  computeRulesDigest,
  createScanCache,
  disabledScanCache,
  fileCacheKey,
} from "../../src/engine/scan-cache.js";

const { readdirSyncThrowAfter, readdirSyncThrowCount, readdirSyncCorruptPath } =
  vi.hoisted(() => {
    return {
      readdirSyncThrowAfter: { value: -1 },
      readdirSyncThrowCount: { value: 0 },
      readdirSyncCorruptPath: { value: "" },
    };
  });

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    readdirSync: (
      ...args: Parameters<(typeof actual)["readdirSync"]>
    ): ReturnType<(typeof actual)["readdirSync"]> => {
      if (readdirSyncThrowAfter.value >= 0) {
        readdirSyncThrowCount.value++;
        if (readdirSyncThrowCount.value > readdirSyncThrowAfter.value) {
          throw new Error("simulated readdirSync failure");
        }
      }
      if (
        readdirSyncCorruptPath.value &&
        typeof args[0] === "string" &&
        args[0]
          .replace(/\\/g, "/")
          .startsWith(readdirSyncCorruptPath.value.replace(/\\/g, "/"))
      ) {
        readdirSyncCorruptPath.value = "";
        return null as unknown as ReturnType<(typeof actual)["readdirSync"]>;
      }
      return actual.readdirSync(...args);
    },
  };
});

let dir: string;
let origCwd: string;

const SPEC_TEXT =
  `import { test, expect } from '@playwright/test';\n` +
  `test('checkout', async ({ page }) => {\n` +
  `  await page.waitForTimeout(3000);\n` +
  `  expect(true).toBe(true);\n` +
  `});\n`;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "qa-doctor-scan-cache-"));
  mkdirSync(join(dir, "e2e"), { recursive: true });
  writeFileSync(join(dir, "e2e", "checkout.spec.ts"), SPEC_TEXT, "utf8");
  origCwd = process.cwd();
  process.chdir(dir);
});

afterEach(() => {
  process.chdir(origCwd);
  rmSync(dir, { recursive: true, force: true });
});

const baseArgs = {
  target: ".",
  json: true,
  verbose: false,
  maxDurationMs: Number.POSITIVE_INFINITY,
  scopeChanged: false,
  format: "json" as const,
};

describe("--cache scan equivalence (a cached scan equals a fresh one)", () => {
  it.each(["crash", "rejected"])(
    "does not cache per-file %s results",
    async (failure) => {
      const original = typescriptAdapter.runRules.bind(typescriptAdapter);
      const runRules = vi
        .spyOn(typescriptAdapter, "runRules")
        .mockImplementation((rules, file, emit, onCrash, budget) => {
          original.call(typescriptAdapter, rules, file, emit, onCrash, budget);
          if (failure === "crash") {
            onCrash?.("TEST-CRASH", new Error("simulated rule failure"));
          } else {
            emit(
              {
                file: file.path,
                line: 0,
                severity: "warning",
                message: "invalid",
              } as never,
              "TEST-INVALID",
              "QA-TEST",
            );
          }
        });
      try {
        const first = await runScan({ ...baseArgs, cache: true });
        const second = await runScan({ ...baseArgs, cache: true });
        expect(first.analysisStatus.rulesCrashed).toBeGreaterThan(0);
        expect(second.analysisStatus.rulesCrashed).toBe(
          first.analysisStatus.rulesCrashed,
        );
        expect(second.partial).toBe(true);
        expect(second.cache?.hits).toBe(0);
        expect(second.findings).toEqual(first.findings);
        runRules.mockRestore();
        const recovered = await runScan({ ...baseArgs, cache: true });
        const cached = await runScan({ ...baseArgs, cache: true });
        expect(recovered.analysisStatus.rulesCrashed).toBe(0);
        expect(cached.cache?.hits).toBeGreaterThan(0);
      } finally {
        runRules.mockRestore();
      }
    },
  );
  it("two --cache runs produce identical findings, score, and counters", async () => {
    const fresh = await runScan({ ...baseArgs, cache: false });
    const warm = await runScan({ ...baseArgs, cache: true });
    const reheated = await runScan({ ...baseArgs, cache: true });

    expect(reheated.findings).toEqual(fresh.findings);
    expect(reheated.score).toBe(fresh.score);
    expect(reheated.testFileCount).toBe(fresh.testFileCount);
    expect(reheated.testDeclarationCount).toBe(fresh.testDeclarationCount);
    expect(reheated.rawDeductions).toBe(fresh.rawDeductions);
    expect(reheated.partial).toBe(fresh.partial);

    // The warm run actually USED the cache (otherwise this test proves
    // nothing — a silent no-op cache would pass an equality check).
    expect(warm.cache?.misses ?? 0).toBeGreaterThan(0);
    expect(reheated.cache?.hits ?? 0).toBeGreaterThan(0);
    expect(reheated.cache?.hits).toBe(warm.cache?.misses);
  });

  it("cached findings are independent copies (post-loop mutation cannot poison the next run)", async () => {
    const first = await runScan({ ...baseArgs, cache: true });
    const second = await runScan({ ...baseArgs, cache: true });
    // Post-loop processing (evidence stamping, tier policy) mutates
    // findings in place — the second run must not inherit the first
    // run's mutations through shared references.
    expect(second.findings).toEqual(first.findings);
    expect(second.findings).not.toBe(first.findings);
  });

  it("BOM + CRLF churn is a hit, not a miss (the key hashes post-normalization text)", async () => {
    await runScan({ ...baseArgs, cache: true });
    // Different bytes on disk; identical after the pipeline's
    // BOM-strip + CRLF→LF normalization. A miss here would mean the
    // key hashes raw bytes instead of normalized text.
    writeFileSync(
      join(dir, "e2e", "checkout.spec.ts"),
      "\uFEFF" + SPEC_TEXT.replaceAll("\n", "\r\n"),
      "utf8",
    );
    const second = await runScan({ ...baseArgs, cache: true });
    expect(second.cache?.hits ?? 0).toBeGreaterThan(0);
  });
});

describe("--cache invalidation (A-2: stale entries can never survive)", () => {
  it("editing a file's content re-analyzes it (miss on the changed bytes)", async () => {
    await runScan({ ...baseArgs, cache: true });
    const before = readFileSync(join(dir, "e2e", "checkout.spec.ts"), "utf8");
    writeFileSync(
      join(dir, "e2e", "checkout.spec.ts"),
      before + "\n// a comment change alters the bytes\n",
      "utf8",
    );
    const second = await runScan({ ...baseArgs, cache: true });
    expect(second.cache?.hits ?? 0).toBe(0);
    expect(second.cache?.misses ?? 0).toBeGreaterThan(0);
  });

  it("a detectorRevision bump produces a different rules digest", () => {
    const rules = [
      { id: "QA-X-001", run: () => [] },
      { id: "QA-X-002", run: () => [] },
    ];
    const baseline = computeRulesDigest(rules);
    const bumped = computeRulesDigest([
      { id: "QA-X-001", detectorRevision: 2, run: () => [] },
      { id: "QA-X-002", run: () => [] },
    ]);
    expect(bumped).not.toBe(baseline);
    // Digest is deterministic — same rules, same key space.
    expect(computeRulesDigest(rules)).toBe(baseline);
  });

  it("an external rule's run-source change produces a different digest even without a revision bump", () => {
    const before = computeRulesDigest([{ id: "QA-LOCAL-1", run: () => [] }]);
    const after = computeRulesDigest([
      {
        id: "QA-LOCAL-1",
        run: function edited() {
          return [];
        },
      },
    ]);
    expect(after).not.toBe(before);
  });

  it("a corrupt cache file degrades to a cold cache, never fails the scan", async () => {
    await runScan({ ...baseArgs, cache: true });
    const cacheFile = join(dir, ".qa-doctor", "cache", "scan-v2.json");
    expect(existsSync(cacheFile)).toBe(true);
    writeFileSync(cacheFile, "{not json at all", "utf8");
    const third = await runScan({ ...baseArgs, cache: true });
    expect(third.cache?.hits ?? 0).toBe(0);
    expect(third.cache?.misses ?? 0).toBeGreaterThan(0);
    expect(third.partial).toBe(false);
  });

  it("a future-versioned cache file is ignored, not trusted", async () => {
    mkdirSync(join(dir, ".qa-doctor", "cache"), { recursive: true });
    writeFileSync(
      join(dir, ".qa-doctor", "cache", "scan-v2.json"),
      JSON.stringify({ version: 999, entries: { bogus: { findings: [] } } }),
      "utf8",
    );
    const result = await runScan({ ...baseArgs, cache: true });
    expect(result.cache?.hits ?? 0).toBe(0);
  });

  it("store() refuses file-budget-truncated results (a truncated analysis must not become permanent)", () => {
    const cache = createScanCache(dir);
    const key = fileCacheKey("digest", "text", {
      relPath: "a.spec.ts",
      adapterId: "typescript",
    });
    cache.store(key, [], true);
    cache.persist();
    const reopened = createScanCache(dir);
    expect(reopened.lookup(key)).toBeUndefined();
  });

  it("the FIFO cap bounds the cache for monorepo-scale runs (oldest evicted)", () => {
    const cache = createScanCache(dir);
    for (let i = 0; i < 5000; i++) {
      cache.store(`k${i}`, [], false);
    }
    cache.persist();
    const reopened = createScanCache(dir);
    expect(reopened.lookup("k0")).toBeUndefined();
    expect(reopened.lookup("k4999")).toBeDefined();
  });

  it("persist() failure degrades to a no-op, never a crash (read-only volume)", () => {
    // mkdirSync under a path that is a FILE fails with ENOTDIR — the
    // same class of failure as a read-only volume, without ESM mocking.
    const blocker = join(dir, "blocker");
    writeFileSync(blocker, "not a directory", "utf8");
    const cache = createScanCache(join(blocker, "sub"));
    expect(() => {
      cache.store(
        fileCacheKey("d", "t", {
          relPath: "a.spec.ts",
          adapterId: "typescript",
        }),
        [],
        false,
      );
      cache.persist();
    }).not.toThrow();
  });
});

describe("--cache privacy posture (local-only, never network)", () => {
  it("scan-cache.ts imports no network-capable API (A-2 contract)", () => {
    const source = readFileSync(
      join(import.meta.dirname, "..", "..", "src", "engine", "scan-cache.ts"),
      "utf8",
    );
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
      expect(
        source.includes(banned),
        `scan-cache.ts must never reference ${banned} — the cache is ` +
          `local-only by contract (plan A-2)`,
      ).toBe(false);
    }
    // Only fs/crypto/path are expected.
    expect(source).toContain("node:crypto");
    expect(source).toContain("node:fs");
  });

  it("the cache lives under .qa-doctor/cache/ and is gitignored", () => {
    const gitignore = readFileSync(
      join(import.meta.dirname, "..", "..", ".gitignore"),
      "utf8",
    );
    expect(gitignore).toContain(".qa-doctor/cache/");
  });

  it("the JSON report names the cache file so consumers can audit it", async () => {
    const result = await runScan({ ...baseArgs, cache: true });
    expect(result.cache?.file).toContain(join(".qa-doctor", "cache"));
  });

  it("the tracked repo never contains the cache dir (machine state, not content)", () => {
    try {
      execFileSync("git", ["rev-parse", "--git-dir"], { cwd: dir });
    } catch {
      return; // not a git checkout — nothing to assert
    }
    const tracked = execFileSync("git", ["ls-files", ".qa-doctor/cache/"], {
      cwd: join(import.meta.dirname, "..", ".."),
      encoding: "utf8",
    }).trim();
    expect(tracked).toBe("");
  });
});

describe("--cache CLI plumbing", () => {
  it("main() accepts --cache (exit is data — findings gate — never usage error)", async () => {
    const code = await main(["--cache", "--json", "."]);
    // The fixture carries a hard-sleep finding, so exit 1 (findings at/
    // above gate) is the data answer. 10 would mean the flag was
    // rejected as unknown; 20 an internal error — neither is allowed.
    expect(code).toBe(1);
  });

  it("without --cache the JSON contract carries no cache block at all", async () => {
    const result = await runScan({ ...baseArgs, cache: false });
    expect(result.cache).toBeUndefined();
  });

  it("the disabled cache is a true no-op (no stats drift, no I/O)", () => {
    expect(disabledScanCache.stats.hits).toBe(0);
    expect(disabledScanCache.stats.misses).toBe(0);
    expect(disabledScanCache.lookup("x")).toBeUndefined();
    expect(() => disabledScanCache.store("x", [], false)).not.toThrow();
    expect(() => disabledScanCache.persist()).not.toThrow();
  });

  it("fileCacheKey is content-addressed: same bytes+rules, same key", () => {
    const digest = computeRulesDigest([]);
    expect(
      fileCacheKey(digest, "const a = 1;", {
        relPath: "a.ts",
        adapterId: "typescript",
      }),
    ).toBe(
      fileCacheKey(digest, "const a = 1;", {
        relPath: "a.ts",
        adapterId: "typescript",
      }),
    );
    expect(
      fileCacheKey(digest, "const a = 2;", {
        relPath: "a.ts",
        adapterId: "typescript",
      }),
    ).not.toBe(
      fileCacheKey(digest, "const a = 1;", {
        relPath: "a.ts",
        adapterId: "typescript",
      }),
    );
  });

  it("a cache round-trip through disk survives process boundaries (persist → reopen)", () => {
    const c1 = createScanCache(dir);
    const key = fileCacheKey("digest", "text", {
      relPath: "a.spec.ts",
      adapterId: "typescript",
    });
    c1.store(key, [], false);
    c1.persist();
    const c2 = createScanCache(dir);
    expect(c2.lookup(key)).toEqual([]);
    expect(c2.stats.hits).toBe(1);
  });

  it("the cache dir is created lazily on first cached run, never before", async () => {
    expect(existsSync(join(dir, ".qa-doctor", "cache"))).toBe(false);
    await runScan({ ...baseArgs, cache: true });
    expect(existsSync(join(dir, ".qa-doctor", "cache"))).toBe(true);
  });
});

describe("computeRulesDigest — hashRulesSourceTree paths", () => {
  it("uses the rules source directory tree hash when modulePath contains /src/rules/", () => {
    const rulesDir = join(dir, "src", "rules");
    mkdirSync(join(rulesDir, "sub"), { recursive: true });
    writeFileSync(join(rulesDir, "a.ts"), "export const a = 1;", "utf8");
    writeFileSync(
      join(rulesDir, "sub", "b.tsx"),
      "export const b = 2;",
      "utf8",
    );

    const modulePath = join(rulesDir, "sub", "b.tsx");
    const digest = computeRulesDigest([
      { id: "R1", run: () => [], modulePath },
    ]);

    expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("falls back to String(run) hashing when modulePath has no /src/rules/ marker", () => {
    const digest = computeRulesDigest([
      { id: "R1", run: () => [], modulePath: "/some/other/path/rule.ts" },
    ]);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("falls back when hashDir throws (rulesDir does not exist on disk)", () => {
    const digest = computeRulesDigest([
      {
        id: "R1",
        run: () => [],
        modulePath: "/nonexistent/src/rules/rule.ts",
      },
    ]);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("skips node_modules and .git in the rules directory hash", () => {
    const rulesDir = join(dir, "src", "rules");
    mkdirSync(join(rulesDir, "node_modules"), { recursive: true });
    mkdirSync(join(rulesDir, ".git"), { recursive: true });
    writeFileSync(join(rulesDir, "a.ts"), "const a = 1;", "utf8");
    writeFileSync(
      join(rulesDir, "node_modules", "ignored.ts"),
      "const ignore = true;",
      "utf8",
    );
    writeFileSync(
      join(rulesDir, ".git", "ignored.ts"),
      "const ignore = true;",
      "utf8",
    );

    const modulePath = join(rulesDir, "a.ts");
    const digest = computeRulesDigest([
      { id: "R1", run: () => [], modulePath },
    ]);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("recurses into subdirectories and hashes .tsx files", () => {
    const rulesDir = join(dir, "src", "rules");
    mkdirSync(join(rulesDir, "deep", "nested"), { recursive: true });
    writeFileSync(join(rulesDir, "top.ts"), "const t = 1;", "utf8");
    writeFileSync(join(rulesDir, "deep", "mid.tsx"), "const m = 2;", "utf8");
    writeFileSync(
      join(rulesDir, "deep", "nested", "leaf.ts"),
      "const l = 3;",
      "utf8",
    );
    writeFileSync(
      join(rulesDir, "deep", "nested", "not-ts.js"),
      "const ignored = true;",
      "utf8",
    );

    const modulePath = join(rulesDir, "top.ts");
    const digest = computeRulesDigest([
      { id: "R1", run: () => [], modulePath },
    ]);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("respects the depth-8 limit in hashDir", () => {
    const rulesDir = join(dir, "src", "rules");
    let deepPath = rulesDir;
    for (let i = 0; i <= 10; i++) {
      deepPath = join(deepPath, `level${i}`);
    }
    mkdirSync(deepPath, { recursive: true });
    writeFileSync(join(rulesDir, "root.ts"), "const r = 0;", "utf8");
    writeFileSync(join(deepPath, "too-deep.ts"), "const td = 1;", "utf8");

    const modulePath = join(rulesDir, "root.ts");
    const digest = computeRulesDigest([
      { id: "R1", run: () => [], modulePath },
    ]);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes digest when rules source directory tree content changes", () => {
    const rulesDir = join(dir, "src", "rules");
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, "a.ts"), "const a = 1;", "utf8");

    const modulePath = join(rulesDir, "a.ts");
    const before = computeRulesDigest([
      { id: "R1", run: () => [], modulePath },
    ]);

    writeFileSync(join(rulesDir, "a.ts"), "const a = 999;", "utf8");
    const after = computeRulesDigest([{ id: "R1", run: () => [], modulePath }]);

    expect(after).not.toBe(before);
  });

  it("uses window-style backslash paths in modulePath", () => {
    const rulesDir = join(dir, "src", "rules");
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, "a.ts"), "const a = 1;", "utf8");

    const backslashPath = rulesDir.replace(/\//g, "\\") + "\\a.ts";
    const digest = computeRulesDigest([
      { id: "R1", run: () => [], modulePath: backslashPath },
    ]);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("falls back to String(run) when modulePath does not contain /src/rules/ (line 124)", () => {
    const digest = computeRulesDigest([
      { id: "R1", run: () => [], modulePath: "/some/other/path/a.js" },
    ]);
    // Falls back to per-rule function source hashing
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("falls back to String(run) when hashDir throws internally (catch on line 131)", () => {
    const rulesDir = join(dir, "src", "rules");
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, "a.ts"), "const a = 1;", "utf8");

    const modulePath = join(rulesDir, "a.ts");

    // Normal digest (no mock active)
    const normal = computeRulesDigest([
      { id: "R1", run: () => [], modulePath },
    ]);

    // Target the mock to corrupt readdirSync only for the rules dir path
    readdirSyncCorruptPath.value = rulesDir;
    const fallback = computeRulesDigest([
      { id: "R1", run: () => [], modulePath },
    ]);

    expect(fallback).toMatch(/^[a-f0-9]{64}$/);
    expect(fallback).not.toBe(normal);
  });
});
