/**
 * The release decision state transition (plan V5-005 / V5-006).
 *
 * The repository used to carry two validators that could never both pass:
 * the manifest shape check demanded a WORKING_CANDIDATE with no candidate SHA,
 * and the readiness check demanded an AUTHORIZED RELEASE_CANDIDATE with one.
 * Both ran in the release path, so the release gate was unsatisfiable by
 * construction and the only way past it was to stop asking.
 *
 * These specs pin the replacement: one evaluator, two stages, and an explicit
 * transition between the states. Every Trust Constitution law the evaluator
 * encodes has a named case here.
 */

import { describe, expect, it } from "vitest";

import {
  evaluateCandidateDecision,
  manifestContradictions,
} from "../../scripts/lib/candidate-decision";
import { readCandidateManifest } from "../../scripts/candidate-manifest.mjs";
import { decideRelease } from "../../src/release/decision.js";

const SHA = "a".repeat(40);
const DIGEST = "b".repeat(64);

function manifest(overrides: Record<string, unknown> = {}) {
  const base = {
    schemaVersion: 1,
    manifestId: "test-candidate",
    train: "M26",
    owner: "maintainers",
    approvalAuthority: "maintainers",
    worktreePolicy: "PRESERVE_NO_RESET_STASH_DELETE",
    control: {
      issueLedger: "RECONCILED",
      gapLedger: "RECONCILED",
      supportMatrix: "RECONCILED",
      externalValidation: "COMPLETE",
      dependencyResolution: "APPROVED",
    },
    blockers: ["explicit"],
    identity: {
      state: "RELEASE_CANDIDATE",
      baseSha: SHA,
      candidateSha: SHA,
      packageSha256: DIGEST,
      lockfileSha256: DIGEST,
    },
    evidence: {
      local: { phase0: "LOCAL_PROVEN" },
      certificationWaves: { "CERT-W1": "PASS" },
      remote: {
        protectedHoldout: "REMOTE_PROVEN",
        realWorldRepositories: "REMOTE_PROVEN",
        platformMatrix: "REMOTE_PROVEN",
        consumerInstall: "REMOTE_PROVEN",
        remoteWorkflow: "REMOTE_PROVEN",
      },
    },
    engineeringCertificationState: "CERTIFIED",
    releaseAuthorizationState: "AUTHORIZED",
    ...overrides,
  };
  return base as never;
}

/** A working candidate: no commit bound, nothing authorized. */
function workingCandidate(overrides: Record<string, unknown> = {}) {
  const identityOverrides =
    typeof overrides.identity === "object" && overrides.identity !== null
      ? (overrides.identity as Record<string, unknown>)
      : {};
  return manifest({
    ...overrides,
    identity: {
      state: "WORKING_CANDIDATE",
      baseSha: SHA,
      candidateSha: null,
      packageSha256: DIGEST,
      lockfileSha256: DIGEST,
      ...identityOverrides,
    },
    engineeringCertificationState: "NOT_CERTIFIED",
    releaseAuthorizationState: "NOT_AUTHORIZED",
  });
}

