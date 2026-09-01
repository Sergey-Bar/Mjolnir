/**
 * Regression tests for the reliability band (R-1…R-10) and the gaps
 * closed while fixing it, not covered by the behavior-specific specs:
 *
 * R-1 scan never writes state (covered in milestones.spec.ts)
 * R-2 saveStats best-effort (covered in stats.spec.ts)
 * R-3 .mjolnir state tracking decision (here)
 * R-4/R-5/R-6/R-7 fix-command safety (covered in fix.spec.ts)
 * R-8 ignore matcher isolation (covered in ignores-resolution.spec.ts)
 * R-9 rulesCrashed counter + --debug surfacing (here)
 * R-10 gitignore semantics (covered in ignores-resolution.spec.ts)
 * H-4 gap: target validation in every scanning subcommand (here)
 * S-8: plugin visibility in the JSON contract (here)
 * P-1: per-file analysis budget (here)
 * P-2: single shared discovery walk (here)
 */

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  runScan,
  runScanCommand,
  runBadgeCommand,
  runBaselineCommand,
  runDiffCommand,
  parseArgs,
} from "../src/cli.js";
import { typescriptAdapter } from "../src/adapters/typescript.js";
import { pythonAdapter } from "../src/adapters/python.js";
import { javaAdapter } from "../src/adapters/java.js";
import { csharpAdapter } from "../src/adapters/csharp.js";
import { discoverAllTestFiles } from "../src/discovery/scan-adapters.js";
import { createIgnoreMatcher, LIMITS } from "../src/discovery/ignores.js";
import type { ScanContext, UniversalRule } from "../src/engine/adapter.js";
import type { Workspace } from "../src/discovery/workspace.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-r-fixes-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ─── R-9: crash isolation is countable and debuggable ─────────────────

describe("R-9: swallowed rule crashes become visible", () => {
  it("adapter.runRules reports a throwing rule through onCrash without killing the scan", () => {
    writeFileSync(join(dir, "a.spec.ts"), "it('a', () => {});\n");
    const boom: UniversalRule = {
      id: "QA-BOOM-001",
      category: "QA-TEST",
      appliesTo: ["typescript"],
      run() {
        throw new Error("boom");
      },
    };
    const crashes: Array<{ ruleId: string; error: unknown }> = [];
    let emitted = 0;
    typescriptAdapter.runRules(
      [boom],
      { path: "a.spec.ts", text: "it('a', () => {});\n" },
      () => {
        emitted++;
      },
      (ruleId, error) => crashes.push({ ruleId, error }),
    );
    expect(emitted).toBe(0);
    expect(crashes).toHaveLength(1);
    expect(crashes[0]?.ruleId).toBe("QA-BOOM-001");
    expect((crashes[0]?.error as Error).message).toBe("boom");
  });

  it("a crashing plugin rule increments analysisStatus.rulesCrashed without changing the exit path", async () => {
    // Minimal real plugin: a package in the scanned repo's node_modules
    // whose only rule throws on every file.
    const pluginDir = join(dir, "node_modules", "crashing-plugin");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, "package.json"),
      JSON.stringify({
        name: "crashing-plugin",
        version: "1.0.0",
        main: "index.cjs",
      }),
    );
    writeFileSync(
      join(pluginDir, "index.cjs"),
      "module.exports = { rules: [{ id: 'QA-CRSH-001', category: 'QA-TEST', appliesTo: 'test-files', run() { throw new Error('plugin boom'); } }] };",
    );
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "repro", private: true }),
    );
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ plugins: ["crashing-plugin"] }),
    );
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(join(dir, "e2e", "a.spec.ts"), "it('a', () => {});\n");

    const result = await runScan(
      parseArgs([dir]) ?? {
        target: dir,
        json: false,
        verbose: false,
        maxDurationMs: 60_000,
        scopeChanged: false,
        format: "terminal",
      },
    );
    expect(result.analysisStatus.rulesCrashed).toBe(1);
    // Audit S-8: the plugin that ran is visible in the JSON contract.
    expect(result.plugins).toEqual([{ name: "crashing-plugin", rules: 1 }]);
    // The plugin itself loaded fine — no QA-PLUGIN-000 degradation finding.
    expect(
      result.findings.filter((f) => f.ruleId === "QA-PLUGIN-000"),
    ).toHaveLength(0);
  });

  it("--debug prints swallowed crashes to stderr; default stays silent", async () => {
    const pluginDir = join(dir, "node_modules", "crashing-plugin");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, "package.json"),
      JSON.stringify({
        name: "crashing-plugin",
        version: "1.0.0",
        main: "index.cjs",
      }),
    );
    writeFileSync(
      join(pluginDir, "index.cjs"),
      "module.exports = { rules: [{ id: 'QA-CRSH-001', category: 'QA-TEST', appliesTo: 'test-files', run() { throw new Error('plugin boom'); } }] };",
    );
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "repro", private: true }),
    );
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ plugins: ["crashing-plugin"] }),
    );
    writeFileSync(join(dir, "a.spec.ts"), "it('a', () => {});\n");

    const loud: string[] = [];
    await runScanCommand([dir, "--debug", "--json"], {
      out: () => {},
      err: (...parts) => loud.push(parts.map(String).join(" ")),
    });
    expect(loud.join("\n")).toContain("1 rule crash(es)");
    expect(loud.join("\n")).toContain("plugin boom");

    const silent: string[] = [];
    await runScanCommand([dir, "--json"], {
      out: () => {},
      err: (...parts) => silent.push(parts.map(String).join(" ")),
    });
    expect(silent.join("\n")).not.toContain("rule crash");
  });

  it("a clean scan reports rulesCrashed 0", async () => {
    writeFileSync(join(dir, "a.spec.ts"), "it('a', () => {});\n");
    const result = await runScan(
      parseArgs([dir]) ?? {
        target: dir,
        json: false,
        verbose: false,
        maxDurationMs: 60_000,
        scopeChanged: false,
        format: "terminal",
      },
    );
    expect(result.analysisStatus.rulesCrashed).toBe(0);
  });
});

