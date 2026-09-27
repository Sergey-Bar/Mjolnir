import { describe, expect, it } from "vitest";

import {
  M38_CHALLENGE_DIMENSIONS,
  M38_CHALLENGE_LIMITS,
  M38_CHALLENGE_TRUST_POLICY,
  applyM38ChallengeReport,
  evaluateM38Challenges,
  type M38ChallengeDimension,
  type M38ChallengeEvidence,
  type M38ChallengeRecord,
  type M38EvaluationContext,
} from "../../src/engine/m38-challenge-contract.js";

const CONTEXT: M38EvaluationContext = {
  candidateId: "candidate-a",
  evaluatedAt: "2026-01-02T00:00:00.000Z",
};

function evidence(
  overrides: Partial<M38ChallengeEvidence> = {},
): M38ChallengeEvidence {
  const completeness = overrides.completeness ?? "COMPLETE";
  const base = {
    completeness,
    execution: "COMPLETE" as const,
    candidateId: CONTEXT.candidateId,
    capturedAt: "2026-01-01T23:59:59.000Z",
    detail: "bounded evidence",
    durationMs: 10,
    outputBytes: 128,
    itemCount: 1,
  };
  if (completeness === "PARTIAL" && overrides.observation === undefined) {
    return { ...base, ...overrides };
  }
  return {
    ...base,
    observation: overrides.observation ?? "NOT_CONTRADICTED",
    ...overrides,
  };
}

function record(
  dimension: M38ChallengeDimension,
  options: {
    readonly id?: string;
    readonly evidence?: M38ChallengeEvidence | null;
    readonly observation?: "CONTRADICTS" | "NOT_CONTRADICTED";
    readonly candidateId?: string;
  } = {},
): M38ChallengeRecord {
  const id = options.id ?? `${dimension}-01`;
  const selectedEvidence =
    options.evidence === null
      ? undefined
      : (options.evidence ??
        evidence(
          options.observation === undefined
            ? {}
            : { observation: options.observation },
        ));
  const common = {
    schemaVersion: 1 as const,
    id,
    claim: `challenge ${dimension} green claim`,
    ...(selectedEvidence === undefined ? {} : { evidence: selectedEvidence }),
  };
  switch (dimension) {
    case "semantic":
      return {
        ...common,
        dimension,
        probe: {
          kind: dimension,
          requirementId: "REQ-1",
          mutation: "remove required assertion",
        },
      };
    case "runtime":
      return {
        ...common,
        dimension,
        probe: {
          kind: dimension,
          executionId: "execution-1",
          eventType: "test.finished",
        },
      };
    case "ci":
      return {
        ...common,
        dimension,
        probe: {
          kind: dimension,
          provider: "github-actions",
          workflowPath: ".github/workflows/ci.yml",
          jobId: "verify",
        },
      };
    case "artifact":
      return {
        ...common,
        dimension,
        probe: {
          kind: dimension,
          digest: "sha256:abc",
          mediaType: "application/json",
        },
      };
    case "environment":
      return {
        ...common,
        dimension,
        probe: {
          kind: dimension,
          fingerprint: "env-1",
          platform: "win32-x64-node22",
        },
      };
    case "mocks":
      return {
        ...common,
        dimension,
        probe: {
          kind: dimension,
          boundary: "database",
          dependency: "payment-client",
        },
      };
    case "release-proof":
      return {
        ...common,
        dimension,
        probe: {
          kind: dimension,
          candidateId: options.candidateId ?? CONTEXT.candidateId,
          proofId: "proof-1",
        },
      };
  }
}

function allRecords(): M38ChallengeRecord[] {
  return M38_CHALLENGE_DIMENSIONS.map((dimension) => record(dimension));
}

