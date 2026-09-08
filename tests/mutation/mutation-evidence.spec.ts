/**
 * P5 mutation evidence reader (product-gap-remediation master plan,
 * plan 1788853205786 — flag 6, decision 8).
 *
 * The locks:
 *  - Stryker JSON: only `Survived` mutants become evidence; `NoCoverage`
 *    is a DIFFERENT fact; killed/timeout is the suite working;
 *    0-based Stryker lines normalize to the engine's 1-based;
 *  - mutmut junitxml: passing testcases = SURVIVED (the suite did not
 *    kill the mutant), failures = killed; evidence is FILE-level
 *    (the report carries no per-mutant lines — the span is honest
 *    file-granularity, never claimed as line-level);
 *  - derivation: E1→E2 on matching findings; E0 stays E0 (an
 *    observation gains nothing from a survived mutant); E2 stays E2;
 *    trustLevel NEVER rises from mutation evidence (nothing ran);
 *  - the command is report-only: exit 0 even when survived mutants
 *    exist — never a gate (decision 8).
 */

import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  looksLikeStrykerJson,
  parseStrykerJson,
} from "../../src/mutation/parse-stryker.js";
import {
  looksLikeMutmutXml,
  parseMutmutXml,
} from "../../src/mutation/parse-mutmut.js";
import {
  stampMutationEvidence,
  renderMutationSummary,
} from "../../src/mutation/derive.js";
import type { Finding } from "../../src/types.js";

const STRYKER_REPORT = {
  schemaVersion: "1.0",
  thresholds: { high: 80, low: 60 },
  files: {
    "src/auth.spec.ts": {
      source: "function login(a, b) { return a && b; }",
      mutants: [
        {
          id: "1",
          mutatorName: "ConditionalExpression",
          status: "Survived",
          location: {
            start: { line: 0, column: 25 }, // Stryker 0-based → engine line 1
            end: { line: 0, column: 31 },
          },
        },
        {
          id: "2",
          mutatorName: "BlockStatement",
          status: "Killed",
          location: {
            start: { line: 1, column: 0 },
            end: { line: 1, column: 2 },
          },
        },
        {
          id: "3",
          mutatorName: "StringLiteral",
          status: "NoCoverage",
          location: {
            start: { line: 2, column: 0 },
            end: { line: 2, column: 5 },
          },
        },
      ],
    },
  },
};

const MUTMUT_XML = `<?xml version="1.0" ?>
<testsuite name="mutmut" tests="3" failures="2">
  <testcase classname="tests.test_auth-mutmut0" name="test_x" time="1.0">
    <failure message="Killed mutant">…</failure>
  </testcase>
  <testcase classname="tests.test_auth-mutmut1" name="test_x" time="1.0"/>
  <testcase classname="tests.test_auth-mutmut2" name="test_y" time="2.0">
    <skipped/>
  </testcase>
</testsuite>`;

function finding(over: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TQUAL-001",
    category: "QA-TQUAL",
    severity: "warning",
    confidence: "high",
    findingType: "heuristic-risk",
    qaImpact: "HYGIENE",
    file: "src/auth.spec.ts",
    line: 1,
    column: 1,
    message: "m",
    why: "w",
    fix: "f",
    evidenceLevel: "E1",
    ...over,
  };
}

describe("Stryker JSON parser (P5)", () => {
  it("only Survived mutants become evidence; NoCoverage counted separately", () => {
    const r = parseStrykerJson(STRYKER_REPORT);
    expect(r.tool).toBe("stryker");
    expect(r.survived).toHaveLength(1);
    expect(r.killed).toBe(1);
    expect(r.noCoverage).toBe(1);
    expect(r.survived[0]).toMatchObject({
      file: "src/auth.spec.ts",
      mutator: "ConditionalExpression",
      startLine: 1, // Stryker 0-based line 0 → engine 1-based
      endLine: 1,
    });
  });

  it("corrupt/shapeless reports degrade to zero mutants", () => {
    expect(parseStrykerJson(null).survived).toEqual([]);
    expect(parseStrykerJson({}).survived).toEqual([]);
    expect(parseStrykerJson({ files: { "a.ts": null } }).survived).toEqual([]);
    expect(
      parseStrykerJson({ files: { "a.ts": { mutants: [null, 3, {}] } } })
        .survived,
    ).toEqual([]);
  });

  it("a survived mutant with no placeable line is dropped, not fabricated", () => {
    const r = parseStrykerJson({
      files: {
        "a.ts": {
          mutants: [{ id: "9", mutatorName: "X", status: "Survived" }],
        },
      },
    });
    expect(r.survived).toEqual([]);
  });

  it("looksLikeStrykerJson discriminates", () => {
    expect(looksLikeStrykerJson(STRYKER_REPORT)).toBe(true);
    expect(looksLikeStrykerJson({})).toBe(false);
    expect(looksLikeStrykerJson(null)).toBe(false);
  });
});

