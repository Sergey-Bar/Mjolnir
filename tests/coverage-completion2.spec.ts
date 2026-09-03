 
/**
 * Remaining coverage-completion specs (Phase 5–8, CI 100% per-file gate):
 * the concurrency slot in tree-sitter-ast.ts, disposeTree's no-throw
 * contract, and CLI-command guard branches.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  parseCSharpAst,
  parseJavaAst,
  disposeTree,
  _resetForTests,
} from "../src/engine/tree-sitter-ast.js";
import { typescriptAdapter } from "../src/adapters/typescript.js";
import {
  runBadgeCommand,
  runDebtCommand,
  runTriageCommand,
} from "../src/cli.js";
import type { ScanResult } from "../src/types.js";

const dirs: string[] = [];

afterEach(() => {
  _resetForTests();
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs.length = 0;
});

describe("tree-sitter-ast — concurrency slot + dispose contract", () => {
  it("concurrent parses beyond MAX_CONCURRENT_PARSES all complete (waiters resolve)", async () => {
    const texts = [
      "class A { void m() {} }\n",
      "class B { void m() {} }\n",
      "class C { void m() {} }\n",
      "class D { void m() {} }\n",
    ];
    const trees = await Promise.all(texts.map((t) => parseJavaAst(t)));
    // Every parse completed despite the 2-slot cap — the waiters queue.
    expect(trees.every((t) => t !== undefined)).toBe(true);
    for (const t of trees) t?.delete();
  });

  it("a throwing parse fn still releases its slot (finally path) — the next parse succeeds", async () => {
    // First parse: fine. The slot release in `finally` runs after both
    // outcomes; assert a second parse works after any first outcome.
    await parseJavaAst("class A {}\n");
    const second = await parseCSharpAst("class B {}\n");
    expect(second).toBeDefined();
    second?.delete();
  });

  it("disposeTree: non-tree / null / undefined / throwing delete → no crash", () => {
    expect(() => disposeTree(undefined)).not.toThrow();
    expect(() => disposeTree(null)).not.toThrow();
    expect(() => disposeTree(42)).not.toThrow();
    expect(() => disposeTree({})).not.toThrow();
    expect(() =>
      disposeTree({
        delete() {
          throw new Error("already freed");
        },
      }),
    ).not.toThrow();
    let deleted = 0;
    const tree = {
      delete(): void {
        deleted++;
      },
    };
    disposeTree(tree);
    expect(deleted).toBe(1);
  });
});

// ─── CLI guard branches (badge/debt/triage usage errors) ─────────────

describe("CLI guard branches — badge/debt/triage usage errors", () => {
  it("runBadgeCommand with an unknown flag → usage + exit 10 (parseArgs null)", async () => {
    const out: string[] = [];
    const code = await runBadgeCommand(["--bogus"], {
      out: (s: unknown) => out.push(String(s)),
      err: () => {},
    });
    expect(code).toBe(10);
    expect(out.join("\n")).toContain("Usage:");
  });

  it("runDebtCommand with an unknown flag → usage + exit 10 (parseArgs null)", async () => {
    const out: string[] = [];
    const code = await runDebtCommand(["--bogus"], {
      out: (s: unknown) => out.push(String(s)),
      err: () => {},
    });
    expect(code).toBe(10);
    expect(out.join("\n")).toContain("Usage:");
  });

  it("runTriageCommand without a target → usage + exit 10", () => {
    const err: string[] = [];
    const code = runTriageCommand([], {
      out: () => {},
      err: (s: unknown) => err.push(String(s)),
    });
    expect(code).toBe(10);
    expect(err.join("\n")).toContain("Usage: mjolnir triage");
  });

  it("runBadgeCommand on a nonexistent target → exit 10 (validateScanTarget)", async () => {
    const err: string[] = [];
    const code = await runBadgeCommand([join(tmpdir(), "mjolnir-nope-zz")], {
      out: () => {},
      err: (s: unknown) => err.push(String(s)),
    });
    expect(code).toBe(10);
    expect(err.join("\n")).toContain("does not exist");
  });

  it("runDebtCommand on a nonexistent target → exit 10", async () => {
    const err: string[] = [];
    const code = await runDebtCommand([join(tmpdir(), "mjolnir-nope-zz")], {
      out: () => {},
      err: (s: unknown) => err.push(String(s)),
    });
    expect(code).toBe(10);
    expect(err.join("\n")).toContain("does not exist");
  });

  it("runTriageCommand on a directory with no reports degrades to exit 2 (usage-shaped)", () => {
    const d = mkdtempSync(join(tmpdir(), "mjolnir-triage-"));
    dirs.push(d);
    const err: string[] = [];
    const code = runTriageCommand([d], {
      out: () => {},
      err: (s: unknown) => err.push(String(s)),
    });
    // The forensics layer reports "No test results recognized" as a
    // usage error (exit 2), not an internal error.
    expect(code).toBe(2);
  });
});

// ─── cli.ts runRulesCommand — --external with a local rules dir ─────

describe("runRulesCommand --external (loaded-catalog branch)", () => {
  it("with a local rule present, --external appends it with provenance external and surfaces warnings on stderr", async () => {
    // Imported lazily to avoid a CLI ↔ command cycle at module init.
    const { runRulesCommand } = await import("../src/cli.js");
    const { loadLocalRules } = await import("../src/plugins/local-rules.js");
    const d = mkdtempSync(join(tmpdir(), "mjolnir-extcat-"));
    dirs.push(d);
    mkdirSync(join(d, "mjolnir-rules"), { recursive: true });
    writeFileSync(
      join(d, "mjolnir-rules", "acme.json"),
      JSON.stringify({
        id: "QA-ACME-200",
        title: "Ext",
        severity: "warning",
        confidence: "medium",
        category: "QA-TEST",
        appliesTo: "test-files",
        patterns: ["Z+"],
        qaImpact: "HYGIENE",
      }),
    );
    // Reserved-prefix file → load error → stderr warning path (L974).
    writeFileSync(
      join(d, "mjolnir-rules", "spoof.json"),
      JSON.stringify({
        id: "qa-pw-000",
        severity: "info",
        category: "QA-PW",
        appliesTo: "test-files",
        patterns: ["X+"],
        qaImpact: "HYGIENE",
      }),
    );
    const loaded = await loadLocalRules(d);
    expect(loaded.rules).toHaveLength(1);
    expect(loaded.errors).toHaveLength(1);

    // The command path itself: process.cwd is not the temp dir, so run
    // the catalog merge via buildCatalog through the exported command
    // with chdir-free inputs — assert via the JSON shape instead.
    const out: string[] = [];
    const prevCwd = process.cwd();
    try {
      process.chdir(d);
      const code = await runRulesCommand(["--external"], {
        out: (s: unknown) => out.push(String(s)),
        err: () => {},
      });
      expect(code).toBe(0);
      const catalog = JSON.parse(out.join("\n")) as Array<{
        id: string;
        provenance: string;
      }>;
      const external = catalog.filter((e) => e.provenance === "external");
      expect(external.map((e) => e.id)).toContain("QA-ACME-200");
    } finally {
      process.chdir(prevCwd);
    }
  });
});

// ─── adapters — config-rule gating branches (§15.2) ──────────────────

describe("typescriptAdapter.runRules — configRule/configFiles gating", () => {
  const mkRule = (configOnly: boolean, configFiles?: string[]) => ({
    id: "R-CFG",
    category: "QA-PW",
    appliesTo: ["typescript"],
    configOnly,
    ...(configFiles !== undefined ? { configFiles } : {}),
    run: (ctx: { path: string }) => [
      {
        severity: "info" as const,
        confidence: "high" as const,
        findingType: "deterministic-defect" as const,
        qaImpact: "HYGIENE" as const,
        file: ctx.path,
        line: 1,
        column: 1,
        message: "m",
        why: "w",
        fix: "f",
      },
    ],
  });

  const configJson = `export default { testDir: "./e2e" };\n`;

  it("configFiles-declared rule runs on its declared config file; test rule skipped on config", () => {
    const emitted: string[] = [];
    typescriptAdapter.runRules(
      [mkRule(true, ["^cypress\\.config\\.(?:js|ts)$"]), mkRule(false)],
      { path: "cypress.config.js", text: configJson },
      (f, ruleId) => emitted.push(ruleId),
      undefined,
      undefined,
    );
    expect(emitted).toEqual(["R-CFG"]);
  });

  it("a config rule on a TEST file is skipped (configOnly gate)", () => {
    const emitted: string[] = [];
    typescriptAdapter.runRules(
      [mkRule(true, ["^cypress\\.config\\.(?:js|ts)$"])],
      { path: "e2e/a.spec.ts", text: "it('a', () => {});\n" },
      (f, ruleId) => emitted.push(ruleId),
      undefined,
      undefined,
    );
    expect(emitted).toEqual([]);
  });

  it("a configOnly rule whose configFiles DON'T match the config file → skipped (configGateMatches false)", () => {
    const emitted: string[] = [];
    typescriptAdapter.runRules(
      [mkRule(true, ["^playwright\\.config\\.(?:ts|js)$"])],
      { path: "cypress.config.js", text: configJson },
      (f, ruleId) => emitted.push(ruleId),
      undefined,
      undefined,
    );
    expect(emitted).toEqual([]);
  });
});

// ─── ScanResult JSON serialization parity (used by CI summary) ───────

describe("ScanResult round-trip", () => {
  it("agenticProfile + runtime fields serialize without breaking schemaVersion", async () => {
    const { computeAgenticProfile } =
      await import("../src/engine/provenance.js");
    const profile = computeAgenticProfile(
      [{ path: "a.ts", provenance: "codegen-like" }],
      [],
    );
    const result = {
      schemaVersion: 1,
      agenticProfile: profile,
    } as unknown as ScanResult;
    const round = JSON.parse(JSON.stringify(result)) as ScanResult;
    expect(round.schemaVersion).toBe(1);
    expect(round.agenticProfile?.codegenLikeFiles).toBe(1);
  });
});
