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
    expect(generated.identity.worktreeInventory.changedPaths).toContain(
      "tests/certification/candidate-manifest.spec.ts",
    );
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
    expect(manifest.identity.dirtyFiles.length).toBeGreaterThan(0);
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