// ─── R-3: the .mjolnir state-tracking decision is encoded ─────────────

describe("R-3: .mjolnir state files are tracked deliberately", () => {
  it("stats.json is gitignored (machine-local); baseline.json is not", () => {
    const gitignore = readFileSync(join(process.cwd(), ".gitignore"), "utf8");
    const activePatterns = gitignore
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));
    expect(activePatterns).toContain(".mjolnir/stats.json");
    expect(
      activePatterns.some((p) => p.includes(".mjolnir/baseline.json")),
    ).toBe(false);
  });
});

// ─── R-1 support: the opt-in flag is parsed, default is off ───────────

describe("R-1: --record-milestones is an explicit opt-in", () => {
  it("parses the flag", () => {
    expect(parseArgs(["--record-milestones"])?.recordMilestones).toBe(true);
    expect(parseArgs(["."])?.recordMilestones).toBeUndefined();
  });
});

// ─── H-4 gap: every scanning subcommand refuses a bogus target ────────

describe("H-4 (extended): target validation in all scanning commands", () => {
  const cases: Array<[string, (argv: string[]) => Promise<number>]> = [
    ["badge", (a) => runBadgeCommand(a, { out: () => {}, err: () => {} })],
    [
      "baseline",
      (a) => runBaselineCommand(a, { out: () => {}, err: () => {} }),
    ],
    ["diff", (a) => runDiffCommand(a, { out: () => {}, err: () => {} })],
  ];
  for (const [name, run] of cases) {
    it(`mjolnir ${name} on a nonexistent target exits 10`, async () => {
      const missing = join(dir, "does-not-exist");
      expect(await run([missing])).toBe(10);
    });
  }
});

// ─── P-1: the per-file analysis budget ────────────────────────────────

function scanArgs(target: string, over: Record<string, unknown> = {}) {
  const parsed = parseArgs([target]);
  if (!parsed) throw new Error("parseArgs failed");
  return { ...parsed, target, ...over };
}

describe("P-1: a single expensive file can no longer own the scan", () => {
  it("a file exceeding its budget is skipped mid-way and reported", async () => {
    for (const n of ["a", "b", "c"]) {
      writeFileSync(join(dir, `${n}.spec.ts`), "it('x', () => {});\n");
    }
    // Deterministic clock: real time through discovery (5 Date.now calls),
    // then +6s per call — each file's 5s budget is exceeded mid-pass, well
    // before the global 60s deadline.
    const realNow = Date.now();
    let calls = 0;
    vi.spyOn(Date, "now").mockImplementation(() => {
      calls++;
      return calls <= 5 ? realNow : realNow + 6000 + (calls - 6) * 6000;
    });
    const result = await runScan(scanArgs(dir, { maxDurationMs: 60_000 }));
    expect(result.analysisStatus.rules).toBe("partial");
    expect(result.partial).toBe(true);
    expect(result.analysisStatus.truncationReasons).toContain("file-budget");
    expect(result.analysisStatus.skippedFiles).toBeGreaterThanOrEqual(3);
  });
});

// ─── P-2: one shared walk fills every adapter's bucket ────────────────

describe("P-2: discoverAllTestFiles — one walk, all adapters", () => {
  it("dispatches each file to exactly the adapter that claims it", () => {
    mkdirSync(join(dir, "node_modules", "x"), { recursive: true });
    writeFileSync(join(dir, "a.spec.ts"), "it('a', () => {});\n");
    writeFileSync(join(dir, "test_b.py"), "def test_b():\n    pass\n");
    writeFileSync(join(dir, "LoginTest.java"), "class LoginTest {}\n");
    writeFileSync(join(dir, "LoginTests.cs"), "class LoginTests {}\n");
    // Ignored locations must never be discovered.
    writeFileSync(
      join(dir, "node_modules", "x", "ignored.spec.ts"),
      "it('i', () => {});\n",
    );
    writeFileSync(join(dir, "helper.ts"), "export {};\n");

    const languageAdapters = [
      typescriptAdapter,
      pythonAdapter,
      javaAdapter,
      csharpAdapter,
    ];
    const buckets = new Map<string, string[]>(
      languageAdapters.map((a) => [a.id, [] as string[]]),
    );
    const ctx: ScanContext = {
      workspace: {
        root: dir,
        name: "t",
        packageJson: {},
        workspaceGlobs: [],
      } satisfies Workspace,
      testFiles: [],
      deadline: Date.now() + 60_000,
      maxFiles: LIMITS.maxFilesPerAdapter,
      ignoreMatcher: createIgnoreMatcher(dir),
      onSkippedFile: () => {},
      onDiscoveryTruncated: () => {},
    };
    discoverAllTestFiles(
      ctx,
      languageAdapters,
      buckets,
      new Map<string, boolean>(),
    );
    expect(
      buckets.get("typescript")?.map((f) => f.split(/[\\/]/).pop()),
    ).toEqual(["a.spec.ts"]);
    expect(buckets.get("python")?.map((f) => f.split(/[\\/]/).pop())).toEqual([
      "test_b.py",
    ]);
    expect(buckets.get("java")?.map((f) => f.split(/[\\/]/).pop())).toEqual([
      "LoginTest.java",
    ]);
    expect(buckets.get("csharp")?.map((f) => f.split(/[\\/]/).pop())).toEqual([
      "LoginTests.cs",
    ]);
  });
});
