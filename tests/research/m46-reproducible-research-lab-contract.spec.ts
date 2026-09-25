import { describe, expect, it } from "vitest";

import {
  M46_RESEARCH_LAB_LIMITS,
  M46_RESEARCH_LAB_POLICY,
  M46_RESEARCH_LAB_SCHEMA,
  M46_RESEARCH_RECORD_KINDS,
  m46ResearchRecordDigest,
  runM46ResearchLab,
  type M46ResearchLabContract,
  type M46Sha256Digest,
} from "../../src/research/m46-reproducible-research-lab-contract.js";

const ARTIFACT_DIGEST: M46Sha256Digest = `sha256:${"a".repeat(64)}`;
const DELETION_DIGEST: M46Sha256Digest = `sha256:${"b".repeat(64)}`;

function validContract(): M46ResearchLabContract {
  const protocol = {
    schemaVersion: 1 as const,
    id: "protocol-46",
    version: "1.0.0",
    title: "Bounded synthetic comparison",
    objective: "Compare a fixed synthetic cohort locally.",
    hypothesis: "The declared ordering is stable.",
    analysisPlan: {
      metrics: ["meanOutcome"],
      fields: ["featureA", "featureB"],
      missingData: "REJECT" as const,
    },
    dataSource: "SYNTHETIC_ONLY" as const,
    externalDataIngestion: "DENY" as const,
    networkAccess: "DENY" as const,
    authorityClaim: "NONE" as const,
  };
  const cohort = {
    schemaVersion: 1 as const,
    id: "cohort-46",
    preregistrationId: "preregistration-46",
    generator: {
      name: "deterministic-fixture",
      version: "1.0.0",
      seed: 46,
    },
    source: "SYNTHETIC_ONLY" as const,
    externalDataIngestion: "DENY" as const,
    entries: [
      { id: "synthetic-001", features: [0, 1], outcome: 0 },
      { id: "synthetic-002", features: [1, 0], outcome: 1 },
    ],
    authorityClaim: "NONE" as const,
  };
  const protocolDigest = m46ResearchRecordDigest(protocol);
  const cohortDigest = m46ResearchRecordDigest(cohort);
  return {
    protocol,
    preregistration: {
      schemaVersion: 1,
      id: "preregistration-46",
      protocolId: protocol.id,
      protocolDigest,
      registeredAt: "2026-09-25T00:00:00.000Z",
      status: "FROZEN",
      registry: "LOCAL_ONLY",
      externalSubmission: "DENY",
      authorityClaim: "NONE",
    },
    consent: {
      schemaVersion: 1,
      id: "consent-46",
      protocolId: protocol.id,
      subjectId: "synthetic-001",
      scope: "LOCAL_SYNTHETIC_ONLY",
      status: "GRANTED",
      grantedAt: "2026-09-25T00:01:00.000Z",
      withdrawnAt: null,
      withdrawalReason: null,
      authorityClaim: "NONE",
    },
    syntheticCohort: cohort,
    contamination: {
      schemaVersion: 1,
      id: "contamination-46",
      cohortId: cohort.id,
      cohortDigest,
      trainingIds: ["synthetic-001"],
      evaluationIds: ["synthetic-002"],
      status: "CLEAR",
      boundary: "SYNTHETIC_ONLY",
      externalDataIngestion: "DENY",
      authorityClaim: "NONE",
    },
    retention: {
      schemaVersion: 1,
      id: "retention-46",
      cohortId: cohort.id,
      cohortDigest,
      retentionDays: 7,
      deleteAfter: "2026-10-02T00:00:00.000Z",
      disposition: "DELETE",
      storage: "LOCAL_ONLY",
      authorityClaim: "NONE",
    },
    deletion: {
      schemaVersion: 1,
      id: "deletion-46",
      retentionId: "retention-46",
      cohortId: cohort.id,
      cohortDigest,
      trigger: "RETENTION_EXPIRY",
      status: "SCHEDULED",
      recordIds: ["synthetic-001", "synthetic-002"],
      receiptDigest: null,
      storage: "LOCAL_ONLY",
      authorityClaim: "NONE",
    },
    publication: {
      schemaVersion: 1,
      id: "publication-46",
      protocolId: protocol.id,
      preregistrationId: "preregistration-46",
      cohortId: cohort.id,
      cohortDigest,
      consentId: "consent-46",
      status: "LOCAL_READY",
      artifactKind: "AGGREGATE_ONLY",
      artifactDigest: ARTIFACT_DIGEST,
      includedRecordIds: [],
      limitations: [
        "Synthetic local aggregate; not an external or authoritative result.",
      ],
      releaseScope: "LOCAL_DERIVED_ONLY",
      externalDistribution: "DENY",
      authorityClaim: "NONE",
    },
  };
}

function codes(result: ReturnType<typeof runM46ResearchLab>): string[] {
  return result.diagnostics.map((diagnostic) => diagnostic.code);
}

