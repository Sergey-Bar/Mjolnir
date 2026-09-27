import { describe, expect, it } from "vitest";

import {
  DEFAULT_M45_PROMOTION_POLICY,
  advanceDetectorLifecycle,
  computeDetectorDifferential,
  createSealedHoldout,
  evaluateDetectorPromotion,
  evaluateSealedHoldout,
  M45_DETECTOR_LIMITS,
  planDetectorDeprecation,
  planDetectorRetirement,
  planDetectorRollback,
  transitionDetectorLifecycle,
  type DetectorLifecycleState,
  type DetectorPromotionPolicy,
  type DetectorPromotionRequest,
  type DetectorRunMetrics,
  type DifferentialContext,
  type SealedHoldout,
  type SealedHoldoutResult,
} from "../../src/detectors/m45-detector-lifecycle.js";

const NOW = "2026-09-25T12:00:00.000Z";
const CANDIDATE_ID = "candidate-a";
const REPOSITORY_ID = "repository-a";
const DETECTOR_ID = "QA-DET-001";
const CORPUS_ID = "corpus-main";
const CORPUS_DIGEST = "sha256:corpus-main";
const MAX_AGE = 3_600_000;

function metrics(
  overrides: Partial<DetectorRunMetrics> = {},
): DetectorRunMetrics {
  return {
    schemaVersion: 1,
    detectorId: DETECTOR_ID,
    detectorRevision: 1,
    candidateId: CANDIDATE_ID,
    repositoryId: REPOSITORY_ID,
    corpusId: CORPUS_ID,
    corpusDigest: CORPUS_DIGEST,
    capturedAt: "2026-09-25T11:59:00.000Z",
    complete: true,
    truePositives: 8,
    falsePositives: 1,
    falseNegatives: 1,
    performance: {
      p50Ms: 10,
      p95Ms: 20,
      maxMs: 30,
      throughputPerSecond: 100,
    },
    crash: {
      total: 0,
      detectorCrashes: 0,
      timeouts: 0,
      contained: 0,
    },
    ...overrides,
  };
}

function context(
  overrides: Partial<DifferentialContext> = {},
): DifferentialContext {
  return {
    candidateId: CANDIDATE_ID,
    detectorId: DETECTOR_ID,
    repositoryId: REPOSITORY_ID,
    evaluatedAt: NOW,
    maxEvidenceAgeMs: MAX_AGE,
    ...overrides,
  };
}

function holdout(): SealedHoldout {
  const created = createSealedHoldout(
    {
      schemaVersion: 1,
      holdoutId: "holdout-a",
      candidateId: CANDIDATE_ID,
      detectorId: DETECTOR_ID,
      detectorRevision: 2,
      repositoryId: REPOSITORY_ID,
      trainingCorpusId: "corpus-training",
      corpusId: "corpus-holdout",
      corpusDigest: "sha256:corpus-holdout",
    },
    "2026-09-25T11:00:00.000Z",
  );
  if (created.holdout === null) throw new Error("fixture holdout is invalid");
  return created.holdout;
}

function holdoutResult(
  overrides: Partial<SealedHoldoutResult> = {},
): SealedHoldoutResult {
  return {
    schemaVersion: 1,
    holdoutId: "holdout-a",
    candidateId: CANDIDATE_ID,
    detectorId: DETECTOR_ID,
    detectorRevision: 2,
    repositoryId: REPOSITORY_ID,
    corpusId: "corpus-holdout",
    corpusDigest: "sha256:corpus-holdout",
    evaluatedAt: "2026-09-25T11:30:00.000Z",
    complete: true,
    isolated: true,
    contamination: "NONE",
    caseCount: 10,
    truePositives: 8,
    falsePositives: 1,
    falseNegatives: 1,
    unknownCount: 0,
    digest: "sha256:holdout-result-a",
    ...overrides,
  };
}

