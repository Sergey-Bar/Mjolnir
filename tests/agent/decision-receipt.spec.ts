import { describe, expect, it } from "vitest";
import {
  createDecisionReceipt,
  DecisionReceiptError,
  MAX_DECISION_RECEIPT_COMMANDS,
  validateDecisionReceipt,
  type CandidateBinding,
  type DecisionReceiptInput,
} from "../../src/agent/decision-receipt.js";

function digest(character: string): string {
  return `sha256:${character.repeat(64)}`;
}

function candidate(): CandidateBinding {
  return {
    candidateId: "candidate-20260925",
    commitSha: "a".repeat(40),
    treeSha256: digest("b"),
    capturedAt: "2026-09-25T00:00:00.000Z",
    freshness: "CURRENT",
  };
}

function input(): DecisionReceiptInput {
  return {
    finding: {
      findingId: "finding-001",
      ruleId: "QA-TEST-001",
      fingerprintSha256: digest("c"),
      candidateId: "candidate-20260925",
    },
    identity: {
      agent: { id: "local-sdet", version: "1.0.0" },
      model: { id: "local-test-model", version: "1.0.0", provider: "local" },
      tool: { id: "local-repair-tool", version: "1.0.0" },
    },
    patch: {
      reference: "patches/finding-001.patch",
      sha256: digest("d"),
      candidateId: "candidate-20260925",
      verified: true,
      proposedAt: "2026-09-25T02:00:00.000Z",
    },
    commands: [
      {
        commandId: "command-test",
        executable: "npm",
        arguments: ["test"],
        exitCode: 0,
        networkAccess: false,
        executedAt: "2026-09-25T03:00:00.000Z",
        candidateId: "candidate-20260925",
      },
      {
        commandId: "command-scan",
        executable: "mjolnir",
        arguments: ["scan", "--json"],
        exitCode: 0,
        networkAccess: false,
        executedAt: "2026-09-25T03:10:00.000Z",
        candidateId: "candidate-20260925",
      },
    ],
    evidence: [
      {
        evidenceId: "evidence-test",
        kind: "TEST",
        reference: "evidence/test-result.json",
        sha256: digest("e"),
        candidateId: "candidate-20260925",
        observedAt: "2026-09-25T03:05:00.000Z",
      },
      {
        evidenceId: "evidence-scan",
        kind: "SCAN",
        reference: "evidence/independent-scan.json",
        sha256: digest("f"),
        candidateId: "candidate-20260925",
        observedAt: "2026-09-25T03:15:00.000Z",
      },
    ],
    verification: {
      result: "VERIFIED",
      independentRescan: true,
      verifier: { name: "mjolnir", version: "3.0.0" },
      candidateId: "candidate-20260925",
      findingId: "finding-001",
      patchSha256: digest("d"),
      evidenceIds: ["evidence-test", "evidence-scan"],
      verifiedAt: "2026-09-25T04:00:00.000Z",
    },
    approval: {
      decision: "APPROVED",
      approverId: "reviewer-001",
      candidateId: "candidate-20260925",
      patchSha256: digest("d"),
      approvedAt: "2026-09-25T01:00:00.000Z",
    },
    rollback: {
      strategy: "REVERT_PATCH",
      reference: "patches/rollback-finding-001.patch",
      sha256: digest("1"),
      candidateId: "candidate-20260925",
      preparedAt: "2026-09-25T03:30:00.000Z",
    },
    candidate: candidate(),
  };
}

function required<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error("Expected fixture value");
  }
  return value;
}

function asInput(value: unknown): DecisionReceiptInput {
  return value as DecisionReceiptInput;
}

function creationDiagnostics(
  value: DecisionReceiptInput,
  currentCandidate: CandidateBinding = candidate(),
): readonly string[] {
  try {
    createDecisionReceipt(value, currentCandidate);
  } catch (error) {
    expect(error).toBeInstanceOf(DecisionReceiptError);
    if (error instanceof DecisionReceiptError) {
      return error.diagnostics.map((diagnostic) => diagnostic.code);
    }
  }
  throw new Error("Expected decision receipt creation to fail");
}

