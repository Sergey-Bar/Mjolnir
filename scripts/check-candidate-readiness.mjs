import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? process.cwd();
const manifest = JSON.parse(
  readFileSync(join(root, "candidate-trust-manifest.json"), "utf8"),
);
const blockers = [];
if (manifest.identity.candidateSha === null)
  blockers.push("candidate SHA not authorized");
if (manifest.engineeringCertificationState !== "CERTIFIED") {
  blockers.push("engineering certification not complete");
}
if (manifest.releaseAuthorizationState !== "AUTHORIZED") {
  blockers.push("release authorization not granted");
}
if (manifest.evidence?.remote?.protectedHoldout !== "REMOTE_PROVEN") {
  blockers.push("protected holdout proof missing");
}
if (manifest.evidence?.remote?.remoteWorkflow !== "REMOTE_PROVEN") {
  blockers.push("remote workflow proof missing");
}
const status = blockers.length === 0 ? "READY" : "BLOCKED";
process.stdout.write(
  `${JSON.stringify({ status, blockers, manifest: manifest.manifestId })}\n`,
);
if (status === "BLOCKED") process.exitCode = 1;
