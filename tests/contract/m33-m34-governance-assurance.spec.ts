import { describe, expect, it } from "vitest";

import {
  M33_CONTROL_PLANE_RECORD,
  M34_ASSURANCE_RECORD,
  M33_M34_RECORDS,
  validateGovernanceAssuranceRecord,
  validateM33ControlPlaneRecord,
  validateM34AssuranceRecord,
  type M33ControlPlaneRecord,
  type M34AssuranceRecord,
} from "../../src/governance/m33-m34-contract.js";

const NOW = "2026-09-25T05:00:00.000Z";

function mutable<T>(value: T): T {
  return structuredClone(value);
}

function object(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function codes(result: {
  readonly diagnostics: readonly { readonly code: string }[];
}): string[] {
  return result.diagnostics.map((diagnostic) => diagnostic.code);
}

function evidenceFor(
  candidateId = "candidate-a",
  tenantId = "tenant-a",
): Record<string, unknown> {
  return {
    evidenceId: "EV-M33-001",
    kind: "SCRUBBED_METADATA",
    candidateId,
    tenantId,
    ownerId: "owner-001",
    observedAt: "2026-09-25T04:59:00.000Z",
    digest:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    scrubbed: true,
    content: "METADATA_ONLY",
    status: "COMPLETE",
  };
}

function withEvidence(
  record: M33ControlPlaneRecord | M34AssuranceRecord,
  candidateId = "candidate-a",
  tenantId = "tenant-a",
): Record<string, unknown> {
  const value = mutable(record) as unknown as Record<string, unknown>;
  const tenancy = object(value["tenancy"]);
  tenancy["tenantId"] = tenantId;
  const evidence = object(value["evidencePackage"]);
  evidence["state"] = "PRESENT";
  evidence["candidateId"] = candidateId;
  evidence["tenantId"] = tenantId;
  evidence["scrubbed"] = true;
  evidence["items"] = [evidenceFor(candidateId, tenantId)];
  return value;
}

function completeM33(): Record<string, unknown> {
  const value = withEvidence(M33_CONTROL_PLANE_RECORD);
  value["status"] = "VALID";
  value["executionStatus"] = "COMPLETE";
  value["owner"] = {
    id: "owner-001",
    state: "ASSIGNED",
    reviewedAt: "2026-09-01T00:00:00.000Z",
    validUntil: "2026-10-01T00:00:00.000Z",
  };
  value["approval"] = {
    state: "APPROVED",
    scope: "M33_PILOT",
    approverId: "security-001",
    approvedAt: "2026-09-01T00:00:00.000Z",
    validUntil: "2026-10-01T00:00:00.000Z",
    evidence: ["EV-M33-001"],
  };
  object(value["architecture"])["status"] = "VALID";
  const tenancy = object(value["tenancy"]);
  tenancy["repositoryIds"] = ["repo-001"];
  tenancy["userIds"] = ["user-001"];
  tenancy["isolation"] = "COMPLETE";
  tenancy["status"] = "VALID";
  const consent = object(value["consent"]);
  consent["state"] = "CONSENTED";
  consent["purpose"] = "CONSENTED_PILOT";
  consent["approverId"] = "security-001";
  consent["grantedAt"] = "2026-09-01T00:00:00.000Z";
  consent["validUntil"] = "2026-10-01T00:00:00.000Z";
  consent["evidence"] = ["EV-M33-001"];
  consent["status"] = "VALID";
  const operating = object(value["operating"]);
  operating["queue"] = "EMPTY";
  operating["reconciliation"] = "COMPLETE";
  operating["status"] = "VALID";
  object(value["evidencePackage"])["status"] = "VALID";
  const retention = object(value["retention"]);
  retention["policy"] = "DEFINED";
  retention["retentionDays"] = 30;
  retention["legalHold"] = "DISABLED";
  retention["deletion"] = "COMPLETE";
  retention["export"] = "COMPLETE";
  retention["status"] = "VALID";
  const offline = object(value["offline"]);
  offline["sync"] = "CONSENTED_OPTIONAL";
  offline["queue"] = "EMPTY";
  offline["reconciliation"] = "COMPLETE";
  offline["status"] = "VALID";
  const recovery = object(value["recovery"]);
  for (const key of ["backup", "restore", "rollback", "incident"]) {
    recovery[key] = "COMPLETE";
  }
  recovery["status"] = "VALID";
  const rpoRto = object(value["rpoRto"]);
  for (const key of ["rpo", "rto"]) {
    const objective = object(rpoRto[key]);
    objective["targetMinutes"] = 60;
    objective["observedMinutes"] = 30;
    objective["evidenceId"] = "EV-M33-001";
    objective["status"] = "COMPLETE";
  }
  rpoRto["status"] = "VALID";
  object(value["persistence"])["status"] = "VALID";
  const pilot = object(value["pilot"]);
  pilot["state"] = "COMPLETE";
  pilot["cohort"] = "COMPLETE";
  pilot["productApproval"] = "APPROVED";
  pilot["securityApproval"] = "APPROVED";
  pilot["status"] = "VALID";
  return value;
}

describe("M33 and M34 governance records", () => {
  it("exposes bounded local read-only defaults for both trains", () => {
    expect(M33_M34_RECORDS).toEqual([
      M33_CONTROL_PLANE_RECORD,
      M34_ASSURANCE_RECORD,
    ]);
    expect(M33_CONTROL_PLANE_RECORD.train).toBe("M33");
    expect(M34_ASSURANCE_RECORD.train).toBe("M34");
    for (const record of M33_M34_RECORDS) {
      expect(record.status).toBe("BLOCKED");
      expect(record.executionStatus).toBe("NOT_RUN");
      expect(record.authority).toBe("NONE");
      expect(record.claimPromotion).toBe("BLOCKED");
      expect(record.architecture.network).toBe("FORBIDDEN");
      expect(record.architecture.writes).toBe("FORBIDDEN");
      expect(record.operating.transport).toBe("NONE");
      expect(record.persistence.source).toBe("FORBIDDEN");
      expect(record.persistence.rawReports).toBe("FORBIDDEN");
      expect(record.offline.localVerdict).toBe("AUTHORITATIVE");
      expect(record.retention.deletion).toBe("NOT_RUN");
      expect(record.recovery.restore).toBe("NOT_RUN");
      expect(record.rpoRto.rpo.status).toBe("NOT_RUN");
      expect(record.rpoRto.rto.status).toBe("NOT_RUN");
      expect(Object.isFrozen(record)).toBe(true);
      expect(Object.isFrozen(record.owner)).toBe(true);
      expect(Object.isFrozen(record.evidencePackage)).toBe(true);
    }
    expect(M34_ASSURANCE_RECORD.enterprise.claim).toBe("BLOCKED");
    expect(M34_ASSURANCE_RECORD.enterprise.promotion).toBe("FORBIDDEN");
    expect(M33_CONTROL_PLANE_RECORD.pilot.state).toBe("NOT_RUN");
  });

  it("validates defaults as blocked without synthesizing approval or PASS", () => {
    const m33 = validateM33ControlPlaneRecord(M33_CONTROL_PLANE_RECORD, {
      now: NOW,
    });
    const m34 = validateM34AssuranceRecord(M34_ASSURANCE_RECORD, {
      now: NOW,
    });

    expect(m33.status).toBe("BLOCKED");
    expect(m34.status).toBe("BLOCKED");
    expect(m33.approval).toBe("NOT_SYNTHESIZED");
    expect(m34.approval).toBe("NOT_SYNTHESIZED");
    expect(m33.claimPromotion).toBe("BLOCKED");
    expect(m34.claimPromotion).toBe("BLOCKED");
    expect(m33.canPromote).toBe(false);
    expect(m34.canPromote).toBe(false);
    expect(m33.valid).toBe(false);
    expect(m34.valid).toBe(false);
    expect(JSON.stringify(m33)).not.toContain("PASS");
    expect(JSON.stringify(m34)).not.toContain("PASS");
  });

  it("validates an explicitly complete record without creating authority", () => {
    const result = validateM33ControlPlaneRecord(completeM33(), {
      now: NOW,
      expectedCandidateId: "candidate-a",
      expectedTenantId: "tenant-a",
    });

    expect(result.status).toBe("VALID");
    expect(result.valid).toBe(true);
    expect(result.approval).toBe("NOT_SYNTHESIZED");
    expect(result.claimPromotion).toBe("BLOCKED");
    expect(result.canPromote).toBe(false);
    expect(JSON.stringify(result)).not.toContain("PASS");
  });

  it("keeps missing human approvals blocked", () => {
    const value = mutable(M33_CONTROL_PLANE_RECORD) as unknown as Record<
      string,
      unknown
    >;
    delete value["approval"];

    const result = validateM33ControlPlaneRecord(value, { now: NOW });
    expect(result.status).toBe("BLOCKED");
    expect(result.approval).toBe("NOT_SYNTHESIZED");
    expect(codes(result)).toContain("MISSING_APPROVAL");
    expect("approval" in value).toBe(false);
  });

  it("blocks stale owners even when the record claims validity", () => {
    const value = mutable(M34_ASSURANCE_RECORD) as unknown as Record<
      string,
      unknown
    >;
    value["owner"] = {
      id: "owner-001",
      state: "ASSIGNED",
      reviewedAt: "2026-09-01T00:00:00.000Z",
      validUntil: "2026-09-02T00:00:00.000Z",
    };

    const result = validateM34AssuranceRecord(value, { now: NOW });
    expect(result.status).toBe("BLOCKED");
    expect(codes(result)).toContain("OWNER_STALE");
    expect(result.canPromote).toBe(false);
  });

  it("rejects any attempt to persist forbidden data or use writes", () => {
    const value = mutable(M33_CONTROL_PLANE_RECORD) as unknown as Record<
      string,
      unknown
    >;
    const persistence = object(value["persistence"]);
    persistence["rawReports"] = "PERSISTED";
    const architecture = object(value["architecture"]);
    architecture["writes"] = "WRITE";

    const result = validateM33ControlPlaneRecord(value, { now: NOW });
    expect(result.status).toBe("INVALID");
    expect(codes(result)).toContain("FORBIDDEN_PERSISTENCE");
    expect(codes(result)).toContain("INVALID_FIELD");
  });

  it("rejects malformed evidence without creating authority", () => {
    const value = withEvidence(M34_ASSURANCE_RECORD);
    const evidence = object(value["evidencePackage"]);
    evidence["items"] = [{ malformed: true }];

    const result = validateM34AssuranceRecord(value, {
      now: NOW,
      expectedCandidateId: "candidate-a",
      expectedTenantId: "tenant-a",
    });
    expect(result.status).toBe("INVALID");
    expect(codes(result)).toContain("MALFORMED_EVIDENCE");
    expect(result.claimPromotion).toBe("BLOCKED");
    expect(result.approval).toBe("NOT_SYNTHESIZED");
  });

  it("rejects foreign candidate or tenant evidence", () => {
    const value = withEvidence(
      M33_CONTROL_PLANE_RECORD,
      "candidate-b",
      "tenant-b",
    );

    const result = validateM33ControlPlaneRecord(value, {
      now: NOW,
      expectedCandidateId: "candidate-a",
      expectedTenantId: "tenant-a",
    });
    expect(result.status).toBe("BLOCKED");
    expect(codes(result)).toContain("FOREIGN_EVIDENCE");
    expect(result.canPromote).toBe(false);
  });

  it("never promotes an enterprise claim, even with positive text", () => {
    const value = mutable(M34_ASSURANCE_RECORD) as unknown as Record<
      string,
      unknown
    >;
    const enterprise = object(value["enterprise"]);
    enterprise["claim"] = "CERTIFIED";
    value["claimPromotion"] = "APPROVED";

    const result = validateM34AssuranceRecord(value, { now: NOW });
    expect(result.status).toBe("BLOCKED");
    expect(codes(result)).toContain("ENTERPRISE_CLAIM_FORBIDDEN");
    expect(result.claimPromotion).toBe("BLOCKED");
    expect(result.canPromote).toBe(false);
  });

  it("dispatches the generic validator by train and remains bounded", () => {
    const foreignTrain = mutable(M33_CONTROL_PLANE_RECORD) as unknown as Record<
      string,
      unknown
    >;
    foreignTrain["train"] = "M34";
    expect(
      validateGovernanceAssuranceRecord(foreignTrain, { now: NOW }).status,
    ).toBe("INVALID");

    const oversized = {
      ...M33_CONTROL_PLANE_RECORD,
      evidencePackage: {
        ...M33_CONTROL_PLANE_RECORD.evidencePackage,
        items: Array.from({ length: 129 }, () => evidenceFor()),
      },
    };
    expect(validateM33ControlPlaneRecord(oversized, { now: NOW }).status).toBe(
      "INVALID",
    );
  });
});
