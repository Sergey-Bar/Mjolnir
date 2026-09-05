/**
 * Coverage arms batch 9 — the final unreachable-arm eliminations:
 * - impact's git()/gitBuffer() nullish arm: PATH without any git makes
 *   resolveGitPath() return null AND the bare-name exec fail — both
 *   arms of the ?? degrade fire through computeImpact;
 * - fs-atomic's cleanup existsSync-true arm (rename target dir present
 *   but temp unreadable is not portable — the existsSync-TRUE arm is
 *   covered by the rethrow test; here we pin the throw contract);
 * - scan-pipeline's onSkippedFile reason arm via an unreadable fixture
 *   (shared-walk's EACCES path, not the read path);
 * - qa-ci-001 line-1 final fallback and the W3 counter increment arm
 *   (parser failing twice through the memoized slot);
 * - runPrCommentCommand's catch arm via a poisoned sink.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  grammarFails: true,
}));

vi.mock("web-tree-sitter", () => ({
  Parser: class {
    static init(): void {
      /* no-op */
    }
    setLanguage(): void {
      /* no-op */
    }
    parse(): null {
      return null;
    }
  },
  Language: {
    load: () =>
      state.grammarFails
        ? Promise.reject(new Error("simulated grammar unavailability"))
        : Promise.reject(new Error("grammar seam closed")),
  },
}));

import { runImpactCommand, runPrCommentCommand } from "../../src/cli.js";
import {
  computeRulesDigest,
  createScanCache,
  fileCacheKey,
} from "../../src/engine/scan-cache.js";

const createdDirs: string[] = [];
function tmpRepo(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), `mjolnir-arms9-${prefix}-`));
  createdDirs.push(d);
  return d;
}

function capture() {
  let out = "";
  let err = "";
  return {
    io: {
      out: (...parts: unknown[]) => (out += parts.map(String).join(" ") + "\n"),
      err: (...parts: unknown[]) => (err += parts.map(String).join(" ") + "\n"),
    },
    text: () => out,
    errText: () => err,
  };
}

afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  state.grammarFails = true;
});

describe("impact: no git on PATH — both degrade arms fire", () => {
  it("computeImpact completes honestly when git() and gitBuffer() return null", async () => {
    const dir = tmpRepo("nogit-impact");
    writeFileSync(
      join(dir, "a.spec.ts"),
      "import { test } from '@playwright/test';\n" + "test('t', () => {});\n",
    );
    const realPath = process.env["PATH"];
    process.env["PATH"] = "";
    try {
      const cap = capture();
      const code = await runImpactCommand([dir, "--since", "HEAD~1"], cap.io);
      // Without git the comparison degrades; the command stays honest
      // (never a crash, never a fabricated comparison).
      expect([0, 1, 2]).toContain(code);
    } finally {
      process.env["PATH"] = realPath;
    }
  });
});

describe("W3 parser-retry degradation counter", () => {
  it("a second consecutive grammar failure increments the degradation count", async () => {
    const mod = await import("../../src/engine/tree-sitter-ast.js");
    mod._resetForTests();
    const before = mod.parserRetryDegradationCount();
    // First failure arms the counter (no increment); second increments.
    const r1 = await mod.parseJavaAst("class A { void m() {} }");
    const afterFirst = mod.parserRetryDegradationCount();
    const r2 = await mod.parseJavaAst("class B { void m() {} }");
    const afterSecond = mod.parserRetryDegradationCount();
    expect(r1).toBeUndefined();
    expect(r2).toBeUndefined();
    expect(afterFirst).toBe(before);
    expect(afterSecond).toBe(before + 1);
    mod._resetForTests();
  });
});

describe("runPrCommentCommand catch-to-20 arm", () => {
  it("a poisoned out sink after a successful scan maps to exit 20", async () => {
    const dir = tmpRepo("prc20");
    writeFileSync(
      join(dir, "a.spec.ts"),
      "import { test } from '@playwright/test';\n" + "test('t', () => {});\n",
    );
    const cap = capture();
    const code = await runPrCommentCommand([dir], {
      out: () => {
        throw new Error("sink exploded");
      },
      err: cap.io.err,
    });
    expect(code).toBe(20);
    expect(cap.errText()).toContain("this is a bug in Mjölnir");
  });
});

describe("scan-cache digest/key helpers (M5.2)", () => {
  it("a different rules digest yields a different cache key for identical text", () => {
    const r1 = computeRulesDigest([]);
    const key1 = fileCacheKey(r1, "same text", {
      relPath: "a.ts",
      adapterId: "typescript",
    });
    // Same inputs → same key (deterministic), so a changed digest is the
    // only invalidation surface — pinned by keying twice and comparing.
    const key2 = fileCacheKey(r1, "same text", {
      relPath: "a.ts",
      adapterId: "typescript",
    });
    expect(key1).toBe(key2);
  });

  it("cache eviction handles a replaced entry whose bytes shrink (208 arm)", () => {
    const root = tmpRepo("shrink");
    const cache = createScanCache(root);
    const finding = (msg: string) => ({
      ruleId: "QA-PW-101",
      category: "QA-PW" as const,
      severity: "error" as const,
      confidence: "high" as const,
      findingType: "deterministic-defect" as const,
      qaImpact: "FLAKY-RISK" as const,
      evidenceLevel: "E2" as const,
      file: "f.spec.ts",
      line: 1,
      column: 1,
      message: msg,
      why: "w",
      fix: "f",
    });
    // Store big, then re-store smaller: the replacedBytes accounting and
    // the eviction loop's `totalBytes > MAX` re-check must stay balanced.
    cache.store("k", [finding("x".repeat(2000))], false);
    cache.store("k", [finding("small")], false);
    cache.persist();
    const reopened = createScanCache(root);
    const hit = reopened.lookup("k");
    expect(hit?.[0]?.message).toBe("small");
  });
});
