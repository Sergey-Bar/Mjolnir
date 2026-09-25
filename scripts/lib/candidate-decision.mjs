/**
 * The one release decision evaluator (plan V5-005 / V5-006).
 *
 * The repository carried two validators that could not both be true:
 *
 *   - `check-candidate-manifest.mjs` asserted the manifest describes a
 *     WORKING_CANDIDATE with a null candidate SHA and NOT_AUTHORIZED.
 *   - `check-candidate-readiness.mjs` asserted the manifest describes an
 *     AUTHORIZED RELEASE_CANDIDATE with a bound candidate SHA.
 *
 * Both ran in the release path, so the only manifest that could satisfy the
 * shape check was one that could never satisfy the release gate — and the one
 * that could satisfy the release gate was rejected by the shape check. That is
 * not a contradiction to be "fixed" by relaxing one side. It is a missing state
 * transition.
 *
 * This module owns the transition. It separates three questions that were
 * previously conflated:
 *
 *   1. Is the manifest internally coherent?      (contradiction → BLOCKED)
 *   2. Is the engineering evidence complete?     (gap → INCONCLUSIVE)
 *   3. Is the release authorized and remote-proven? (gap → INCONCLUSIVE)
 *
 * Human authorization is a separate input from evidence and can never upgrade
 * an evidence state (Trust Constitution law 12): AUTHORIZED with missing
 * evidence is still not releasable. The converse holds too — the absence of
 * an authorization decision cannot make the local evidence worse, so the
 * engineering stage is about evidence integrity, never about who said yes.
 */

import { readCandidateManifest } from "../candidate-manifest.mjs";

export const CANDIDATE_STATES = ["WORKING_CANDIDATE", "RELEASE_CANDIDATE"];
export const STAGES = ["engineering", "release"];

const SHA40 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
// Law 11: partial is never clean. A PARTIAL phase is an open requirement, not
// a satisfied one — accepting it here is how "mostly proven" becomes "proven".
const LOCAL_EVIDENCE_STATES = ["LOCAL_PROVEN"];
const WAVE_EVIDENCE_STATES = [
  "PASS",
  "FAIL",
  "BLOCKED",
  "NOT_RUN",
  "PARTIAL",
  "LOCAL_PROVEN",
  "REMOTE_PROVEN",
  "REMOTE_BLOCKED",
];
const REMOTE_REQUIREMENTS = [
  ["protectedHoldout", "protected holdout proof missing"],
  ["realWorldRepositories", "real-world repository proof missing"],
  ["platformMatrix", "platform matrix proof missing"],
  ["consumerInstall", "consumer install proof missing"],
  ["remoteWorkflow", "remote workflow proof missing"],
];

/**
 * Contradictions: states the manifest cannot legally be in. A contradiction is
 * not a gap, it is a false claim, and it fails every stage.
 */
export function manifestContradictions(manifest) {
  const problems = [];
  const identity = manifest.identity ?? {};
  const state = identity.state;

  if (manifest.schemaVersion !== 1) {
    problems.push(`schemaVersion must be 1, got ${manifest.schemaVersion}`);
  }
  if (!CANDIDATE_STATES.includes(state)) {
    problems.push(
      `identity.state must be one of ${CANDIDATE_STATES.join(", ")}`,
    );
  }
  for (const key of ["packageSha256", "lockfileSha256"]) {
    if (!SHA256.test(identity[key] ?? "")) {
      problems.push(`identity.${key} is not a SHA-256`);
    }
  }
  if (!SHA40.test(identity.baseSha ?? "")) {
    problems.push("identity.baseSha is not a commit SHA");
  }
  if (typeof manifest.owner !== "string" || manifest.owner.length === 0) {
    problems.push("candidate owner missing");
  }
  if (
    typeof manifest.approvalAuthority !== "string" ||
    manifest.approvalAuthority.length === 0
  ) {
    problems.push("approval authority missing");
  }
  if (typeof manifest.control !== "object" || manifest.control === null) {
    problems.push("M26 control record missing");
  }
  if (!Array.isArray(manifest.blockers) || manifest.blockers.length === 0) {
    problems.push("candidate blockers must be explicit");
  }
  for (const state_ of Object.values(
    manifest.evidence?.certificationWaves ?? {},
  )) {
    if (!WAVE_EVIDENCE_STATES.includes(state_)) {
      problems.push(`invalid wave evidence state ${state_}`);
    }
  }

  // The state transition itself. A working candidate carries no commit; a
  // release candidate carries exactly one. Anything else is a fabricated
  // identity, which is the failure mode this whole ledger exists to prevent.
  if (state === "WORKING_CANDIDATE") {
    if (identity.candidateSha !== null) {
      problems.push("WORKING_CANDIDATE cannot carry a candidate SHA");
    }
    if (manifest.releaseAuthorizationState !== "NOT_AUTHORIZED") {
      problems.push(
        "an unauthorized working candidate cannot claim a release authorization state",
      );
    }
    if (manifest.engineeringCertificationState === "CERTIFIED") {
      problems.push(
        "WORKING_CANDIDATE cannot be engineering-certified before release",
      );
    }
  } else if (state === "RELEASE_CANDIDATE") {
    if (!SHA40.test(identity.candidateSha ?? "")) {
      problems.push("RELEASE_CANDIDATE must bind an immutable candidate SHA");
    }
    if (
      !["NOT_AUTHORIZED", "AUTHORIZED"].includes(
        manifest.releaseAuthorizationState,
      )
    ) {
      problems.push(
        "releaseAuthorizationState must be NOT_AUTHORIZED or AUTHORIZED",
      );
    }
  }
  return problems;
}

