/**
 * Candidate binding and run identity (plan V5-010, fixing G-V5-033).
 *
 * `RunIdentity` declared `commit?: string` for the entire life of the project
 * and `buildRunIdentity` never set it. A run therefore could not be traced to
 * the tree it analysed: two runs over byte-identical inputs from different
 * commits produced the same `scanId`, so "which build produced this verdict"
 * had no answer. That is the exact claim the chain law requires.
 *
 * The binding law these specs pin: ABSENCE over invention. A manifest that is
 * missing, malformed, or internally contradictory yields NO binding — never a
 * partial one. A consumer that can see "not bound" can refuse to trust the
 * run; a consumer handed a half-filled binding cannot tell what is missing.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  bindRepository,
  parseCandidateBinding,
  readCandidateBinding,
} from "../../src/engine/candidate-binding.js";
import {
  buildEvidenceGraph,
  buildRunIdentity,
} from "../../src/engine/run-identity.js";
import type { CandidateBinding } from "../../src/types.js";

const SHA = "a".repeat(40);
const DIGEST = "b".repeat(64);

const workingManifest = {
  schemaVersion: 1,
  manifestId: "mjolnir-qa@4.0.0-rc.1",
  owner: "maintainers",
  approvalAuthority: "maintainers",
  identity: {
    state: "WORKING_CANDIDATE",
    baseSha: SHA,
    candidateSha: null,
    packageSha256: DIGEST,
    lockfileSha256: DIGEST,
  },
  engineeringCertificationState: "NOT_CERTIFIED",
  releaseAuthorizationState: "NOT_AUTHORIZED",
};

const releaseManifest = {
  ...workingManifest,
  manifestId: "mjolnir-qa@5.0.0",
  identity: {
    ...workingManifest.identity,
    state: "RELEASE_CANDIDATE",
    candidateSha: SHA,
  },
  engineeringCertificationState: "CERTIFIED",
  releaseAuthorizationState: "AUTHORIZED",
};

function identity(overrides: Record<string, unknown> = {}) {
  return buildRunIdentity({
    files: [{ path: "a.ts", size: 10, hash: "h1" }],
    rules: [{ id: "QA-TEST-001", detectorRevision: 1 }],
    config: { gate: "error" },
    engineVersion: "4.0.0-rc.1",
    ...overrides,
  });
}

describe("manifest parsing is absence over invention", () => {
  it("binds a well-formed working candidate", () => {
    const binding = parseCandidateBinding(workingManifest);
    expect(binding).toEqual({
      manifestId: "mjolnir-qa@4.0.0-rc.1",
      state: "WORKING_CANDIDATE",
      candidateSha: null,
      baseSha: SHA,
      packageSha256: DIGEST,
      lockfileSha256: DIGEST,
      owner: "maintainers",
      releaseAuthorizationState: "NOT_AUTHORIZED",
    });
  });

  it("binds a well-formed release candidate", () => {
    expect(parseCandidateBinding(releaseManifest)?.state).toBe(
      "RELEASE_CANDIDATE",
    );
  });

  it("refuses a working candidate that carries a commit", () => {
    // The state-transition law: a working candidate has no commit yet. A
    // manifest claiming otherwise is fabricating an identity.
    expect(
      parseCandidateBinding({
        ...workingManifest,
        identity: { ...workingManifest.identity, candidateSha: SHA },
      }),
    ).toBeNull();
  });

  it("refuses an unauthorized working candidate", () => {
    expect(
      parseCandidateBinding({
        ...workingManifest,
        releaseAuthorizationState: "AUTHORIZED",
      }),
    ).toBeNull();
  });

  it("refuses a release candidate with no bound commit", () => {
    expect(parseCandidateBinding(workingManifest)).not.toBeNull();
    expect(
      parseCandidateBinding({
        ...releaseManifest,
        identity: { ...releaseManifest.identity, candidateSha: null },
      }),
    ).toBeNull();
  });

  it("refuses a malformed field rather than passing it through", () => {
    const cases: Array<[string, unknown]> = [
      ["not an object", "candidate"],
      ["no identity", { manifestId: "x" }],
      [
        "short base sha",
        {
          ...workingManifest,
          identity: { ...workingManifest.identity, baseSha: "abc" },
        },
      ],
      [
        "non-hex package digest",
        {
          ...workingManifest,
          identity: { ...workingManifest.identity, packageSha256: "zz" },
        },
      ],
      ["no manifest id", { ...workingManifest, manifestId: "" }],
      [
        "unknown state",
        {
          ...workingManifest,
          identity: { ...workingManifest.identity, state: "RELEASED" },
        },
      ],
      [
        "unknown authorization",
        { ...workingManifest, releaseAuthorizationState: "MAYBE" },
      ],
    ];
    for (const [label, value] of cases) {
      expect(parseCandidateBinding(value), label).toBeNull();
    }
  });

  it("reads a manifest from a checkout, and returns null when absent", () => {
    const dir = mkdtempSync(join(tmpdir(), "mj-binding-"));
    try {
      expect(readCandidateBinding(dir)).toBeNull();
      writeFileSync(
        join(dir, "candidate-trust-manifest.json"),
        JSON.stringify(workingManifest),
        "utf8",
      );
      expect(readCandidateBinding(dir)?.state).toBe("WORKING_CANDIDATE");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("the identity carries the bindings it claims", () => {
  it("binds only the links it was given", () => {
    expect(identity().boundLinks).toEqual([
      "input",
      "rules",
      "config",
      "engine",
    ]);
  });

  it("commit, tree and lockfile each add a link when present", () => {
    const bound = identity({
      commit: SHA,
      tree: "t".repeat(40),
      lockfile: DIGEST,
    });
    expect(bound.boundLinks).toEqual([
      "input",
      "rules",
      "config",
      "engine",
      "commit",
      "tree",
      "lockfile",
    ]);
    expect(bound.commit).toBe(SHA);
    expect(bound.tree).toBe("t".repeat(40));
    expect(bound.lockfile).toBe(DIGEST);
  });

  it("a run with no repository is not bound to one", () => {
    // Absence must stay absence: a placeholder commit would let a scan of a
    // tarball claim provenance it does not have.
    const loose = identity();
    expect(loose.commit).toBeUndefined();
    expect(loose.boundLinks).not.toContain("commit");
  });

  it("the scan id changes when the commit changes", () => {
    // G-V5-033: identical bytes from two commits used to share an identity.
    const a = identity({ commit: "a".repeat(40) });
    const b = identity({ commit: "c".repeat(40) });
    expect(a.scanId).not.toBe(b.scanId);
  });

  it("the scan id changes when the candidate changes", () => {
    const a = identity({
      candidate: parseCandidateBinding(workingManifest) as CandidateBinding,
    });
    const b = identity({
      candidate: parseCandidateBinding(releaseManifest) as CandidateBinding,
    });
    expect(a.scanId).not.toBe(b.scanId);
    expect(a.boundLinks).toContain("candidate");
  });

  it("candidate authorization does not change the id — it is not a verdict input", () => {
    // Human authorization is recorded, not hashed: flipping it must not
    // silently make a run's identity a different run, or a store keyed by
    // scanId would lose the history when someone granted approval.
    const a = identity({
      candidate: {
        ...(parseCandidateBinding(workingManifest) as CandidateBinding),
      },
    });
    const b = identity({
      candidate: {
        ...(parseCandidateBinding(workingManifest) as CandidateBinding),
        releaseAuthorizationState: "AUTHORIZED",
      },
    });
    expect(a.scanId).toBe(b.scanId);
  });

  it("is deterministic for the same inputs", () => {
    expect(identity({ commit: SHA }).scanId).toBe(
      identity({ commit: SHA }).scanId,
    );
    // Order-insensitive: the same SET of files and rules is the same snapshot.
    expect(
      buildRunIdentity({
        files: [
          { path: "b.ts", size: 2, hash: "h2" },
          { path: "a.ts", size: 1, hash: "h1" },
        ],
        rules: [
          { id: "QA-TEST-002", detectorRevision: 2 },
          { id: "QA-TEST-001", detectorRevision: 1 },
        ],
        config: { gate: "error" },
        engineVersion: "4.0.0-rc.1",
      }).inputFingerprint,
    ).toBe(
      buildRunIdentity({
        files: [
          { path: "a.ts", size: 1, hash: "h1" },
          { path: "b.ts", size: 2, hash: "h2" },
        ],
        rules: [
          { id: "QA-TEST-001", detectorRevision: 1 },
          { id: "QA-TEST-002", detectorRevision: 2 },
        ],
        config: { gate: "error" },
        engineVersion: "4.0.0-rc.1",
      }).inputFingerprint,
    );
  });
});

describe("the evidence graph shows the candidate, and the chain stays stable", () => {
  it("carries the candidate when the run is bound to one", () => {
    const graph = buildEvidenceGraph({
      runId: identity({
        candidate: parseCandidateBinding(releaseManifest) as CandidateBinding,
      }),
      candidate: { manifestId: "mjolnir-qa@5.0.0", candidateSha: SHA },
    });
    expect(graph.candidate).toEqual({
      manifestId: "mjolnir-qa@5.0.0",
      candidateSha: SHA,
    });
  });

  it("an unbound run is visibly unbound", () => {
    expect(buildEvidenceGraph({ runId: identity() }).candidate).toBeUndefined();
  });

  it("the chain law order is unchanged, so existing consumers keep working", () => {
    // The candidate is deliberately NOT a new chain link: the eight-link chain
    // is the law and existing readers index into it positionally.
    const graph = buildEvidenceGraph({
      runId: identity(),
      candidate: { manifestId: "m", candidateSha: SHA },
    });
    expect(graph.chain.map((n) => n.link)).toEqual([
      "verdict",
      "evidence",
      "execution",
      "scope",
      "source",
      "rule",
      "fixture",
      "reproduction",
    ]);
  });
});

describe("repository binding", () => {
  it("omits everything outside a git repository rather than inventing it", () => {
    const dir = mkdtempSync(join(tmpdir(), "mj-norepo-"));
    try {
      // A temp dir under the OS temp root is not a git worktree.
      const binding = bindRepository(dir);
      expect(binding.commit).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("binds a real repository's commit and tree", () => {
    const binding = bindRepository(process.cwd());
    if (binding.commit === undefined) return; // not a repo in this environment
    expect(binding.commit).toMatch(/^[a-f0-9]{40}$/);
    expect(binding.tree).toMatch(/^[a-f0-9]{40}$/);
  });
});
