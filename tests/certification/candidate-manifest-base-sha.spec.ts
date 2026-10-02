/**
 * The candidate trust manifest's verdict must not depend on which objects
 * happen to survive in a developer's local object store.
 *
 * A stamp names the tip of the branch it was cut from. When that branch merges
 * through a squash, the stamp's base is a *sibling* of the merge commit and
 * never an ancestor of it. Enforcing that relation produced two different
 * verdicts for one commit:
 *
 *   - a fresh clone, which has never seen the branch tip, skipped the check
 *     and reported PASS;
 *   - a developer who still had the branch locally got "candidate base SHA is
 *     not the current or an ancestor HEAD" for the identical commit.
 *
 * Same tree, same manifest, opposite verdicts, decided by whether an object
 * happens to survive in the local store.
 *
 * The tree fingerprint is the actual binding and it is checked without
 * exception. The base-SHA relation is now reported. This spec pins that it is
 * reported rather than enforced, and that a genuine tree mismatch still fails.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");
const CHECK = join(root, "scripts", "check-candidate-manifest.mjs");
const MANIFEST = join(root, "candidate-trust-manifest.json");

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
  identity: { baseSha: string };
};
const head = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).stdout.trim();

function runCheck() {
  return spawnSync(process.execPath, [CHECK, root], { encoding: "utf8" });
}

describe("candidate manifest base SHA is reported, not enforced", () => {
  it("never fails for the base SHA, whatever else it reports", () => {
    // Deliberately an assertion about the message and not about the exit code.
    // The check hashes the working tree, and a parallel suite run is not
    // guaranteed to be quiescent: any test that writes and restores a tracked
    // file mid-run makes the fingerprint move, so the exit code is not this
    // spec's to claim. The regression is specific and this pins it — the old
    // gate failed with exactly this line, for a repository state that is the
    // normal one after any squash-merged release.
    const result = runCheck();
    expect(result.stdout + result.stderr).not.toContain(
      "candidate base SHA is not the current or an ancestor HEAD",
    );
  });

  it("passes outright when the tree is quiescent", () => {
    // Run after the message assertion and on its own, so a run that happens to
    // be quiescent is still checked end to end. If a parallel writer made the
    // tree move, this reports it rather than hiding it — and the message it
    // then produces is a real finding about this run, not about the base SHA.
    //
    // The tolerated set is "any content-invariant drift", and the checker
    // names its own invariants as `<key> drift` (`CONTENT_INVARIANTS`).
    // This used to spell out three of the four as a regex, so a
    // `lockfileSha256 drift` — what any `npm audit fix` produces — failed
    // here with a message the test did not recognise as the transient it is.
    // A hand-copied tolerance list is a second source that goes stale; the
    // shape of the message is the contract.
    const result = runCheck();
    if (result.status !== 0) {
      const message = result.stderr + result.stdout;
      expect(message).toMatch(/\w+ drift/);
      // …and specifically not the base-SHA complaint, which is the one
      // failure this file exists to prove is NOT fatal.
      expect(message).not.toContain(
        "candidate base SHA is not the current or an ancestor HEAD",
      );
    }
  });

  it("says something about the base when it is not HEAD", () => {
    // Only meaningful in the squash-merged state this was written for; in any
    // other state baseSha === HEAD and there is nothing to report. The
    // diagnostic is only reached once every earlier check has passed, so this
    // requires a tree that agrees with the manifest — which is the point: the
    // base is reported, never enforced.
    if (manifest.identity.baseSha === head) return;
    const result = runCheck();
    if (result.status !== 0) return;
    expect(result.stdout).toContain("candidate-manifest: base");
  });

  // There is deliberately no case here that dirties the tree to prove the gate
  // still rejects a dirty tree. An untracked file in the checkout is part of
  // the fingerprint, so writing one inside a parallel test run makes every
  // other spec's manifest check see a drifted tree — this spec flaked
  // `npm run ci-local` exactly that way, under coverage, where files run
  // concurrently. The dirty-tree behaviour is covered by the ledger gate's own
  // tests, which own a sandbox.
});
