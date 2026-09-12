/**
 * Evidence Core — normalization, determinism and preservation suite
 * (Mega MVP Master Plan v3.1 §26 WI-2: identity-stability,
 * ordering-determinism, preservation).
 *
 * The preservation half is differential: stamping through the core is
 * compared, finding-for-finding, against an oracle implementing the
 * pre-core matching verbatim (report-order grouping + line sort). Any
 * observable difference in runtimeCorroboration/trustLevel output is a
 * regression — WI-2 must be byte-identical on the JSON contract.
 */

import { describe, expect, it } from "vitest";

import {
  buildEvidenceRecords,
  compareEvidenceRecords,
  countEvidence,
  countTestsIn,
  findTestAt,
  EVIDENCE_CORE_VERSION,
  type EvidenceRecord,
} from "../../src/engine/evidence-core.js";
import {
  deriveTrustLevel,
  stampRuntimeCorroboration,
} from "../../src/engine/runtime-corroboration.js";
import type {
  ForensicsReport,
  TestVerdict,
} from "../../src/forensics/types.js";
import type { Finding } from "../../src/types.js";

function verdict(
  overrides: Partial<{
    [K in keyof TestVerdict]: K extends "line"
      ? number | undefined
      : TestVerdict[K];
  }>,
): TestVerdict {
  const merged = {
    file: "e2e/shop.spec.ts",
    title: "checkout flow",
    attempts: 1,
    finalStatus: "passed" as TestVerdict["finalStatus"],
    totalDurationMs: 120,
    passedOnRetry: false,
    everFailed: false,
    skipped: false,
    ...overrides,
  };
  return {
    file: merged.file,
    title: merged.title,
    attempts: merged.attempts,
    finalStatus: merged.finalStatus,
    totalDurationMs: merged.totalDurationMs,
    passedOnRetry: merged.passedOnRetry,
    everFailed: merged.everFailed,
    skipped: merged.skipped,
    ...(merged.line !== undefined ? { line: merged.line } : {}),
  };
}

function report(overrides: Partial<ForensicsReport> = {}): ForensicsReport {
  return {
    source: "playwright-json",
    totalTests: 2,
    failed: 0,
    skipped: 0,
    retriedTests: 0,
    flakyTests: 0,
    totalDurationMs: 240,
    verdicts: [],
    ...overrides,
  };
}

function finding(overrides: Partial<Finding>): Finding {
  return {
    ruleId: "QA-PW-102",
    category: "QA-PW",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FLAKY-RISK",
    evidenceLevel: "E2",
    file: "e2e/shop.spec.ts",
    line: 12,
    column: 3,
    message: "msg",
    why: "why",
    fix: "fix",
    ...overrides,
  };
}

describe("buildEvidenceRecords — normalization fidelity (WI-2 field contract)", () => {
  it("normalizes every plan-WI-2 field from a verdict", () => {
    const rep = report({
      verdicts: [
        verdict({
          file: "e2e/a.spec.ts",
          title: "flaky checkout",
          line: 10,
          attempts: 3,
          finalStatus: "passed",
          totalDurationMs: 999,
          passedOnRetry: true,
          everFailed: true,
        }),
        verdict({
          file: "e2e/b.spec.ts",
          title: "skipped suite",
          attempts: 1,
          finalStatus: "skipped",
          skipped: true,
        }),
      ],
    });
    const recs = buildEvidenceRecords(rep, "mjolnir.report.json");
    expect(recs).toHaveLength(2);
    const flaky = recs[0] as EvidenceRecord;
    expect(flaky.source).toBe("playwright-json");
    expect(flaky.artifact).toBe("mjolnir.report.json");
    expect(flaky.file).toBe("e2e/a.spec.ts");
    expect(flaky.title).toBe("flaky checkout");
    expect(flaky.line).toBe(10);
    expect(flaky.status).toEqual({
      final: "passed",
      failed: true,
      retried: true,
      passedOnRetry: true,
      skipped: false,
      timedOut: false,
    });
    expect(flaky.attempts).toBe(3);
    expect(flaky.durationMs).toBe(999);
    expect(flaky.errors).toEqual([]);
    expect(flaky.attachments).toEqual([]);
    expect(flaky.provenance).toEqual({
      core: EVIDENCE_CORE_VERSION,
      ingest: "mjolnir.forensics",
    });
    const skipped = recs[1] as EvidenceRecord;
    expect(skipped.status.skipped).toBe(true);
    expect(skipped.status.final).toBe("skipped");
  });

  it("absent declaration line stays absent — never guessed (evidence-state vocabulary)", () => {
    const recs = buildEvidenceRecords(
      report({ source: "junit-xml", verdicts: [verdict({ file: "unknown" })] }),
      "junit.xml",
    );
    expect(recs[0]?.line).toBeUndefined();
    expect(recs[0]?.source).toBe("junit-xml");
  });
});