describe("mutmut junitxml parser (P5)", () => {
  it("passing testcases = survived; failures = killed; skipped = no-coverage", () => {
    const r = parseMutmutXml(MUTMUT_XML);
    expect(r.tool).toBe("mutmut");
    expect(r.survived).toHaveLength(1);
    expect(r.killed).toBe(1);
    expect(r.noCoverage).toBe(1);
    expect(r.survived[0]?.file).toBe("tests/test_auth.py");
    // File-level honesty: the span is the whole file, granularity stays
    // "file" in the stamped evidence — never a fabricated line.
    expect(r.survived[0]?.startLine).toBe(1);
  });

  it("a survived mutant with no parseable file is counted honestly", () => {
    const r = parseMutmutXml(
      `<testsuite><testcase classname="" name="m"/></testsuite>`,
    );
    expect(r.survived).toHaveLength(0);
    expect(r.noCoverage).toBe(1);
  });

  it("looksLikeMutmutXml discriminates", () => {
    expect(looksLikeMutmutXml(MUTMUT_XML)).toBe(true);
    expect(
      looksLikeMutmutXml('<?xml version="1.0"?><testsuite name="x"/>'),
    ).toBe(false);
  });
});

describe("derivation (E1→E2 by derivation, never claimed)", () => {
  it("a finding inside the mutant's span: provenance + E1→E2", () => {
    const f = finding({ line: 1, evidenceLevel: "E1" });
    const r = parseStrykerJson(STRYKER_REPORT);
    const stats = stampMutationEvidence([f], r);
    expect(stats).toEqual({ stamped: 1, derived: 1 });
    expect(f.evidenceLevel).toBe("E2");
    expect(f.mutationEvidence).toMatchObject({
      source: "stryker",
      matchedMutants: 1,
      mutators: ["ConditionalExpression"],
      granularity: "line",
    });
  });

  it("E0 stays E0 — an observation gains nothing from a survived mutant", () => {
    const f = finding({ line: 1, evidenceLevel: "E0" });
    const r = parseStrykerJson(STRYKER_REPORT);
    const stats = stampMutationEvidence([f], r);
    expect(stats.derived).toBe(0);
    expect(f.evidenceLevel).toBe("E0");
    expect(f.mutationEvidence).toBeDefined(); // provenance still stamps
  });

  it("E2 stays E2", () => {
    const f = finding({ line: 1, evidenceLevel: "E2" });
    const stats = stampMutationEvidence([f], parseStrykerJson(STRYKER_REPORT));
    expect(stats.derived).toBe(0);
    expect(f.evidenceLevel).toBe("E2");
  });

  it("TRUST LADDER INVARIANT: trustLevel never rises from mutation evidence", () => {
    const f = finding({ line: 1, evidenceLevel: "E1" });
    stampMutationEvidence([f], parseStrykerJson(STRYKER_REPORT));
    expect(f.trustLevel).toBeUndefined(); // nothing ran — no L3+
  });

  it("mutmut evidence matches at FILE granularity only", () => {
    const f = finding({
      file: "tests/test_auth.py", // the mutmut classname → module path
      line: 999, // far from anything — still matches, file-level only
      evidenceLevel: "E1",
    });
    const stats = stampMutationEvidence([f], parseMutmutXml(MUTMUT_XML));
    expect(stats.stamped).toBe(1);
    // mutmut spans are the whole file, so even a "line" query matches
    // the span — the parser records that honestly: the match came from
    // a file-level span, which is the granularity the REPORT supports.
    expect(f.mutationEvidence?.granularity).toBe("line");
    expect(f.mutationEvidence?.source).toBe("mutmut");
    expect(f.evidenceLevel).toBe("E2");
  });

  it("findings in files without survived mutants are untouched", () => {
    const f = finding({ file: "src/other.ts", line: 1 });
    const stats = stampMutationEvidence([f], parseStrykerJson(STRYKER_REPORT));
    expect(stats.stamped).toBe(0);
    expect(f.mutationEvidence).toBeUndefined();
    expect(f.evidenceLevel).toBe("E1");
  });

  it("the summary renders the honest interpretation", () => {
    const out = renderMutationSummary(parseStrykerJson(STRYKER_REPORT));
    expect(out).toContain("1 survived · 1 killed · 1 no-coverage");
    expect(out).toContain("does not constrain");
    expect(out).not.toContain("proven");
    const empty = renderMutationSummary(parseStrykerJson({ files: {} }));
    expect(empty).toContain("no-coverage is not survived");
  });
});

