import { describe, expect, it } from "vitest";
import {
  createM50ReleaseProof,
  M50_RELEASE_PROOF_CHAIN,
  M50_RELEASE_PROOF_LIMITS,
  M50_RELEASE_PROOF_SCHEMA,
  M50ReleaseProofError,
  serializeM50ReleaseProof,
  validateM50ReleaseProof,
  type M50CandidateBinding,
  type M50Change,
  type M50Decision,
  type M50EvidenceReference,
  type M50IndependentAssurance,
  type M50Reference,
  type M50ReleaseProofInput,
  type M50RollbackTarget,
} from "../../src/engine/m50-release-proof-contract.js";

const candidate: M50CandidateBinding = {
  candidateId: "candidate-m50",
  commitSha: "a".repeat(40),
  treeSha256: `sha256:${"b".repeat(64)}`,
  capturedAt: "2026-09-25T00:00:00.000Z",
  freshness: "CURRENT",
};

const context = {
  candidate,
  evaluatedAt: "2026-09-25T01:00:00.000Z",
};

const change: M50Change = {
  changeId: "change-001",
  candidateId: candidate.candidateId,
  summary: "M50 release-proof contract",
  paths: ["src/engine/m50-release-proof-contract.ts"],
  digest: `sha256:${"c".repeat(64)}`,
};

const evidence: readonly M50EvidenceReference[] = [
  {
    evidenceId: "evidence-test",
    kind: "TEST",
    candidateId: candidate.candidateId,
    state: "FRESH",
    capturedAt: "2026-09-25T00:30:00.000Z",
    sha256: `sha256:${"d".repeat(64)}`,
    scopePaths: ["src/engine/m50-release-proof-contract.ts"],
    producer: "local-test",
  },
  {
    evidenceId: "evidence-assurance",
    kind: "ASSURANCE",
    candidateId: candidate.candidateId,
    state: "FRESH",
    capturedAt: "2026-09-25T00:35:00.000Z",
    sha256: `sha256:${"e".repeat(64)}`,
    scopePaths: ["src/engine/m50-release-proof-contract.ts"],
    producer: "independent-reviewer",
  },
];

const references: readonly M50Reference[] = [
  {
    kind: "CLAIM",
    referenceId: "claim-release-proof",
    candidateId: candidate.candidateId,
    reference: "registry/claims.json",
    sha256: `sha256:${"1".repeat(64)}`,
  },
  {
    kind: "CAPABILITY",
    referenceId: "capability-release-proof",
    candidateId: candidate.candidateId,
    reference: "registry/capabilities.json",
    sha256: `sha256:${"2".repeat(64)}`,
  },
  {
    kind: "GAP",
    referenceId: "gap-release-proof",
    candidateId: candidate.candidateId,
    reference: "ledger/gaps.jsonl",
    sha256: `sha256:${"3".repeat(64)}`,
  },
  {
    kind: "SUPPORT",
    referenceId: "support-release-proof",
    candidateId: candidate.candidateId,
    reference: "registry/support.json",
    sha256: `sha256:${"4".repeat(64)}`,
  },
  {
    kind: "POLICY",
    referenceId: "policy-release-proof",
    candidateId: candidate.candidateId,
    reference: "policy/release.json",
    sha256: `sha256:${"5".repeat(64)}`,
  },
];

const decision: M50Decision = {
  decisionId: "decision-001",
  candidateId: candidate.candidateId,
  outcome: "APPROVED",
  decidedBy: "release-owner",
  decidedAt: "2026-09-25T00:40:00.000Z",
  evidenceIds: evidence.map((item) => item.evidenceId),
  referenceIds: references.map((item) => item.referenceId),
  rationale:
    "The candidate-bound evidence is complete and independently assured.",
};

const rollback: M50RollbackTarget = {
  candidateId: candidate.candidateId,
  targetCandidateId: "candidate-m49",
  targetCommitSha: "f".repeat(40),
  targetTreeSha256: `sha256:${"6".repeat(64)}`,
  reference: "rollback/m50.json",
  sha256: `sha256:${"7".repeat(64)}`,
  verified: true,
  preparedAt: "2026-09-25T00:45:00.000Z",
};