describe("M32 local decision receipt", () => {
  it("creates, validates, and deterministically identifies an approved verified receipt", () => {
    const first = createDecisionReceipt(input(), candidate());
    const second = createDecisionReceipt(input(), candidate());

    expect(validateDecisionReceipt(first, candidate())).toEqual({
      valid: true,
      errors: [],
      diagnostics: [],
    });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.receiptId).toBe(second.receiptId);
  });

  it("returns a deeply immutable snapshot detached from caller input", () => {
    const source = input();
    const receipt = createDecisionReceipt(source, candidate());
    const mutableSource = source as unknown as {
      finding: { findingId: string };
      commands: Array<{ arguments: string[] }>;
      evidence: Array<{ reference: string }>;
      candidate: { commitSha: string };
    };

    mutableSource.finding.findingId = "mutated-finding";
    required(mutableSource.commands[0]).arguments[0] = "mutated-command";
    required(mutableSource.evidence[0]).reference = "mutated-evidence.json";
    mutableSource.candidate.commitSha = "f".repeat(40);

    const firstCommand = required(receipt.commands[0]);
    const firstEvidence = required(receipt.evidence[0]);
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(Object.isFrozen(receipt.finding)).toBe(true);
    expect(Object.isFrozen(receipt.commands)).toBe(true);
    expect(Object.isFrozen(firstCommand.arguments)).toBe(true);
    expect(Object.isFrozen(firstEvidence)).toBe(true);
    expect(receipt.finding.findingId).toBe("finding-001");
    expect(firstCommand.arguments).toEqual(["test"]);
    expect(firstEvidence.reference).toBe("evidence/test-result.json");
    expect(receipt.candidate.commitSha).toBe("a".repeat(40));
  });

  it("rejects missing or non-human approval", () => {
    expect(
      creationDiagnostics({
        ...input(),
        approval: undefined,
      } as unknown as DecisionReceiptInput),
    ).toContain("MISSING_APPROVAL");

    const base = input();
    const selfApproved = asInput({
      ...base,
      approval: {
        ...base.approval,
        approverId: base.identity.agent.id,
      },
    });
    expect(creationDiagnostics(selfApproved)).toContain("SELF_APPROVAL");
  });

  it("rejects an unverified patch and failed verification commands", () => {
    const base = input();
    const unverified = asInput({
      ...base,
      patch: {
        ...base.patch,
        verified: false,
      },
    });
    expect(creationDiagnostics(unverified)).toContain("UNVERIFIED_PATCH");

    const failed = asInput({
      ...base,
      commands: [
        {
          ...required(base.commands[0]),
          exitCode: 1,
        },
      ],
    });
    expect(creationDiagnostics(failed)).toContain("UNVERIFIED_PATCH");
  });

  it("rejects foreign and stale candidate bindings", () => {
    const base = input();
    const foreign = asInput({
      ...base,
      evidence: [
        {
          ...required(base.evidence[0]),
          candidateId: "candidate-foreign",
        },
        required(base.evidence[1]),
      ],
    });
    expect(creationDiagnostics(foreign)).toContain("FOREIGN_CANDIDATE");

    expect(
      creationDiagnostics(input(), {
        ...candidate(),
        freshness: "STALE",
      }),
    ).toContain("STALE_CANDIDATE");

    const receipt = createDecisionReceipt(input(), candidate());
    const foreignResult = validateDecisionReceipt(receipt, {
      ...candidate(),
      commitSha: "b".repeat(40),
    });
    expect(
      foreignResult.diagnostics.map((diagnostic) => diagnostic.code),
    ).toContain("FOREIGN_CANDIDATE");

    const staleResult = validateDecisionReceipt(receipt, {
      ...candidate(),
      capturedAt: "2026-09-25T00:00:00.001Z",
    });
    expect(
      staleResult.diagnostics.map((diagnostic) => diagnostic.code),
    ).toContain("STALE_CANDIDATE");
  });

  it("rejects secret-like fields and command arguments", () => {
    const secretField = asInput({
      ...input(),
      apiKey: "local-test-value",
    });
    expect(creationDiagnostics(secretField)).toContain("SECRET_FIELD");

    const base = input();
    const secretArgument = asInput({
      ...base,
      commands: [
        {
          ...required(base.commands[0]),
          arguments: ["--token", "local-value"],
        },
      ],
    });
    expect(creationDiagnostics(secretArgument)).toContain("SECRET_VALUE");
  });

  it("rejects malformed evidence and missing independent scan evidence", () => {
    const base = input();
    const malformed = asInput({
      ...base,
      evidence: [
        {
          ...required(base.evidence[0]),
          sha256: "not-a-digest",
        },
        required(base.evidence[1]),
      ],
    });
    expect(creationDiagnostics(malformed)).toContain("MALFORMED_EVIDENCE");

    const noScan = asInput({
      ...base,
      evidence: [required(base.evidence[0])],
      verification: {
        ...base.verification,
        evidenceIds: ["evidence-test"],
      },
    });
    expect(creationDiagnostics(noScan)).toContain("INDEPENDENT_RESCAN_MISSING");
  });

  it("rejects attempts to set PASS, severity, trust, or verdict", () => {
    const base = input();
    const passAttempt = asInput({
      ...base,
      verification: {
        ...base.verification,
        result: "PASS",
      },
    });
    expect(creationDiagnostics(passAttempt)).toContain(
      "FORBIDDEN_AUTHORITY_VALUE",
    );

    for (const field of ["severity", "trust", "verdict"] as const) {
      expect(
        creationDiagnostics(
          asInput({
            ...input(),
            [field]: "high",
          }),
        ),
      ).toContain("FORBIDDEN_AUTHORITY_FIELD");
    }
  });

  it("enforces bounded collections and canonical local artifact references", () => {
    const base = input();
    const baseCommand = required(base.commands[0]);
    const oversized = asInput({
      ...base,
      commands: Array.from(
        { length: MAX_DECISION_RECEIPT_COMMANDS + 1 },
        (_, index) => ({
          ...baseCommand,
          commandId: `command-${index}`,
        }),
      ),
    });
    expect(creationDiagnostics(oversized)).toContain("RECEIPT_TOO_LARGE");

    const traversal = asInput({
      ...base,
      evidence: [
        {
          ...required(base.evidence[0]),
          reference: "../outside.json",
        },
        required(base.evidence[1]),
      ],
    });
    expect(creationDiagnostics(traversal)).toContain("INVALID_REFERENCE");
  });

  it("detects mutation of canonical receipt content", () => {
    const receipt = createDecisionReceipt(input(), candidate());
    const changed = JSON.parse(JSON.stringify(receipt)) as Record<
      string,
      unknown
    >;
    const finding = changed["finding"] as Record<string, unknown>;
    finding["ruleId"] = "QA-TEST-999";

    const result = validateDecisionReceipt(changed, candidate());
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "RECEIPT_ID_MISMATCH",
    );
  });
});