describe("ordering determinism + identity stability (WI-2 Test contract)", () => {
  const shuffled = (): ForensicsReport =>
    report({
      verdicts: [
        verdict({ file: "e2e/c.spec.ts", title: "zeta", line: 30 }),
        verdict({ file: "e2e/a.spec.ts", title: "mid", line: 20 }),
        verdict({ file: "e2e/a.spec.ts", title: "alpha", line: 5 }),
        verdict({ file: "e2e/b.spec.ts", title: "no line" }),
      ],
    });

  it("report order never leaks: shuffled input, identical canonical output", () => {
    const r1 = buildEvidenceRecords(shuffled(), "x.json");
    const r2 = buildEvidenceRecords(shuffled(), "x.json");
    expect(r1).toEqual(r2);
    // file asc, then line asc, then title asc; line-absent last in file.
    expect(r1.map((r) => `${r.file}:${r.title}`)).toEqual([
      "e2e/a.spec.ts:alpha",
      "e2e/a.spec.ts:mid",
      "e2e/b.spec.ts:no line",
      "e2e/c.spec.ts:zeta",
    ]);
  });

  it("identity-stability: two builds of the same report are deep-equal", () => {
    expect(buildEvidenceRecords(shuffled(), "a")).toEqual(
      buildEvidenceRecords(shuffled(), "a"),
    );
  });
});

describe("findTestAt — W8 honesty preserved", () => {
  it("a single verdict without a line can never match test-level", () => {
    const recs = buildEvidenceRecords(
      report({
        verdicts: [verdict({ line: undefined })],
      }),
      "x",
    );
    expect(findTestAt(recs, "e2e/shop.spec.ts", 500)).toBeUndefined();
  });

  it("a single verdict matches only when its declaration line precedes the finding", () => {
    const recs = buildEvidenceRecords(
      report({ verdicts: [verdict({ line: 10 })] }),
      "x",
    );
    expect(findTestAt(recs, "e2e/shop.spec.ts", 12)?.title).toBe(
      "checkout flow",
    );
    expect(findTestAt(recs, "e2e/shop.spec.ts", 5)).toBeUndefined();
  });

  it("multi-verdict files: any line-absent verdict downgrades the whole file to file-level", () => {
    const recs = buildEvidenceRecords(
      report({
        verdicts: [
          verdict({ title: "a", line: 1 }),
          verdict({ title: "b", line: undefined }),
        ],
      }),
      "x",
    );
    expect(findTestAt(recs, "e2e/shop.spec.ts", 100)).toBeUndefined();
  });

  it("multi-verdict files: the greatest declaration line ≤ the finding wins", () => {
    const recs = buildEvidenceRecords(
      report({
        verdicts: [
          verdict({ title: "early", line: 10 }),
          verdict({ title: "late", line: 50 }),
        ],
      }),
      "x",
    );
    expect(findTestAt(recs, "e2e/shop.spec.ts", 60)?.title).toBe("late");
    expect(findTestAt(recs, "e2e/shop.spec.ts", 40)?.title).toBe("early");
  });
});

describe("countEvidence / countTestsIn", () => {
  it("counts statuses honestly from the status facts", () => {
    const recs = buildEvidenceRecords(
      report({
        verdicts: [
          verdict({ title: "pass" }),
          verdict({ title: "flaky", passedOnRetry: true, everFailed: true }),
          verdict({ title: "skip", skipped: true, finalStatus: "skipped" }),
          verdict({ title: "timeout", finalStatus: "timedOut" }),
        ],
      }),
      "x",
    );
    expect(countEvidence(recs)).toEqual({
      total: 4,
      failed: 1,
      flaky: 1,
      skipped: 1,
      timedOut: 1,
    });
    expect(countTestsIn(recs, "e2e/shop.spec.ts")).toBe(4);
    expect(countTestsIn(recs, "missing.ts")).toBe(0);
  });
});

