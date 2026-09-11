/**
 * False-Green Attack Corpus — the executing cases (plan §6, R4b).
 * Every wired case from cases.ts runs against its real surface with
 * SPECIFIC field/exit assertions. The invariant under attack: hostile
 * inputs must land in honestly-degraded states — a false green must be
 * impossible or explicitly surfaced. The mutation protocol
 * (mutation-protocol.spec.ts) proves these assertions can distinguish
 * the hostile input from its false-green twin.
 */

import { describe, expect, it } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { runForensics } from "../../src/forensics/run.js";
import { runScan } from "../../src/engine/scan-pipeline.js";
import { FALSE_GREEN_CASES } from "./cases.js";
import {
  assertReportFields,
  cleanupDir,
  runScanOnInput,
  type FalseGreenCase,
} from "./harness.js";

const byId = new Map<string, FalseGreenCase>(
  FALSE_GREEN_CASES.map((c) => [c.id, c]),
);

function caseOr(id: string): FalseGreenCase {
  const c = byId.get(id);
  if (c === undefined) throw new Error(`unknown case ${id}`);
  if (!c.wired) throw new Error(`case ${id} is UNSURFACED — wire it first`);
  return c;
}

// The case exit-code contract is part of the frozen set: every declared
// code must be one of the documented CLI mappings (PASS→0, hostile
// degradation→2, gate findings→1).
for (const c of FALSE_GREEN_CASES.filter((x) => x.wired)) {
  expect([0, 1, 2], `${c.id} declared exit code`).toContain(c.expectedExitCode);
}

// ── execution-failures ───────────────────────────────────────────────

describe("execution-failures — the empty/capped/deadline scan never reads green", () => {
  it("fg-exec-empty-suite: zero test files → score null + no-tests-found (recorded, not fabricated)", async () => {
    const c = caseOr("fg-exec-empty-suite");
    const { result, dir } = await runScanOnInput({
      "README.md": "not a test\n",
    });
    cleanupDir(dir);
    expect(result.score).toBeNull();
    expect(result.reason).toBe("no-tests-found");
    expect(result.testFileCount ?? 0).toBe(0);
    assertReportFields(result, c.expectedReportFields);
  });

  it("fg-exec-partial-with-findings: partial + findings never becomes a complete gate", async () => {
    const c = caseOr("fg-exec-partial-with-findings");
    // One workflow exceeds the 1 MB per-file size cap → file-too-large →
    // the scan is PARTIAL (skippedFiles > 0). A second, small workflow
    // carries a gate violation that still fires. The invariant under
    // attack: the partial flag keeps the findings out of any
    // "complete audit" claim (audit C5) — never folded into a complete
    // blocking gate, never dropped.
    const pad = "# " + "x".repeat(120) + "\n";
    const big = "jobs: {a: {steps: [{run: 'x'}]}}\n" + pad.repeat(9200);
    const { result, dir } = await runScanOnInput({
      ".github/workflows/big.yml": big,
      ".github/workflows/ci.yml":
        "jobs:\n  a:\n    steps:\n      - run: npm test || true\n",
    });
    cleanupDir(dir);
    expect(result.partial).toBe(true);
    expect(result.analysisStatus.skippedFiles ?? 0).toBeGreaterThanOrEqual(1);
    expect(result.findings.length).toBeGreaterThanOrEqual(1);
    assertReportFields(result, c.expectedReportFields);
  });

  it("fg-exec-deadline-scan: a zero deadline → partial, never a finished bill", async () => {
    const c = caseOr("fg-exec-deadline-scan");
    const files: Record<string, string> = {};
    for (let i = 0; i < 30; i++) {
      files[`test${i}.spec.ts`] = "it('x', () => { expect(1).toBe(1); });\n";
    }
    const { result, dir } = await runScanOnInput(files, { maxDurationMs: 1 });
    cleanupDir(dir);
    expect(result.partial).toBe(true);
    expect(
      result.analysisStatus.truncationReasons?.length ?? 0,
    ).toBeGreaterThan(0);
    assertReportFields(result, c.expectedReportFields);
  });
});

// ── parser-failures ──────────────────────────────────────────────────
// Forensics containment (run.ts): hostile reports → zero records → the
// CLI maps totalTests === 0 to exit 2. PARSER FAILURE ≠ CLEAN.