describe("candidate decision — the state transition", () => {
  it("an authorized, remote-proven release candidate passes the release gate", () => {
    const decision = evaluateCandidateDecision(manifest(), "release");
    expect(decision.determination).toBe("READY");
    expect(decision.blockers).toEqual([]);
  });

  it("a working candidate can never pass the release gate", () => {
    // G-V5-008: the contradiction that made the release gate unsatisfiable.
    // Forcing the release state onto a working candidate is a contradiction,
    // not an upgrade, and it fails every stage.
    const smuggled = workingCandidate({
      identity: {
        state: "WORKING_CANDIDATE",
        baseSha: SHA,
        candidateSha: SHA,
        packageSha256: DIGEST,
        lockfileSha256: DIGEST,
      },
      engineeringCertificationState: "CERTIFIED",
      releaseAuthorizationState: "AUTHORIZED",
    });
    const decision = evaluateCandidateDecision(smuggled, "release");
    expect(decision.determination).toBe("BLOCKED");
    expect(decision.contradictions).toContain(
      "WORKING_CANDIDATE cannot carry a candidate SHA",
    );
  });

  it("a well-formed working candidate passes engineering and fails release", () => {
    const working = workingCandidate();
    expect(
      evaluateCandidateDecision(working, "engineering").determination,
    ).toBe("READY");
    const release = evaluateCandidateDecision(working, "release");
    expect(release.determination).toBe("INCONCLUSIVE");
    expect(release.releaseBlockers).toEqual(
      expect.arrayContaining([
        "candidate identity is not a release candidate",
        "candidate SHA not authorized",
        "engineering certification not complete",
        "release authorization not granted",
      ]),
    );
  });

  it("law 12: human authorization never upgrades missing evidence", () => {
    const authorizedButUnproven = manifest({
      evidence: {
        local: { phase0: "LOCAL_PROVEN" },
        certificationWaves: {},
        remote: {
          protectedHoldout: "REMOTE_BLOCKED",
          realWorldRepositories: "NOT_RUN",
          platformMatrix: "NOT_RUN",
          consumerInstall: "NOT_RUN",
          remoteWorkflow: "NOT_RUN",
        },
      },
    });
    const decision = evaluateCandidateDecision(
      authorizedButUnproven,
      "release",
    );
    expect(decision.determination).toBe("INCONCLUSIVE");
    expect(decision.releaseBlockers).toContain(
      "protected holdout proof missing",
    );
  });

  it("law 12 in reverse: an ungranted authorization cannot degrade engineering", () => {
    // The build gate measures evidence integrity, not who said yes.
    const decision = evaluateCandidateDecision(
      workingCandidate(),
      "engineering",
    );
    expect(decision.determination).toBe("READY");
    expect(decision.contradictions).toEqual([]);
  });

  it("law 11: an empty result with no evidence is never READY", () => {
    const noEvidence = manifest({
      evidence: {
        local: {},
        certificationWaves: {},
        remote: {},
      },
    });
    expect(
      evaluateCandidateDecision(noEvidence, "engineering").determination,
    ).toBe("INCONCLUSIVE");
    expect(evaluateCandidateDecision(noEvidence, "release").determination).toBe(
      "INCONCLUSIVE",
    );
  });

  it("a partially proven local phase never certifies engineering", () => {
    const partial = manifest({ evidence: { local: { phase0: "PARTIAL" } } });
    const decision = evaluateCandidateDecision(partial, "engineering");
    expect(decision.contradictions.join(" ")).not.toContain("evidence");
    expect(decision.determination).toBe("INCONCLUSIVE");
  });

  it("unreconciled control records block engineering", () => {
    const unreconciled = manifest({
      control: {
        issueLedger: "RECONCILED",
        gapLedger: "STALE",
        supportMatrix: "RECONCILED",
        externalValidation: "COMPLETE",
        dependencyResolution: "APPROVED",
      },
    });
    const decision = evaluateCandidateDecision(unreconciled, "engineering");
    expect(decision.determination).toBe("INCONCLUSIVE");
    expect(decision.engineeringBlockers).toContain("gapLedger not reconciled");
  });

  it("a release candidate without a bound commit is a contradiction, not a gap", () => {
    const unbound = manifest({
      identity: {
        state: "RELEASE_CANDIDATE",
        baseSha: SHA,
        candidateSha: null,
        packageSha256: DIGEST,
        lockfileSha256: DIGEST,
      },
    });
    expect(manifestContradictions(unbound)).toContain(
      "RELEASE_CANDIDATE must bind an immutable candidate SHA",
    );
    expect(
      evaluateCandidateDecision(unbound, "engineering").determination,
    ).toBe("BLOCKED");
  });

  it("a malformed evidence state is a contradiction, not a silent default", () => {
    const bogus = manifest({
      evidence: {
        local: { phase0: "LOCAL_PROVEN" },
        certificationWaves: { w: "PROBABLY" },
      },
    });
    expect(manifestContradictions(bogus).join(" ")).toContain(
      "invalid wave evidence state PROBABLY",
    );
  });

  it("an unassigned owner or authority blocks engineering", () => {
    const decision = evaluateCandidateDecision(
      manifest({ owner: "UNASSIGNED", approvalAuthority: "UNASSIGNED" }),
      "engineering",
    );
    expect(decision.engineeringBlockers).toEqual(
      expect.arrayContaining([
        "candidate owner unassigned",
        "approval authority unassigned",
      ]),
    );
  });

  it("an unknown stage is rejected rather than defaulting to a laxer one", () => {
    const invalidStage = "ship-it" as never;
    expect(() => evaluateCandidateDecision(manifest(), invalidStage)).toThrow(
      /unknown stage/,
    );
  });

  it("the committed manifest is evaluated, not trusted", () => {
    const committed = readCandidateManifest(process.cwd()) as unknown;
    const engineering = evaluateCandidateDecision(committed, "engineering");
    const release = evaluateCandidateDecision(committed, "release");
    // The repository's own working candidate must never read as releasable.
    expect(release.determination).not.toBe("READY");
    expect(engineering.contradictions).toEqual([]);
  });
});

describe("release decision — GO is still required for publication", () => {
  it("a passing gate set still produces GO only when nothing is blocked", () => {
    const result = decideRelease({
      currentVersion: "4.0.0",
      publishedVersion: "3.0.0",
      candidateStatus: "PASS",
      m26Status: "PASS",
      versionStatus: "PASS",
      claimsStatus: "PASS",
      roadmapStatus: "PASS",
    });
    expect(result.status).toBe("GO");
  });

  it("a blocked candidate produces NO_GO", () => {
    const result = decideRelease({
      currentVersion: "4.0.0",
      publishedVersion: "3.0.0",
      candidateStatus: "BLOCKED",
      m26Status: "PASS",
      versionStatus: "PASS",
      claimsStatus: "PASS",
      roadmapStatus: "PASS",
    });
    expect(result.status).toBe("NO_GO");
  });
});