function promotionRequest(
  baseline: DetectorRunMetrics = metrics(),
  candidate: DetectorRunMetrics = metrics({
    detectorRevision: 2,
    truePositives: 9,
    falsePositives: 0,
  }),
  approvalDecision: "APPROVE" | "REJECT" = "APPROVE",
  policy: Partial<DetectorPromotionPolicy> = {},
): DetectorPromotionRequest {
  const differential = computeDetectorDifferential(
    baseline,
    candidate,
    context(),
  );
  const reportId = differential.differential?.reportId ?? "unavailable";
  const sealed = holdout();
  const result = holdoutResult();
  return {
    schemaVersion: 1,
    detectorId: DETECTOR_ID,
    detectorRevision: 2,
    candidateId: CANDIDATE_ID,
    repositoryId: REPOSITORY_ID,
    baseline,
    candidate,
    holdout: sealed,
    holdoutResult: result,
    humanApprovalEvidence: {
      schemaVersion: 1,
      evidenceId: "approval-a",
      evidenceDigest: "sha256:approval-a",
      reviewerId: "reviewer-a",
      decision: approvalDecision,
      candidateId: CANDIDATE_ID,
      detectorId: DETECTOR_ID,
      detectorRevision: 2,
      differentialReportId: reportId,
      holdoutResultDigest: result.digest,
      recordedAt: "2026-09-25T11:59:30.000Z",
    },
    humanApprovalEvidenceRef: "approval-a",
    policy,
  };
}

describe("M45 detector revision differential", () => {
  it("reports TP, FP, performance, and crash deltas deterministically", () => {
    const baseline = metrics({
      truePositives: 2,
      truePositiveIds: ["tp-1", "tp-2"],
      falsePositives: 1,
      falsePositiveIds: ["fp-1"],
      falseNegatives: 1,
      falseNegativeIds: ["fn-1"],
    });
    const candidate = metrics({
      detectorRevision: 2,
      truePositives: 2,
      falsePositives: 1,
      truePositiveIds: ["tp-2", "tp-3"],
      falsePositiveIds: ["fp-1"],
      falseNegativeIds: ["fn-1"],
      performance: {
        p50Ms: 12,
        p95Ms: 25,
        maxMs: 35,
        throughputPerSecond: 95,
      },
      crash: {
        total: 1,
        detectorCrashes: 1,
        timeouts: 0,
        contained: 1,
      },
    });

    const first = computeDetectorDifferential(baseline, candidate, context());
    const second = computeDetectorDifferential(baseline, candidate, context());

    expect(first).toEqual(second);
    expect(first.differential).toMatchObject({
      newTruePositives: 1,
      lostTruePositives: 1,
      newTp: 1,
      lostTp: 1,
      newFalsePositives: 0,
      resolvedFalsePositives: 0,
      performanceDelta: {
        p50Ms: 2,
        p95Ms: 5,
        maxMs: 5,
        throughputPerSecond: -5,
      },
      crashDelta: {
        total: 1,
        detectorCrashes: 1,
        timeouts: 0,
        contained: 1,
      },
    });
    expect(first.differential?.reportId).toMatch(
      /^differential:sha256:[0-9a-f]{64}$/,
    );
  });

  it("seals a holdout separate from training and evaluates an isolated result", () => {
    const sealed = holdout();
    const result = holdoutResult();
    const evaluation = evaluateSealedHoldout(
      sealed,
      result,
      {
        candidateId: CANDIDATE_ID,
        detectorId: DETECTOR_ID,
        detectorRevision: 2,
        repositoryId: REPOSITORY_ID,
        evaluatedAt: NOW,
        maxEvidenceAgeMs: MAX_AGE,
      },
      DEFAULT_M45_PROMOTION_POLICY,
    );

    expect(sealed.status).toBe("SEALED");
    expect(sealed.trainingCorpusId).not.toBe(sealed.corpusId);
    expect(evaluation).toMatchObject({
      state: "VALID",
      outcome: "ACCEPTED",
      unknownCount: 0,
      resultDigest: result.digest,
    });

    const contaminated = evaluateSealedHoldout(
      sealed,
      { ...result, isolated: false },
      {
        candidateId: CANDIDATE_ID,
        detectorId: DETECTOR_ID,
        detectorRevision: 2,
        repositoryId: REPOSITORY_ID,
        evaluatedAt: NOW,
        maxEvidenceAgeMs: MAX_AGE,
      },
      DEFAULT_M45_PROMOTION_POLICY,
    );
    expect(contaminated.outcome).toBe("INCONCLUSIVE");
    expect(contaminated.reason).toBe("HOLDOUT_CONTAMINATED");
  });
});