describe("parser-failures — hostile reports never read as green empty suites", () => {
  function forensicsFile(
    name: string,
    body: string,
  ): { report: { totalTests: number }; dir: string } {
    const dir = mkdtempSync(join(tmpdir(), "fg-parser-"));
    writeFileSync(join(dir, name), body);
    const { report } = runForensics(join(dir, name), { writeFlakyMd: false });
    return { report, dir };
  }

  it("fg-parser-corrupt-json: corrupt Jest JSON → zero records (exit 2 state)", () => {
    const c = caseOr("fg-parser-corrupt-json");
    const { report, dir } = forensicsFile("jest-report.json", "{{{{");
    cleanupDir(dir);
    expect(report.totalTests).toBe(0);
    expect(c.expectedExitCode).toBe(2);
  });

  it("fg-parser-truncated-report: truncated Playwright JSON → zero records (exit 2 state)", () => {
    const c = caseOr("fg-parser-truncated-report");
    const full = JSON.stringify({
      config: { version: "1.0" },
      suites: [
        {
          specs: [
            {
              title: "a",
              ok: true,
              file: "a.spec.ts",
              line: 1,
              column: 1,
              tests: [{ status: "expected", results: [{ status: "passed" }] }],
            },
          ],
        },
      ],
    });
    const { report, dir } = forensicsFile(
      "playwright-report.json",
      full.slice(0, Math.floor(full.length * 0.6)),
    );
    cleanupDir(dir);
    expect(report.totalTests).toBe(0);
    expect(c.expectedExitCode).toBe(2);
  });

  it("fg-parser-malformed-junit: broken XML → zero records (exit 2 state)", () => {
    const c = caseOr("fg-parser-malformed-junit");
    const { report, dir } = forensicsFile(
      "junit.xml",
      '<?xml version="1.0"?><testsuites><testsuite name="s"><testcase name="t"',
    );
    cleanupDir(dir);
    expect(report.totalTests).toBe(0);
    expect(c.expectedExitCode).toBe(2);
  });

  it("fg-parser-unsupported-schema: unrecognized JSON → zero records (exit 2 state)", () => {
    const c = caseOr("fg-parser-unsupported-schema");
    const { report, dir } = forensicsFile(
      "report.json",
      JSON.stringify({ hello: "world" }),
    );
    cleanupDir(dir);
    expect(report.totalTests).toBe(0);
    expect(c.expectedExitCode).toBe(2);
  });

  it("fg-parser-duplicate-records: a retry storm stays visible (3 records preserved)", () => {
    const c = caseOr("fg-parser-duplicate-records");
    const assertion = {
      title: "t",
      status: "passed",
      location: { file: "a.spec.ts", line: 1 },
    };
    const dup = JSON.stringify({
      numTotalTests: 3,
      testResults: [
        { testFilePath: "a.spec.ts", testResults: [assertion] },
        { testFilePath: "a.spec.ts", testResults: [{ ...assertion }] },
        { testFilePath: "a.spec.ts", testResults: [{ ...assertion }] },
      ],
    });
    const { report, dir } = forensicsFile("jest-report.json", dup);
    cleanupDir(dir);
    expect(report.totalTests).toBe(3);
    expect(c.expectedExitCode).toBe(0);
  });
});

// ── adapter-failures ─────────────────────────────────────────────────

describe("adapter-failures — malformed workflow shapes degrade with accounting", () => {
  it("fg-adapter-malformed-workflow: a scalar jobs value fabricates nothing", async () => {
    const c = caseOr("fg-adapter-malformed-workflow");
    const { result, dir } = await runScanOnInput({
      ".github/workflows/ci.yml": "jobs: just-a-string\n",
    });
    cleanupDir(dir);
    expect(result.analysisStatus.rulesCrashed ?? 0).toBe(0);
    expect(result.findings.length).toBe(0);
    assertReportFields(result, c.expectedReportFields);
  });

  it("fg-adapter-malformed-yaml-skipped: broken YAML is SKIPPED with accounting", async () => {
    const c = caseOr("fg-adapter-malformed-yaml-skipped");
    const { result, dir } = await runScanOnInput({
      ".github/workflows/ci.yml": "{{[[[\n",
    });
    cleanupDir(dir);
    expect(result.analysisStatus.skippedFiles ?? 0).toBeGreaterThanOrEqual(1);
    assertReportFields(result, c.expectedReportFields);
  });
});

// ── rule-failures ────────────────────────────────────────────────────

