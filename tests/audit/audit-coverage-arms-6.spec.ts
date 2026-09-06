/**
 * Coverage arms batch 6 — scan-pipeline internals driven through the
 * canonical runScan with injected module seams:
 * - W9 fallback re-key: parse hooks return undefined (grammar seam
 *   mocked out) and the regex-keyed cache entry is served on re-scan;
 * - W10 malformed-record rejection: an external JS-module rule emitting
 *   a malformed finding is routed to the crash channel, never scored;
 * - C2 gate notice: gated sources announce on stderr / the hook;
 * - the honest per-file read-failure skip (no-reason arm).
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  poisonReadFile: null as string | null,
  failGrammarLoad: false,
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const readFileSync = ((path: unknown, options?: unknown) => {
    if (
      state.poisonReadFile !== null &&
      String(path).endsWith(state.poisonReadFile)
    ) {
      throw new Error("EACCES (simulated unreadable)");
    }
    return (actual.readFileSync as unknown as (...a: unknown[]) => string)(
      path,
      options,
    );
  }) as typeof actual.readFileSync;
  return { ...actual, readFileSync };
});

vi.mock("web-tree-sitter", () => ({
  Parser: class {
    init(): void {
      /* no-op init */
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
      state.failGrammarLoad
        ? Promise.reject(new Error("simulated grammar unavailability"))
        : Promise.reject(new Error("grammar seam closed for this spec")),
  },
}));

import { runScan, type ScanHooks } from "../../src/cli.js";

const createdDirs: string[] = [];
function tmpRepo(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), `mjolnir-arms6-${prefix}-`));
  createdDirs.push(d);
  return d;
}

afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
  state.poisonReadFile = null;
  state.failGrammarLoad = true;
});

function baseArgs(dir: string, cache: boolean) {
  return {
    target: dir,
    json: true,
    verbose: false,
    maxDurationMs: Number.POSITIVE_INFINITY,
    scopeChanged: false,
    format: "json" as const,
    strict: true,
    ...(cache ? { cache: true } : {}),
  };
}

describe("W9 fallback re-key: regex verdicts under a closed grammar seam", () => {
  it("scan 1 stores under the regex key; scan 2 serves it (fallback hit)", async () => {
    const dir = tmpRepo("w9");
    // Java adapter test file: TestA.java matches JAVA_TEST_RE.
    writeFileSync(
      join(dir, "TestA.java"),
      "class TestA { void m() { Thread.sleep(3000); } }\n",
    );
    const hooks: ScanHooks = {};
    const first = await runScan(baseArgs(dir, true), hooks);
    expect(first.testFileCount).toBeGreaterThan(0);
    const second = await runScan(baseArgs(dir, true), hooks);
    // The fallback re-keyed lookup served scan 1's regex verdicts.
    expect(second.cache).toBeDefined();
    expect(second.cache?.hits).toBeGreaterThan(0);
    expect(second.findings.map((f) => f.ruleId)).toEqual(
      first.findings.map((f) => f.ruleId),
    );
  });
});

describe("W10 malformed external-rule records", () => {
  it("a JS-module rule emitting a malformed record is routed to the crash channel", async () => {
    const dir = tmpRepo("w10");
    writeFileSync(
      join(dir, "a.spec.ts"),
      "import { test, expect } from '@playwright/test';\n" +
        "test('t', async () => {});\n",
    );
    mkdirSync(join(dir, "mjolnir-rules"), { recursive: true });
    writeFileSync(
      join(dir, "mjolnir-rules", "broken.mjs"),
      [
        "export const rules = [{",
        "  id: 'QA-ZZ-950',",
        "  category: 'QA-PW',",
        "  appliesTo: 'test-files',",
        "  severity: 'warning',",
        "  run: () => [{ severity: 'fatal', line: 0, message: '', file: '' }],",
        "}];",
      ].join("\n"),
    );
    const crashes: Array<{ ruleId: string; file: string }> = [];
    const hooks: ScanHooks = {
      onRuleCrash: (ruleId, file) => {
        crashes.push({ ruleId, file });
      },
    };
    const result = await runScan(
      { ...baseArgs(dir, false), enablePlugins: true },
      hooks,
    );
    expect(crashes.length).toBeGreaterThan(0);
    expect(
      crashes.some((c) => c.ruleId === "QA-ZZ-950" && c.file === "a.spec.ts"),
    ).toBe(true);
    // The malformed record was rejected, never scored.
    expect(result.findings.some((f) => f.ruleId === "QA-ZZ-950")).toBe(false);
  });
});

describe("C2 gate notice arms", () => {
  it("a gated JS module announces on the onGateNotice hook (gate closed)", async () => {
    const dir = tmpRepo("gate-hook");
    writeFileSync(
      join(dir, "a.spec.ts"),
      "import { test } from '@playwright/test';\n" + "test('t', () => {});\n",
    );
    mkdirSync(join(dir, "mjolnir-rules"), { recursive: true });
    writeFileSync(
      join(dir, "mjolnir-rules", "gated.mjs"),
      [
        "export const rules = [{",
        "  id: 'QA-ZZ-951',",
        "  category: 'QA-PW',",
        "  appliesTo: 'test-files',",
        "  severity: 'warning',",
        "  run: () => [],",
        "}];",
      ].join("\n"),
    );
    const notices: string[] = [];
    const hooks: ScanHooks = { onGateNotice: (n) => notices.push(n) };
    const result = await runScan(baseArgs(dir, false), hooks);
    expect(notices.length).toBeGreaterThan(0);
    expect(notices.join("\n")).toContain("JS module");
    // The gated rule never loaded.
    expect(result.findings.some((f) => f.ruleId === "QA-ZZ-951")).toBe(false);
  });

  it("without a hook, the notice goes to stderr (console.error default)", async () => {
    const dir = tmpRepo("gate-stderr");
    writeFileSync(
      join(dir, "a.spec.ts"),
      "import { test } from '@playwright/test';\n" + "test('t', () => {});\n",
    );
    mkdirSync(join(dir, "mjolnir-rules"), { recursive: true });
    writeFileSync(
      join(dir, "mjolnir-rules", "gated2.mjs"),
      [
        "export const rules = [{",
        "  id: 'QA-ZZ-952',",
        "  category: 'QA-PW',",
        "  appliesTo: 'test-files',",
        "  severity: 'warning',",
        "  run: () => [],",
        "}];",
      ].join("\n"),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await runScan(baseArgs(dir, false), {});
      expect(errSpy).toHaveBeenCalled();
    } finally {
      errSpy.mockRestore();
    }
  });
});

describe("honest per-file read-failure skip (no-reason arm)", () => {
  it("a file that exists but cannot be read is counted as skipped", async () => {
    const dir = tmpRepo("unreadable");
    // Two java test files so the java adapter discovers both; one is
    // unreadable at read time (mocked EACCES).
    writeFileSync(
      join(dir, "TestReadable.java"),
      "class TestReadable { void m() {} }\n",
    );
    writeFileSync(
      join(dir, "TestUnreadable.java"),
      "class TestUnreadable { void m() {} }\n",
    );
    state.poisonReadFile = "TestUnreadable.java";
    const hooks: ScanHooks = {};
    const result = await runScan(baseArgs(dir, false), hooks);
    expect(result.analysisStatus.skippedFiles).toBe(1);
    expect(result.partial).toBe(true);
  });
});
