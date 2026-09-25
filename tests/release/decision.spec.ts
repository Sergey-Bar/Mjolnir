import { describe, expect, it } from "vitest";
import { decideRelease } from "../../src/release/decision.js";

const passing = {
  currentVersion: "4.0.0",
  publishedVersion: "3.0.0",
  candidateStatus: "PASS" as const,
  m26Status: "PASS" as const,
  versionStatus: "PASS" as const,
  claimsStatus: "PASS" as const,
  roadmapStatus: "PASS" as const,
};

describe("release decision", () => {
  it("allows a future version only when every release gate passes", () => {
    expect(decideRelease(passing)).toEqual({
      status: "GO",
      version: "4.0.0",
      blockers: [],
      historicalVersionImmutable: false,
      releaseMutationAllowed: false,
    });
  });

  it("blocks republishing an already published version", () => {
    const result = decideRelease({
      ...passing,
      currentVersion: "3.0.0",
    });
    expect(result.status).toBe("NO_GO");
    expect(result.historicalVersionImmutable).toBe(true);
    expect(result.blockers).toContain(
      "3.0.0 is already published; assign the next legal SemVer",
    );
  });

  it("blocks every failed or incomplete gate", () => {
    const result = decideRelease({
      ...passing,
      candidateStatus: "BLOCKED",
      m26Status: "BLOCKED",
      versionStatus: "FAIL",
    });
    expect(result.status).toBe("NO_GO");
    expect(result.blockers).toEqual([
      "candidate readiness is not PASS",
      "M26 audit is not PASS",
      "version surface check is not PASS",
    ]);
  });
});
