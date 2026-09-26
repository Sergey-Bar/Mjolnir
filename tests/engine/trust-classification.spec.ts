/**
 * One determination of what a run proves.
 *
 * The decision used to live in the reporter as a band mapping over
 * (level, confidence), with five surfaces each re-deriving something adjacent.
 * A reporter that decides is how a CI gate and a PR comment end up disagreeing
 * — and for a solo maintainer, duplicated judgment is the most expensive kind
 * of duplication, because there is nobody to notice the two copies drifting.
 *
 * These specs pin the determination itself, and above all the precondition:
 * an incomplete analysis proves nothing, at ANY level. That is the case where
 * a confident-looking number used to talk its way to a clean verdict.
 */

import { describe, expect, it } from "vitest";

import {
  classifyTrust,
  unclassifiable,
  type TrustClaim,
} from "../../src/engine/trust-classification.js";
import type { ScanResult, TrustSummary } from "../../src/types.js";
import { TRUST_ORDER } from "../../src/types.js";

function summary(overrides: Partial<TrustSummary> = {}): TrustSummary {
  return {
    level: "L2",
    confidence: 0.9,
    evidenceCoverage: 0.1,
    inconclusiveRate: 0,
    provisionalRuleIds: [],
    ceilingReasons: [],
    ...overrides,
  };
}

function result(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 90,
    frameworks: [],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: [],
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1,
    },
    ...overrides,
  };
}

function claim(r: ScanResult, s: TrustSummary): TrustClaim {
  return classifyTrust(r, s).claim;
}

describe("completeness is a precondition, not a factor", () => {
  it("a partial scan is INCOMPLETE at the highest level and full confidence", () => {
    // The case that matters. A confident-looking L5 on a truncated scan says
    // nothing about the files the budget never reached.
    const c = classifyTrust(
      result({ partial: true }),
      summary({ level: "L5", confidence: 0.99, evidenceCoverage: 0.9 }),
    );
    expect(c.claim).toBe("INCOMPLETE");
    expect(c.licensesClean).toBe(false);
    expect(c.gaps).toContain("the scan was partial");
  });

  it("truncated discovery is INCOMPLETE", () => {
    expect(
      claim(
        result({
          analysisStatus: {
            discovery: "partial",
            rules: "complete",
            skippedFiles: 0,
            durationMs: 1,
          },
        }),
        summary({ level: "L5", confidence: 0.99 }),
      ),
    ).toBe("INCOMPLETE");
  });

  it("a crashed rule is INCOMPLETE — a rule that threw proves nothing", () => {
    const c = classifyTrust(
      result({
        analysisStatus: {
          discovery: "complete",
          rules: "partial",
          skippedFiles: 0,
          rulesCrashed: 1,
          durationMs: 1,
        },
      }),
      summary({ level: "L5", confidence: 0.99 }),
    );
    expect(c.claim).toBe("INCOMPLETE");
    expect(c.gaps.join(" ")).toMatch(/crashed/);
  });

  it("a skipped file is INCOMPLETE", () => {
    expect(
      claim(
        result({
          analysisStatus: {
            discovery: "complete",
            rules: "complete",
            skippedFiles: 4,
            durationMs: 1,
          },
        }),
        summary({ level: "L5" }),
      ),
    ).toBe("INCOMPLETE");
  });

  it("a ceiling reason makes it INCOMPLETE and names the ceiling", () => {
    const c = classifyTrust(
      result(),
      summary({ ceilingReasons: ["budget-exceeded"] }),
    );
    expect(c.claim).toBe("INCOMPLETE");
    expect(c.gaps.join(" ")).toMatch(/budget-exceeded/);
  });

  it("a missing analysisStatus is not a complete scan", () => {
    // Absence of evidence about completeness is not evidence of completeness.
    // Treating a missing status as a full scan is how a report that says
    // nothing gets to say "trust them".
    const bare = { findings: [] } as unknown as ScanResult;
    expect(classifyTrust(bare, summary()).claim).toBe("INCOMPLETE");
  });
});

describe("a complete run is classified by what its evidence supports", () => {
  it("L4/L5 with confidence is run-backed", () => {
    expect(claim(result(), summary({ level: "L5", confidence: 0.9 }))).toBe(
      "RUN_EVIDENCE_BACKS_FINDINGS",
    );
    expect(claim(result(), summary({ level: "L4", confidence: 0.9 }))).toBe(
      "RUN_EVIDENCE_BACKS_FINDINGS",
    );
  });

  it("L3 is runtime-corroborated", () => {
    expect(claim(result(), summary({ level: "L3", confidence: 0.9 }))).toBe(
      "RUNTIME_CORROBORATED",
    );
  });

  it("L0 or zero coverage is NO_EVIDENCE and never licenses a clean claim", () => {
    // A complete scan with no runtime evidence is an OBSERVATION. "Zero
    // findings, high confidence, level L0" must not read as proven clean.
    const c = classifyTrust(
      result(),
      summary({ level: "L0", confidence: 0.99 }),
    );
    expect(c.claim).toBe("NO_EVIDENCE");
    expect(c.licensesClean).toBe(false);
    const zeroCoverage = classifyTrust(
      result(),
      summary({ level: "L2", confidence: 0.99, evidenceCoverage: 0 }),
    );
    expect(zeroCoverage.licensesClean).toBe(false);
  });

  it("confident static analysis licenses a clean claim", () => {
    const c = classifyTrust(
      result(),
      summary({ level: "L2", confidence: 0.9 }),
    );
    expect(c.claim).toBe("DETERMINISTIC_STATIC");
    expect(c.licensesClean).toBe(true);
  });

  it("low-confidence static analysis is leads, not verdicts", () => {
    const c = classifyTrust(
      result(),
      summary({ level: "L2", confidence: 0.2 }),
    );
    expect(c.claim).toBe("THIN_STATIC_SIGNAL");
    expect(c.reason).toMatch(/leads/);
  });
});

describe("a surface with nothing to classify fails closed", () => {
  it("unclassifiable never licenses a clean claim", () => {
    const c = unclassifiable("no report was supplied");
    expect(c.claim).toBe("INCOMPLETE");
    expect(c.licensesClean).toBe(false);
    expect(c.gaps).toEqual(["no report was supplied"]);
  });
});

describe("the determination is total and stable", () => {
  it("every (level, confidence) pair classifies to exactly one claim", () => {
    // The real ladder: an exhaustiveness check against a private copy keeps
    // passing after the ladder changes, which is the bug the single-source
    // guard exists to prevent.
    const levels = TRUST_ORDER;
    for (const level of levels) {
      for (const confidence of [0, 0.2, 0.5, 0.74, 0.75, 0.9, 1]) {
        for (const coverage of [0, 0.1, 0.9]) {
          const c = classifyTrust(
            result(),
            summary({ level, confidence, evidenceCoverage: coverage }),
          );
          expect(typeof c.claim, `${level}/${confidence}/${coverage}`).toBe(
            "string",
          );
          expect(
            c.claim.length,
            `${level}/${confidence}/${coverage}`,
          ).toBeGreaterThan(0);
          expect(c.reason.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("is deterministic", () => {
    const r = result();
    const s = summary({ level: "L3", confidence: 0.8 });
    expect(classifyTrust(r, s)).toEqual(classifyTrust(r, s));
  });

  it("a missing analysisStatus does not crash and does not claim clean", () => {
    const bare = { findings: [] } as unknown as ScanResult;
    const c = classifyTrust(bare, summary());
    // Absent status is not evidence of completeness, so the conservative
    // reading applies rather than an assumption of a full scan.
    expect(c.licensesClean).toBe(false);
  });
});
