/**
 * Phase 2 — precision & output contracts: Selector Health exact score
 * vectors, hand-computed forensics math, terminal-footer/JSON deduction
 * consistency, Mermaid well-formedness, and the three-verdict-band proof
 * (WORTHY / NEEDS WORK / UNWORTHY each reached for its documented reason).
 */

import { describe, expect, it } from "vitest";
import { join } from "node:path";

import {
  computeSpecHealth,
  scoreLocatorRisk,
} from "../src/playwright/selector-health.js";
import { analyze } from "../src/forensics/analyze.js";
import type { ForensicsReport } from "../src/forensics/types.js";
import { runScan } from "../src/cli.js";
import { verdictFor } from "../src/reporter/terminal.js";
import { renderMermaid } from "../src/reporter/mermaid.js";
import { renderTerminal } from "../src/reporter/terminal.js";
import type { ScanResult } from "../src/types.js";

const HERE = import.meta.dirname;
const REPO_ROOT = join(HERE, "..");

describe("Selector Health exact score vectors", () => {
  it.each([
    ["page.getByRole('button', { name: 'Save' });", 0],
    ["page.locator('[data-testid=save-btn]');", 0],
    ["page.locator('.footer .btn');", 60],
    ["page.locator('xpath=//div/span');", 90],
    // 2+ element combinators (combinator followed by a tag name) add +15.
    ["page.locator('.footer > div > span');", 75],
    ["page.locator('.row:nth-child(3)');", 85],
    ["page.locator('.Button-sc-1x2yz-0');", 80],
    ["page.locator('xpath=//div/span/a/ul/li');", 100],
    ["page.locator('.css-x1y2z3 > div:nth-child(2) > span > a');", 100],
  ] as const)("scoreLocatorRisk(%s) = %i", (line, expected) => {
    expect(scoreLocatorRisk(line).score).toBe(expected);
  });

  it("a locator with no structural chars classifies as null", () => {
    expect(scoreLocatorRisk("locator('button')").score).toBe(0);
    expect(scoreLocatorRisk("locator('button')").reason).toBe("not a locator");
  });

  it("health score: 2 role + 2 testid + 2 css + 2 xpath = 58", () => {
    const lines = [
      "page.getByRole('button');",
      "page.getByRole('textbox');",
      "page.locator('[data-testid=a]');",
      "page.locator('[data-testid=b]');",
      "page.locator('.a.b');",
      "page.locator('.c.d');",
      "page.locator('xpath=//a');",
      "page.locator('xpath=//b');",
      "it('t', () => {});",
    ];
    const health = computeSpecHealth("probe.spec.ts", lines);
    // good = 4, css-chain credit = 2 × 0.3, total = 8.
    expect(health.score).toBe(Math.round(((4 + 0.6) / 8) * 100));
    expect(health.counts["role-based"]).toBe(2);
    expect(health.counts.testid).toBe(2);
    expect(health.counts["css-chain"]).toBe(2);
    expect(health.counts.xpath).toBe(2);
  });

  it("health score: 1 css-chain among 3 role-based = 76", () => {
    const health = computeSpecHealth("probe.spec.ts", [
      "page.getByRole('button');",
      "page.getByRole('textbox');",
      "page.getByRole('link');",
      "page.locator('.a.b');",
      "it('t', () => {});",
    ]);
    expect(health.score).toBe(Math.round(((3 + 0.3) / 4) * 100));
  });

  it("a file with no locators scores 100", () => {
    expect(
      computeSpecHealth("probe.spec.ts", ["it('t', () => {});"]).score,
    ).toBe(100);
  });
});

describe("forensics math, hand-computed", () => {
  // Five tests with known attempt shapes:
  //   r1 [passed]                     → passed
  //   r2 [failed, passed]             → TRUE-FLAKE
  //   r3 [failed, failed]             → failed, retried
  //   r4 [timedOut, passed]           → TRUE-FLAKE (timedOut counts as failed)
  //   r5 [skipped]                    → skipped
  const records = [
    {
      file: "e2e/1.spec.ts",
      title: "r1",
      attempts: [{ index: 1, status: "passed", durationMs: 100 }],
    },
    {
      file: "e2e/2.spec.ts",
      title: "r2",
      attempts: [
        { index: 1, status: "failed", durationMs: 100 },
        { index: 2, status: "passed", durationMs: 50 },
      ],
    },
    {
      file: "e2e/3.spec.ts",
      title: "r3",
      attempts: [
        { index: 1, status: "failed", durationMs: 200 },
        { index: 2, status: "failed", durationMs: 200 },
      ],
    },
    {
      file: "e2e/4.spec.ts",
      title: "r4",
      attempts: [
        { index: 1, status: "timedOut", durationMs: 500 },
        { index: 2, status: "passed", durationMs: 100 },
      ],
    },
    {
      file: "e2e/5.spec.ts",
      title: "r5",
      attempts: [{ index: 1, status: "skipped", durationMs: 0 }],
    },
  ] as ConstructorParameters<typeof Object>[0] extends never
    ? never
    : Array<{
        file: string;
        title: string;
        attempts: Array<{ index: number; status: string; durationMs: number }>;
      }>;

  const report: ForensicsReport = analyze(records as never, "playwright-json");

  it("counts totals, failures, skips, retries, and flakes exactly", () => {
    expect(report.totalTests).toBe(5);
    expect(report.failed).toBe(1); // only r3 ends failed
    expect(report.skipped).toBe(1); // r5
    expect(report.retriedTests).toBe(3); // r2, r3, r4 have >= 2 attempts
    expect(report.flakyTests).toBe(2); // r2 and r4 (final pass after a failure)
    // Hand-summed: 100 + 150 + 400 + 600 + 0.
    expect(report.totalDurationMs).toBe(1250);
  });

  it("verdicts carry the per-test facts", () => {
    const byTitle = new Map(report.verdicts.map((v) => [v.title, v]));
    const r2 = byTitle.get("r2");
    expect(r2?.passedOnRetry).toBe(true);
    expect(r2?.everFailed).toBe(true);
    expect(r2?.finalStatus).toBe("passed");
    const r3 = byTitle.get("r3");
    expect(r3?.passedOnRetry).toBe(false);
    expect(r3?.everFailed).toBe(true);
    expect(r3?.finalStatus).toBe("failed");
    const r4 = byTitle.get("r4");
    // timedOut counts as a failure for everFailed, so the eventual pass
    // is a TRUE-FLAKE, not a "retried" pass.
    expect(r4?.passedOnRetry).toBe(true);
  });
});