describe("M45 promotion state machine", () => {
  it("requires the complete evidence chain and human approval", () => {
    const request = promotionRequest();
    const result = evaluateDetectorPromotion(request, {
      evaluatedAt: NOW,
      maxEvidenceAgeMs: MAX_AGE,
    });

    expect(result.outcome).toBe("PROMOTED");
    expect(result.state).toBe("PROMOTED");
    expect(result.reason).toBe("CRITERIA_MET");
    expect(result.differential?.newTruePositives).toBe(1);
    expect(result.differential?.resolvedFalsePositives).toBe(1);
    expect(result.holdout?.outcome).toBe("ACCEPTED");
    expect(result.humanApprovalEvidenceRef).toBe("approval-a");
  });

  it("uses explicit NO_PROMOTION for measured regressions and human rejection", () => {
    const falsePositive = promotionRequest(
      metrics(),
      metrics({ detectorRevision: 2, falsePositives: 2 }),
    );
    const lostTruePositive = promotionRequest(
      metrics(),
      metrics({ detectorRevision: 2, truePositives: 7 }),
    );
    const crash = promotionRequest(
      metrics(),
      metrics({
        detectorRevision: 2,
        crash: {
          total: 1,
          detectorCrashes: 1,
          timeouts: 0,
          contained: 1,
        },
      }),
    );
    const rejected = promotionRequest(
      metrics(),
      metrics({ detectorRevision: 2, truePositives: 9, falsePositives: 0 }),
      "REJECT",
    );

    for (const request of [falsePositive, lostTruePositive, crash, rejected]) {
      const result = evaluateDetectorPromotion(request, {
        evaluatedAt: NOW,
        maxEvidenceAgeMs: MAX_AGE,
      });
      expect(result.outcome).toBe("NO_PROMOTION");
      expect(result.state).toBe("NO_PROMOTION");
      expect(result.reason).not.toBe("INCONCLUSIVE");
    }
    expect(
      evaluateDetectorPromotion(falsePositive, {
        evaluatedAt: NOW,
        maxEvidenceAgeMs: MAX_AGE,
      }).reason,
    ).toBe("NEW_FALSE_POSITIVES");
    expect(
      evaluateDetectorPromotion(rejected, {
        evaluatedAt: NOW,
        maxEvidenceAgeMs: MAX_AGE,
      }).reason,
    ).toBe("HUMAN_REJECTED");
  });

  it("returns INCONCLUSIVE for missing, partial, or contaminated evidence", () => {
    const missingApproval = {
      ...promotionRequest(),
      humanApprovalEvidence: null,
    } as unknown as DetectorPromotionRequest;
    const partial = promotionRequest(
      metrics(),
      metrics({ detectorRevision: 2, complete: false, truePositives: 9 }),
    );
    const unknownHoldout = {
      ...promotionRequest(),
      holdoutResult: holdoutResult({
        unknownCount: 1,
        truePositives: 8,
        caseCount: 11,
      }),
    };
    const contaminated = {
      ...promotionRequest(),
      holdoutResult: {
        ...promotionRequest().holdoutResult,
        isolated: false,
      },
    };

    for (const request of [
      missingApproval,
      partial,
      unknownHoldout,
      contaminated,
    ]) {
      const result = evaluateDetectorPromotion(request, {
        evaluatedAt: NOW,
        maxEvidenceAgeMs: MAX_AGE,
      });
      expect(result.outcome).toBe("INCONCLUSIVE");
      expect(result.state).toBe("INCONCLUSIVE");
    }

    const malformed = { ...missingApproval, humanApprovalEvidence: null };
    expect(
      evaluateDetectorPromotion(malformed, {
        evaluatedAt: NOW,
        maxEvidenceAgeMs: MAX_AGE,
      }).outcome,
    ).toBe("INCONCLUSIVE");
  });

  it("does not permit a direct intuition-only promotion", () => {
    expect(
      transitionDetectorLifecycle("AWAITING_APPROVAL", "PROMOTE"),
    ).toMatchObject({
      accepted: false,
      outcome: "NO_PROMOTION",
      to: "AWAITING_APPROVAL",
    });
    expect(
      transitionDetectorLifecycle("AWAITING_APPROVAL", {
        type: "PROMOTE",
        humanApprovalVerified: true,
        humanApprovalEvidenceRef: "approval-a",
      }),
    ).toMatchObject({ accepted: true, outcome: "ACCEPTED", to: "PROMOTED" });
  });

  it("enforces the ordered lifecycle and explicit recovery states", () => {
    const steps = [
      ["DISCOVERED", "RECORD_FINDING"],
      ["DISPOSITIONED", "RECORD_DISPOSITION"],
      ["ADJUDICATED", "COMPLETE_ADJUDICATION"],
      ["CANDIDATE", "COMPLETE_DIFFERENTIAL"],
      ["DIFFERENTIAL_EVALUATED", "COMPLETE_HOLDOUT"],
      ["HOLDOUT_EVALUATED", "RECORD_APPROVAL"],
    ] as const;
    let state: DetectorLifecycleState = steps[0][0];
    for (const [from, event] of steps) {
      expect(state).toBe(from);
      const transition = advanceDetectorLifecycle(state, event);
      expect(transition.accepted).toBe(true);
      state = transition.to;
    }
    expect(state).toBe("AWAITING_APPROVAL");
    expect(transitionDetectorLifecycle(state, "INCONCLUSIVE").to).toBe(
      "INCONCLUSIVE",
    );
    expect(transitionDetectorLifecycle("NO_PROMOTION", "REMEDIATE").to).toBe(
      "CANDIDATE",
    );
    expect(transitionDetectorLifecycle("INCONCLUSIVE", "REASSESS").to).toBe(
      "ADJUDICATED",
    );
  });
});

