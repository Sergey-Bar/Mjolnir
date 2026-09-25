import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  inspectCandidateWorktree,
  readCandidateManifest,
} from "./candidate-manifest.mjs";

const root = process.argv[2] ?? process.cwd();
const manifest = readCandidateManifest(root);
const fail = (message) => {
  console.error(`candidate-manifest: ${message}`);
  process.exit(1);
};
if (
  manifest.schemaVersion !== 1 ||
  manifest.identity?.state !== "WORKING_CANDIDATE"
) {
  fail("schemaVersion/identity must describe a WORKING_CANDIDATE");
}
if (manifest.identity.candidateSha !== null) {
  fail("working candidate cannot carry a candidate SHA");
}
if (manifest.engineeringCertificationState === "CERTIFIED") {
  fail("working candidate cannot be CERTIFIED");
}
if (manifest.releaseAuthorizationState !== "NOT_AUTHORIZED") {
  fail("pre-authorization manifest must remain NOT_AUTHORIZED");
}
for (const key of ["packageSha256", "lockfileSha256"]) {
  if (!/^[a-f0-9]{64}$/.test(manifest.identity[key]))
    fail(`${key} is not a SHA-256`);
}
for (const source of manifest.sourceRefs ?? []) {
  if (!existsSync(join(root, source)))
    fail(`missing source reference ${source}`);
}
if (manifest.train !== "M26") fail("train must be M26");
if (manifest.worktreePolicy !== "PRESERVE_NO_RESET_STASH_DELETE") {
  fail("worktree preservation policy is not explicit");
}
if (typeof manifest.owner !== "string" || manifest.owner.length === 0) {
  fail("candidate owner missing");
}
if (
  typeof manifest.approvalAuthority !== "string" ||
  manifest.approvalAuthority.length === 0
) {
  fail("approval authority missing");
}
if (typeof manifest.control !== "object" || manifest.control === null) {
  fail("M26 control record missing");
}
if (!Array.isArray(manifest.blockers) || manifest.blockers.length === 0) {
  fail("candidate blockers must be explicit");
}
const worktree = inspectCandidateWorktree(root);
for (const key of [
  "version",
  "baseSha",
  "packageSha256",
  "lockfileSha256",
  "workingTreeSha256",
  "changedPathCount",
]) {
  if (worktree[key] !== manifest.identity[key]) fail(`${key} drift`);
}
if (
  JSON.stringify(worktree.dirtyFiles) !==
  JSON.stringify(manifest.identity.dirtyFiles)
) {
  fail("dirty-file inventory drift");
}
if (
  JSON.stringify(worktree.worktreeInventory) !==
  JSON.stringify(manifest.identity.worktreeInventory)
) {
  fail("worktree inventory drift");
}
if (
  !manifest.claimRegistry?.path ||
  !existsSync(join(root, manifest.claimRegistry.path))
) {
  fail("claim registry reference is missing");
}
for (const state of Object.values(
  manifest.evidence?.certificationWaves ?? {},
)) {
  if (
    ![
      "PASS",
      "FAIL",
      "BLOCKED",
      "NOT_RUN",
      "PARTIAL",
      "LOCAL_PROVEN",
      "REMOTE_PROVEN",
      "REMOTE_BLOCKED",
    ].includes(state)
  ) {
    fail(`invalid wave evidence state ${state}`);
  }
}
console.log(
  JSON.stringify({
    status: "PASS",
    state: manifest.identity.state,
    engineeringCertificationState: manifest.engineeringCertificationState,
    releaseAuthorizationState: manifest.releaseAuthorizationState,
  }),
);