describe("terminal footer agrees with the JSON deduction fields", () => {
  const scan: ScanResult = runScan({
    target: join(REPO_ROOT, "examples", "demo-repo"),
    json: false,
    verbose: false,
    maxDurationMs: Number.POSITIVE_INFINITY,
    scopeChanged: false,
    format: "terminal",
  });

  it("the terminal WHERE-POINTS-WERE-LOST table names every deducted severity", () => {
    const out = renderTerminal(scan, { width: 100, ascii: true, isTTY: false });
    const severities = new Set(scan.findings.map((f) => f.severity));
    expect(out).toContain("WHERE POINTS WERE LOST");
    expect(severities.has("error")).toBe(out.includes("error"));
  });

  it("rawDeductions in the JSON contract is the sum of per-finding deductions", () => {
    const sum = scan.findings.reduce((acc, f) => {
      const level = f.evidenceLevel ?? "E2";
      const base =
        f.severity === "error" ? 8 : f.severity === "warning" ? 3 : 1;
      return (
        acc +
        (level === "E0" ? 0 : level === "E1" ? Math.floor(base / 2) : base)
      );
    }, 0);
    expect(scan.rawDeductions).toBe(sum);
  });
});

describe("mermaid output is structurally well-formed", () => {
  it("balances brackets and declares every referenced class", () => {
    const out = renderMermaid({
      ...({} as ScanResult),
      score: 75,
      frameworks: ["vitest"],
      frameworkDetectionUnknown: false,
      dimensions: [
        { category: "QA-TEST", score: 55, errors: 0, warnings: 1, infos: 0 },
      ],
      findings: [
        {
          ruleId: "QA-TEST-001",
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
        },
      ],
      testFileCount: 1,
      testDeclarationCount: 1,
      rawDeductions: 8,
      suppressionCount: 0,
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1,
        rulesCrashed: 0,
      },
    });
    // Flowchart statements are single lines; brackets balance globally.
    expect(out.startsWith("flowchart TD")).toBe(true);
    const opens = (out.match(/\[/g) ?? []).length;
    const closes = (out.match(/\]/g) ?? []).length;
    expect(opens).toBe(closes);
    const braces = (out.match(/\{/g) ?? []).length;
    const braceCloses = (out.match(/\}/g) ?? []).length;
    expect(braces).toBe(braceCloses);
    // Every style assignment targets a declared class id (letters/digits/
    // underscores only, mirroring the renderer's CAT_/SEV_ prefixes).
    for (const line of out.split("\n")) {
      if (line.trim().startsWith("class ")) {
        expect(line.trim()).toMatch(/^class \w+ \w+;$/);
      }
    }
  });
});

describe("three verdict bands are reachable for their documented reasons", () => {
  it("self-scan is WORTHY (>= 80)", { timeout: 120_000 }, () => {
    const scan = runScan({
      target: REPO_ROOT,
      json: false,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "terminal",
    });
    expect(scan.score).not.toBeNull();
    expect(scan.score as number).toBeGreaterThanOrEqual(80);
    expect(verdictFor(scan.score as number)).toBe("WORTHY");
  });

  it("demo repo is NEEDS WORK (50-79)", { timeout: 60_000 }, () => {
    const scan = runScan({
      target: join(REPO_ROOT, "examples", "demo-repo"),
      json: false,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "terminal",
    });
    expect(scan.score).not.toBeNull();
    const score = scan.score as number;
    expect(score).toBeGreaterThanOrEqual(50);
    expect(score).toBeLessThanOrEqual(79);
    expect(verdictFor(score)).toBe("NEEDS WORK");
  });

  it(
    "golden repo is UNWORTHY by the categorical suite-invalidating fact",
    { timeout: 60_000 },
    () => {
      const scan = runScan({
        target: join(REPO_ROOT, "tests", "golden", "repo"),
        json: false,
        verbose: false,
        maxDurationMs: Number.POSITIVE_INFINITY,
        scopeChanged: false,
        format: "terminal",
      });
      expect(scan.score).not.toBeNull();
      const score = scan.score as number;
      expect(score).toBeLessThanOrEqual(49);
      expect(verdictFor(score)).toBe("UNWORTHY");
      // The stated reason: a suite-invalidating finding (committed .only).
      expect(scan.findings.some((f) => f.ruleId === "QA-TEST-001")).toBe(true);
    },
  );
});