describe("M46 reproducible research-lab contract", () => {
  it("defines every bounded record and closes external authority", () => {
    const result = runM46ResearchLab(validContract());

    expect(M46_RESEARCH_RECORD_KINDS).toEqual([
      "protocol",
      "preregistration",
      "consent",
      "syntheticCohort",
      "contamination",
      "retention",
      "deletion",
      "publication",
    ]);
    expect(Object.isFrozen(M46_RESEARCH_RECORD_KINDS)).toBe(true);
    expect(Object.isFrozen(M46_RESEARCH_LAB_LIMITS)).toBe(true);
    expect(
      Object.values(M46_RESEARCH_LAB_LIMITS).every(Number.isSafeInteger),
    ).toBe(true);
    expect(M46_RESEARCH_LAB_POLICY).toEqual({
      dataSource: "SYNTHETIC_ONLY",
      externalDataIngestion: "DENY",
      networkAccess: "DENY",
      storage: "LOCAL_ONLY",
      releaseScope: "LOCAL_DERIVED_ONLY",
      authorityClaim: "NONE",
    });
    expect(result.state).toBe("REPRODUCIBLE");
    expect(result.execution).toEqual({
      mode: "LOCAL_DETERMINISTIC",
      dataSource: "SYNTHETIC_ONLY",
      externalDataIngestion: "DENY",
      network: "NOT_USED",
      authorityClaim: "NONE",
    });
  });

  it("repeats byte-identically and canonicalizes record key order", () => {
    const contract = validContract();
    const reordered = Object.fromEntries(
      Object.entries(contract).reverse(),
    ) as unknown as M46ResearchLabContract;
    const first = runM46ResearchLab(contract);
    const second = runM46ResearchLab(contract);
    const third = runM46ResearchLab(reordered);

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(third).toEqual(first);
    expect(first.schemaVersion).toBe(M46_RESEARCH_LAB_SCHEMA);
    expect(first.contractDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(first.diagnostics).toEqual([]);
    expect(first.publicationEligible).toBe(true);
    expect(m46ResearchRecordDigest({ a: 1, b: 2 })).toBe(
      m46ResearchRecordDigest({ b: 2, a: 1 }),
    );
  });

  it("blocks protocol and cohort hash drift", () => {
    const base = validContract();
    const protocolDrift = runM46ResearchLab({
      ...base,
      protocol: { ...base.protocol, hypothesis: "Changed after freeze." },
    });
    const cohortDrift = runM46ResearchLab({
      ...base,
      syntheticCohort: {
        ...base.syntheticCohort,
        entries: [
          { ...base.syntheticCohort.entries[0], outcome: 0.5 },
          base.syntheticCohort.entries[1],
        ],
      },
    });

    expect(protocolDrift.state).toBe("BLOCKED");
    expect(codes(protocolDrift)).toContain("PROTOCOL_HASH_DRIFT");
    expect(cohortDrift.state).toBe("BLOCKED");
    expect(codes(cohortDrift)).toContain("COHORT_HASH_DRIFT");
    expect(protocolDrift.publicationEligible).toBe(false);
    expect(cohortDrift.publicationEligible).toBe(false);
  });

  it("propagates withdrawal to deletion and withholds publication", () => {
    const base = validContract();
    const result = runM46ResearchLab({
      ...base,
      consent: {
        ...base.consent,
        status: "WITHDRAWN",
        withdrawnAt: "2026-09-25T00:02:00.000Z",
        withdrawalReason: "Synthetic withdrawal requested.",
      },
      deletion: {
        ...base.deletion,
        trigger: "CONSENT_WITHDRAWAL",
        status: "COMPLETED",
        receiptDigest: DELETION_DIGEST,
      },
      publication: {
        ...base.publication,
        status: "WITHHELD",
        artifactDigest: null,
      },
    });

    expect(result.state).toBe("BLOCKED");
    expect(result.inputState).toBe("VALID");
    expect(result.consentState).toBe("WITHDRAWN");
    expect(result.publicationEligible).toBe(false);
    expect(codes(result)).toContain("CONSENT_WITHDRAWN");
    expect(codes(result)).not.toContain("WITHDRAWAL_NOT_PROPAGATED");
  });

  it("blocks detected split contamination", () => {
    const base = validContract();
    const result = runM46ResearchLab({
      ...base,
      contamination: {
        ...base.contamination,
        trainingIds: ["synthetic-001", "synthetic-002"],
        evaluationIds: ["synthetic-002", "unknown-001"],
        status: "DETECTED",
      },
    });

    expect(result.state).toBe("BLOCKED");
    expect(result.contaminationState).toBe("DETECTED");
    expect(codes(result)).toContain("CONTAMINATION_DETECTED");
    expect(result.publicationEligible).toBe(false);
  });

  it.each([
    ["null", null],
    ["array", []],
    [
      "external ingestion",
      {
        ...validContract(),
        protocol: {
          ...validContract().protocol,
          externalDataIngestion: "ALLOW",
        },
      },
    ],
    [
      "authority claim",
      {
        ...validContract(),
        publication: {
          ...validContract().publication,
          authorityClaim: "CERTIFIED",
        },
      },
    ],
    ["unknown field", { ...validContract(), certification: "PASS" }],
  ])("contains malformed input: %s", (_label, input) => {
    const result = runM46ResearchLab(input);

    expect(result.state).toBe("MALFORMED");
    expect(result.inputState).toBe("MALFORMED");
    expect(result.contractDigest).toBeNull();
    expect(result.publicationEligible).toBe(false);
    expect(result.execution.authorityClaim).toBe("NONE");
    expect(codes(result)).toEqual(["MALFORMED_RECORD"]);
  });

  it("enforces the cohort and retention bounds", () => {
    const base = validContract();
    const entries = Array.from(
      { length: M46_RESEARCH_LAB_LIMITS.maxCohortRecords + 1 },
      (_, index) => ({
        id: `synthetic-${index.toString().padStart(3, "0")}`,
        features: [index],
        outcome: index % 2,
      }),
    );
    const oversized = runM46ResearchLab({
      ...base,
      syntheticCohort: { ...base.syntheticCohort, entries },
    });
    const excessiveRetention = runM46ResearchLab({
      ...base,
      retention: {
        ...base.retention,
        retentionDays: M46_RESEARCH_LAB_LIMITS.maxRetentionDays + 1,
      },
    });

    expect(oversized.state).toBe("MALFORMED");
    expect(excessiveRetention.state).toBe("MALFORMED");
  });
});