describe("M45 hostile, stale, and foreign evidence", () => {
  it("contains malformed, oversized, and throwing inputs without promotion", () => {
    const hostile = new Proxy(
      {},
      {
        get() {
          throw new Error("hostile getter");
        },
      },
    );
    expect(() =>
      evaluateDetectorPromotion(hostile, { evaluatedAt: NOW }),
    ).not.toThrow();
    expect(
      evaluateDetectorPromotion(hostile, { evaluatedAt: NOW }).outcome,
    ).toBe("INCONCLUSIVE");

    const oversized = metrics({
      truePositiveIds: Array.from(
        { length: M45_DETECTOR_LIMITS.maxCases + 1 },
        (_, index) => `tp-${index}`,
      ),
      truePositives: M45_DETECTOR_LIMITS.maxCases + 1,
    });
    expect(
      computeDetectorDifferential(metrics(), oversized, context()).state,
    ).toBe("MALFORMED");
    expect(
      computeDetectorDifferential(
        metrics(),
        metrics({ detectorRevision: 2, truePositives: Number.NaN }),
        context(),
      ).state,
    ).toBe("MALFORMED");
  });

  it("rejects stale metrics and stale holdout evidence as INCONCLUSIVE", () => {
    const staleMetrics = metrics({
      capturedAt: "2020-01-01T00:00:00.000Z",
    });
    const stale = computeDetectorDifferential(
      staleMetrics,
      metrics({ detectorRevision: 2, capturedAt: staleMetrics.capturedAt }),
      context(),
    );
    expect(stale.state).toBe("STALE");

    const request = promotionRequest(
      metrics({ capturedAt: "2020-01-01T00:00:00.000Z" }),
      metrics({
        detectorRevision: 2,
        capturedAt: "2020-01-01T00:00:00.000Z",
      }),
    );
    const result = evaluateDetectorPromotion(request, {
      evaluatedAt: NOW,
      maxEvidenceAgeMs: MAX_AGE,
    });
    expect(result).toMatchObject({
      outcome: "INCONCLUSIVE",
      reason: "STALE_EVIDENCE",
    });

    const staleHoldout = createSealedHoldout(
      {
        schemaVersion: 1,
        holdoutId: "holdout-old",
        candidateId: CANDIDATE_ID,
        detectorId: DETECTOR_ID,
        detectorRevision: 2,
        repositoryId: REPOSITORY_ID,
        trainingCorpusId: "corpus-training",
        corpusId: "corpus-holdout-old",
        corpusDigest: "sha256:corpus-holdout-old",
      },
      "2020-01-01T00:00:00.000Z",
    );
    expect(
      evaluateSealedHoldout(
        staleHoldout.holdout,
        holdoutResult({
          holdoutId: "holdout-old",
          corpusId: "corpus-holdout-old",
          corpusDigest: "sha256:corpus-holdout-old",
          evaluatedAt: "2020-01-01T00:01:00.000Z",
        }),
        {
          candidateId: CANDIDATE_ID,
          detectorId: DETECTOR_ID,
          detectorRevision: 2,
          repositoryId: REPOSITORY_ID,
          evaluatedAt: NOW,
          maxEvidenceAgeMs: MAX_AGE,
        },
        DEFAULT_M45_PROMOTION_POLICY,
      ).outcome,
    ).toBe("INCONCLUSIVE");
  });

  it("rejects foreign candidate, repository, and holdout bindings", () => {
    const foreignMetrics = computeDetectorDifferential(
      metrics(),
      metrics({ detectorRevision: 2, candidateId: "candidate-b" }),
      context(),
    );
    expect(foreignMetrics.state).toBe("FOREIGN");

    const request = promotionRequest(
      metrics(),
      metrics({ detectorRevision: 2, repositoryId: "repository-b" }),
    );
    const result = evaluateDetectorPromotion(request, {
      evaluatedAt: NOW,
      maxEvidenceAgeMs: MAX_AGE,
    });
    expect(result).toMatchObject({
      outcome: "INCONCLUSIVE",
      reason: "FOREIGN_EVIDENCE",
    });

    const foreignHoldout = evaluateSealedHoldout(
      holdout(),
      holdoutResult({ candidateId: "candidate-b" }),
      {
        candidateId: CANDIDATE_ID,
        detectorId: DETECTOR_ID,
        detectorRevision: 2,
        repositoryId: REPOSITORY_ID,
        evaluatedAt: NOW,
        maxEvidenceAgeMs: MAX_AGE,
      },
      DEFAULT_M45_PROMOTION_POLICY,
    );
    expect(foreignHoldout).toMatchObject({
      state: "FOREIGN",
      outcome: "INCONCLUSIVE",
    });
  });
});