/** Engineering evidence: what local work must prove before certification. */
export function engineeringBlockers(manifest) {
  const blockers = [];
  const localStates = Object.values(manifest.evidence?.local ?? {});
  if (localStates.length === 0) {
    blockers.push("no local implementation evidence recorded");
  } else if (
    !localStates.every((state) => LOCAL_EVIDENCE_STATES.includes(state))
  ) {
    blockers.push("local implementation evidence is incomplete");
  }
  if (manifest.control) {
    for (const key of ["issueLedger", "gapLedger", "supportMatrix"]) {
      if (manifest.control[key] !== "RECONCILED") {
        blockers.push(`${key} not reconciled`);
      }
    }
    if (manifest.control.dependencyResolution !== "APPROVED") {
      blockers.push("dependency resolution not approved");
    }
  }
  if (manifest.owner === "UNASSIGNED")
    blockers.push("candidate owner unassigned");
  if (manifest.approvalAuthority === "UNASSIGNED") {
    blockers.push("approval authority unassigned");
  }
  return blockers;
}

/** Release authority and independent assurance. Never upgrades evidence. */
export function releaseBlockers(manifest) {
  const blockers = [];
  if (manifest.identity?.state !== "RELEASE_CANDIDATE") {
    blockers.push("candidate identity is not a release candidate");
  }
  if (manifest.identity?.candidateSha === null) {
    blockers.push("candidate SHA not authorized");
  }
  if (manifest.engineeringCertificationState !== "CERTIFIED") {
    blockers.push("engineering certification not complete");
  }
  if (manifest.control?.externalValidation !== "COMPLETE") {
    blockers.push("external validation not complete");
  }
  if (manifest.releaseAuthorizationState !== "AUTHORIZED") {
    blockers.push("release authorization not granted");
  }
  const remote = manifest.evidence?.remote ?? {};
  for (const [key, message] of REMOTE_REQUIREMENTS) {
    if (remote[key] !== "REMOTE_PROVEN") blockers.push(message);
  }
  return blockers;
}

/**
 * The determination for one stage. Trust Constitution vocabulary:
 * a contradiction is BLOCKED (a false claim), an unmet requirement is
 * INCONCLUSIVE (unknown is not pass), and only zero blockers is READY.
 */
export function evaluateCandidateDecision(manifest, stage = "engineering") {
  if (!STAGES.includes(stage)) {
    throw new Error(
      `unknown stage ${stage}; expected one of ${STAGES.join(", ")}`,
    );
  }
  const contradictions = manifestContradictions(manifest);
  const engineering = engineeringBlockers(manifest);
  const release = stage === "release" ? releaseBlockers(manifest) : [];
  const unmet =
    stage === "release" ? [...engineering, ...release] : engineering;

  let determination = "READY";
  if (contradictions.length > 0) determination = "BLOCKED";
  else if (unmet.length > 0) determination = "INCONCLUSIVE";

  return {
    stage,
    status: determination === "READY" ? "READY" : "BLOCKED",
    determination,
    state: manifest.identity?.state ?? null,
    candidateSha: manifest.identity?.candidateSha ?? null,
    engineeringCertificationState: manifest.engineeringCertificationState,
    releaseAuthorizationState: manifest.releaseAuthorizationState,
    contradictions,
    engineeringBlockers: engineering,
    releaseBlockers: release,
    unmet,
    blockers: [...contradictions, ...unmet],
  };
}

export function decideForRoot(root, stage = "engineering") {
  return evaluateCandidateDecision(readCandidateManifest(root), stage);
}
