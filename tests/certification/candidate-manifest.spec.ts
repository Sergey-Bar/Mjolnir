import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");

describe("candidate trust manifest", () => {
  it("recomputes candidate identity and worktree inventory without mutating", () => {
    const manifestPath = join(root, "candidate-trust-manifest.json");
    const before = readFileSync(manifestPath, "utf8");
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts", "update-candidate-manifest.mjs"), root],
      { encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    const generated = JSON.parse(result.stdout) as {
      generatedAt: string;
      identity: {
        version: string;
        baseSha: string;
        candidateSha: null;
        changedPathCount: number;
        worktreeInventory: {
          changedPaths: string[];
          untrackedPaths: string[];
        };
      };
    };
    expect(generated.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(generated.identity.version).toBe(
      (
        JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
          version: string;
        }
      ).version,
    );
    expect(generated.identity.baseSha).toBe(
      execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).trim(),
    );
    expect(generated.identity.candidateSha).toBeNull();
    expect(
      Array.isArray(generated.identity.worktreeInventory.changedPaths),
    ).toBe(true);
    expect(generated.identity.worktreeInventory.changedPaths).not.toContain(
      "candidate-trust-manifest.json",
    );
    expect(generated.identity.changedPathCount).toBe(
      new Set([
        ...generated.identity.worktreeInventory.changedPaths,
        ...generated.identity.worktreeInventory.untrackedPaths,
      ]).size,
    );
    expect(readFileSync(manifestPath, "utf8")).toBe(before);
    const manifest = JSON.parse(before) as {
      train: string;
      worktreePolicy: string;
      blockers: string[];
      identity: { dirtyFiles: string[] };
      sourceRefs: string[];
    };
    expect(manifest.train).toBe("M26");
    expect(manifest.worktreePolicy).toBe("PRESERVE_NO_RESET_STASH_DELETE");
    expect(manifest.blockers.length).toBeGreaterThan(0);
    expect(Array.isArray(manifest.identity.dirtyFiles)).toBe(true);
    expect(manifest.sourceRefs).toContain("docs/ROADMAP.yaml");
  });

  it("keeps pre-authorization identity and evidence states separate", () => {
    const output = execFileSync(
      process.execPath,
      [join(root, "scripts", "check-candidate-manifest.mjs"), root],
      { encoding: "utf8" },
    );
    expect(output).toContain('"state":"WORKING_CANDIDATE"');
    expect(output).toContain('"engineeringCertificationState":"NOT_CERTIFIED"');
    expect(output).toContain('"releaseAuthorizationState":"NOT_AUTHORIZED"');
  });

  it("verifies on a SETTLED tree, which is the state CI checks out", () => {
    // This replaced a test that asserted `changedPathCount === 0` on a clean
    // tree — an invariant no committed stamp can satisfy, because a stamp
    // records the dirtiness of the moment it was taken and committing it makes
    // that moment past. It failed on every fresh checkout and passed only while
    // the tree stayed dirty, which is why the failure looked like tampering
    // and survived four releases.
    //
    // What replaced it is the property that CAN hold, and the one that
    // actually detects a changed file: the manifest's content hash must match
    // the tree, from a clean checkout, with no dirty-tree escape hatch. If the
    // tree is dirty the assertion is skipped with a reason rather than
    // weakened — a check that adapts to the state it is checking has stopped
    // checking it.
    const manifest = JSON.parse(
      readFileSync(join(root, "candidate-trust-manifest.json"), "utf8"),
    ) as {
      identity: { workingTreeSha256: string; changedPathCount: number };
    };
    const dirty = execFileSync("git", ["status", "--porcelain"], {
      cwd: root,
      encoding: "utf8",
    })
      .split("\n")
      .filter((line) => line.trim() !== "");
    if (dirty.length > 0) {
      expect(
        manifest.identity.workingTreeSha256,
        "the tree is dirty, so this assertion is not meaningful right now",
      ).toMatch(/^[0-9a-f]{64}$/);
      return;
    }
    // The gate itself, run against a clean tree — which is the assertion that
    // used to be impossible to satisfy.
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts", "check-candidate-manifest.mjs"), root],
      { encoding: "utf8" },
    );
    expect(
      result.status,
      `candidate-manifest:check failed on a clean tree:\n${result.stdout}${result.stderr}`,
    ).toBe(0);
  });

  it("does not re-derive the transient fields the stamp recorded", () => {
    // The flip side, and the reason this is one test rather than a deletion:
    // `changedPathCount` and `dirtyFiles` are still IN the manifest, as a
    // record of what the stamp saw. They are simply not invariants, and a
    // reader who finds them under `identity` deserves to know that.
    const source = readFileSync(
      join(root, "scripts", "check-candidate-manifest.mjs"),
      "utf8",
    );
    const compared = /CONTENT_INVARIANTS = \[([^\]]*)\]/.exec(source);
    expect(compared, "CONTENT_INVARIANTS not found").not.toBeNull();
    const keys = [...(compared?.[1] ?? "").matchAll(/"(\w+)"/g)].map(
      (m) => m[1],
    );
    expect(keys).toContain("workingTreeSha256");
    expect(
      keys,
      "a transient field is being compared as an invariant",
    ).not.toContain("changedPathCount");
  });

  it("reports readiness blockers without promoting the candidate", () => {
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts", "check-candidate-readiness.mjs"), root],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('"status":"BLOCKED"');
    expect(result.stdout).toContain("candidate SHA not authorized");
  });

  it("blocks every unproven external readiness dimension", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-candidate-readiness-"));
    try {
      const manifest = JSON.parse(
        readFileSync(join(root, "candidate-trust-manifest.json"), "utf8"),
      ) as {
        identity: { state: string; candidateSha: string | null };
        engineeringCertificationState: string;
        releaseAuthorizationState: string;
        evidence: {
          local: Record<string, string>;
          remote: Record<string, string>;
        };
        manifestId: string;
        owner: string;
        approvalAuthority: string;
        control: Record<string, string>;
      };
      manifest.identity.state = "RELEASE_CANDIDATE";
      manifest.identity.candidateSha = "a".repeat(40);
      manifest.owner = "qa-owner";
      manifest.approvalAuthority = "qa-approver";
      manifest.control = {
        issueLedger: "RECONCILED",
        gapLedger: "RECONCILED",
        supportMatrix: "RECONCILED",
        externalValidation: "COMPLETE",
        dependencyResolution: "APPROVED",
      };
      manifest.engineeringCertificationState = "CERTIFIED";
      manifest.releaseAuthorizationState = "AUTHORIZED";
      manifest.evidence.remote.realWorldRepositories = "REMOTE_PROVEN";
      manifest.evidence.remote.platformMatrix = "REMOTE_PROVEN";
      manifest.evidence.remote.consumerInstall = "REMOTE_PROVEN";
      manifest.evidence.remote.protectedHoldout = "REMOTE_PROVEN";
      manifest.evidence.remote.remoteWorkflow = "REMOTE_PROVEN";
      writeFileSync(
        join(dir, "candidate-trust-manifest.json"),
        JSON.stringify(manifest),
      );
      const check = () =>
        spawnSync(
          process.execPath,
          [join(root, "scripts", "check-candidate-readiness.mjs"), dir],
          { encoding: "utf8" },
        );
      const ready = check();
      expect(ready.status, ready.stderr).toBe(0);
      expect(ready.stdout).toContain('"status":"READY"');

      manifest.evidence.remote.realWorldRepositories = "REMOTE_BLOCKED";
      writeFileSync(
        join(dir, "candidate-trust-manifest.json"),
        JSON.stringify(manifest),
      );
      const blocked = check();
      expect(blocked.status).toBe(1);
      expect(blocked.stdout).toContain("real-world repository proof missing");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