describe("M45 rollback and deprecation", () => {
  it("rolls back only to an earlier promoted revision", () => {
    expect(
      planDetectorRollback({
        state: "PROMOTED",
        activeRevision: 2,
        targetRevision: 1,
        reason: "crash regression",
        evidenceId: "rollback-evidence",
      }),
    ).toMatchObject({
      outcome: "APPLIED",
      state: "ROLLED_BACK",
      activeRevision: 1,
    });
    expect(
      planDetectorRollback({
        state: "CANDIDATE",
        activeRevision: 2,
        targetRevision: 1,
        reason: "not promoted",
        evidenceId: "rollback-evidence",
      }).outcome,
    ).toBe("NO_PROMOTION");
  });

  it("requires approval evidence and a future removal date for deprecation", () => {
    const input = {
      state: "PROMOTED" as const,
      detectorId: DETECTOR_ID,
      detectorRevision: 2,
      replacementDetectorId: "QA-DET-002",
      since: "2026-09-25T12:00:00.000Z",
      removeAfter: "2026-10-25T12:00:00.000Z",
      reason: "superseded detector",
      approvalEvidenceRef: "approval-deprecation",
    };
    expect(planDetectorDeprecation(input)).toMatchObject({
      outcome: "APPLIED",
      state: "DEPRECATED",
      replacementDetectorId: "QA-DET-002",
    });
    expect(
      planDetectorDeprecation({ ...input, approvalEvidenceRef: "" }),
    ).toMatchObject({ outcome: "INCONCLUSIVE" });
    expect(
      planDetectorDeprecation({ ...input, removeAfter: input.since }).outcome,
    ).toBe("NO_PROMOTION");
    expect(
      planDetectorRetirement(
        { ...input, state: "DEPRECATED" },
        "2026-10-24T00:00:00.000Z",
      ).outcome,
    ).toBe("NO_PROMOTION");
    expect(
      planDetectorRetirement(
        { ...input, state: "DEPRECATED" },
        "2026-10-26T00:00:00.000Z",
      ).outcome,
    ).toBe("APPLIED");
  });
});