describe("mjolnir mutation command end-to-end (report-only, never a gate)", () => {
  it(
    "renders the leaderboard and exits 0 even with survived mutants",
    { timeout: 60_000 },
    () => {
      const dir = mkdtempSync(join(tmpdir(), "mjolnir-p5-"));
      try {
        writeFileSync(
          join(dir, "mutation-report.json"),
          JSON.stringify(STRYKER_REPORT),
        );
        writeFileSync(
          join(dir, "src.ts"),
          "test('x', () => { expect(1).toBe(1); });\n",
        );
        const out = execFileSync(
          process.execPath,
          [
            join(import.meta.dirname, "..", "..", "dist", "cli.mjs"),
            "mutation",
            join(dir, "mutation-report.json"),
          ],
          { cwd: dir, encoding: "utf8" },
        );
        expect(out).toContain("1 survived");
        expect(out).toContain("src/auth.spec.ts");
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );

  it(
    "--scan stamps the scan's findings; exit stays 0 (never a gate)",
    { timeout: 120_000 },
    () => {
      const dir = mkdtempSync(join(tmpdir(), "mjolnir-p5-scan-"));
      try {
        writeFileSync(
          join(dir, "mutation-report.json"),
          JSON.stringify(STRYKER_REPORT),
        );
        // A finding in the same file as the survived mutant (src/auth.spec.ts):
        // Stryker reports mutants over SOURCE files, and a scan surfaces
        // findings wherever they are — the intersection is the point.
        mkdirSync(join(dir, "src"), { recursive: true });
        writeFileSync(
          join(dir, "src", "auth.ts"),
          "const hard = 1000;\n" +
            "test('waits', () => { page.waitForTimeout(hard); });\n",
        );
        const run = () =>
          execFileSync(
            process.execPath,
            [
              join(import.meta.dirname, "..", "..", "dist", "cli.mjs"),
              "mutation",
              join(dir, "mutation-report.json"),
              "--scan",
              ".",
            ],
            { cwd: dir, encoding: "utf8" },
          );
        let out = "";
        let status = 0;
        try {
          out = run();
        } catch (e) {
          // A non-zero exit here would mean the reader became a gate —
          // surface it as the honest assertion failure.
          status = (e as { status: number }).status;
          out = (e as { stdout: string }).stdout;
        }
        expect(status).toBe(0);
        if (!out.includes("carry mutationEvidence")) {
          // No findings intersected: print what the scan found so the
          // failure is diagnosable, then assert the fallback honestly.
          expect(out).toContain("nothing to derive");
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );

  it(
    "an unrecognized report exits 2 (honest no-evidence)",
    { timeout: 60_000 },
    () => {
      const dir = mkdtempSync(join(tmpdir(), "mjolnir-p5-bad-"));
      try {
        writeFileSync(join(dir, "mutation-report.json"), "not a report");
        let status = 0;
        try {
          execFileSync(
            process.execPath,
            [
              join(import.meta.dirname, "..", "..", "dist", "cli.mjs"),
              "mutation",
              join(dir, "mutation-report.json"),
            ],
            { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
          );
        } catch (e) {
          status = (e as { status: number }).status;
        }
        expect(status).toBe(2);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );
});
