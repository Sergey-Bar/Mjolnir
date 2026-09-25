import { describe, expect, it } from "vitest";

import {
  M40_CERTIFICATION_STATES,
  M40_LANGUAGE_CERTIFICATION_STATES,
  M40_LANGUAGE_TIERS,
  M40_MINIMUM_SATURATION_GATES,
  M40_PARSER_TIER_MODES,
  M40_SATURATION_GATES,
  M40_LANGUAGE_CONTRACT_SCHEMA,
  M40_LANGUAGE_LIMITS,
  analyzeM40LanguageExpansion,
  evaluateM40LanguageCertification,
  evaluateM40LanguageExpansion,
  isM40CertificationState,
  isM40EvidenceState,
  isM40LanguageTier,
  validateM40LanguageCandidate,
  type M40CrossFileEvidence,
  type M40LanguageExpansionRequest,
  type M40LanguageExpansionReport,
  type M40RuntimeEvidence,
  type M40SaturationEvidence,
  type M40SaturationGateEvidence,
  type M40UnsupportedEvidence,
  type M40VirEvidence,
} from "../../src/engine/m40-language-expansion-contract.js";

const CANDIDATE_ID = "candidate-a";
const CANDIDATE_DIGEST = "sha256:candidate-a";
const EVALUATED_AT = "2026-01-02T00:00:00.000Z";

const CANDIDATE = {
  candidateId: CANDIDATE_ID,
  candidateDigest: CANDIDATE_DIGEST,
  commit: "commit-a",
  tree: "tree-a",
} as const;

const CONTEXT = {
  candidateId: CANDIDATE_ID,
  candidateDigest: CANDIDATE_DIGEST,
  evaluatedAt: EVALUATED_AT,
  maxEvidenceAgeMs: 86_400_000,
} as const;

function base(kind: string, capturedAt = "2026-01-01T23:59:59.000Z") {
  return {
    candidateId: CANDIDATE_ID,
    candidateDigest: CANDIDATE_DIGEST,
    evidenceId: `evidence-${kind}`,
    producer: "fixture",
    capturedAt,
    state: "FRESH" as const,
  };
}

function vir(overrides: Partial<M40VirEvidence> = {}): M40VirEvidence {
  return {
    ...base("vir"),
    nodeCount: 4,
    edgeCount: 3,
    requiredNodeKinds: 3,
    coveredNodeKinds: 3,
    ...overrides,
  };
}

function crossFile(
  overrides: Partial<M40CrossFileEvidence> = {},
): M40CrossFileEvidence {
  return {
    ...base("cross-file"),
    caseCount: 2,
    passedCases: 2,
    edgeCount: 2,
    unresolvedEdges: 0,
    ...overrides,
  };
}

function runtime(
  overrides: Partial<M40RuntimeEvidence> = {},
): M40RuntimeEvidence {
  return {
    ...base("runtime"),
    executedTests: 3,
    passedTests: 3,
    failedTests: 0,
    skippedTests: 0,
    complete: true,
    reportDigest: "sha256:runtime",
    ...overrides,
  };
}

function unsupported(
  overrides: Partial<M40UnsupportedEvidence> = {},
): M40UnsupportedEvidence {
  return {
    ...base("unsupported"),
    checkedConstructs: 2,
    classifiedConstructs: 2,
    unsupportedConstructs: 0,
    limitations: [],
    ...overrides,
  };
}

function gates(
  overrides: Partial<
    Record<
      (typeof M40_MINIMUM_SATURATION_GATES)[number],
      M40SaturationGateEvidence
    >
  > = {},
): M40SaturationGateEvidence[] {
  return M40_MINIMUM_SATURATION_GATES.map((gate) => {
    const value = overrides[gate];
    return value ?? { gate, status: "PASS", denominator: 1, passed: 1 };
  });
}

function saturation(
  overrides: Partial<M40SaturationEvidence> = {},
): M40SaturationEvidence {
  const gateEvidence = overrides.gates ?? gates();
  const denominator = gateEvidence.reduce(
    (total, gate) => total + gate.denominator,
    0,
  );
  const passed = gateEvidence.reduce(
    (total, gate) => total + (gate.status === "PASS" ? gate.passed : 0),
    0,
  );
  const partial = gateEvidence.reduce(
    (total, gate) => total + (gate.status === "PARTIAL" ? gate.denominator : 0),
    0,
  );
  const unknown = gateEvidence.reduce(
    (total, gate) => total + (gate.status === "UNKNOWN" ? gate.denominator : 0),
    0,
  );
  const blocked = gateEvidence.reduce(
    (total, gate) => total + (gate.status === "BLOCKED" ? gate.denominator : 0),
    0,
  );
  const unsupportedCount = gateEvidence.reduce(
    (total, gate) =>
      total + (gate.status === "UNSUPPORTED" ? gate.denominator : 0),
    0,
  );
  return {
    ...base("saturation"),
    requiredGates: [...M40_MINIMUM_SATURATION_GATES],
    gates: gateEvidence,
    denominator,
    passed,
    partial,
    unknown,
    blocked,
    unsupported: unsupportedCount,
    invalid: 0,
    ...overrides,
  };
}