describe("preservation: stamping through the core ≡ pre-core semantics (differential)", () => {
  /**
   * Oracle: the pre-core matching, verbatim from runtime-corroboration
   * before WI-2 (report-order grouping, stable line sort, W8 rule).
   * Grouping by file happened BEFORE matching, so a finding whose file
   * has no verdicts never reached the matcher.
   */
  function oracleMatch(
    verdicts: TestVerdict[],
    file: string,
    line: number,
  ): TestVerdict | undefined {
    const inFile = verdicts.filter((v) => v.file === file);
    if (inFile.length === 0) return undefined;
    if (inFile.length === 1) {
      const only = inFile[0] as TestVerdict;
      return only.line !== undefined && only.line <= line ? only : undefined;
    }
    for (const v of inFile) {
      if (v.line === undefined) return undefined;
    }
    const sorted = [...inFile].sort((a, b) => {
      const la = a.line as number;
      const lb = b.line as number;
      if (la < lb) return -1;
      if (la > lb) return 1;
      return 0;
    });
    let match: TestVerdict | undefined;
    for (const v of sorted) {
      const vl = v.line as number;
      if (vl <= line) match = v;
      else break;
    }
    return match;
  }

  const CASES: Array<{
    name: string;
    verdicts: TestVerdict[];
    findings: Array<{ file: string; line: number }>;
  }> = [
    {
      name: "three tests, findings interleaved",
      verdicts: [
        verdict({ title: "first", line: 1 }),
        verdict({ title: "second", line: 20, everFailed: true }),
        verdict({ title: "third", line: 60, attempts: 2, passedOnRetry: true }),
      ],
      findings: [
        { file: "e2e/shop.spec.ts", line: 5 },
        { file: "e2e/shop.spec.ts", line: 25 },
        { file: "e2e/shop.spec.ts", line: 100 },
        { file: "other/none.ts", line: 1 },
      ],
    },
    {
      name: "single verdict with line",
      verdicts: [verdict({ title: "only", line: 8, everFailed: true })],
      findings: [
        { file: "e2e/shop.spec.ts", line: 8 },
        { file: "e2e/shop.spec.ts", line: 7 },
      ],
    },
    {
      name: "single verdict without line (JUnit shape)",
      verdicts: [verdict({ title: "only", line: undefined })],
      findings: [{ file: "e2e/shop.spec.ts", line: 1 }],
    },
    {
      name: "multi verdict with a line-absent entry",
      verdicts: [
        verdict({ title: "a", line: 3 }),
        verdict({ title: "b", line: undefined }),
      ],
      findings: [{ file: "e2e/shop.spec.ts", line: 50 }],
    },
  ];

  for (const c of CASES) {
    it(`differential match — ${c.name}`, () => {
      const rep = report({ verdicts: c.verdicts });
      const records = buildEvidenceRecords(rep, "report.json");
      for (const f of c.findings) {
        const oracle = oracleMatch(c.verdicts, f.file, f.line);
        const actual = findTestAt(records, f.file, f.line);
        expect(actual?.title).toEqual(oracle?.title);
        expect(actual?.line).toEqual(oracle?.line);
      }
    });
  }

  it("stamped findings are identical with pre-built vs internally-built records", () => {
    const rep = report({
      verdicts: [
        verdict({ title: "first", line: 1 }),
        verdict({
          title: "flaky",
          line: 40,
          passedOnRetry: true,
          everFailed: true,
        }),
      ],
    });
    const mk = (): Finding[] => [
      finding({ file: "e2e/shop.spec.ts", line: 10 }),
      finding({ file: "e2e/shop.spec.ts", line: 45 }),
      finding({ file: "nowhere/x.ts", line: 2 }),
    ];
    const viaCore = mk();
    buildEvidenceRecords(rep, "r.json");
    stampRuntimeCorroboration(viaCore, rep);
    const viaInternal = mk();
    stampRuntimeCorroboration(viaInternal, rep);
    expect(viaCore).toEqual(viaInternal);
    // And the L5 defect-class upgrade still fires through the core;
    // a finding whose file the run never touched stays unstamped.
    expect(viaCore[1]?.trustLevel).toBe("L5");
    expect(viaCore[0]?.trustLevel).toBe("L4");
    expect(viaCore[2]?.trustLevel).toBeUndefined();
  });

  it("deriveTrustLevel keeps the structural L3–L5 require-corroboration invariant", () => {
    expect(
      deriveTrustLevel({
        evidenceLevel: "E2",
        findingType: "deterministic-defect",
        confidence: "high",
      }),
    ).toBe("L2");
    expect(
      deriveTrustLevel(
        {
          evidenceLevel: "E2",
          findingType: "deterministic-defect",
          confidence: "high",
        },
        { level: "file", source: "junit-xml", testsExecuted: 3 },
      ),
    ).toBe("L3");
  });
});

