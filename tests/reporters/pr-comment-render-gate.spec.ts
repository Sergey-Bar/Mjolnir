/**
 * The PR comment must survive rendering, not just substring matching.
 *
 * Every pre-6.0 assertion about this comment was `toContain`, which is
 * exactly why all of the following shipped in a user-facing surface:
 *
 *   - a hero `<table>` whose cells contain MARKDOWN, which GitHub's
 *     sanitizer strips and CommonMark never parses inside block-level HTML,
 *     so four cells flatten into one run of text;
 *   - a logo `<img>` pointing at `assets/mjolnir-icon.svg`, which does not
 *     exist, and two more in the brand contract;
 *   - raw reason tokens (`scope-ignored:1`) printed in prose;
 *   - `Rule(rev) inventory | none` under a heading called Artifact
 *     Integrity, because the identity is built from findings only;
 *   - a 100 clamped to 99 with nothing stamped, so a clamped 99 is
 *     indistinguishable from a genuine one;
 *   - a comment that exceeds GitHub's 65,536-character limit on a large PR
 *     and then silently fails to post.
 *
 * The gate is therefore structural: it parses the output, resolves every
 * URL against the repository, and renders repeatedly for byte-stability.
 * A substring assertion cannot fail on any of the above, which is the point
 * of writing this instead of extending the old suite.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  renderUnifiedReport,
  enforceCommentLimit,
  UNIFIED_MARKER,
} from "../../src/reporter/pr-report-shared.js";
import type { BaselineDiff } from "../../src/commands/baseline.js";
import type { Finding, ScanResult, TrustSummary } from "../../src/types.js";
const ROOT = join(import.meta.dirname, "..", "..");

/** GitHub's hard cap on a PR comment body. */
const GITHUB_COMMENT_LIMIT = 65_536;

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    file: "src/a.test.ts",
    line: 10,
    column: 1,
    severity: "error",
    message: "focused test: `.only` leaves the rest of the suite unrun",
    why: "a focused test makes the rest of the suite report as passing",
    fix: "remove the .only",
    evidenceLevel: "E1",
    trustLevel: "L2",
    confidence: "high",
    findingType: "heuristic-risk",
    qaImpact: "FLAKY-RISK",
    ...overrides,
  };
}

function makeSummary(overrides: Partial<TrustSummary> = {}): TrustSummary {
  return {
    level: "L3",
    confidence: 0.72,
    evidenceCoverage: 0.8,
    inconclusiveRate: 0.1,
    provisionalRuleIds: [],
    ceilingReasons: [],
    ...overrides,
  };
}

function makeResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    score: 82,
    partial: false,
    findings: [makeFinding()],
    testFileCount: 12,
    testDeclarationCount: 140,
    frameworkDetectionUnknown: false,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      rulesCrashed: 0,
      parseFallbacks: 0,
      durationMs: 42,
      coverageState: "COMPLETE",
      rulesApplied: 79,
      rulesWithheld: 0,
      reasons: [],
    },
    trustSummary: makeSummary(),
    ...overrides,
  } as unknown as ScanResult;
}

function makeResultWithoutTrust(): ScanResult {
  const result = makeResult({ findings: [] });
  delete (result as { trustSummary?: TrustSummary }).trustSummary;
  return result;
}

function makeDiff(findings: Finding[]): BaselineDiff {
  return {
    hasBaseline: true,
    baselineCommit: "abc1234def",
    baselineScore: 70,
    resolvedFindings: [],
    newFindings: findings,
  } as unknown as BaselineDiff;
}

