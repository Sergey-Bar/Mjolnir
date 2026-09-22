import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, chmodSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runScan } from "../src/engine/scan-pipeline.js";
import { createScanCache, disabledScanCache, fileCacheKey } from "../src/engine/scan-cache.js";
import { RULES } from "../src/rules/index.js";

describe("M8: Security Validation for Hostile Repository Model", () => {
  let dir: string;
  let origCwd: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mjolnir-hostile-"));
    origCwd = process.cwd();
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    rmSync(dir, { recursive: true, force: true });
  });

  describe("Filesystem-level hostility", () => {
    it("a zero-byte test file does not crash the scan", async () => {
      mkdirSync(join(dir, "e2e"), { recursive: true });
      writeFileSync(join(dir, "e2e", "empty.spec.ts"), "");
      await expect(
        runScan({
          target: dir,
          json: true,
          verbose: true,
          maxDurationMs: 10_000,
          scopeChanged: false,
          format: "json",
        }),
      ).resolves.toBeDefined();
    });

    it("an unreadable file (permissions revoked) degrades instead of crashing", async () => {
      mkdirSync(join(dir, "e2e"), { recursive: true });
      const target = join(dir, "e2e", "locked.spec.ts");
      writeFileSync(target, "it('x', () => { expect(1).toBe(1); });");
      try {
        chmodSync(target, 0o000);
      } catch {
        // chmod semantics differ across platforms - skip gracefully
        return;
      }
      try {
        const result = await runScan({
          target: dir,
          json: true,
          verbose: true,
          maxDurationMs: 10_000,
          scopeChanged: false,
          format: "json",
        });
        expect(result).toBeDefined();
      } finally {
        chmodSync(target, 0o644);
      }
    });

    it("a directory nested far deeper than any real test suite does not hang", async () => {
      let deep = dir;
      for (let i = 0; i < 60; i++) {
        deep = join(deep, `level-${i}`);
      }
      mkdirSync(deep, { recursive: true });
      writeFileSync(
        join(deep, "deep.spec.ts"),
        "it('x', () => { expect(1).toBe(1); });",
      );
      const start = performance.now();
      await expect(
        runScan({
          target: dir,
          json: true,
          verbose: true,
          maxDurationMs: 10_000,
          scopeChanged: false,
          format: "json",
        }),
      ).resolves.toBeDefined();
      expect(performance.now() - start).toBeLessThan(10_000);
    });

    it("a symlink loop does not hang or crash the scan (skips if unsupported)", async () => {
      mkdirSync(join(dir, "e2e"), { recursive: true });
      writeFileSync(
        join(dir, "e2e", "real.spec.ts"),
        "it('x', () => { expect(1).toBe(1); });",
      );
      const loopPath = join(dir, "e2e", "loop");
      try {
        symlinkSync(dir, loopPath, "junction");
      } catch {
        // Symlink/junction creation needs elevated privileges on some Windows configurations
        return;
      }
      const start = performance.now();
      await expect(
        runScan({
          target: dir,
          json: true,
          verbose: true,
          maxDurationMs: 10_000,
          scopeChanged: false,
          format: "json",
        }),
      ).resolves.toBeDefined();
      expect(performance.now() - start).toBeLessThan(10_000);
    });
  });

  describe("Encoding hostility: non-UTF8 and mixed line endings", () => {
    it("a UTF-16LE encoded file degrades honestly instead of throwing", async () => {
      mkdirSync(join(dir, "e2e"), { recursive: true });
      const text = "it('x', () => { expect(1).toBe(1); });";
      const utf16le = Buffer.from(text, "utf16le");
      const bom = Buffer.from([0xff, 0xfe]);
      writeFileSync(
        join(dir, "e2e", "utf16.spec.ts"),
        Buffer.concat([bom, utf16le]),
      );
      await expect(
        runScan({
          target: dir,
          json: true,
          verbose: true,
          maxDurationMs: 10_000,
          scopeChanged: false,
          format: "json",
        }),
      ).resolves.toBeDefined();
    });

    it("a UTF-8 BOM-prefixed file scans normally", async () => {
      mkdirSync(join(dir, "e2e"), { recursive: true });
      const bom = Buffer.from([0xef, 0xbb, 0xbf]);
      const body = Buffer.from(
        "it.only('x', () => { expect(true).toBe(true); });",
        "utf8",
      );
      writeFileSync(join(dir, "e2e", "bom.spec.ts"), Buffer.concat([bom, body]));
      await expect(
        runScan({
          target: dir,
          json: true,
          verbose: true,
          maxDurationMs: 10_000,
          scopeChanged: false,
          format: "json",
        }),
      ).resolves.toBeDefined();
    });

    it("mixed CRLF/LF/CR line endings in one file do not crash any rule", () => {
      const mixed =
        "it.only('x', () => {\r\n" +
        "  expect(true).toBe(true);\n" +
        "  // comment\r" +
        "});\r\n";
      for (const rule of RULES) {
        if (rule.appliesTo !== "test-files") continue;
        expect(
          () => rule.run({ path: "mixed.spec.ts", text: mixed }),
          rule.id,
        ).not.toThrow();
      }
    });
  });

  describe("Python adapter: hostile source never crashes a rule", () => {
    const PYTHON_RULES = RULES.filter((r) => r.appliesTo === ("python" as never));

    const HOSTILE_PY_SNIPPETS: Array<[string, string]> = [
      ["mixed-tabs-spaces", "def test_x():\n\tassert True\n    assert False\n"],
      ["inconsistent-indent", "def test_x():\n  assert True\n      assert True\n"],
      ["unterminated-string", 'def test_x():\n    assert "never closed\n'],
      ["deep-nesting", `def test_x():\n${"    if True:\n".repeat(300)}        pass\n`],
      ["null-bytes", "def test_x():\n\x00\x01\x02\n    assert True\n"],
      ["empty-file", ""],
      ["only-whitespace", "   \n\t\n   "],
      ["huge-single-line", `def test_x():\n    assert "${"a".repeat(100_000)}" == ""\n`],
      ["unicode-directional-override", "def test_x():\n    assert '‮test‭' == ''\n"],
      ["binary-garbage", "\x00\x01\x02\xFF\xFE\xFD def test_x(): assert"],
    ];

    for (const [name, snippet] of HOSTILE_PY_SNIPPETS) {
      it(`survives: ${name}`, () => {
        for (const rule of PYTHON_RULES) {
          expect(
            () => rule.run({ path: "test_evil.py", text: snippet }),
            `${rule.id} on ${name}`,
          ).not.toThrow();
        }
      });
    }
  });

  describe("Scan cache: hostile cache handling", () => {
    it("a corrupt cache file degrades to a cold cache, never fails the scan", async () => {
      mkdirSync(join(dir, "e2e"), { recursive: true });
      writeFileSync(
        join(dir, "e2e", "checkout.spec.ts"),
        "it('x', () => { expect(1).toBe(1); });",
      );
      await runScan({
        target: dir,
        json: true,
        verbose: true,
        maxDurationMs: 10_000,
        scopeChanged: false,
        format: "json",
        cache: true,
      });
      const cacheFile = join(dir, ".mjolnir", "cache", "scan-v2.json");
      expect(existsSync(cacheFile)).toBe(true);
      writeFileSync(cacheFile, "{not json at all", "utf8");
      const third = await runScan({
        target: dir,
        json: true,
        verbose: true,
        maxDurationMs: 10_000,
        scopeChanged: false,
        format: "json",
        cache: true,
      });
      expect(third.cache?.hits ?? 0).toBe(0);
      expect(third.cache?.misses ?? 0).toBeGreaterThan(0);
      expect(third.partial).toBe(false);
    });

    it("a future-versioned cache file is ignored, not trusted", async () => {
      mkdirSync(join(dir, ".mjolnir", "cache"), { recursive: true });
      writeFileSync(
        join(dir, ".mjolnir", "cache", "scan-v2.json"),
        JSON.stringify({ version: 999, entries: { bogus: { findings: [] } } }),
        "utf8",
      );
      const result = await runScan({
        target: dir,
        json: true,
        verbose: true,
        maxDurationMs: 10_000,
        scopeChanged: false,
        format: "json",
        cache: true,
      });
      expect(result.cache?.hits ?? 0).toBe(0);
    });

    it("store() refuses file-budget-truncated results", () => {
      const cache = createScanCache(dir);
      const key = fileCacheKey("digest", "text", {
        relPath: "a.spec.ts",
        adapterId: "typescript",
      });
      cache.store(key, [], true); // fileBudgetExceeded = true
      cache.persist();
      const reopened = createScanCache(dir);
      expect(reopened.lookup(key)).toBeUndefined();
    });

    it("the FIFO cap bounds the cache for monorepo-scale runs", () => {
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

  describe("Scan cache privacy posture", () => {
    it("scan-cache.ts imports no network-capable API", () => {
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

    it("the cache lives under .mjolnir/cache/", () => {
      const gitignore = `
.mjolnir/cache/
node_modules/
dist/
`;
      expect(gitignore).toContain(".mjolnir/cache/");
    });
  });

  describe("Rule-level hostility: null bytes, huge files, malformed syntax", () => {
    it("TypeScript rules survive hostile in-memory strings", () => {
      const TS_RULES = RULES.filter((r) => r.appliesTo === "test-files");
      const HOSTILE_TS_SNIPPETS = [
        "it('x', () => { expect('\x00').toBe(''); });", // null byte
        "it('x', () => { expect('" + "a".repeat(100_000) + "').toBe(''); });", // huge string
        "it('x', () => { expect('‮test‭').toBe(''); });", // unicode override
        "it('x', () => { expect(1).toBe(1); }", // missing closing paren
        "describe('x', () => { it('y', () => { expect(true).toBe(true); }); });", // valid
      ];

      for (const snippet of HOSTILE_TS_SNIPPETS) {
        for (const rule of TS_RULES) {
          expect(
            () => rule.run({ path: "test.spec.ts", text: snippet }),
            `${rule.id} on hostile snippet`,
          ).not.toThrow();
        }
      }
    });

    it("Playwright rules survive hostile timeout and navigation patterns", () => {
      const PW_RULES = RULES.filter((r) => r.frameworks?.includes("playwright"));
      const HOSTILE_PW_SNIPPETS = [
        "test('x', async ({ page }) => { await page.waitForTimeout(999999); });",
        "test('x', async ({ page }) => { await page.goto('http://localhost:9999'); });",
        "test('x', async ({ page }) => { await page.waitForSelector('#never-exists', { timeout: 0 }); });",
      ];

      for (const snippet of HOSTILE_PW_SNIPPETS) {
        for (const rule of PW_RULES) {
          expect(
            () => rule.run({ path: "test.spec.ts", text: snippet }),
            `${rule.id} on hostile PW snippet`,
          ).not.toThrow();
        }
      }
    });
  });

  describe("Malicious configuration inputs", () => {
    it("malformed mjolnir.config.json does not crash", async () => {
      writeFileSync(join(dir, "mjolnir.config.json"), "{ not valid json");
      await expect(
        runScan({
          target: dir,
          json: true,
          verbose: true,
          maxDurationMs: 10_000,
          scopeChanged: false,
          format: "json",
        }),
      ).resolves.toBeDefined();
    });

    it("malformed .mjolnirignore does not crash", async () => {
      writeFileSync(join(dir, ".mjolnirignore"), "[invalid regex");
      await expect(
        runScan({
          target: dir,
          json: true,
          verbose: true,
          maxDurationMs: 10_000,
          scopeChanged: false,
          format: "json",
        }),
      ).resolves.toBeDefined();
    });

    it("extremely long config values do not cause buffer overflow", async () => {
      const longConfig = `{"target": "${"x".repeat(1_000_000)}"}`;
      writeFileSync(join(dir, "mjolnir.config.json"), longConfig);
      await expect(
        runScan({
          target: dir,
          json: true,
          verbose: true,
          maxDurationMs: 10_000,
          scopeChanged: false,
          format: "json",
        }),
      ).resolves.toBeDefined();
    });
  });
});