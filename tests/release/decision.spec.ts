import { describe, expect, it } from "vitest";
import { decideRelease } from "../../src/release/decision.js";

const passing = {
  currentVersion: "4.0.0",
  publishedVersion: "3.0.0",
  candidateStatus: "PASS" as const,
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
      versionStatus: "FAIL",
    });
    expect(result.status).toBe("NO_GO");
    expect(result.blockers).toEqual([
      "candidate readiness is not PASS",
      "version surface check is not PASS",
    ]);
  });

  it("has no M26 arm, because the M26 program it gated on is retired", () => {
    // 6.0 removed `m26Status`. The gate read four ledgers recording blocked
    // evidence that was never going to arrive, so it could only ever answer
    // BLOCKED — a release decision with a wall in it is not a decision.
    // Asserted as ABSENT rather than merely unused: an input nobody can set is
    // a field a future author will wire back up by habit.
    const decision = decideRelease({ ...passing });
    expect(decision.blockers.join(" ")).not.toMatch(/M26/i);
  });
});