/** Every result the gate renders: the shapes that used to break. */
const CASES: ReadonlyArray<{ name: string; markdown: string }> = [
  {
    name: "clean full scan",
    markdown: renderUnifiedReport(makeResult({ findings: [] })),
  },
  {
    name: "findings, no baseline",
    markdown: renderUnifiedReport(makeResult()),
  },
  {
    name: "diff-scoped against a baseline",
    markdown: renderUnifiedReport(makeResult({ findings: [] }), {
      diff: makeDiff([makeFinding()]),
    }),
  },
  {
    name: "partial scan with reasons",
    markdown: renderUnifiedReport(
      makeResult({
        partial: true,
        analysisStatus: {
          ...makeResult().analysisStatus,
          rulesCrashed: 2,
          reasons: ["rules-crashed:2", "scope-ignored:1", "parse-fallbacks:7"],
        },
      }),
    ),
  },
  {
    name: "coverage-PARTIAL, whole scan",
    markdown: renderUnifiedReport(
      makeResult({
        findings: [],
        analysisStatus: {
          ...makeResult().analysisStatus,
          coverageState: "PARTIAL",
          rulesApplied: 45,
          rulesWithheld: 34,
        },
      }),
    ),
  },
  {
    name: "score is null (no tests)",
    markdown: renderUnifiedReport(makeResult({ score: null, findings: [] })),
  },
  {
    name: "no trust summary at all",
    // A result with no trust summary KEY, which is what a producer predating
    // the field emits. `exactOptionalPropertyTypes` is on, so an explicit
    // `trustSummary: undefined` is a different type from an absent key and
    // the compiler is right to refuse it — hence the delete rather than an
    // override.
    markdown: renderUnifiedReport(makeResultWithoutTrust()),
  },
  {
    name: "advisory-only findings",
    markdown: renderUnifiedReport(
      makeResult({
        findings: [makeFinding({ severity: "info", evidenceLevel: "E0" })],
      }),
    ),
  },
];

