import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? process.cwd();
const manifest = JSON.parse(
  readFileSync(join(root, "candidate-trust-manifest.json"), "utf8"),
);
const localStates = Object.values(manifest.evidence?.local ?? {});
const implementationReady =
  ["WORKING_CANDIDATE", "RELEASE_CANDIDATE"].includes(
    manifest.identity.state,
  ) &&
  localStates.length > 0 &&
  localStates.every((state) => ["LOCAL_PROVEN", "PARTIAL"].includes(state));
const blockers = [];
if (manifest.identity?.state !== "RELEASE_CANDIDATE") {
  blockers.push("candidate identity is not a release candidate");
}
if (!implementationReady) {
  blockers.push("local implementation evidence is incomplete");
}
if (manifest.identity.candidateSha === null)
  blockers.push("candidate SHA not authorized");
if (manifest.owner === "UNASSIGNED")
  blockers.push("candidate owner unassigned");
if (manifest.approvalAuthority === "UNASSIGNED") {
  blockers.push("approval authority unassigned");
}
if (manifest.control) {
  for (const key of ["issueLedger", "gapLedger", "supportMatrix"]) {
    if (manifest.control[key] !== "RECONCILED") {
      blockers.push(`${key} not reconciled`);
    }
  }
  if (manifest.control.externalValidation !== "COMPLETE") {
    blockers.push("external validation not complete");
  }
  if (manifest.control.dependencyResolution !== "APPROVED") {
    blockers.push("dependency resolution not approved");
  }
}
if (manifest.engineeringCertificationState !== "CERTIFIED") {
  blockers.push("engineering certification not complete");
}
if (manifest.releaseAuthorizationState !== "AUTHORIZED") {
  blockers.push("release authorization not granted");
}
const remoteEvidence = manifest.evidence?.remote ?? {};
for (const [key, message] of [
  ["protectedHoldout", "protected holdout proof missing"],
  ["realWorldRepositories", "real-world repository proof missing"],
  ["platformMatrix", "platform matrix proof missing"],
  ["consumerInstall", "consumer install proof missing"],
  ["remoteWorkflow", "remote workflow proof missing"],
]) {
  if (remoteEvidence[key] !== "REMOTE_PROVEN") blockers.push(message);
}
const status = blockers.length === 0 ? "READY" : "BLOCKED";
process.stdout.write(
  `${JSON.stringify({
    status,
    implementationStatus: implementationReady
      ? "IMPLEMENTATION_READY_CANDIDATE_COMMIT_NOT_AUTHORIZED"
      : "IMPLEMENTATION_BLOCKED",
    blockers,
    manifest: manifest.manifestId,
  })}\n`,
);
if (status === "BLOCKED") process.exitCode = 1;
