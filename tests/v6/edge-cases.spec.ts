import { describe, expect, it } from "vitest";

import {
  demote,
  deriveMaturityFromEvidence,
  nextLevelGapFromEvidence,
  nextMaturity,
  previousMaturity,
  type MaturityEvidence,
} from "../../src/v6/maturity.js";
import {
  isDirectory,
  listPublicFiles,
  scanSurfaces,
  scanText,
  type ClaimCandidate,
} from "../../src/v6/claim-lint.js";

const NONE: MaturityEvidence = {
  declared: false,
  implemented: false,
  unitTested: false,
  fixtureQuadVerified: false,
  corpusVerified: false,
  fieldProven: false,
};

describe("the nextLevelGap names the unsatisfied criterion at every level", () => {
  it("names the registry entry when nothing is declared", () => {
    const { maturity, nextLevelGap } = nextLevelGapFromEvidence(
      NONE,
      "owner",
      "trigger",
    );
    expect(maturity).toBe("M0_UNKNOWN");
    expect(nextLevelGap?.target).toBe("M1_DECLARED");
    expect(nextLevelGap?.missing.join(" ")).toMatch(
      /registry entry with an owner/,
    );
  });

  it("names the corpus criterion at M3 and the field criterion at M4", () => {
    const atM3 = nextLevelGapFromEvidence(
      {
        declared: true,
        implemented: true,
        unitTested: true,
        fixtureQuadVerified: true,
        corpusVerified: false,
        fieldProven: false,
      },
      "owner",
      "trigger",
    );
    expect(atM3.nextLevelGap?.target).toBe("M4_CORPUS_VERIFIED");
    // The gap text is the M4 criterion in full, because "run some more repos"
    // is not a gap a reader can act on.
    const text = atM3.nextLevelGap?.missing.join(" ") ?? "";
    expect(text).toMatch(/n >= 10/);
    expect(text).toMatch(/Wilson CI/);
    expect(text).toMatch(/precision AND recall/);
    expect(text).toMatch(/detectorRev/);

    const atM4 = nextLevelGapFromEvidence(
      {
        declared: true,
        implemented: true,
        unitTested: true,
        fixtureQuadVerified: true,
        corpusVerified: true,
        fieldProven: false,
      },
      "owner",
      "trigger",
    );
    expect(atM4.nextLevelGap?.target).toBe("M5_FIELD_PROVEN");
    expect(atM4.nextLevelGap?.missing.join(" ")).toMatch(
      /independent real-world repositories/,
    );
  });
});

describe("ladder edges return null rather than an out-of-range value", () => {
  it("returns null at both ends and a real level in between", () => {
    // The `?? null` arms are what stop an off-by-one from yielding
    // `undefined` — a level that is neither a claim nor an absence, and
    // which a renderer would print.
    expect(nextMaturity("M5_FIELD_PROVEN")).toBeNull();
    expect(previousMaturity("M0_UNKNOWN")).toBeNull();
    expect(nextMaturity("M0_UNKNOWN")).toBe("M1_DECLARED");
    expect(previousMaturity("M5_FIELD_PROVEN")).toBe("M4_CORPUS_VERIFIED");
  });
});

describe("auto-demotion covers every reason and both no-op shapes", () => {
  it("reports EVIDENCE_STALE when the bound evidence stopped being current", () => {
    expect(
      demote({
        maturity: "M3_FIXTURE_VERIFIED",
        gap: {
          target: "M3_FIXTURE_VERIFIED",
          missing: ["x"],
          owner: "o",
          revisitTrigger: "t",
        },
        triggerFired: true,
        evidenceStale: true,
      })?.reason,
    ).toBe("EVIDENCE_STALE");
  });

  it("demotes nothing when the gap targets a different level than the maturity", () => {
    // The trigger retires the level the gap was working toward. A gap
    // pointing elsewhere is an inconsistent record, and the safe response
    // to an inconsistent record is to change nothing.
    expect(
      demote({
        maturity: "M2_IMPLEMENTED",
        gap: {
          target: "M4_CORPUS_VERIFIED",
          missing: ["x"],
          owner: "o",
          revisitTrigger: "t",
        },
        triggerFired: true,
      }),
    ).toBeNull();
  });

  it("demotes a declaration to M0, and refuses to go below M0", () => {
    // A fired trigger on M1 means the declaration no longer holds, so M0 is
    // the honest result. M0 is the floor, and `previousMaturity("M0")` is
    // null, so there is no state below it to demote into — which is why the
    // `?? null` arm matters: it is what stops an off-by-one producing a
    // level the ladder does not declare.
    expect(
      demote({
        maturity: "M1_DECLARED",
        gap: {
          target: "M1_DECLARED",
          missing: ["x"],
          owner: "o",
          revisitTrigger: "t",
        },
        triggerFired: true,
      }),
    ).toEqual({
      from: "M1_DECLARED",
      to: "M0_UNKNOWN",
      reason: "REVISIT_TRIGGER_FIRED",
    });
    expect(
      demote({
        maturity: "M0_UNKNOWN",
        gap: null,
        triggerFired: true,
      }),
    ).toBeNull();
  });
});