const independentAssurance: M50IndependentAssurance = {
  assuranceId: "assurance-001",
  candidateId: candidate.candidateId,
  status: "INDEPENDENTLY_ASSURED",
  independent: true,
  assessorId: "independent-reviewer",
  assessedAt: "2026-09-25T00:50:00.000Z",
  evidenceIds: ["evidence-assurance"],
};

function input(): M50ReleaseProofInput {
  return {
    candidate: { ...candidate },
    change: { ...change, paths: [...change.paths] },
    evidence: evidence.map((item) => ({
      ...item,
      scopePaths: [...item.scopePaths],
    })),
    decision: {
      ...decision,
      evidenceIds: [...decision.evidenceIds],
      referenceIds: [...decision.referenceIds],
    },
    references: references.map((item) => ({ ...item })),
    rollback: { ...rollback },
    independentAssurance: {
      ...independentAssurance,
      evidenceIds: [...independentAssurance.evidenceIds],
    },
  };
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Expected fixture value");
  return value;
}

function blockerCodes(
  value: ReturnType<typeof createM50ReleaseProof>,
): readonly string[] {
  return value.readiness.blockers.map((blocker) => blocker.code);
}

describe("M50 immutable release-proof envelope", () => {
  it("binds the complete change to evidence, decision, proof, and independent assurance", () => {
    const source = input();
    const envelope = createM50ReleaseProof(source, context);

    expect(envelope.schema).toBe(M50_RELEASE_PROOF_SCHEMA);
    expect(envelope.chain).toEqual(M50_RELEASE_PROOF_CHAIN);
    expect(envelope.candidate).toEqual(candidate);
    expect(envelope.releaseProof.state).toBe("READY");
    expect(envelope.releaseProof.assuranceStatus).toBe("INDEPENDENTLY_ASSURED");
    expect(envelope.readiness).toEqual({
      state: "READY",
      trustPromotion: "DENIED",
      trustEffect: "PRESERVE",
      blockers: [],
    });
    expect(envelope.releaseProof.trustPromotion).toBe("DENIED");
    expect(envelope.releaseProof.trustEffect).toBe("PRESERVE");
    expect(envelope.releaseProof.evidenceIds).toEqual([
      "evidence-assurance",
      "evidence-test",
    ]);
    expect(envelope.releaseProof.referenceIds).toEqual([
      "capability-release-proof",
      "claim-release-proof",
      "gap-release-proof",
      "policy-release-proof",
      "support-release-proof",
    ]);
    expect(validateM50ReleaseProof(envelope, context)).toMatchObject({
      valid: true,
      ready: true,
    });
  });

  it("detaches and freezes the envelope from caller input", () => {
    const source = input();
    const mutable = source as unknown as {
      change: { summary: string };
      evidence: Array<{ state: string }>;
      candidate: { commitSha: string };
    };
    const envelope = createM50ReleaseProof(source, context);

    mutable.change.summary = "mutated";
    required(mutable.evidence[0]).state = "STALE";
    mutable.candidate.commitSha = "0".repeat(40);

    expect(envelope.change.summary).toBe(change.summary);
    expect(required(envelope.evidence[0]).state).toBe("FRESH");
    expect(envelope.candidate.commitSha).toBe(candidate.commitSha);
    expect(Object.isFrozen(envelope)).toBe(true);
    expect(Object.isFrozen(envelope.change)).toBe(true);
    expect(Object.isFrozen(envelope.evidence)).toBe(true);
    expect(Object.isFrozen(required(envelope.evidence[0]))).toBe(true);
    expect(Object.isFrozen(envelope.readiness)).toBe(true);
  });

  it.each([
    ["STALE", "STALE_EVIDENCE"],
    ["FOREIGN", "FOREIGN_EVIDENCE"],
    ["CONTRADICTORY", "CONTRADICTORY_EVIDENCE"],
  ] as const)("blocks %s evidence and never promotes trust", (state, code) => {
    const source = input();
    const changed = {
      ...source,
      evidence: source.evidence.map((item, index) =>
        index === 0 ? { ...item, state } : { ...item },
      ),
    } satisfies M50ReleaseProofInput;
    const envelope = createM50ReleaseProof(changed, context);

    expect(envelope.readiness.state).toBe("BLOCKED");
    expect(blockerCodes(envelope)).toContain(code);
    expect(envelope.readiness.trustPromotion).toBe("DENIED");
    expect(envelope.readiness.trustEffect).toBe("PRESERVE");
    expect(envelope.releaseProof.state).toBe("BLOCKED");
    expect(
      validateM50ReleaseProof(envelope, context).diagnostics.map(
        (item) => item.code,
      ),
    ).toContain(code);
  });

  it("blocks foreign candidate evidence and missing evidence", () => {
    const foreign = input();
    const foreignInput = {
      ...foreign,
      evidence: foreign.evidence.map((item, index) =>
        index === 0
          ? { ...item, candidateId: "candidate-foreign" }
          : { ...item },
      ),
    } satisfies M50ReleaseProofInput;
    const foreignEnvelope = createM50ReleaseProof(foreignInput, context);
    expect(blockerCodes(foreignEnvelope)).toContain("FOREIGN_EVIDENCE");

    const missing = {
      ...input(),
      evidence: [],
      decision: { ...input().decision, evidenceIds: [] },
      independentAssurance: {
        ...input().independentAssurance,
        evidenceIds: [],
      },
    } satisfies M50ReleaseProofInput;
    const missingEnvelope = createM50ReleaseProof(missing, context);
    expect(blockerCodes(missingEnvelope)).toContain("MISSING_EVIDENCE");
    expect(missingEnvelope.readiness.state).toBe("BLOCKED");
  });

  it("blocks non-independent assurance and an unverified rollback", () => {
    const source = input();
    const assurance = {
      ...source,
      independentAssurance: {
        ...source.independentAssurance,
        status: "PENDING" as const,
        independent: false,
      },
      rollback: { ...source.rollback, verified: false },
    } satisfies M50ReleaseProofInput;
    const envelope = createM50ReleaseProof(assurance, context);

    expect(blockerCodes(envelope)).toEqual(
      expect.arrayContaining([
        "ASSURANCE_NOT_INDEPENDENT",
        "ROLLBACK_UNVERIFIED",
      ]),
    );
    expect(envelope.readiness.state).toBe("BLOCKED");
  });

  it("blocks trust-promotion fields at the input boundary", () => {
    const source = input() as unknown as Record<string, unknown>;
    source["trust"] = "HIGH";

    const envelope = createM50ReleaseProof(
      source as unknown as M50ReleaseProofInput,
      context,
    );
    expect(envelope.readiness.state).toBe("BLOCKED");
    expect(blockerCodes(envelope)).toContain("TRUST_PROMOTION_FORBIDDEN");
    expect(envelope.readiness.trustPromotion).toBe("DENIED");
  });

  it("serializes identically after input ordering changes", () => {
    const first = createM50ReleaseProof(input(), context);
    const source = input();
    const reordered = {
      ...source,
      change: { ...source.change, paths: [...source.change.paths].reverse() },
      evidence: [...source.evidence].reverse(),
      references: [...source.references].reverse(),
    } satisfies M50ReleaseProofInput;
    const second = createM50ReleaseProof(reordered, context);

    expect(second.envelopeId).toBe(first.envelopeId);
    expect(serializeM50ReleaseProof(second)).toBe(
      serializeM50ReleaseProof(first),
    );
  });

  it("detects envelope mutation and bounds oversized collections", () => {
    const envelope = createM50ReleaseProof(input(), context);
    const changed = JSON.parse(serializeM50ReleaseProof(envelope)) as {
      evidence: Array<{ state: string }>;
    };
    required(changed.evidence[0]).state = "STALE";
    const validation = validateM50ReleaseProof(changed, context);
    expect(validation.ready).toBe(false);
    expect(
      validation.diagnostics.map((diagnostic) => diagnostic.code),
    ).toContain("ENVELOPE_ID_MISMATCH");

    const oversized = input();
    const mutableOversized = oversized as unknown as {
      evidence: M50EvidenceReference[];
    };
    const baseEvidence = required(evidence[0]);
    mutableOversized.evidence = Array.from(
      { length: M50_RELEASE_PROOF_LIMITS.maxEvidence + 1 },
      (_, index) => ({ ...baseEvidence, evidenceId: `evidence-${index}` }),
    );
    expect(() => createM50ReleaseProof(oversized, context)).toThrow(
      M50ReleaseProofError,
    );
  });
});
