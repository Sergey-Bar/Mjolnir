/**
 * Phase 1 coverage: the long tail — selector-health walk/sort/risk arms,
 * scope/changed degradation paths, terminal/theme/mermaid/pr-comment/
 * pw-report/debt/stats/handover/init renderers, forensics parse/analyze/
 * run edges, ignores defense, shared-walk memo, scorer caps, CI rule
 * guards, and the remaining single-branch rule arms.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const readdirSync = ((path: string, ...rest: unknown[]) => {
    if (String(path).endsWith("locked-results")) {
      throw new Error("readdir failed (simulated)");
    }
    return (actual.readdirSync as unknown as (...a: unknown[]) => unknown)(
      path,
      ...rest,
    );
  }) as typeof actual.readdirSync;
  return { ...actual, readdirSync };
});

import {
  computeSelectorHealth,
  renderSelectorHealth,
  scoreLocatorRisk,
} from "../../src/playwright/selector-health.js";
import { computeChangedScope } from "../../src/scope/changed.js";
import { renderTerminal } from "../../src/reporter/terminal.js";
import { shouldUseAscii, wrapText } from "../../src/reporter/theme.js";
import { renderMermaid } from "../../src/reporter/mermaid.js";
import { parsePlaywrightJson } from "../../src/forensics/parse-playwright-json.js";
import { createIgnoreMatcher } from "../../src/discovery/ignores.js";
import {
  analyze,
  renderFlakyMd,
  renderLeaderboard,
} from "../../src/forensics/analyze.js";
import { runForensics } from "../../src/forensics/run.js";
import { computeTotal } from "../../src/scorer/scorer.js";
import { prioritize } from "../../src/scorer/prioritize.js";
import { renderBadgeSnippet } from "../../src/commands/badge.js";
import { renderDebt } from "../../src/commands/debt.js";
import { renderStats } from "../../src/commands/stats.js";
import { buildHandover } from "../../src/commands/handover.js";
import { renderPrComment } from "../../src/commands/pr-comment.js";
import { renderPwRunSummary } from "../../src/commands/pw-report.js";
import { renderInit } from "../../src/commands/init.js";
import { sharedWalk } from "../../src/discovery/shared-walk.js";
import { discoverAllTestFiles } from "../../src/discovery/scan-adapters.js";
import { parseJunitXml } from "../../src/forensics/parse-junit.js";
import { continueOnError } from "../../src/rules/ci/qa-ci-001-continue-on-error.js";
import { retryMasking } from "../../src/rules/ci/qa-ci-007-retry-masking.js";
import { alwaysSuccessStep } from "../../src/rules/ci/qa-ci-008-always-success.js";
import { exitCodeNotPropagated } from "../../src/rules/ci/qa-ci-009-exit-code.js";
import { nonBlockingTestJob } from "../../src/rules/ci/qa-ci-010-non-blocking.js";
import { pwOrderDependence } from "../../src/rules/playwright/qa-pw-119-order-dependence.js";
import { definePatternFamily } from "../../src/rules/shared/family.js";
import { parseWorkflow } from "../../src/discovery/workflow-parser.js";
import type { DimensionScore, Finding, ScanResult } from "../../src/types.js";

let dir: string;
let origCwd: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-longtail-"));
  origCwd = process.cwd();
});
afterEach(() => {
  process.chdir(origCwd);
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function ciCtx(yaml: string) {
  return {
    path: ".github/workflows/ci.yml",
    text: yaml,
    ast: parseWorkflow(yaml),
  };
}

describe("selector health", () => {
  it("scores generated class names, deep xpath chains, and nth coupling", () => {
    const generated = scoreLocatorRisk(
      "await page.locator('.Button-sc-1x2yz-0').click();",
    );
    expect(generated.reason).toContain("generated class name +20");

    const deepXpath = scoreLocatorRisk(
      "page.locator('xpath=//div/span/a/ul/li')",
    );
    expect(deepXpath.reason).toContain("deep XPath +10");

    const nth = scoreLocatorRisk("page.locator('.a:nth-child(2)')");
    expect(nth.reason).toContain("nth-child positional coupling +25");
  });

  it("returns null for a bare quoted locator that is not structural", () => {
    // A line with no ., >, # or [ after the quoted selector is CSS but
    // not structural — the class is dropped and the risk stays 0.
    expect(scoreLocatorRisk("await locator('button')")).toEqual({
      score: 0,
      reason: "not a locator",
    });
  });

  it("walks subdirectories, skips fixture-shaped dirs and non-specs, breaks ties by path", () => {
    mkdirSync(join(dir, "sub"), { recursive: true });
    mkdirSync(join(dir, "fixtures-dir", "must-fire"), { recursive: true });
    mkdirSync(join(dir, "fixtures-dir", "must-not-fire"), { recursive: true });
    writeFileSync(join(dir, "README.md"), "not a spec\n");
    writeFileSync(
      join(dir, "b.spec.ts"),
      "it('a', () => { page.locator('#x').click(); });\n",
    );
    writeFileSync(
      join(dir, "sub", "a.spec.ts"),
      "it('a', () => { page.locator('#x').click(); });\n",
    );
    const specs = computeSelectorHealth(dir);
    // Equal scores → deterministic tiebreak by path.
    expect(specs.map((s) => s.file)).toEqual(["b.spec.ts", "sub/a.spec.ts"]);
    expect(renderSelectorHealth(specs)).toContain("SELECTOR HEALTH");
  });
});

describe("scope/changed degradation paths", () => {
  function git(args: string[]): void {
    execFileSync("git", ["-C", dir, ...args], { stdio: "ignore" });
  }

  it("reports diff-failed when a base object is missing from the store", () => {
    git(["init", "-b", "main"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);
    writeFileSync(join(dir, "a.spec.ts"), "it('a', () => {});\n");
    git(["add", "."]);
    git(["commit", "-m", "base"]);
    // Corrupt the base TREE object: merge-base still resolves (it needs
    // only commits) but the committed name-status diff cannot read it.
    const sha = execFileSync("git", ["-C", dir, "rev-parse", "HEAD^{tree}"])
      .toString()
      .trim();
    const obj = join(dir, ".git", "objects", sha.slice(0, 2), sha.slice(2));
    rmSync(obj, { force: true });
    const diff = computeChangedScope(dir);
    expect(diff.degraded).toBe(true);
    expect(diff.reason).toBe("diff-failed");
  });

  it("treats an oversized untracked test file as fully changed for that file only (no whole-scope degradation)", () => {
    git(["init", "-b", "main"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);
    writeFileSync(join(dir, "base.spec.ts"), "it('a', () => {});\n");
    git(["add", "."]);
    git(["commit", "-m", "base"]);
    git(["checkout", "-b", "feat"]);
    writeFileSync(
      join(dir, "big.spec.ts"),
      "it('big', () => {});\n".repeat(60_000),
    );
    const diff = computeChangedScope(dir);
    // Audit fix (changed.ts): one unreadable/oversized untracked file
    // degrades ONLY that file — treated as fully changed (honest
    // superset) — instead of discarding line precision for the whole
    // scope. The scope stays precise.
    expect(diff.degraded).toBe(false);
    expect(diff.changed["big.spec.ts"]?.size).toBeGreaterThan(0);
  });
});

const baseScan: ScanResult = {
  schemaVersion: 1,
  partial: false,
  score: 100,
  frameworks: [],
  frameworkDetectionUnknown: false,
  dimensions: [],
  findings: [],
  testFileCount: 1,
  testDeclarationCount: 1,
  rawDeductions: 0,
  suppressionCount: 0,
  analysisStatus: {
    discovery: "complete",
    rules: "complete",
    skippedFiles: 0,
    durationMs: 1,
    rulesCrashed: 0,
  },
};

describe("reporter renderers", () => {
  it("skips the score block when no tests were found", () => {
    const out = renderTerminal(
      { ...baseScan, score: null, testDeclarationCount: 0, testFileCount: 0 },
      { width: 80, ascii: true, isTTY: true },
    );
    expect(out).not.toContain("SCORE");
  });

  it("renders the trophy in ASCII mode and the unicode trophy otherwise", () => {
    expect(
      renderTerminal(baseScan, { width: 80, ascii: true, isTTY: true }),
    ).toContain("*** FLAWLESS VICTORY ***");
    const unicode = renderTerminal(baseScan, {
      width: 80,
      ascii: false,
      isTTY: true,
    });
    expect(unicode).toContain("._==_==_=_.'");
    expect(unicode).not.toContain("*** FLAWLESS VICTORY ***");
  });

  it("pluralizes the advisory note and lists plugins with rule counts", () => {
    const finding: Finding = {
      ruleId: "QA-TEST-940",
      category: "QA-TEST",
      severity: "info" as const,
      confidence: "high" as const,
      findingType: "observation" as const,
      qaImpact: "HYGIENE" as const,
      file: "a.spec.ts",
      line: 1,
      column: 1,
      message: "probe",
      why: "why",
      fix: "fix",
      evidenceLevel: "E0" as const,
    };
    const out = renderTerminal(
      {
        ...baseScan,
        score: 90,
        findings: [finding, { ...finding, line: 2 }],
        plugins: [
          { name: "one", rules: 1 },
          { name: "two", rules: 2 },
        ],
      },
      { width: 80, ascii: true, isTTY: true },
    );
    expect(out).toContain("2 advisory findings");
    expect(out).toContain("one (1 rule)");
    expect(out).toContain("two (2 rules)");
  });

  it("uses the unicode warning glyph when ascii is off", () => {
    const out = renderTerminal(
      {
        ...baseScan,
        score: 90,
        findings: [
          {
            ruleId: "QA-TEST-004",
            category: "QA-TEST",
            severity: "warning",
            confidence: "high",
            findingType: "deterministic-defect",
            qaImpact: "FALSE-GREEN",
            file: "a.spec.ts",
            line: 1,
            column: 1,
            message: "hard sleep",
            why: "why",
            fix: "fix",
          },
        ],
      },
      { width: 80, ascii: false, isTTY: true },
    );
    expect(out).toContain("⚠");
  });

  it("wrapText returns [''] for empty input", () => {
    expect(wrapText("", 40)).toEqual([""]);
  });

  it("shouldUseAscii honors modern-host detection", () => {
    const orig = process.env["WT_SESSION"];
    try {
      process.env["WT_SESSION"] = "terminal-integration";
      expect(shouldUseAscii()).toBe(false);
    } finally {
      if (orig === undefined) delete process.env["WT_SESSION"];
      else process.env["WT_SESSION"] = orig;
    }
  });

  it("renderMermaid maps dimension scores to class colors", () => {
    const out = renderMermaid({
      ...baseScan,
      score: 75,
      dimensions: [
        { category: "QA-TEST", score: 55, errors: 0, warnings: 1, infos: 0 },
        { category: "QA-PW", score: 30, errors: 2, warnings: 0, infos: 0 },
      ],
    });
    expect(out).toContain("warn");
    expect(out).toContain("crit");
  });
});

describe("forensics parse and render edges", () => {
  it("handles interrupted status and malformed suite/spec/test/result entries", () => {
    const records = parsePlaywrightJson({
      suites: [
        null,
        {
          suites: [],
          specs: [
            null,
            {
              title: "t",
              file: "a.spec.ts",
              line: 1,
              tests: [
                null,
                {
                  projectName: "chromium",
                  results: [
                    null,
                    { status: "interrupted" },
                    { status: "passed" },
                    { status: "failed" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(records.length).toBeGreaterThanOrEqual(1);
  });

  it("labels a retried-but-finally-failed attempt as retried, not a flake", () => {
    const records = parsePlaywrightJson({
      suites: [
        {
          suites: [],
          specs: [
            {
              title: "always fails",
              file: "e2e/a.spec.ts",
              line: 2,
              tests: [
                {
                  projectName: "chromium",
                  results: [
                    { status: "failed", duration: 100 },
                    { status: "failed", duration: 120 },
                  ],
                },
              ],
            },
            {
              title: "real flake",
              file: "e2e/b.spec.ts",
              line: 2,
              tests: [
                {
                  projectName: "chromium",
                  results: [
                    { status: "failed", duration: 100 },
                    { status: "passed", duration: 50 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const analysis = analyze(records, "playwright-json");
    const retried = analysis.verdicts.find((v) => v.title === "always fails");
    expect(retried?.attempts).toBe(2);
    expect(retried?.passedOnRetry).toBe(false);
    const leaderboard = renderLeaderboard(analysis);
    expect(leaderboard).toContain("retried");
    const md = renderFlakyMd(analysis);
    expect(md).toContain("retried");
  });

  it("skips the bar chart when every duration is zero", () => {
    const records = parsePlaywrightJson({
      suites: [
        {
          suites: [],
          specs: [
            {
              title: "instant",
              file: "e2e/c.spec.ts",
              line: 1,
              tests: [
                {
                  projectName: "chromium",
                  results: [{ status: "passed", duration: 0 }],
                },
              ],
            },
          ],
        },
      ],
    });
    const leaderboard = renderLeaderboard(analyze(records, "playwright-json"));
    expect(leaderboard).toBeDefined();
  });

  it("degrades gracefully when a subdirectory cannot be listed and caps depth", () => {
    const resultsDir = join(dir, "test-results");
    mkdirSync(join(resultsDir, "locked-results"), { recursive: true });
    // 6-deep nesting with a report at the bottom: the depth cap stops it.
    let deep = resultsDir;
    for (const part of ["d1", "d2", "d3", "d4", "d5", "d6"]) {
      deep = join(deep, part);
      mkdirSync(deep, { recursive: true });
    }
    writeFileSync(join(deep, "report.json"), JSON.stringify({ suites: [] }));
    const result = runForensics(resultsDir);
    expect(result.report.totalTests).toBe(0);
  });

  it("keeps going when FLAKY.md cannot be written", () => {
    const resultsDir = join(dir, "test-results-2");
    mkdirSync(resultsDir, { recursive: true });
    mkdirSync(join(resultsDir, "FLAKY.md"));
    writeFileSync(
      join(resultsDir, "report.json"),
      JSON.stringify({
        suites: [
          {
            suites: [],
            specs: [
              {
                title: "flake",
                file: "e2e/f.spec.ts",
                line: 2,
                tests: [
                  {
                    projectName: "chromium",
                    results: [
                      { status: "failed", duration: 10 },
                      { status: "passed", duration: 5 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    );
    const result = runForensics(resultsDir);
    expect(result.report.flakyTests).toBe(1);
    expect(result.flakyMdPath).toBeUndefined();
  });

  it("stops pairing at an unclosed testcase tag", () => {
    const junit = [
      '<testsuites><testsuite name="s">',
      '<testcase name="ok"/>',
      '<testcase name="unclosed"',
      "</testsuite></testsuites>",
    ].join("\n");
    const records = parseJunitXml(junit);
    expect(records).toHaveLength(1);
  });
});

describe("ignores defense and shared-walk memo", () => {
  it("skips blank, non-string, and negation-only patterns without crashing", () => {
    writeFileSync(
      join(dir, ".mjolnirignore"),
      "\n   \n!\n! \nnode_modules/**\n",
    );
    const matcher = createIgnoreMatcher(dir);
    expect(matcher.isIgnored("node_modules/x/index.js")).toBe(true);
    expect(matcher.isIgnored("src/a.spec.ts")).toBe(false);
  });

  it("reuses the fixture-dir memo across walks of the same root", () => {
    mkdirSync(join(dir, "fixtures-shape", "must-fire"), { recursive: true });
    mkdirSync(join(dir, "fixtures-shape", "must-not-fire"), {
      recursive: true,
    });
    writeFileSync(join(dir, "a.spec.ts"), "it('a', () => {});\n");
    const memo = new Map<string, boolean>();
    const makeWalk = () =>
      sharedWalk({
        root: dir,
        deadline: Number.POSITIVE_INFINITY,
        ignoreMatcher: createIgnoreMatcher(dir),
        onSkipped: () => {},
        onTruncated: () => {},
        skipDirs: [],
        isTestFile: (name) => /\.spec\.ts$/.test(name),
        onTestFile: () => {},
        isFull: () => false,
        fixtureDirMemo: memo,
      });
    makeWalk();
    // Second walk must hit the memo for the fixture-shaped directory.
    expect(() => makeWalk()).not.toThrow();
    expect(memo.size).toBeGreaterThan(0);
  });

  it("handles an empty adapter list when building the walk skip set", () => {
    const buckets = new Map<string, string[]>();
    expect(() =>
      discoverAllTestFiles(
        {
          workspace: {
            root: dir,
            name: "x",
            packageJson: {},
            workspaceGlobs: [],
          },
          testFiles: [],
          deadline: Number.POSITIVE_INFINITY,
          maxFiles: 10,
          ignoreMatcher: createIgnoreMatcher(dir),
          onSkippedFile: () => {},
          onDiscoveryTruncated: () => {},
          onRuleCrash: () => {},
        },
        [],
        buckets,
        new Map(),
      ),
    ).not.toThrow();
  });
});

describe("scorer caps and prioritize tiebreak", () => {
  function errorFinding(ruleId = "QA-TEST-001"): Finding {
    return {
      ruleId,
      category: "QA-TEST",
      severity: "error",
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: "FALSE-GREEN",
      file: "a.spec.ts",
      line: 1,
      column: 1,
      message: "m",
      why: "w",
      fix: "f",
    };
  }
  const dims: DimensionScore[] = [
    { category: "QA-TEST", score: 0, errors: 1, warnings: 0, infos: 0 },
  ];

  it("caps a high score with error findings at the error ceiling", () => {
    const score = computeTotal(dims, [errorFinding()], 100_000);
    expect(score).toBeLessThanOrEqual(95);
  });

  it("supports the legacy numeric exposure argument", () => {
    expect(computeTotal([], [], 7)).toBe(100);
  });

  it("tie-breaks equal priorities by rule id", () => {
    const ordered = prioritize([
      errorFinding("QA-TEST-002"),
      errorFinding("QA-TEST-001"),
    ]);
    expect(ordered[0]?.finding.ruleId).toBe("QA-TEST-001");
  });
});

describe("renderers: honest empty and plural states", () => {
  it("badge reports the no-tests state for a null score", () => {
    const badge = renderBadgeSnippet({
      schemaVersion: 1,
      partial: false,
      score: null,
      frameworks: [],
      frameworkDetectionUnknown: false,
      dimensions: [],
      findings: [],
      testFileCount: 0,
      testDeclarationCount: 0,
      rawDeductions: 0,
      suppressionCount: 0,
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 0,
        rulesCrashed: 0,
      },
    } as unknown as ScanResult);
    expect(badge).toContain("no tests found");
  });

  it("debt renders multi-rule findings sorted by rule id", () => {
    const finding = (ruleId: string, line: number): Finding => ({
      ruleId,
      category: "QA-TEST",
      severity: "warning",
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: "FALSE-GREEN",
      file: "a.spec.ts",
      line,
      column: 1,
      message: "m",
      why: "w",
      fix: "f",
    });
    const md = renderDebt({
      ...baseScan,
      score: 60,
      findings: [
        finding("QA-TEST-002", 1),
        finding("QA-TEST-001", 2),
        finding("QA-TEST-001", 3),
      ],
    });
    // The register groups by tracked debt class; QA-TEST-002 (skipped
    // tests) carries a cost entry, so the class row must render.
    expect(md).toContain("Skipped tests");
    expect(md).toContain("TOTAL ESTIMATED DRAG");
  });

  it("stats sorts resolved counters by count", () => {
    const out = renderStats({
      milestones: {},
      resolvedByRule: { "QA-TEST-001": 1, "QA-TEST-002": 5 },
    } as never);
    expect(out).toContain("QA-TEST-002");
  });

  it("handover labels flake rows with attempt counts", () => {
    const handover = buildHandover(
      {
        score: 80,
        partial: false,
        testFileCount: 2,
        testDeclarationCount: 2,
        suppressionCount: 0,
        findings: [],
        analysisStatus: { rulesCrashed: 0 },
      } as never,
      {
        source: "playwright-json",
        totalTests: 2,
        failed: 1,
        skipped: 0,
        retriedTests: 1,
        flakyTests: 1,
        totalDurationMs: 25,
        verdicts: [
          {
            title: "flake",
            file: "e2e/f.spec.ts",
            attempts: 2,
            passedOnRetry: true,
            suggestedAction: "quarantine",
            proposedQuarantine: true,
            totalDurationMs: 15,
            everFailed: true,
          },
          {
            title: "broke",
            file: "e2e/g.spec.ts",
            attempts: 1,
            passedOnRetry: false,
            suggestedAction: "fix",
            proposedQuarantine: false,
            totalDurationMs: 10,
            everFailed: true,
          },
        ],
      } as never,
    );
    const text = JSON.stringify(handover);
    expect(text).toContain("TRUE-FLAKE");
  });

  it("pr-comment uses severity glyphs and the unknown-commit fallback", () => {
    const finding = (
      ruleId: string,
      severity: Finding["severity"],
      line: number,
    ): Finding => ({
      ruleId,
      category: "QA-TEST",
      severity,
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: severity === "info" ? "HYGIENE" : "FALSE-GREEN",
      file: "a.spec.ts",
      line,
      column: 1,
      message: "m",
      why: "w",
      fix: "f",
    });
    const out = renderPrComment({ ...baseScan, score: 50 }, {
      diff: {
        hasBaseline: true,
        baselineCommit: undefined,
        baselineCapturedAt: undefined,
        newFindings: [
          finding("QA-TEST-001", "error", 1),
          finding("QA-TEST-004", "warning", 2),
          finding("QA-TEST-003", "info", 3),
        ],
        resolvedFindings: [],
      },
    } as never);
    expect(out).toContain("🔴");
    expect(out).toContain("🟡");
    expect(out).toContain("🔵");
    expect(out).toContain("unknown");
  });

  it("pw-report pluralizes TRUE-FLAKES and skips the slowest table when all durations are zero", () => {
    const out = renderPwRunSummary({
      totalTests: 2,
      passed: 1,
      failed: 0,
      flakyTests: 2,
      retried: 3,
      trueFlakes: 1,
      slowest: [{ title: "t", file: "a.spec.ts", ms: 0 }],
    } as never);
    expect(out).toContain("1 TRUE-FLAKE (passed only on attempt ≥2)");
    const out2 = renderPwRunSummary({
      totalTests: 2,
      passed: 1,
      failed: 0,
      flakyTests: 2,
      retried: 3,
      trueFlakes: 2,
      slowest: [],
    } as never);
    expect(out2).toContain("2 TRUE-FLAKES");
  });

  it("init renders advice steps and omits next commands when nothing remains", () => {
    const out = renderInit({
      steps: [
        { name: "Config", status: "advice", detail: "consider a config" },
      ],
      nextCommands: [],
      detectedFrameworks: [],
      detectionUnknown: false,
    } as never);
    expect(out).toContain("[·] Config");
    expect(out).not.toContain("Next commands:");
  });
});

describe("CI rule guards", () => {
  it("stays silent when a job-level continue-on-error only wraps best-effort steps", () => {
    const y =
      "jobs:\n  e2e:\n    continue-on-error: true\n    steps:\n      - run: echo best-effort\n      - uses: actions/upload-artifact@v4\n";
    expect(continueOnError.run(ciCtx(y))).toEqual([]);
  });

  it("retry-masking ignores jobs without steps and steps without with config", () => {
    const y =
      "jobs:\n  bare: {}\n  e2e:\n    steps:\n      - uses: myorg/playwright-runner@v1\n";
    expect(retryMasking.run(ciCtx(y))).toEqual([]);
  });

  it("always-success ignores jobs without steps", () => {
    const y = "jobs:\n  bare: {}\n";
    expect(alwaysSuccessStep.run(ciCtx(y))).toEqual([]);
  });

  it("exit-code skips `;` sequences that end with the test command", () => {
    const y = "jobs:\n  e2e:\n    steps:\n      - run: npx vitest; npm test\n";
    expect(exitCodeNotPropagated.run(ciCtx(y))).toEqual([]);
  });

  it("non-blocking skips jobs without steps and still flags skip-on-PR conditions", () => {
    const y =
      "jobs:\n  bare: {}\n  e2e:\n    if: github.event_name != 'pull_request'\n    steps:\n      - run: npm test\n";
    const findings = nonBlockingTestJob.run(ciCtx(y));
    expect(findings.length).toBe(1);
    expect(findings[0]?.message).toContain("skips it on pull requests");
  });
});

describe("remaining rule arms", () => {
  it("QA-PW-119: handles hook paren nesting, expression hooks, and blank names", () => {
    const text = [
      "let counter = 0;",
      "beforeEach(async (opts = getDefault(1)) => { if (opts) { counter = 1; } });",
      "beforeEach(() => counter++)",
      "let other = 1;",
      "test('a', () => { counter = 2; other = 3; });",
      "",
    ].join("\n");
    const findings = pwOrderDependence.run({ path: "a.spec.ts", text });
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it("QA-PW-119: shared module state assigned inside a test is flagged", () => {
    const text = [
      "let shared = 0;",
      "beforeEach(() => { shared = 0; });",
      "test('a', () => { shared = 5; });",
      "",
    ].join("\n");
    const findings = pwOrderDependence.run({ path: "a.spec.ts", text });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("shared");
  });

  it("definePatternFamily applies default detection strategy and omits introduced", () => {
    const rules = definePatternFamily({
      id: "QA-TEST-998",
      category: "QA-TEST",
      title: "Family probe",
      severity: "warning",
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: "HYGIENE",
      falsePositiveRisk: "low",
      variants: [
        {
          id: "QA-TEST-998",
          ext: ".ts",
          appliesTo: "test-files",
          languages: ["typescript"],
          frameworks: ["vitest"],
          patterns: [/hard-coded-probe/g],
          message: "probe finding: $0",
          fix: "remove the probe",
        },
      ],
    } as never);
    expect(rules[0]?.detectionStrategy).toBe("LEXICAL");
    expect(rules[0]?.introduced).toBeUndefined();
    const findings = rules[0]?.run({
      path: "a.spec.ts",
      text: "const x = 'hard-coded-probe';",
      codeText: "const x = 'hard-coded-probe';",
    });
    expect(findings).toHaveLength(1);
  });

  it("definePatternFamily passes overlapWith through (family default, variant override)", () => {
    // Bug Map M-02 §1.4.5: the family generator plumbs overlapWith
    // uniformly — a family-level default applies to every variant, and a
    // variant-level entry overrides it. Families without pairs carry no
    // key at all.
    const rules = definePatternFamily({
      id: "QA-TEST-999",
      category: "QA-TEST",
      title: "Family overlap probe",
      severity: "warning",
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: "HYGIENE",
      falsePositiveRisk: "low",
      overlapWith: ["QA-FAMILY-DEFAULT"],
      variants: [
        {
          id: "QA-TEST-997",
          ext: ".ts",
          appliesTo: "test-files",
          languages: ["typescript"],
          frameworks: ["vitest"],
          patterns: [/hard-coded-probe/g],
          message: "probe finding: $0",
          fix: "remove the probe",
          overlapWith: ["QA-VARIANT-SPECIFIC"],
        },
        {
          id: "QA-TEST-998",
          ext: ".ts",
          appliesTo: "test-files",
          languages: ["typescript"],
          frameworks: ["vitest"],
          patterns: [/hard-coded-probe/g],
          message: "probe finding: $0",
          fix: "remove the probe",
        },
      ],
    } as never);
    // Variant-level entry wins over the family default.
    expect(rules[0]?.id).toBe("QA-TEST-997");
    expect(rules[0]?.overlapWith).toEqual(["QA-VARIANT-SPECIFIC"]);
    // Variant without an entry inherits the family-level default.
    expect(rules[1]?.id).toBe("QA-TEST-998");
    expect(rules[1]?.overlapWith).toEqual(["QA-FAMILY-DEFAULT"]);

    // No pair declared anywhere → no overlapWith key (only families
    // with valid pairs carry entries).
    const bare = definePatternFamily({
      id: "QA-TEST-996",
      category: "QA-TEST",
      title: "Family bare probe",
      severity: "warning",
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: "HYGIENE",
      falsePositiveRisk: "low",
      variants: [
        {
          id: "QA-TEST-996",
          ext: ".ts",
          appliesTo: "test-files",
          languages: ["typescript"],
          frameworks: ["vitest"],
          patterns: [/hard-coded-probe/g],
          message: "probe finding: $0",
          fix: "remove the probe",
        },
      ],
    } as never);
    expect(bare[0]?.overlapWith).toBeUndefined();
  });
});
