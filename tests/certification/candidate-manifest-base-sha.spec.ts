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
import { readFileSync, writeFileSync } from "node:fs";
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
  it("does not fail merely because the stamped base is not HEAD", () => {
    const result = runCheck();
    expect(
      result.status,
      `check failed on a clean tree: ${result.stdout}${result.stderr}`,
    ).toBe(0);
    expect(result.stdout + result.stderr).not.toContain(
      "candidate base SHA is not the current or an ancestor HEAD",
    );
  });

  it("says something about the base when it is not HEAD", () => {
    // Only meaningful in the squash-merged state this was written for; in any
    // other state baseSha === HEAD and there is nothing to report.
    if (manifest.identity.baseSha === head) return;
    expect(runCheck().stdout).toContain("candidate-manifest: base");
  });

  it("still fails when the tree is dirty", () => {
    // Written and removed inside the test, so the gate under test is the one
    // this spec is about: a manifest that no longer describes the tree must be
    // rejected, whatever the base SHA says.
    const stray = join(root, "untracked-by-the-base-sha-spec.txt");
    writeFileSync(stray, "stray\n");
    try {
      const result = runCheck();
      expect(result.status).toBe(1);
    } finally {
      spawnSync("cmd", ["/c", "del", "/f", "/q", stray], { encoding: "utf8" });
    }
  });
});
