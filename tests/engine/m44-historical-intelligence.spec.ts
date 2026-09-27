import { describe, expect, it } from "vitest";

import {
  M44_AUTHORITY_POLICY,
  M44_EVENT_KINDS,
  M44_EVENT_STATES,
  M44_HISTORY_LIMITS,
  M44_HISTORY_SCHEMA_VERSION,
  appendM44Event,
  classifyM44Incident,
  diffM44Replays,
  evaluateM44TrustDecay,
  replayM44History,
  validateM44History,
  type M44AppendResult,
  type M44DecisionEventInput,
  type M44EventInput,
  type M44EvidenceEventInput,
  type M44IncidentEventInput,
  type M44ReleaseEventInput,
  type M44ReplayContext,
  type M44ReplayResult,
  type M44ScanEventInput,
} from "../../src/engine/m44-historical-intelligence.js";

const CANDIDATE = "candidate-a";
const REPOSITORY = "repository-a";
const HISTORY = "history-a";
const NOW = "2026-09-25T00:00:00.000Z";

function digest(character: string): string {
  return `sha256:${character.repeat(64)}`;
}

function base() {
  return {
    repositoryId: REPOSITORY,
    historyId: HISTORY,
    candidateId: CANDIDATE,
    subjectId: "subject-1",
    correlationId: "correlation-1",
    source: "local-test",
    occurredAt: "2026-09-24T00:00:00.000Z",
    recordedAt: "2026-09-24T01:00:00.000Z",
    detail: "bounded historical observation",
    evidenceIds: ["evidence-1"],
    relatedEventIds: [],
    debt: { category: "verification" as const, points: 100 },
    retention: {
      policy: "standard-v1",
      legalBasis: "OPERATIONAL" as const,
      retainUntil: "2027-09-24T01:00:00.000Z",
    },
    deletion: {
      state: "NOT_REQUESTED" as const,
      requestedAt: null,
      completedAt: null,
      reason: null,
      evidenceIds: [],
    },
  };
}

function scanInput(
  overrides: Partial<M44ScanEventInput> = {},
): M44ScanEventInput {
  return {
    ...base(),
    kind: "scan",
    state: "COMPLETE",
    data: {
      findingCount: 2,
      incompleteChecks: 0,
      sensitivityEscapes: 0,
    },
    ...overrides,
  };
}

function evidenceInput(
  overrides: Partial<M44EvidenceEventInput> = {},
): M44EvidenceEventInput {
  return {
    ...base(),
    kind: "evidence",
    state: "OBSERVED",
    subjectId: "evidence-1",
    data: {
      evidenceId: "evidence-1",
      sourceCandidateId: CANDIDATE,
      digest: digest("a"),
    },
    ...overrides,
  };
}

function incidentInput(
  overrides: Partial<M44IncidentEventInput> = {},
): M44IncidentEventInput {
  return {
    ...base(),
    kind: "incident",
    state: "ESCAPED",
    subjectId: "incident-1",
    correlationId: "incident-1",
    debt: { category: "incident", points: 1_000 },
    data: {
      defectConfirmed: true,
      detectedBeforeRelease: false,
      escapedToRelease: true,
      expectedVerificationId: "verification-1",
      missingEvidenceIds: [],
      regressionFixtureId: "fixture-1",
    },
    ...overrides,
  };
}

function decisionInput(
  overrides: Partial<M44DecisionEventInput> = {},
): M44DecisionEventInput {
  return {
    ...base(),
    kind: "decision",
    state: "ACCEPTED",
    subjectId: "decision-1",
    data: { rationale: "linked to incident evidence", supersedes: null },
    ...overrides,
  };
}

function releaseInput(
  overrides: Partial<M44ReleaseEventInput> = {},
): M44ReleaseEventInput {
  return {
    ...base(),
    kind: "release",
    state: "PUBLISHED",
    subjectId: "release-1",
    data: {
      releaseId: "release-1",
      incidentIds: ["incident-1"],
      artifactDigest: digest("b"),
    },
    ...overrides,
  };
}

function appendRequired(
  history: readonly M44AppendResult["event"][],
  input: M44EventInput,
): readonly M44AppendResult["event"][] {
  const result = appendM44Event(history, input);
  if (!result.accepted || result.event === null) {
    throw new Error(
      result.diagnostics.map((diagnostic) => diagnostic.code).join(","),
    );
  }
  return [...history, result.event];
}