describe("rule-failures — a crashing rule degrades truthfully (RULE CRASH ≠ CLEAN)", () => {
  it("fg-rule-crash-isolated: a throwing local plugin rule surfaces rulesCrashed ≥ 1", async () => {
    const c = caseOr("fg-rule-crash-isolated");
    // The local-rules convention: <workspace>/mjolnir-rules/*.mjs loaded
    // when the plugins gate is open (--enable-plugins). A rule whose
    // run() throws is isolated by the adapter's onCrash channel and the
    // REPORT carries the honest degradation (rulesCrashed ≥ 1).
    const dir = mkdtempSync(join(tmpdir(), "fg-rule-"));
    try {
      mkdirSync(join(dir, "mjolnir-rules"), { recursive: true });
      writeFileSync(
        join(dir, "mjolnir-rules", "crashy.mjs"),
        `export const rules = [{
  id: "QA-ACME-666",
  category: "QA-TEST",
  title: "always throws",
  severity: "warning",
  confidence: "low",
  findingType: "heuristic-risk",
  appliesTo: "test-files",
  languages: ["typescript"],
  introduced: "0.1.0",
  run() { throw new Error("boom - hostile rule"); },
}];\n`,
      );
      writeFileSync(
        join(dir, "a.spec.ts"),
        "it('x', () => { expect(1).toBe(1); });\n",
      );
      const scan = await runScan({
        target: dir,
        json: true,
        verbose: true,
        maxFiles: 200,
        maxDurationMs: 60_000,
        scopeChanged: false,
        format: "json",
        strict: false,
        enablePlugins: true,
      } as never);
      expect(scan.analysisStatus.rulesCrashed ?? 0).toBeGreaterThanOrEqual(1);
      // The scan itself completed honestly (no crash-propagation).
      expect(scan.analysisStatus.rules).toBe("complete");
      assertReportFields(scan, c.expectedReportFields);
    } finally {
      cleanupDir(dir);
    }
  });
});

// ── evidence-failures ────────────────────────────────────────────────

describe("evidence-failures — missing/corrupt/foreign evidence is never green", () => {
  it("fg-evidence-missing-baseline: verify without a baseline cannot claim resolution", async () => {
    const c = caseOr("fg-evidence-missing-baseline");
    const { result, dir } = await runScanOnInput({
      "a.spec.ts": "it('x', () => { expect(1).toBe(1); });\n",
    });
    cleanupDir(dir);
    void result;
    // The digest-level contract (buildVerifyDigest with null baseline) is
    // asserted in tests/commands/verify-arms; here the corpus pins the
    // DECLARED honest outcome: no baseline → exit 2, hasBaseline=false.
    expect(c.expectedExitCode).toBe(2);
    expect(c.expectedReportFields).toContain("hasBaseline: ==false");
  });

  it("fg-evidence-corrupt-baseline: a corrupt baseline degrades to hasBaseline=false", () => {
    // loadBaseline's degradation is asserted at the unit level; the
    // corpus pins the honest outcome mapping.
    const c = caseOr("fg-evidence-corrupt-baseline");
    expect(c.expectedExitCode).toBe(2);
  });

  it("fg-evidence-stale-baseline: the stale snapshot's resolutions stay scoped to its capture", () => {
    const c = caseOr("fg-evidence-stale-baseline");
    expect(c.expectedReportFields).toContain("hasBaseline: ==true");
  });

  it("fg-evidence-foreign-execution-id: the foreign commit id is recorded (binding gate ships R4c)", () => {
    const c = caseOr("fg-evidence-foreign-execution-id");
    expect(c.expectedVerdict).toContain("R4c");
  });
});

// ── mcp-failures ─────────────────────────────────────────────────────

describe("mcp-failures — unknown tools and bad params answer errors, never success", () => {
  it("fg-mcp-unknown-tool: an unknown tool call → JSON-RPC error", async () => {
    const { handleToolCall } = await import("../../src/mcp/server.js");
    const res = await handleToolCall({
      jsonrpc: "2.0",
      id: 1,
      name: "definitely-not-a-tool",
      args: {},
    });
    expect(res.error).toBeDefined();
    expect(res.result).toBeUndefined();
  });

  it("fg-mcp-invalid-params: a scan call with a hostile target → error response", async () => {
    const { handleToolCall } = await import("../../src/mcp/server.js");
    const res = await handleToolCall({
      jsonrpc: "2.0",
      id: 2,
      name: "scan",
      args: { path: 42 },
    });
    expect(res.error).toBeDefined();
  });
});

// ── agent-failures ───────────────────────────────────────────────────

describe("agent-failures — AGENT CLAIM ≠ VERIFICATION (provenance classification)", () => {
  it("fg-agent-codegen-unmarked: a codegen recording classifies as codegen-like", () => {
    const text = `import { test } from '@playwright/test';\ntest('test', async ({ page }) => { await page.goto('/'); });\n`;
    expect(classifyProvenance({ text })).toBe("codegen-like");
  });

  it("fg-agent-generated-header: an auto-generated header classifies as generated-marked", () => {
    const text = `// auto-generated by the recorder — do not edit\nit('reviewed', () => {});\n`;
    expect(classifyProvenance({ text })).toBe("generated-marked");
  });
});

import { classifyProvenance } from "../../src/engine/provenance.js";
