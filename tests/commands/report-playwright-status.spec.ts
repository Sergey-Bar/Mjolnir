/**
 * T1 — `mjolnir report` must never publish a runtime verdict it did not
 * measure.
 *
 * The defect: `buildPlaywrightReport` computed the TOP-LEVEL `status` from
 * the findings (`partial ? "interrupted" : hasError ? "failed" : "passed"`)
 * and wrote it beside `totalTests: 0`. A clean scan therefore shipped
 * `{status: "passed", totalTests: 0}` — the one field a Playwright consumer
 * reads first, asserting a green run over zero executed tests. The
 * `execution: "STATIC_ANALYSIS"` marker that contradicts it was buried in the
 * extension block. `failed` was equally dishonest in the other direction: it
 * implies tests ran and lost.
 *
 * The fix narrows the field's type to the literal `"interrupted"` and moves
 * the blocked/clean distinction to `mjolnir.scanOutcome`, where it cannot be
 * read as a test result. These tests cover all three input classes the old
 * branch handled, and a source-level invariant so no future path can
 * reintroduce a root-level runtime verdict without failing here first.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildPlaywrightReport } from "../../src/commands/report-playwright.js";
import type { Finding } from "../../src/types.js";

const SOURCE = join(
  import.meta.dirname,
  "..",
  "..",
  "src",
  "commands",
  "report-playwright.ts",
);

/**
 * Block and line comments carry no code. The same strip the
 * privacy-network-isolation contract uses, for the same reason: a
 * header that CITES a former false claim must not read as a violation.
 */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const errorFinding: Finding = {
  ruleId: "QA-TEST-001",
  category: "QA-TEST" as const,
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "HYGIENE",
  file: "test.ts",
  line: 1,
  column: 1,
  message: "failure",
  why: "why",
  fix: "fix",
};

const inputClasses: ReadonlyArray<{
  name: string;
  result: Parameters<typeof buildPlaywrightReport>[0];
  outcome: "clean" | "blocked" | "partial";
}> = [
  {
    name: "clean scan",
    result: { findings: [], score: 100, frameworks: ["playwright"] },
    outcome: "clean",
  },
  {
    name: "scan with error-severity findings",
    result: {
      findings: [errorFinding],
      score: 50,
      frameworks: ["playwright"],
    },
    outcome: "blocked",
  },
  {
    name: "partial scan",
    result: {
      findings: [],
      score: null,
      frameworks: [],
      partial: true,
    },
    outcome: "partial",
  },
  {
    name: "partial scan that ALSO carries error findings",
    // The arm the old ternary collapsed: `partial` won, and the error
    // findings were silently dropped from the status. It must still not
    // produce a runtime verdict, and it must not be silently reclassified
    // as merely "blocked".
    result: {
      findings: [errorFinding],
      score: 10,
      frameworks: ["vitest"],
      partial: true,
    },
    outcome: "partial",
  },
];

describe("T1: `mjolnir report` never publishes a runtime verdict", () => {
  it.each(inputClasses)(
    "$name reads as interrupted with zero tests",
    ({ result, outcome }) => {
      const report = buildPlaywrightReport(result);
      expect(report.status).toBe("interrupted");
      expect(report.totalTests).toBe(0);
      expect(report.passedTests).toBe(0);
      expect(report.failedTests).toBe(0);
      expect(report.suites).toEqual([]);
      // The honest scan outcome moved to the extension block, unchanged.
      expect(report.mjolnir.scanOutcome).toBe(outcome);
      expect(report.mjolnir.execution).toBe("STATIC_ANALYSIS");
    },
  );

  it("the root status is the literal `interrupted`, not a union", () => {
    // A union is how `passed` came back: the type admitted a runtime
    // verdict, so a future edit could reintroduce one and still typecheck.
    const source = readFileSync(SOURCE, "utf8");
    expect(source).toMatch(/^ {2}status: "interrupted";$/m);
    expect(source).not.toMatch(/^ {2}status: "passed" \|/m);
  });

  it("no code path in the builder can write `passed` or `failed`", () => {
    // The durable half. `buildPlaywrightReport` is the only producer of
    // this file, so if the literal cannot appear in its body, the root
    // status cannot become a runtime verdict — whatever a future branch
    // does. Modelled on tests/contract/header-claims.spec.ts: a source
    // invariant at the granularity a reviewer reads.
    //
    // Comments are stripped first: this file CITES the old ternary in
    // prose, and a comment that quotes a former false claim is exactly
    // what tests/contract/header-claims.spec.ts already learned to
    // tolerate. The invariant is about code, not about documentation.
    const source = stripComments(readFileSync(SOURCE, "utf8"));
    const start = source.indexOf("export function buildPlaywrightReport");
    expect(
      start,
      "buildPlaywrightReport must exist in the source",
    ).toBeGreaterThan(-1);
    const builder = source.slice(start);
    expect(builder).toMatch(/const status = "interrupted" as const;/);
    expect(builder, "the builder may not name a runtime verdict").not.toContain(
      '"passed"',
    );
    expect(builder, "the builder may not name a runtime verdict").not.toContain(
      '"failed"',
    );
  });
});