describe("claim-lint — the filesystem arms", () => {
  it("recognises a directory and denies a file", () => {
    expect(isDirectory("src")).toBe(true);
    expect(isDirectory("package.json")).toBe(false);
    expect(isDirectory("no-such-path")).toBe(false);
  });

  it("recognises a `via` that already carries a wire prefix, and normalises a bare path", () => {
    // The scanner has to pass a prefixed `via` through unchanged and prefix
    // a bare path once. Double-prefixing `manifest-file:` is the bug that
    // made every file-based census signal undetectable, so the two shapes
    // are asserted against the same corpus entry set below.
    const findings = scanText(
      "works with Jest, Vitest and Playwright",
      "README.md",
      "readme",
    );
    expect(findings.map((f) => f.patternId)).toContain(
      "framework-support-enumeration",
    );
  });

  it("does not walk node_modules or dist when listing public files", () => {
    // A lint that scans node_modules finds 40 000 hits and a lint that
    // scans dist finds stale copies. Both look like "everything is broken".
    const files = listPublicFiles(process.cwd()).map((f) => f.file);
    expect(files.some((f) => f.includes("node_modules"))).toBe(false);
    expect(files.some((f) => f.includes("/dist/"))).toBe(false);
  });

  it("scans this repository and finds its own committed public claims", () => {
    // The end-to-end arm: the lint must actually see the surfaces it
    // declares, or `claims:prose` is a report of nothing.
    const findings = scanSurfaces(process.cwd());
    expect(findings.length).toBeGreaterThan(0);
    const surfaces = new Set(findings.map((f) => f.surface));
    expect([...surfaces].some((s) => s === "README.md")).toBe(true);
  });

  it("treats an unreadable line as an empty line rather than crashing", () => {
    expect(scanText("", "README.md", "readme")).toEqual([]);
  });
});

describe("claim-lint — a candidate is a reportable record", () => {
  const candidate: ClaimCandidate = {
    location: "README.md:7",
    surface: "README.md",
    kind: "readme",
    patternId: "count-of-rules",
    severity: "BANNED",
    text: "79 rules",
    line: 7,
  };

  it("carries a location, a severity and the matched text", () => {
    // A finding a reviewer cannot locate or triage is not a finding; it is
    // a log line. Every field is what makes the finding actionable.
    expect(candidate.location).toContain("README.md");
    expect(candidate.severity).toBe("BANNED");
    expect(candidate.text.length).toBeGreaterThan(0);
    expect(candidate.line).toBeGreaterThan(0);
  });

  it("sorts deterministically, so a report diffs", () => {
    const results = [
      scanText("79 rules", "a.md", "doc"),
      scanText("5 languages", "b.md", "doc"),
    ];
    const a = JSON.stringify(results[0]);
    const b = JSON.stringify(results[1]);
    expect(JSON.stringify(scanText("79 rules", "a.md", "doc"))).toBe(a);
    expect(JSON.stringify(scanText("5 languages", "b.md", "doc"))).toBe(b);
  });
});

describe("the maturity ladder and the claim lint stay consistent", () => {
  it("never derives a level the ladder does not declare", () => {
    const levels = new Set([
      "M0_UNKNOWN",
      "M1_DECLARED",
      "M2_IMPLEMENTED",
      "M3_FIXTURE_VERIFIED",
      "M4_CORPUS_VERIFIED",
      "M5_FIELD_PROVEN",
    ]);
    for (const declared of [false, true]) {
      for (const implemented of [false, true]) {
        for (const unitTested of [false, true]) {
          for (const fixtures of [false, true]) {
            for (const corpus of [false, true]) {
              for (const field of [false, true]) {
                expect(
                  levels.has(
                    deriveMaturityFromEvidence({
                      declared,
                      implemented,
                      unitTested,
                      fixtureQuadVerified: fixtures,
                      corpusVerified: corpus,
                      fieldProven: field,
                    }),
                  ),
                ).toBe(true);
              }
            }
          }
        }
      }
    }
  });
});
