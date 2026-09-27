import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  inspectCandidateWorktree,
  readCandidateManifest,
} from "./candidate-manifest.mjs";
import { manifestContradictions } from "./lib/candidate-decision.mjs";

const root = process.argv[2] ?? process.cwd();
const manifest = readCandidateManifest(root);
const fail = (message) => {
  console.error(`candidate-manifest: ${message}`);
  process.exit(1);
};
// State-shape and evidence-honesty rules live in the one evaluator
// (scripts/lib/candidate-decision.mjs) so the working-candidate and
// release-candidate manifests are validated by the same law, not two.
for (const problem of manifestContradictions(manifest)) fail(problem);
if (manifest.train !== "M26") fail("train must be M26");
if (manifest.worktreePolicy !== "PRESERVE_NO_RESET_STASH_DELETE") {
  fail("worktree preservation policy is not explicit");
}
for (const source of manifest.sourceRefs ?? []) {
  if (!existsSync(join(root, source)))
    fail(`missing source reference ${source}`);
}
const worktree = inspectCandidateWorktree(root);
for (const key of [
  "version",
  "packageSha256",
  "lockfileSha256",
  "workingTreeSha256",
  "changedPathCount",
]) {
  if (worktree[key] !== manifest.identity[key]) fail(`${key} drift`);
}
// The base SHA is bookkeeping, not the binding.
//
// The manifest's authority is `workingTreeSha256`, checked above without
// exception, together with the dirty-file and worktree inventories. Those are
// the invariants. A base SHA that is not an ancestor of HEAD adds no failure
// case they do not already cover more precisely — and while it was enforced it
// made the verdict depend on invisible local state.
//
// A stamp names the tip of the branch it was cut from. When that branch merges
// through a squash, the stamp's base is a sibling of the merge commit, never an
// ancestor. A fresh clone has never seen the branch tip, `git cat-file -e`
// fails, the check is skipped, and CI is green — while a developer who still
// has the branch locally gets "candidate base SHA is not the current or an
// ancestor HEAD" for the identical commit. Same tree, same manifest, opposite
// verdicts, decided by whether an object happens to survive in the local store.
//
// So the relation is reported, not enforced.
const baseObjectAvailable =
  spawnSync(
    "git",
    ["cat-file", "-e", `${manifest.identity.baseSha}^{commit}`],
    { cwd: root, windowsHide: true },
  ).status === 0;
if (manifest.identity.baseSha !== worktree.baseSha) {
  const isAncestor =
    baseObjectAvailable &&
    spawnSync(
      "git",
      [
        "merge-base",
        "--is-ancestor",
        manifest.identity.baseSha,
        worktree.baseSha,
      ],
      { cwd: root, windowsHide: true },
    ).status === 0;
  const relation = !baseObjectAvailable
    ? "not present in this repository, as expected after a squash merge"
    : isAncestor
      ? "an ancestor of HEAD"
      : "not an ancestor of HEAD, which is what a squash merge produces";
  console.log(
    `candidate-manifest: base ${manifest.identity.baseSha.slice(0, 8)} is ${relation}`,
  );
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
console.log(
  JSON.stringify({
    status: "PASS",
    state: manifest.identity.state,
    engineeringCertificationState: manifest.engineeringCertificationState,
    releaseAuthorizationState: manifest.releaseAuthorizationState,
  }),
);