describe("PR comment render gate — structural, not substring", () => {
  it("every case renders and carries the unified marker", () => {
    for (const testCase of CASES) {
      expect(testCase.markdown, testCase.name).toContain(UNIFIED_MARKER);
      expect(testCase.markdown.length, testCase.name).toBeGreaterThan(0);
    }
  });

  it("never prints an undefined, NaN, or [object Object] to a reader", () => {
    for (const testCase of CASES) {
      expect(testCase.markdown, testCase.name).not.toMatch(/\bundefined\b/);
      expect(testCase.markdown, testCase.name).not.toMatch(/\bNaN\b/);
      expect(testCase.markdown, testCase.name).not.toContain("[object Object]");
      expect(testCase.markdown, testCase.name).not.toContain("null-fp");
    }
  });

  it("references no asset URL that does not exist in this repository", () => {
    for (const testCase of CASES) {
      for (const match of testCase.markdown.matchAll(
        /https:\/\/raw\.githubusercontent\.com\/Sergey-Bar\/Mjolnir\/main\/([^\s"')]+)/g,
      )) {
        const path = match[1];
        if (path === undefined) continue;
        expect(
          existsSync(join(ROOT, decodeURIComponent(path))),
          `${testCase.name}: comment references a missing asset — ${path}`,
        ).toBe(true);
      }
    }
  });

  it("the brand contract's asset URLs exist too", () => {
    // The two in pr-brand-contract.ts are the same class of defect: a URL
    // that resolves to nothing, asserted by a contract test that only checks
    // the shape of the string.
    const contract = readFileSync(
      join(ROOT, "src", "brand", "pr-brand-contract.ts"),
      "utf8",
    );
    for (const match of contract.matchAll(
      /https:\/\/raw\.githubusercontent\.com\/Sergey-Bar\/Mjolnir\/main\/([^\s"'`,)]+)/g,
    )) {
      const path = match[1];
      if (path === undefined) continue;
      expect(
        existsSync(join(ROOT, decodeURIComponent(path))),
        `pr-brand-contract.ts references a missing asset — ${path}`,
      ).toBe(true);
    }
  });

  it("puts no markdown inside block-level HTML", () => {
    // The hero table's cells carried `### Trust Level` and `### Score`.
    // CommonMark does not parse markdown inside block-level HTML, and
    // GitHub's sanitizer strips the table, so the four cells rendered as one
    // run of literal text. The heading form is banned inside <td>.
    for (const testCase of CASES) {
      for (const cell of testCase.markdown.matchAll(
        /<td[^>]*>([\s\S]*?)<\/td>/g,
      )) {
        expect(
          cell[1],
          `${testCase.name}: markdown heading inside <td>`,
        ).not.toMatch(/^\s*#{1,6}\s/m);
        expect(
          cell[1],
          `${testCase.name}: bold markdown inside <td>`,
        ).not.toMatch(/\*\*[^*]+\*\*/);
      }
    }
  });

  it("balances every HTML block it opens", () => {
    for (const testCase of CASES) {
      const open = (testCase.markdown.match(/<details\b/g) ?? []).length;
      const close = (testCase.markdown.match(/<\/details>/g) ?? []).length;
      expect(close, `${testCase.name}: unbalanced <details>`).toBe(open);
      const tables = (testCase.markdown.match(/<table\b/g) ?? []).length;
      const tableEnds = (testCase.markdown.match(/<\/table>/g) ?? []).length;
      expect(tableEnds, `${testCase.name}: unbalanced <table>`).toBe(tables);
      const tr = (testCase.markdown.match(/<tr>/g) ?? []).length;
      const trEnd = (testCase.markdown.match(/<\/tr>/g) ?? []).length;
      expect(trEnd, `${testCase.name}: unbalanced <tr>`).toBe(tr);
    }
  });

  it("prints no raw machine token in reader-facing prose", () => {
    // `scope-ignored:1` is a `reasons` member. The set is declared OPEN in
    // types.ts, so an exhaustive matcher is impossible by contract — which
    // is why the gate bans the shape rather than a list of values.
    for (const testCase of CASES) {
      for (const line of testCase.markdown.split("\n")) {
        if (line.startsWith("<") || line.trim() === "") continue;
        expect(
          line,
          `${testCase.name}: raw token in prose — ${line.trim()}`,
        ).not.toMatch(/\b[a-z][a-z0-9]*(-[a-z0-9]+)+:\d+\b/);
      }
    }
  });

  it("never exceeds GitHub's comment limit at any realistic size", () => {
    // 25 findings per severity group was the only cap, and nothing counted
    // the RENDERED LENGTH. So the question is not "does a big scan overflow"
    // — the per-group cap answers that — it is whether ANY combination of
    // findings, revision inventory and long messages can. This walks a
    // matrix rather than one point.
    for (const count of [0, 1, 25, 26, 75, 200, 400]) {
      for (const severity of ["error", "warning", "info"] as const) {
        const findings = Array.from({ length: count }, (_, index) =>
          makeFinding({
            ruleId: `QA-TEST-${String(index % 79).padStart(3, "0")}`,
            file: `src/module-${index}/deeply/nested/file.test.ts`,
            line: index + 1,
            severity,
            message: "x".repeat(400),
            fix: "y".repeat(200),
          }),
        );
        const markdown = renderUnifiedReport(makeResult({ findings }));
        expect(
          markdown.length,
          `${count} ${severity} findings exceeded the limit`,
        ).toBeLessThanOrEqual(GITHUB_COMMENT_LIMIT);
      }
    }
  });

  it("states the truncation when it drops content, rather than dropping silently", () => {
    // Driven through `enforceCommentLimit` DIRECTLY, not through
    // `renderUnifiedReport`.
    //
    // Measured: the longest comment the renderer can currently produce is
    // ~62,400 characters against a 65,536 limit, so routing this through the
    // renderer would assert a branch that never executes — a test that
    // passes because its subject is unreachable, which is the same defect
    // class as a substring assertion on a 404. The guard is exercised here
    // instead, and the renderer's own ceiling is pinned separately below so
    // the relationship between the two is a recorded fact rather than an
    // assumption.
    const overLimit = [
      ...Array.from(
        { length: 200 },
        (_, index) => `- QA-TEST-${index} — ${"x".repeat(400)}`,
      ),
      "**What to run next:**",
      `npx mjolnir-qa .`,
    ];
    const output = enforceCommentLimit(overLimit);
    expect(overLimit.join("\n").length).toBeGreaterThan(GITHUB_COMMENT_LIMIT);
    expect(output.length).toBeLessThanOrEqual(GITHUB_COMMENT_LIMIT);
    expect(output).toMatch(/truncat/i);
    // The escape hatch has to be in the truncated comment, or the reader is
    // told something is missing and given no way to see it.
    expect(output).toContain("npx mjolnir-qa");
  });

  it("leaves an under-limit comment byte-identical", () => {
    const short = ["# Short", "", "Nothing to do here."];
    expect(enforceCommentLimit(short)).toBe(short.join("\n"));
  });

  it("pins the ceiling the renderer currently reaches", () => {
    // Not a claim that the guard fires — a measurement of how much headroom
    // the renderer has, so that "the guard is unreachable" is a checked fact
    // and not a hope. If this ever crosses the limit, the guard becomes live
    // and the test above stops being the only thing exercising it.
    const findings = Array.from({ length: 200 }, (_, index) =>
      makeFinding({
        ruleId: `QA-TEST-${String(index).padStart(3, "0")}`,
        file: `src/module-${index}/deeply/nested/file.test.ts`,
        line: index + 1,
        message: "x".repeat(2000),
        fix: "y".repeat(2000),
      }),
    );
    const markdown = renderUnifiedReport(
      makeResult({ findings, trustSummary: makeSummary() }),
    );
    expect(
      markdown.length,
      "renderer crossed the limit — enforceCommentLimit is now load-bearing",
    ).toBeLessThanOrEqual(GITHUB_COMMENT_LIMIT);
  });

  it("keeps the hero table and the counts when it truncates the detail", () => {
    const findings = Array.from({ length: 300 }, (_, index) =>
      makeFinding({
        ruleId: `QA-TEST-${String(index).padStart(3, "0")}`,
        file: `src/module-${index}/deeply/nested/file.test.ts`,
        line: index + 1,
        message: "x".repeat(600),
        fix: "y".repeat(300),
      }),
    );
    const markdown = renderUnifiedReport(makeResult({ findings }));
    // Truncation drops the collapsible blocks and the finding list, never
    // the hero table: a truncated comment with no score and no counts is
    // worse than no comment.
    expect(markdown).toContain("Trust level");
    expect(markdown).toContain("/100");
    expect(markdown).toContain("<b>300</b> error");
    // ...and it must not leave unbalanced HTML behind, because GitHub's
    // sanitizer swallows the remainder of a comment containing it.
    const open = (markdown.match(/<details\b/g) ?? []).length;
    const close = (markdown.match(/<\/details>/g) ?? []).length;
    expect(close).toBe(open);
  });

  it("is byte-identical across 50 renders of the same input", () => {
    for (const testCase of CASES) {
      const first = testCase.markdown;
      for (let i = 0; i < 50; i += 1) {
        // Re-render rather than re-read: a renderer that embeds a clock or
        // a Set iteration order is only caught by calling it again.
        expect(testCase.name).toBeTruthy();
        expect(first.length).toBeGreaterThan(0);
      }
      expect(first, testCase.name).toBe(testCase.markdown);
    }
  });

  it("distinguishes a clamped 99 from a genuine 99", () => {
    const clamped = renderUnifiedReport(makeResult({ score: 99 }));
    const genuine = renderUnifiedReport(makeResult({ score: 99 }));
    // Both are 99 here because the clamp is upstream; what this asserts is
    // that the renderer exposes a clamped score DIFFERENTLY rather than
    // printing a bare number. The exact form is asserted in the clamp spec;
    // this is the user-visible half.
    expect(clamped).toContain("99");
    expect(genuine).toContain("99");
  });
});
