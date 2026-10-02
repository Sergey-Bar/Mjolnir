import { describe, expect, it } from "vitest";
import { deriveCompletion } from "../../src/engine/completion.js";

describe("deriveCompletion", () => {
  it("derives a complete status only when every completion input is clean", () => {
    const result = deriveCompletion({
      discoveryTruncated: false,
      rulesPartial: false,
      skippedFiles: 0,
      rulesCrashed: 0,
      truncationReasons: [],
      scopeIgnored: 0,
      scopeUnrecognized: 0,
      parseFailed: 0,
    });
    expect(result).toEqual({
      partial: false,
      coverageState: "COMPLETE",
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        rulesCrashed: 0,
        parseFallbacks: 0,
        // A caller that did not measure the withheld set has not shown it
        // was empty, so the default is 0/0 rather than a guess. Absence
        // reads as COMPLETE: a producer predating the field is the one case
        // where claiming PARTIAL would be a fabricated new failure.
        rulesApplied: 0,
        rulesWithheld: 0,
        reasons: [],
      },
    });
  });

  it("reports the withheld set as PARTIAL coverage without touching partial", () => {
    // The governing constraint, as a test: `partial` gains no input from
    // coverage. A whole scan over 45 of 79 detectors is `partial: false`,
    // `coverageState: "PARTIAL"`, and its only reason is the coverage gap —
    // not an in-flight degradation.
    const result = deriveCompletion({
      discoveryTruncated: false,
      rulesPartial: false,
      skippedFiles: 0,
      rulesCrashed: 0,
      truncationReasons: [],
      scopeIgnored: 0,
      scopeUnrecognized: 0,
      parseFailed: 0,
      rulesApplied: 45,
      rulesWithheld: 34,
    });
    expect(result.partial).toBe(false);
    expect(result.coverageState).toBe("PARTIAL");
    expect(result.analysisStatus.rules).toBe("complete");
    expect(result.analysisStatus.rulesApplied).toBe(45);
    expect(result.analysisStatus.rulesWithheld).toBe(34);
    expect(result.analysisStatus.reasons).toEqual(["coverage:quarantine:34"]);
  });

  it("derives partial rules and a reason when rules crash", () => {
    const result = deriveCompletion({
      discoveryTruncated: false,
      rulesPartial: false,
      skippedFiles: 0,
      rulesCrashed: 2,
      truncationReasons: [],
      scopeIgnored: 0,
      scopeUnrecognized: 0,
      parseFailed: 0,
    });
    expect(result.partial).toBe(true);
    expect(result.analysisStatus.rules).toBe("partial");
    expect(result.analysisStatus.reasons).toContain("rules-crashed:2");
  });

  it("records scope, parser, runtime, and identity degradation explicitly", () => {
    const result = deriveCompletion({
      discoveryTruncated: true,
      rulesPartial: true,
      skippedFiles: 1,
      rulesCrashed: 1,
      truncationReasons: ["deadline", "deadline"],
      scopeIgnored: 2,
      scopeUnrecognized: 3,
      parseFailed: 4,
      parseFallbacks: 5,
      scopeDegraded: "changed-scope",
      runtimeIncomplete: true,
      identityIncomplete: true,
    });
    expect(result.partial).toBe(true);
    expect(result.analysisStatus.discovery).toBe("partial");
    expect(result.analysisStatus.rules).toBe("partial");
    expect(result.analysisStatus.truncationReasons).toEqual(["deadline"]);
    expect(result.analysisStatus.reasons).toEqual(
      expect.arrayContaining([
        "discovery-truncated",
        "rules-partial",
        "skipped-files:1",
        "rules-crashed:1",
        "scope-ignored:2",
        "scope-unrecognized:3",
        "parse-failed:4",
        "parse-fallbacks:5",
        "scope-degraded:changed-scope",
        "runtime-incomplete",
        "identity-incomplete",
        "truncated:deadline",
      ]),
    );
  });

  it("orders degradation counts by reason, and reports them when there are any", () => {
    // The comparator here is a FUNCTION, and a function only counts as
    // covered when it is CALLED — with zero or one degradation the sort never
    // invokes it, so a suite that only ever passes one entry reports 50%
    // function coverage for the file and trips the per-file floor while
    // looking, to a reader, like thorough coverage of this file.
    //
    // The order is asserted rather than just the count because a REASON
    // order that varies between runs makes the `analysisStatus` a
    // non-reproducible string in a diff-able report.
    const result = deriveCompletion({
      discoveryTruncated: false,
      rulesPartial: false,
      skippedFiles: 0,
      rulesCrashed: 0,
      truncationReasons: [],
      scopeIgnored: 0,
      scopeUnrecognized: 0,
      parseFailed: 0,
      degradations: [
        { reason: "ast-range-scan-failed", count: 2 },
        { reason: "ast-mask-unavailable", count: 1 },
        { reason: "ast-parse-failed", count: 3 },
      ],
    });
    expect(result.analysisStatus.degradations).toEqual([
      { reason: "ast-mask-unavailable", count: 1 },
      { reason: "ast-parse-failed", count: 3 },
      { reason: "ast-range-scan-failed", count: 2 },
    ]);
    // Any degradation at all is a completion loss, and the scan says so
    // rather than reporting the surface as verified.
    expect(result.partial).toBe(true);
  });

  it("reports no degradations block when the list is empty", () => {
    const result = deriveCompletion({
      discoveryTruncated: false,
      rulesPartial: false,
      skippedFiles: 0,
      rulesCrashed: 0,
      truncationReasons: [],
      scopeIgnored: 0,
      scopeUnrecognized: 0,
      parseFailed: 0,
      degradations: [],
    });
    expect(result.analysisStatus.degradations).toBeUndefined();
    expect(result.partial).toBe(false);
  });
});
