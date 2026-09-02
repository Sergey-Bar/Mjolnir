/**
 * Regression tests for audit findings H-1 … H-10 (AUDIT-2026-08-29).
 *
 * H-1 quarantine tier caps severity/evidence (never gates)
 * H-2 Law #3 ratchet (covered in trust-upgrade.spec.ts)
 * H-3 --max-duration bounds the rule loop; honest analysisStatus
 * H-4 nonexistent/file scan target exits 10 (covered in
 *     config-feature-audit.spec.ts)
 * H-5 empty-state hint references a real invocation (covered in
 *     empty-states.spec.ts)
 * H-6 empty-state lists every adapter's search patterns (covered in
 *     empty-states.spec.ts)
 * H-7 config.gate drives the exit-code decision
 * H-8 discovery truncation: per-adapter budget + named reasons
 * H-9 --scope changed sees Python/Java/C#/workflow changes
 * H-10 --base flag, main→master fallback, working tree included
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  parseArgs,
  runScan,
  runScanCommand,
  exitForFindings,
} from "../src/cli.js";
import { typescriptAdapter } from "../src/adapters/typescript.js";
import { pythonAdapter } from "../src/adapters/python.js";
import { createIgnoreMatcher, LIMITS } from "../src/discovery/ignores.js";
import {
  discoverAllTestFiles,
  isKnownTestFile,
} from "../src/discovery/scan-adapters.js";
import { computeChangedScope, filterToChanged } from "../src/scope/changed.js";
import { isAdvisoryFinding, type Finding } from "../src/types.js";
import type { ScanContext } from "../src/engine/adapter.js";
import type { Workspace } from "../src/discovery/workspace.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-h-fixes-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function scanArgs(target: string, over: Record<string, unknown> = {}) {
  const parsed = parseArgs([target]);
  if (!parsed) throw new Error("parseArgs failed");
  return { ...parsed, target, ...over };
}

function finding(file: string, line: number): Finding {
  return {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FALSE-GREEN",
    file,
    line,
    column: 1,
    message: "m",
    why: "w",
    fix: "f",
  };
}

// ─── H-1: quarantine tier is authoritative ────────────────────────────

describe("H-1: quarantine findings are capped to info/E0 and never gate", () => {
  beforeEach(() => {
    // The audit's repro: one placeholder Python test with no assertions —
    // fires QA-PY-003 (and QA-PY-006), both quarantine tier with a
    // measured 100% FP rate.
    writeFileSync(
      join(dir, "test_placeholder.py"),
      "def test_placeholder():\n    pass\n",
    );
  });

  it("strict scan caps quarantine findings to severity=info, evidence=E0", async () => {
    const result = await runScan(scanArgs(dir, { strict: true }));
    const quarantine = result.findings.filter((f) =>
      ["QA-PY-003", "QA-PY-006"].includes(f.ruleId),
    );
    expect(quarantine.length).toBeGreaterThan(0);
    for (const f of quarantine) {
      expect(f.severity, `${f.ruleId} severity`).toBe("info");
      expect(f.evidenceLevel, `${f.ruleId} evidence`).toBe("E0");
      expect(isAdvisoryFinding(f), `${f.ruleId} advisory`).toBe(true);
    }
  });

  it("the audit's repro now exits 0 instead of gating on a 100%-FP rule", async () => {
    const code = await runScanCommand([dir, "--strict", "--json"], {
      out: () => {},
      err: () => {},
    });
    expect(code).toBe(0);
  });

  it("quarantine rules stay excluded from a default (non-strict) scan", async () => {
    const result = await runScan(scanArgs(dir));
    expect(
      result.findings.filter((f) =>
        ["QA-PY-003", "QA-PY-006"].includes(f.ruleId),
      ),
    ).toHaveLength(0);
  });
});

// ─── H-3: the deadline bounds the rule loop; status is honest ─────────

describe("H-3: --max-duration honours the budget in the rule loop", () => {
  it("the rule loop checks the deadline per file and counts unscanned files", async () => {
    for (let i = 0; i < 150; i++) {
      writeFileSync(join(dir, `a${i}.spec.ts`), "it('a', () => {});\n");
    }
    // Deterministic clock: real time through discovery — runScan calls
    // Date.now exactly 5 times before the rule loop (scan start + one
    // walk-entry check per language adapter) — then 60s past the
    // deadline for every per-file loop check.
    const realNow = Date.now();
    let calls = 0;
    vi.spyOn(Date, "now").mockImplementation(() => {
      calls++;
      return calls <= 5 ? realNow : realNow + 60_000;
    });
    const result = await runScan(scanArgs(dir, { maxDurationMs: 1000 }));
    expect(result.analysisStatus.rules).toBe("partial");
    expect(result.analysisStatus.discovery).toBe("complete");
    expect(result.partial).toBe(true);
    expect(result.analysisStatus.skippedFiles).toBe(150);
    expect(result.analysisStatus.truncationReasons).toContain(
      "rule-loop-deadline",
    );
  });

  it("a finished scan reports complete/complete with no truncation reasons", async () => {
    writeFileSync(join(dir, "a.spec.ts"), "it('a', () => {});\n");
    const result = await runScan(scanArgs(dir));
    expect(result.analysisStatus.discovery).toBe("complete");
    expect(result.analysisStatus.rules).toBe("complete");
    expect(result.analysisStatus.truncationReasons).toBeUndefined();
    expect(result.partial).toBe(false);
  });
});

// ─── H-7: config.gate is live ─────────────────────────────────────────

describe("H-7: config.gate drives the exit code", () => {
  beforeEach(() => {
    mkdirSync(join(dir, "e2e"), { recursive: true });
    // The gate fixture needs an ERROR finding from a NON-quarantine
    // rule: the 2026-09-02 measured-wave demoted QA-TEST-001 (focused
    // test) to quarantine, and the tier policy caps quarantine findings
    // to severity=info/E0 which never gate (H-1). QA-CI-009 (exit-code
    // not propagated) still fires error on this workflow.
    mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
    writeFileSync(
      join(dir, ".github", "workflows", "ci.yml"),
      "on:\n  push:\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test | tee out.log\n",
    );
  });

  const writeConfig = (cfg: Record<string, unknown>) =>
    writeFileSync(join(dir, "mjolnir.config.json"), JSON.stringify(cfg));

  const scan = async () =>
    runScanCommand([dir, "--json", "--strict"], {
      out: () => {},
      err: () => {},
    });

  it("no config → default gate error → an error finding exits 1", async () => {
    expect(await scan()).toBe(1);
  });

  it("gate advisory → findings reported, exit 0", async () => {
    writeConfig({ gate: "advisory" });
    expect(await scan()).toBe(0);
  });

  it("gate error → an error finding exits 1", async () => {
    writeConfig({ gate: "error" });
    expect(await scan()).toBe(1);
  });

  it("gate warning → downgraded-to-warning findings gate", async () => {
    writeConfig({
      gate: "warning",
      severityOverrides: {
        "QA-CI-009": "warning",
      },
    });
    expect(await scan()).toBe(1);
  });

  it("gate error → warning-severity findings do not gate", async () => {
    writeConfig({
      gate: "error",
      severityOverrides: {
        "QA-CI-009": "warning",
      },
    });
    expect(await scan()).toBe(0);
  });

  it("exitForFindings: E0/advisory findings never gate at any level", () => {
    const advisory: Finding = {
      ...finding("a.spec.ts", 1),
      severity: "error",
      evidenceLevel: "E0",
    };
    expect(exitForFindings([advisory], "error")).toBe(0);
    expect(exitForFindings([advisory], "warning")).toBe(0);
    expect(exitForFindings([advisory], "advisory")).toBe(0);
  });
});

// ─── H-8: per-adapter budgets and named truncation reasons ────────────

function ctxFor(root: string, over: Partial<ScanContext> = {}): ScanContext {
  const workspace: Workspace = {
    root,
    name: "t",
    packageJson: {},
    workspaceGlobs: [],
  };
  return {
    workspace,
    testFiles: [],
    deadline: Date.now() + 60_000,
    maxFiles: LIMITS.maxFilesPerAdapter,
    ignoreMatcher: createIgnoreMatcher(root),
    onSkippedFile: () => {},
    onDiscoveryTruncated: () => {},
    ...over,
  };
}

describe("H-8: discovery budgets and truncation reporting", () => {
  it("a per-adapter cap stops discovery and names the reason", () => {
    for (const sub of ["one", "two"]) {
      mkdirSync(join(dir, sub), { recursive: true });
      writeFileSync(join(dir, sub, "a.spec.ts"), "it('a', () => {});\n");
    }
    const truncated: string[] = [];
    const ctx = ctxFor(dir, {
      maxFiles: 1,
      onDiscoveryTruncated: (reason) => truncated.push(reason),
    });
    typescriptAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(1);
    expect(truncated).toContain("file-cap:typescript");
  });

  it("an expired deadline stops discovery and names the reason", () => {
    writeFileSync(join(dir, "a.spec.ts"), "it('a', () => {});\n");
    const truncated: string[] = [];
    const ctx = ctxFor(dir, {
      deadline: Date.now() - 1000,
      onDiscoveryTruncated: (reason) => truncated.push(reason),
    });
    pythonAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(0);
    expect(truncated).toContain("deadline");
  });

  it("one shared walk buckets each file to its own adapter, capped per adapter", () => {
    // P-2 collapsed four tree walks into one. The bucketing loop is the
    // only place a discovered file is attributed to a language, so it is
    // covered directly: two TS files (the second lands in an EXISTING
    // bucket) plus one Python file.
    writeFileSync(join(dir, "a.spec.ts"), "it('a', () => {});\n");
    writeFileSync(join(dir, "b.spec.ts"), "it('b', () => {});\n");
    writeFileSync(join(dir, "test_c.py"), "def test_c():\n    pass\n");
    const buckets = new Map<string, string[]>();
    discoverAllTestFiles(
      ctxFor(dir, { maxFiles: 5 }),
      [typescriptAdapter, pythonAdapter],
      buckets,
      new Map(),
    );
    expect(buckets.get("typescript")).toHaveLength(2);
    expect(buckets.get("python")).toHaveLength(1);
  });

  it("the shared walk stops only once EVERY adapter bucket is full", () => {
    for (const name of ["a.spec.ts", "b.spec.ts"]) {
      writeFileSync(join(dir, name), "it('x', () => {});\n");
    }
    for (const name of ["test_a.py", "test_b.py"]) {
      writeFileSync(join(dir, name), "def test_x():\n    pass\n");
    }
    const truncated: string[] = [];
    const buckets = new Map<string, string[]>();
    discoverAllTestFiles(
      ctxFor(dir, {
        maxFiles: 1,
        onDiscoveryTruncated: (reason) => truncated.push(reason),
      }),
      [typescriptAdapter, pythonAdapter],
      buckets,
      new Map(),
    );
    // isFull() is an EVERY, not a some: a full TS bucket must not stop
    // Python discovery — that regression is exactly audit H-8.
    expect(buckets.get("typescript")).toHaveLength(1);
    expect(buckets.get("python")).toHaveLength(1);
    expect(truncated.length).toBeGreaterThan(0);
  });

  it("every shipped adapter exposes its search patterns (H-6 contract)", () => {
    // Included here so the empty-state display can never silently lose
    // an adapter: SCAN_ADAPTERS and SEARCHED_FOR are derived from the
    // same registry.
    expect(isKnownTestFile("a/b/c.test.ts")).toBe(true);
    expect(isKnownTestFile("tests/test_login.py")).toBe(true);
    expect(isKnownTestFile("src/LoginTest.java")).toBe(true);
    expect(isKnownTestFile("src/LoginTests.cs")).toBe(true);
    expect(isKnownTestFile(".github/workflows/ci.yml")).toBe(true);
    expect(isKnownTestFile("src/util.ts")).toBe(false);
  });
});

// ─── H-9/H-10: changed-scope ──────────────────────────────────────────

function git(args: string[], cwd: string): void {
  execFileSync("git", ["-C", cwd, ...args], { stdio: "ignore" });
}

describe("H-9: --scope changed recognizes every adapter's test files", () => {
  it("keeps findings on changed Python/Java/C# test files and workflows", () => {
    git(["init", "-b", "main"], dir);
    git(["config", "user.email", "t@t"], dir);
    git(["config", "user.name", "t"], dir);
    writeFileSync(join(dir, "test_base.py"), "def test_base():\n    pass\n");
    git(["add", "."], dir);
    git(["commit", "-m", "init"], dir);

    // Untracked (uncommitted) files across every language — all must
    // enter the changed set (H-9 predicate + H-10 working tree).
    writeFileSync(join(dir, "test_new.py"), "def test_new():\n    pass\n");
    writeFileSync(join(dir, "LoginTest.java"), "class LoginTest {}\n");
    writeFileSync(join(dir, "LoginTests.cs"), "class LoginTests {}\n");
    mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
    writeFileSync(join(dir, ".github", "workflows", "ci.yml"), "on: push\n");
    writeFileSync(join(dir, "helper.ts"), "export {};\n"); // not a test file

    const diff = computeChangedScope(dir, "main");
    expect(diff.degraded).toBe(false);
    expect(Object.keys(diff.changed).sort()).toEqual([
      ".github/workflows/ci.yml",
      "LoginTest.java",
      "LoginTests.cs",
      "test_new.py",
    ]);

    const kept = filterToChanged([finding("test_new.py", 1)], diff);
    expect(kept).toHaveLength(1);
    const dropped = filterToChanged([finding("helper.ts", 1)], diff);
    expect(dropped).toHaveLength(0);
  });
});

describe("H-10: base-branch fallback and the working tree", () => {
  it("falls back to master when no --base is given and main does not exist", () => {
    git(["init", "-b", "master"], dir);
    git(["config", "user.email", "t@t"], dir);
    git(["config", "user.name", "t"], dir);
    writeFileSync(join(dir, "a.spec.ts"), "it('a', () => {});\n");
    git(["add", "."], dir);
    git(["commit", "-m", "init"], dir);
    git(["checkout", "-b", "feature"], dir);
    writeFileSync(join(dir, "b.spec.ts"), "it('b', () => {});\n");
    git(["add", "."], dir);
    git(["commit", "-m", "wip"], dir);

    const diff = computeChangedScope(dir); // no base → main → master chain
    expect(diff.degraded).toBe(false);
    expect(Object.keys(diff.changed)).toContain("b.spec.ts");
  });

  it("includes uncommitted modifications to tracked test files", () => {
    git(["init", "-b", "main"], dir);
    git(["config", "user.email", "t@t"], dir);
    git(["config", "user.name", "t"], dir);
    writeFileSync(join(dir, "a.spec.ts"), "it('a', () => {});\n");
    git(["add", "."], dir);
    git(["commit", "-m", "init"], dir);

    // Local, not yet committed: the old mergeBase..HEAD-only diff saw
    // nothing; the working tree is now included.
    writeFileSync(
      join(dir, "a.spec.ts"),
      "it('a', () => {});\nit('b', () => {});\n",
    );
    const diff = computeChangedScope(dir, "main");
    expect(diff.degraded).toBe(false);
    const lines = diff.changed["a.spec.ts"];
    expect(lines).toBeDefined();
    expect(lines?.has(2)).toBe(true);
  });

  it("parses --base and rejects a missing value", () => {
    expect(parseArgs(["--scope", "changed", "--base", "develop"])?.base).toBe(
      "develop",
    );
    expect(parseArgs(["--base"])).toBeNull();
    expect(parseArgs(["--base", "--json"])).toBeNull();
  });
});
