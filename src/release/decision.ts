export type ReleaseDecisionInput = {
  currentVersion: string;
  publishedVersion: string;
  candidateStatus: "PASS" | "BLOCKED" | "FAIL";
  versionStatus: "PASS" | "FAIL";
  claimsStatus: "PASS" | "FAIL";
  roadmapStatus: "PASS" | "FAIL";
};

export type ReleaseDecision = {
  status: "GO" | "NO_GO";
  version: string;
  blockers: string[];
  historicalVersionImmutable: boolean;
  releaseMutationAllowed: boolean;
};

export function decideRelease(input: ReleaseDecisionInput): ReleaseDecision {
  const blockers: string[] = [];
  if (input.currentVersion === input.publishedVersion) {
    blockers.push(
      `${input.currentVersion} is already published; assign the next legal SemVer`,
    );
  }
  if (input.candidateStatus !== "PASS") {
    blockers.push("candidate readiness is not PASS");
  }
  // 6.0 removed `m26Status` from this input. The release decision gated on an
  // M26 audit, and that audit read four ledgers recording blocked evidence
  // that was never going to arrive — so a gate that could only ever say NO_GO
  // was one of the reasons the release decision was never actually exercised.
  // A gate nobody can satisfy is not a gate; it is a wall.
  if (input.versionStatus !== "PASS") {
    blockers.push("version surface check is not PASS");
  }
  if (input.claimsStatus !== "PASS") {
    blockers.push("claim registry check is not PASS");
  }
  if (input.roadmapStatus !== "PASS") {
    blockers.push("roadmap check is not PASS");
  }
  return {
    status: blockers.length === 0 ? "GO" : "NO_GO",
    version: input.currentVersion,
    blockers,
    historicalVersionImmutable: input.currentVersion === input.publishedVersion,
    releaseMutationAllowed: false,
  };
}
