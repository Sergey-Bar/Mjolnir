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
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        rulesCrashed: 0,
        parseFallbacks: 0,
        reasons: [],
      },
    });
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
});