function request(
  overrides: Partial<M40LanguageExpansionRequest> = {},
): M40LanguageExpansionRequest {
  return {
    schemaVersion: 1,
    languageId: "go",
    tier: "B",
    support: "SUPPORTED",
    candidate: CANDIDATE,
    evidence: {
      vir: vir(),
      crossFile: crossFile(),
      runtime: runtime(),
      unsupported: unsupported(),
    },
    saturation: saturation(),
    ...overrides,
  };
}

function reportFor(value: unknown): M40LanguageExpansionReport {
  return evaluateM40LanguageExpansion(value, CONTEXT);
}

describe("M40 universal language expansion contract", () => {
  it("defines bounded tiers, parser modes, states, and saturation gates", () => {
    expect(M40_LANGUAGE_TIERS).toEqual(["A", "B", "C", "D", "E"]);
    expect(M40_CERTIFICATION_STATES).toEqual(M40_LANGUAGE_CERTIFICATION_STATES);
    expect(M40_PARSER_TIER_MODES).toEqual({
      A: "native-semantic",
      B: "tree-sitter",
      C: "language-server",
      D: "structural",
      E: "lexical-fallback",
    });
    expect(M40_SATURATION_GATES).toEqual(
      expect.arrayContaining([...M40_MINIMUM_SATURATION_GATES]),
    );
    expect(M40_CERTIFICATION_STATES).not.toContain("PASS");
    expect(M40_LANGUAGE_LIMITS.maxSaturationGates).toBeGreaterThan(0);
  });

  it("certifies only a complete fresh candidate-bound fixture", () => {
    const result = reportFor(request());

    expect(result.state).toBe("TRUST-COMPLETE");
    expect(result.certificationState).toBe("CERTIFIED");
    expect(result.certified).toBe(true);
    expect(result.canCertify).toBe(true);
    expect(result.saturation.denominators).toMatchObject({
      required: 4,
      total: 4,
      passed: 4,
      partial: 0,
      unknown: 0,
      blocked: 0,
      unsupported: 0,
      invalid: 0,
      complete: true,
    });
    expect(result.evidence.every((item) => item.outcome === "PASS")).toBe(true);
  });

  it("returns an explicit unknown outcome for an unknown language", () => {
    const result = reportFor(request({ languageId: "klingon" }));

    expect(result.state).toBe("UNKNOWN");
    expect(result.reason).toBe("LANGUAGE_UNKNOWN");
    expect(result.certified).toBe(false);
    expect(result.canCertify).toBe(false);
  });

  it("returns an explicit unsupported outcome for an unsupported language", () => {
    const result = reportFor(request({ support: "UNSUPPORTED" }));

    expect(result.state).toBe("UNSUPPORTED");
    expect(result.reason).toBe("LANGUAGE_UNSUPPORTED");
    expect(result.certified).toBe(false);
  });

  it("rejects stale evidence without turning it into certification", () => {
    const result = reportFor(
      request({
        evidence: {
          vir: vir({ capturedAt: "2020-01-01T00:00:00.000Z" }),
          crossFile: crossFile(),
          runtime: runtime(),
          unsupported: unsupported(),
        },
      }),
    );

    expect(result.state).toBe("DEGRADED");
    expect(result.reason).toBe("EVIDENCE_STALE");
    expect(result.evidence.find((item) => item.kind === "vir")).toMatchObject({
      state: "STALE",
      outcome: "STALE",
      candidateBound: true,
    });
    expect(result.certified).toBe(false);
  });

  it("rejects foreign evidence and reports the binding failure", () => {
    const result = reportFor(
      request({
        evidence: {
          vir: vir(),
          crossFile: crossFile(),
          runtime: runtime({ candidateId: "candidate-b" }),
          unsupported: unsupported(),
        },
      }),
    );
    const digestMismatch = reportFor(
      request({
        evidence: {
          vir: vir(),
          crossFile: crossFile(),
          runtime: runtime({ candidateDigest: "sha256:other" }),
          unsupported: unsupported(),
        },
      }),
    );

    expect(result.state).toBe("DEGRADED");
    expect(result.reason).toBe("EVIDENCE_FOREIGN");
    expect(
      result.evidence.find((item) => item.kind === "runtime"),
    ).toMatchObject({
      state: "FOREIGN",
      outcome: "FOREIGN",
      candidateBound: false,
    });
    expect(digestMismatch.reason).toBe("EVIDENCE_FOREIGN");
    expect(result.certified).toBe(false);
  });

  it("keeps the saturation denominator honest when a gate is incomplete", () => {
    const result = reportFor(
      request({
        saturation: saturation({
          gates: gates({
            runtime: {
              gate: "runtime",
              status: "PARTIAL",
              denominator: 1,
              passed: 0,
            },
          }),
          partial: 1,
          passed: 3,
        }),
      }),
    );

    expect(result.state).toBe("BLOCKED");
    expect(result.reason).toBe("SATURATION_INCOMPLETE");
    expect(result.saturation.denominators).toMatchObject({
      required: 4,
      total: 4,
      passed: 3,
      partial: 1,
      complete: false,
    });
  });

  it("blocks certification when runtime evidence is missing", () => {
    const result = reportFor(
      request({
        evidence: {
          vir: vir(),
          crossFile: crossFile(),
          unsupported: unsupported(),
        },
      }),
    );

    expect(result.state).toBe("BLOCKED");
    expect(result.reason).toBe("RUNTIME_EVIDENCE_MISSING");
    expect(
      result.evidence.find((item) => item.kind === "runtime"),
    ).toMatchObject({
      state: "MISSING",
      outcome: "BLOCKED",
    });
    expect(result.certified).toBe(false);
  });

  it("does not let a candidate or malformed record self-certify", () => {
    const candidate = reportFor(request({ support: "CANDIDATE" }));
    const malformed = reportFor({
      ...request(),
      certificationState: "CERTIFIED",
      saturation: {
        ...saturation(),
        denominator: 1,
        passed: 1,
        gates: gates({
          runtime: {
            gate: "runtime",
            status: "PASS",
            denominator: 1,
            passed: 1,
          },
        }),
      },
    });

    expect(candidate.state).toBe("CANDIDATE");
    expect(candidate.certified).toBe(false);
    expect(malformed.state).toBe("BLOCKED");
    expect(malformed.certified).toBe(false);
    expect(malformed.certificationState).not.toBe("CERTIFIED");
  });

  it("accepts the bounded alias shape without weakening binding", () => {
    const result = evaluateM40LanguageExpansion({
      schema: M40_LANGUAGE_CONTRACT_SCHEMA,
      language: "ts",
      parserTier: "B",
      supportState: "SUPPORTED",
      candidateId: CANDIDATE_ID,
      candidateDigest: CANDIDATE_DIGEST,
      evaluatedAt: EVALUATED_AT,
      evidence: {
        virEvidence: vir(),
        crossFileEvidence: crossFile(),
        runtimeEvidence: runtime(),
        unsupportedEvidence: unsupported(),
      },
      saturationMatrix: saturation(),
    });

    expect(result.state).toBe("TRUST-COMPLETE");
    expect(result.demandRank).toBe(2);
  });

  it("fails closed for malformed request and evidence shapes", () => {
    const malformedRequest = evaluateM40LanguageExpansion({}, CONTEXT);
    const malformedEvidence = evaluateM40LanguageExpansion(
      {
        schemaVersion: 1,
        languageId: "go",
        tier: "B",
        support: "SUPPORTED",
        candidate: CANDIDATE,
        evidence: {},
        saturation: {},
      },
      CONTEXT,
    );

    expect(malformedRequest).toMatchObject({
      state: "BLOCKED",
      reason: "MALFORMED_REQUEST",
      certified: false,
    });
    expect(malformedEvidence.state).toBe("BLOCKED");
    expect(malformedEvidence.certified).toBe(false);
  });

  it("fails closed on malformed context and keeps validation helpers bound", () => {
    const malformed = evaluateM40LanguageExpansion(request(), {
      ...CONTEXT,
      maxEvidenceAgeMs: -1,
    });

    expect(malformed).toMatchObject({
      state: "BLOCKED",
      reason: "MALFORMED_CONTEXT",
      certified: false,
      canCertify: false,
    });
    expect(validateM40LanguageCandidate(request(), CONTEXT).certified).toBe(
      true,
    );
    expect(analyzeM40LanguageExpansion(request(), CONTEXT).certified).toBe(
      true,
    );
    expect(evaluateM40LanguageCertification(request(), CONTEXT).certified).toBe(
      true,
    );
    expect(isM40LanguageTier("B")).toBe(true);
    expect(isM40LanguageTier("Z")).toBe(false);
    expect(isM40CertificationState("CERTIFIED")).toBe(true);
    expect(isM40CertificationState("PASS")).toBe(false);
    expect(isM40EvidenceState("FRESH")).toBe(true);
    expect(isM40EvidenceState("UNVERIFIED")).toBe(false);
  });
});
