export type ReleaseDecisionInput = {
  currentVersion: string;
  publishedVersion: string;
  candidateStatus: "PASS" | "BLOCKED" | "FAIL";
  m26Status: "PASS" | "BLOCKED" | "FAIL";
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
  if (input.m26Status !== "PASS") {
    blockers.push("M26 audit is not PASS");
  }
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