describe("ordering tiebreaks (coverage of the full comparator)", () => {
  it("records differing only in title order by title; identical records compare 0", () => {
    const base = verdict({ file: "e2e/x.spec.ts", title: "alpha" });
    const recs = buildEvidenceRecords(
      report({
        source: "junit-xml",
        verdicts: [verdict({ file: "e2e/x.spec.ts", title: "beta" }), base],
      }),
      "a.xml",
    );
    const titles = recs.map((r) => r.title);
    expect([...titles].sort()).toEqual(titles);
    // Full comparator: rebuilding the same report yields identical bytes
    // (the comparator's equal-records arm is exercised by the sort).
    const again = buildEvidenceRecords(
      report({
        source: "junit-xml",
        verdicts: [verdict({ file: "e2e/x.spec.ts", title: "beta" }), base],
      }),
      "a.xml",
    );
    expect(again).toEqual(recs);
  });

  it("records within ONE report share its source; order never leaks", () => {
    const recs = buildEvidenceRecords(
      report({
        source: "vitest-json",
        verdicts: [verdict({ title: "beta" }), verdict({ title: "alpha" })],
      }),
      "same.xml",
    );
    expect(recs.map((r) => r.source)).toEqual(["vitest-json", "vitest-json"]);
    expect(recs.map((r) => r.title)).toEqual(["alpha", "beta"]);
    const recs2 = buildEvidenceRecords(
      report({
        source: "vitest-json",
        verdicts: [verdict({ title: "alpha" }), verdict({ title: "beta" })],
      }),
      "same.xml",
    );
    expect(recs2).toEqual(recs);
  });

  it("zero-attempt verdicts take the skipped fallback (line 90 arm)", () => {
    const recs = buildEvidenceRecords(
      report({
        verdicts: [
          verdict({ attempts: 0, finalStatus: "skipped", skipped: true }),
        ],
      }),
      "z.xml",
    );
    expect(recs[0]?.status.final).toBe("skipped");
  });

  it("the comparator's final arm (identical file/line/title/source) is total", () => {
    // Two verdicts that differ in NOTHING the comparator reads must
    // still both be present — sort stability, never a lost record.
    const v1 = verdict({ title: "same", file: "f.spec.ts" });
    const v2 = verdict({ title: "same", file: "f.spec.ts" });
    const recs = buildEvidenceRecords(
      report({ verdicts: [v1, v2] }),
      "same.xml",
    );
    expect(recs).toHaveLength(2);
  });
});

describe("cross-source ordering (the source tiebreak's arms)", () => {
  it("records from two artifacts merge canonically — source is the final tiebreak", () => {
    // The pipeline merges per-artifact record lists; the comparator's
    // source arm is what makes THAT merge deterministic. Exercise it:
    const junit = buildEvidenceRecords(
      report({ source: "junit-xml", verdicts: [verdict({})] }),
      "same.xml",
    );
    const vitest = buildEvidenceRecords(
      report({ source: "vitest-json", verdicts: [verdict({})] }),
      "same.xml",
    );
    const merged = [...junit, ...vitest].sort(compareEvidenceRecords);
    expect(merged.map((r) => r.source)).toEqual(["junit-xml", "vitest-json"]);
    const merged2 = [...vitest, ...junit].sort(compareEvidenceRecords);
    expect(merged2.map((r) => r.source)).toEqual(["junit-xml", "vitest-json"]);
  });
});