describe("M38 challenge contract", () => {
  it("defines frozen finite dimensions and resource limits", () => {
    expect(M38_CHALLENGE_DIMENSIONS).toEqual([
      "semantic",
      "runtime",
      "ci",
      "artifact",
      "environment",
      "mocks",
      "release-proof",
    ]);
    expect(Object.isFrozen(M38_CHALLENGE_DIMENSIONS)).toBe(true);
    expect(Object.isFrozen(M38_CHALLENGE_LIMITS)).toBe(true);
    for (const value of Object.values(M38_CHALLENGE_LIMITS)) {
      expect(Number.isSafeInteger(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
    expect(M38_CHALLENGE_TRUST_POLICY).toEqual({
      effect: "PRESERVE_OR_DOWNGRADE",
      canIncreaseTrust: false,
    });
  });

  it("evaluates every typed dimension deterministically and never emits PASS", () => {
    const records = allRecords();
    const forward = evaluateM38Challenges(records, CONTEXT);
    const reverse = evaluateM38Challenges([...records].reverse(), CONTEXT);

    expect(JSON.stringify(forward)).toBe(JSON.stringify(reverse));
    expect(forward.state).toBe("NOT_CONTRADICTED");
    expect(forward.results).toHaveLength(M38_CHALLENGE_DIMENSIONS.length);
    expect(forward.dimensions.map((item) => item.dimension)).toEqual(
      M38_CHALLENGE_DIMENSIONS,
    );
    expect(forward.resourceState).toBe("WITHIN_BOUNDS");
    expect(forward.state).not.toBe("PASS");
  });

  it("downgrades a contradiction and cannot manufacture PASS", () => {
    const records = allRecords();
    records[0] = record("semantic", { observation: "CONTRADICTS" });
    const challenged = evaluateM38Challenges(records, CONTEXT);
    const unchallenged = evaluateM38Challenges(allRecords(), CONTEXT);

    expect(challenged.state).toBe("CONTRADICTED");
    expect(applyM38ChallengeReport("PASS", challenged)).toBe("PARTIAL");
    expect(applyM38ChallengeReport("UNKNOWN", unchallenged)).toBe("UNKNOWN");
    expect(applyM38ChallengeReport("PARTIAL", unchallenged)).toBe("PARTIAL");
    expect(applyM38ChallengeReport("UNKNOWN", { state: "PASS" })).toBe(
      "UNKNOWN",
    );
  });

  it("states UNKNOWN when evidence is absent", () => {
    const records = allRecords();
    records[2] = record("ci", { evidence: null });
    const result = evaluateM38Challenges(records, CONTEXT);
    const ci = result.results.find((item) => item.challengeId === "ci-01");

    expect(ci?.outcome).toBe("UNKNOWN");
    expect(ci?.reason).toBe("EVIDENCE_ABSENT");
    expect(result.state).toBe("UNKNOWN");
    expect(evaluateM38Challenges([], CONTEXT).state).toBe("UNKNOWN");
  });

  it("states PARTIAL when evidence is incomplete or execution times out", () => {
    const partialRecords = allRecords();
    partialRecords[1] = record("runtime", {
      evidence: evidence({ completeness: "PARTIAL" }),
    });
    const timeoutRecords = allRecords();
    timeoutRecords[3] = record("artifact", {
      evidence: evidence({
        execution: "TIMED_OUT",
        observation: "CONTRADICTS",
      }),
    });

    const partial = evaluateM38Challenges(partialRecords, CONTEXT);
    const timeout = evaluateM38Challenges(timeoutRecords, CONTEXT);

    expect(partial.state).toBe("PARTIAL");
    expect(
      partial.results.find((item) => item.challengeId === "runtime-01")?.reason,
    ).toBe("EVIDENCE_PARTIAL");
    expect(timeout.state).toBe("PARTIAL");
    expect(
      timeout.results.find((item) => item.challengeId === "artifact-01"),
    ).toMatchObject({
      reason: "EXECUTION_TIMEOUT",
      outcome: "PARTIAL",
    });
  });

  it("rejects stale evidence as UNKNOWN", () => {
    const records = allRecords();
    records[4] = record("environment", {
      evidence: evidence({ capturedAt: "2020-01-01T00:00:00.000Z" }),
    });
    const result = evaluateM38Challenges(records, CONTEXT);
    const stale = result.results.find(
      (item) => item.challengeId === "environment-01",
    );

    expect(stale?.outcome).toBe("UNKNOWN");
    expect(stale?.reason).toBe("EVIDENCE_STALE");
    expect(result.state).toBe("UNKNOWN");
  });

  it("rejects foreign evidence as UNKNOWN", () => {
    const records = allRecords();
    records[5] = record("mocks", {
      evidence: evidence({ candidateId: "candidate-b" }),
    });
    const result = evaluateM38Challenges(records, CONTEXT);
    const foreign = result.results.find(
      (item) => item.challengeId === "mocks-01",
    );

    expect(foreign?.outcome).toBe("UNKNOWN");
    expect(foreign?.reason).toBe("EVIDENCE_FOREIGN");
    expect(result.state).toBe("UNKNOWN");

    const proofRecords = allRecords();
    proofRecords[6] = record("release-proof", {
      candidateId: "candidate-b",
    });
    const proofResult = evaluateM38Challenges(proofRecords, CONTEXT);
    expect(
      proofResult.results.find(
        (item) => item.challengeId === "release-proof-01",
      )?.reason,
    ).toBe("EVIDENCE_FOREIGN");
  });

  it("rejects malformed and forged evidence without creating PASS", () => {
    const forged = evidence({
      observation: "PASS" as "NOT_CONTRADICTED",
    });
    const result = evaluateM38Challenges(
      [record("semantic", { evidence: forged })],
      CONTEXT,
    );

    expect(result.results[0]?.outcome).toBe("UNKNOWN");
    expect(result.results[0]?.reason).toBe("EVIDENCE_MALFORMED");
    expect(result.state).toBe("UNKNOWN");
    expect(evaluateM38Challenges(null, CONTEXT).inputState).toBe("MALFORMED");
    expect(evaluateM38Challenges([], null).state).toBe("UNKNOWN");
  });

  it("bounds hostile input and refuses oversized evidence", () => {
    const repeated = Array.from(
      { length: M38_CHALLENGE_LIMITS.maxChallenges + 25 },
      () => record("semantic"),
    );
    const oversized = record("artifact", {
      evidence: evidence({
        outputBytes: M38_CHALLENGE_LIMITS.maxOutputBytes + 1,
      }),
    });
    const getter = record("release-proof");
    Object.defineProperty(getter, "id", {
      get: () => {
        throw new Error("hostile getter");
      },
    });
    const revoked = Proxy.revocable(record("ci"), {});
    revoked.revoke();

    const bounded = evaluateM38Challenges(repeated, CONTEXT);
    const overBudget = evaluateM38Challenges([oversized], CONTEXT);
    const hostileGetterReport = evaluateM38Challenges([getter], CONTEXT);
    const revokedReport = evaluateM38Challenges([revoked.proxy], CONTEXT);

    expect(bounded.evaluatedCount).toBe(M38_CHALLENGE_LIMITS.maxChallenges);
    expect(bounded.unprocessedCount).toBe(25);
    expect(bounded.state).toBe("PARTIAL");
    expect(overBudget.results[0]?.outcome).toBe("PARTIAL");
    expect(overBudget.results[0]?.withinResourceBudget).toBe(false);
    expect(overBudget.resourceState).toBe("EXCEEDED");
    expect(hostileGetterReport.state).toBe("UNKNOWN");
    expect(revokedReport.state).toBe("UNKNOWN");
  });

  it("rejects duplicate challenge IDs deterministically", () => {
    const first = record("runtime", { id: "duplicate" });
    const second = record("runtime", { id: "duplicate" });
    const forward = evaluateM38Challenges([first, second], CONTEXT);
    const reverse = evaluateM38Challenges([second, first], CONTEXT);

    expect(JSON.stringify(forward)).toBe(JSON.stringify(reverse));
    expect(forward.duplicateIdCount).toBe(1);
    expect(
      forward.results.every((item) => item.reason === "DUPLICATE_ID"),
    ).toBe(true);
    expect(forward.state).toBe("UNKNOWN");
  });

  it("marks aggregate resource exhaustion as PARTIAL", () => {
    const records = allRecords().map((item) =>
      record(item.dimension, {
        evidence: evidence({ durationMs: 5_000 }),
      }),
    );
    const result = evaluateM38Challenges(records, CONTEXT);
    const hostileNumber = evaluateM38Challenges(
      [
        record("artifact", {
          evidence: evidence({ outputBytes: Number.MAX_SAFE_INTEGER }),
        }),
      ],
      CONTEXT,
    );

    expect(result.totalResources.durationMs).toBe(
      M38_CHALLENGE_LIMITS.maxTotalDurationMs + 1,
    );
    expect(result.resourceState).toBe("EXCEEDED");
    expect(result.state).toBe("PARTIAL");
    expect(hostileNumber.totalResources.outputBytes).toBe(
      M38_CHALLENGE_LIMITS.maxOutputBytes + 1,
    );
  });
});