function context(overrides: Partial<M44ReplayContext> = {}): M44ReplayContext {
  return {
    repositoryId: REPOSITORY,
    historyId: HISTORY,
    candidateId: CANDIDATE,
    asOf: NOW,
    maxEvidenceAgeMs: 31_536_000_000,
    ...overrides,
  };
}

function allEvents(): readonly M44AppendResult["event"][] {
  let history: readonly M44AppendResult["event"][] = [];
  history = appendRequired(history, scanInput());
  history = appendRequired(history, evidenceInput());
  history = appendRequired(history, incidentInput());
  history = appendRequired(history, decisionInput());
  history = appendRequired(history, releaseInput());
  return history;
}

describe("M44 historical intelligence contract", () => {
  it("publishes finite advisory-only constants for every historical event kind", () => {
    expect(M44_HISTORY_SCHEMA_VERSION).toBe(1);
    expect(M44_EVENT_KINDS).toEqual([
      "scan",
      "incident",
      "decision",
      "release",
      "evidence",
    ]);
    expect(M44_EVENT_STATES).toEqual({
      scan: ["STARTED", "COMPLETE", "PARTIAL", "INVALIDATED", "CONTRADICTORY"],
      incident: ["OPEN", "CONTAINED", "ESCAPED", "RESOLVED", "CONTRADICTORY"],
      decision: [
        "PROPOSED",
        "ACCEPTED",
        "REJECTED",
        "DEFERRED",
        "SUPERSEDED",
        "CONTRADICTORY",
      ],
      release: [
        "PREPARED",
        "PUBLISHED",
        "REVOKED",
        "SUPERSEDED",
        "CONTRADICTORY",
      ],
      evidence: ["OBSERVED", "STALE", "FOREIGN", "CONTRADICTORY", "DELETED"],
    });
    expect(Object.isFrozen(M44_EVENT_KINDS)).toBe(true);
    expect(Object.isFrozen(M44_EVENT_STATES)).toBe(true);
    expect(Object.isFrozen(M44_HISTORY_LIMITS)).toBe(true);
    expect(M44_AUTHORITY_POLICY).toEqual({
      effect: "ADVISORY_ONLY",
      canApproveRelease: false,
      canCertify: false,
      canSetTrust: false,
    });
  });

  it("builds deterministic append-only chains for scan, incident, decision, release, and evidence", () => {
    const first = allEvents();
    const second = allEvents();

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.map((event) => event?.sequence)).toEqual([1, 2, 3, 4, 5]);
    expect(first[0]?.previousEventId).toBeNull();
    expect(first[1]?.previousEventId).toBe(first[0]?.eventId);
    expect(first.every((event) => event?.authority === "NONE")).toBe(true);
    expect(validateM44History(first)).toMatchObject({
      valid: true,
      diagnostics: [],
      unprocessedCount: 0,
    });
  });

  it("detaches and freezes appended envelopes and rejects authority claims", () => {
    const source = incidentInput();
    const mutableSource = source as unknown as {
      detail: string;
      debt: { points: number };
    };
    const appended = appendM44Event([], source);
    mutableSource.detail = "mutated";
    mutableSource.debt.points = 0;

    expect(appended.accepted).toBe(true);
    expect(appended.event?.detail).toBe("bounded historical observation");
    expect(appended.event?.debt.points).toBe(1_000);
    expect(Object.isFrozen(appended.event)).toBe(true);
    expect(Object.isFrozen(appended.event?.data)).toBe(true);

    const forged = {
      ...incidentInput(),
      verdict: "PASS",
      authority: "APPROVE",
      unexpected: true,
    } as unknown as M44EventInput;
    const result = appendM44Event([], forged);

    expect(result.accepted).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["FORBIDDEN_AUTHORITY_FIELD", "UNKNOWN_FIELD"]),
    );
  });

  it("replays deterministically and diffs appended versus changed history", () => {
    const baseHistory = allEvents();
    const changedHistory = appendRequired(
      baseHistory,
      incidentInput({
        state: "RESOLVED",
        debt: { category: "incident", points: 0 },
        data: {
          ...incidentInput().data,
          escapedToRelease: false,
        },
      }),
    );

    const before = replayM44History(baseHistory, context());
    const after = replayM44History(changedHistory, context());
    const reordered = replayM44History([...baseHistory].reverse(), context());
    const diff = diffM44Replays(before, after);
    const empty = replayM44History([], context());
    const removedDiff = diffM44Replays(before, empty);
    const addedDiff = diffM44Replays(empty, before);

    expect(JSON.stringify(reordered)).toBe(JSON.stringify(before));
    expect(before.state).toBe("COMPLETE");
    expect(before.projections).toHaveLength(5);
    expect(
      after.projections.find((item) => item.kind === "incident"),
    ).toMatchObject({
      state: "RESOLVED",
      disposition: "INCLUDED",
    });
    expect(diff.equivalent).toBe(false);
    expect(diff.changed).toEqual([
      {
        key: "incident:incident-1",
        before: before.projections.find(
          (item) => item.key === "incident:incident-1",
        ),
        after: after.projections.find(
          (item) => item.key === "incident:incident-1",
        ),
      },
    ]);
    expect(removedDiff.removed).toHaveLength(5);
    expect(addedDiff.added).toHaveLength(5);
  });

  it("quarantines stale and foreign observations without making a trust claim", () => {
    const stale = replayM44History(
      [appendM44Event([], evidenceInput()).event],
      context({ maxEvidenceAgeMs: 3_600_000 }),
    );
    const foreignEvent = appendM44Event(
      [],
      evidenceInput({
        state: "FOREIGN",
        data: {
          evidenceId: "evidence-foreign",
          sourceCandidateId: "candidate-b",
          digest: digest("c"),
        },
      }),
    );
    const foreign = replayM44History([foreignEvent.event], context());
    const wrongCandidate = replayM44History(
      allEvents(),
      context({ candidateId: "candidate-b" }),
    );
    const wrongHistory = replayM44History(
      allEvents(),
      context({ repositoryId: "repository-b" }),
    );

    expect(stale.projections[0]?.disposition).toBe("STALE");
    expect(stale.projections[0]?.reasons).toContain("STALE");
    expect(foreign.projections[0]?.disposition).toBe("FOREIGN");
    expect(foreign.projections[0]?.reasons).toContain("FOREIGN_CANDIDATE");
    expect(
      wrongCandidate.projections.every(
        (item) => item.disposition === "FOREIGN",
      ),
    ).toBe(true);
    expect(
      wrongHistory.projections.every((item) => item.disposition === "FOREIGN"),
    ).toBe(true);
    expect(stale.projections[0]?.data).toBeNull();
    expect(foreign.projections[0]?.data).toBeNull();
    expect(stale.authority).toBe("NONE");
    expect(foreign.authority).toBe("NONE");
    expect(wrongCandidate.authority).toBe("NONE");
    expect(wrongHistory.authority).toBe("NONE");
  });

  it("surfaces contradictory events and rejects digest or chain mutation", () => {
    const contradictoryEvent = appendM44Event(
      [],
      incidentInput({
        state: "CONTRADICTORY",
        detail: "linked observations disagree",
      }),
    );
    const contradictory = replayM44History(
      [contradictoryEvent.event],
      context(),
    );
    const history = allEvents();
    const changed = JSON.parse(JSON.stringify(history)) as Record<
      string,
      unknown
    >[];
    const first = changed[0] as Record<string, unknown>;
    first["detail"] = "mutated after append";
    const validation = validateM44History(changed);
    const replay = replayM44History(changed, context());

    expect(contradictory.projections[0]).toMatchObject({
      disposition: "CONTRADICTORY",
      reasons: ["CONTRADICTORY"],
    });
    expect(
      validation.diagnostics.map((diagnostic) => diagnostic.code),
    ).toContain("EVENT_DIGEST_MISMATCH");
    expect(replay.state).toBe("UNKNOWN");
    expect(replay.authority).toBe("NONE");
    expect(history[0]?.detail).toBe("bounded historical observation");
  });

  it("applies retention and deletion metadata as tombstones without deleting ledger events", () => {
    const observed = appendM44Event([], evidenceInput()).event;
    const deleted = appendRequired(
      [observed],
      evidenceInput({
        state: "DELETED",
        detail: "source deletion completion was reported",
        deletion: {
          state: "REPORTED_COMPLETE",
          requestedAt: "2026-09-24T02:00:00.000Z",
          completedAt: "2026-09-24T03:00:00.000Z",
          reason: "source artifact deletion requested by policy",
          evidenceIds: ["deletion-receipt-1"],
        },
      }),
    );
    const expiredEvent = appendM44Event(
      [],
      scanInput({
        retention: {
          policy: "short-v1",
          legalBasis: "OPERATIONAL",
          retainUntil: "2026-09-24T02:00:00.000Z",
        },
      }),
    );
    const expired = replayM44History([expiredEvent.event], context());
    const tombstoned = replayM44History(deleted, context());

    expect(expired.projections[0]?.disposition).toBe("RETENTION_EXPIRED");
    expect(expired.projections[0]?.reasons).toContain("RETENTION_EXPIRED");
    expect(tombstoned.projections[0]?.disposition).toBe("DELETION_REPORTED");
    expect(tombstoned.projections[0]?.reasons).toContain("DELETION_REPORTED");
    expect(expired.projections[0]?.data).toBeNull();
    expect(tombstoned.projections[0]?.data).toBeNull();
    expect(validateM44History(deleted)).toMatchObject({
      valid: true,
      unprocessedCount: 0,
    });
    expect(deleted).toHaveLength(2);
  });

  it("bounds trust decay into deterministic exact and uncertainty ranges", () => {
    const exactHistory = appendRequired(
      [],
      incidentInput({
        occurredAt: "2026-01-01T00:00:00.000Z",
        recordedAt: "2026-01-01T00:00:00.000Z",
        detail: "historical incident for decay",
      }),
    );
    const staleHistory = appendRequired(
      [],
      evidenceInput({
        state: "STALE",
        debt: { category: "evidence", points: 500 },
        occurredAt: "2020-01-01T00:00:00.000Z",
        recordedAt: "2020-01-01T00:00:00.000Z",
        detail: "stale evidence debt",
      }),
    );
    const exactReplay = replayM44History(
      exactHistory,
      context({ asOf: "2026-01-11T00:00:00.000Z" }),
    );
    const uncertainReplay = replayM44History(staleHistory, context());
    let lifecycleHistory: readonly M44AppendResult["event"][] = [];
    lifecycleHistory = appendRequired(
      lifecycleHistory,
      scanInput({
        state: "PARTIAL",
        data: {
          ...scanInput().data,
          incompleteChecks: 1,
        },
      }),
    );
    lifecycleHistory = appendRequired(
      lifecycleHistory,
      decisionInput({ state: "DEFERRED" }),
    );
    lifecycleHistory = appendRequired(
      lifecycleHistory,
      releaseInput({ state: "PREPARED" }),
    );
    const lifecycleReplay = replayM44History(lifecycleHistory, context());
    const exact = evaluateM44TrustDecay(exactReplay, {
      asOf: "2026-01-11T00:00:00.000Z",
      halfLifeMs: 10 * 86_400_000,
      horizonMs: 100 * 86_400_000,
    });
    const uncertain = evaluateM44TrustDecay(uncertainReplay, {
      asOf: NOW,
      halfLifeMs: 10 * 86_400_000,
      horizonMs: 100 * 86_400_000,
    });
    const lifecycle = evaluateM44TrustDecay(lifecycleReplay, {
      asOf: NOW,
      halfLifeMs: 10 * 86_400_000,
      horizonMs: 100 * 86_400_000,
    });

    expect(exact).toMatchObject({
      state: "BOUNDED",
      certainty: "EXACT",
      lowerBound: 500,
      upperBound: 500,
      uncertainty: 0,
      authority: "NONE",
    });
    expect(uncertain.state).toBe("BOUNDED");
    expect(uncertain.certainty).toBe("RANGE");
    expect(uncertain.lowerBound).toBeLessThan(uncertain.upperBound);
    expect(uncertain.reasons).toContain("STALE");
    expect(lifecycle.contributions.map((item) => item.key)).toEqual([
      "decision:decision-1",
      "release:release-1",
      "scan:subject-1",
    ]);
    expect(JSON.stringify(uncertain)).toBe(
      JSON.stringify(
        evaluateM44TrustDecay(uncertainReplay, {
          asOf: NOW,
          halfLifeMs: 10 * 86_400_000,
          horizonMs: 100 * 86_400_000,
        }),
      ),
    );
  });

  it("distinguishes escaped defects from near misses and contradictory history", () => {
    const escaped = replayM44History(
      [appendM44Event([], incidentInput()).event],
      context(),
    );
    const nearMiss = replayM44History(
      [
        appendM44Event(
          [],
          incidentInput({
            state: "CONTAINED",
            data: {
              ...incidentInput().data,
              detectedBeforeRelease: true,
              escapedToRelease: false,
            },
          }),
        ).event,
      ],
      context(),
    );
    const contradictory = replayM44History(
      [appendM44Event([], incidentInput({ state: "CONTRADICTORY" })).event],
      context(),
    );
    const notDefect = replayM44History(
      [
        appendM44Event(
          [],
          incidentInput({
            state: "CONTAINED",
            data: {
              ...incidentInput().data,
              defectConfirmed: false,
              detectedBeforeRelease: false,
              escapedToRelease: false,
            },
          }),
        ).event,
      ],
      context(),
    );
    const missingEvidence = replayM44History(
      [
        appendM44Event(
          [],
          incidentInput({
            state: "CONTAINED",
            data: {
              ...incidentInput().data,
              detectedBeforeRelease: false,
              escapedToRelease: false,
              missingEvidenceIds: ["verification-1"],
            },
          }),
        ).event,
      ],
      context(),
    );
    const contained = replayM44History(
      [
        appendM44Event(
          [],
          incidentInput({
            state: "CONTAINED",
            data: {
              ...incidentInput().data,
              detectedBeforeRelease: false,
              escapedToRelease: false,
            },
          }),
        ).event,
      ],
      context(),
    );

    expect(classifyM44Incident(escaped, "incident-1")).toMatchObject({
      classification: "ESCAPED_DEFECT",
      nearMiss: false,
      authority: "NONE",
    });
    expect(classifyM44Incident(nearMiss, "incident-1")).toMatchObject({
      classification: "NEAR_MISS",
      nearMiss: true,
      expectedVerificationId: "verification-1",
      regressionFixtureId: "fixture-1",
      authority: "NONE",
    });
    expect(classifyM44Incident(contradictory, "incident-1")).toMatchObject({
      classification: "INCONCLUSIVE",
      nearMiss: false,
    });
    expect(classifyM44Incident(notDefect, "incident-1").classification).toBe(
      "NOT_DEFECT",
    );
    expect(
      classifyM44Incident(missingEvidence, "incident-1").classification,
    ).toBe("INCONCLUSIVE");
    expect(classifyM44Incident(contained, "incident-1").classification).toBe(
      "CONTAINED_DEFECT",
    );
    expect(
      classifyM44Incident(escaped, "missing-incident").classification,
    ).toBe("INCONCLUSIVE");
  });

  it("bounds collections, rejects malformed history, and never mutates callers", () => {
    const oversized = appendM44Event(
      [],
      evidenceInput({
        evidenceIds: Array.from(
          { length: M44_HISTORY_LIMITS.maxReferences + 1 },
          (_, index) => `evidence-${index}`,
        ),
      }),
    );
    const hostile = validateM44History(null);
    const minimalContext = replayM44History([], {
      repositoryId: REPOSITORY,
      historyId: HISTORY,
      candidateId: CANDIDATE,
      asOf: NOW,
    });
    const replay = replayM44History(null, context());
    const decay: M44ReplayResult = replay;
    const unknownDecay = evaluateM44TrustDecay(decay, {
      asOf: NOW,
      halfLifeMs: 10 * 86_400_000,
      horizonMs: 100 * 86_400_000,
    });
    const diff = diffM44Replays(decay, decay);

    expect(oversized.accepted).toBe(false);
    expect(
      oversized.diagnostics.map((diagnostic) => diagnostic.code),
    ).toContain("RESOURCE_LIMIT");
    expect(hostile.valid).toBe(false);
    expect(minimalContext.state).toBe("COMPLETE");
    expect(replay.state).toBe("UNKNOWN");
    expect(replay.authority).toBe("NONE");
    expect(unknownDecay.state).toBe("UNKNOWN");
    expect(classifyM44Incident(replay, "invalid id").classification).toBe(
      "INCONCLUSIVE",
    );
    expect(diff).toMatchObject({
      comparable: false,
      equivalent: false,
      authority: "NONE",
    });
  });
});
