import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  M47_FALSE_GREEN_ATTACKS,
  M47_FALSE_GREEN_BENCHMARK_LIMITS,
  M47_FALSE_GREEN_BENCHMARK_MANIFEST,
  M47_FALSE_GREEN_CORPUS,
  M47_FALSE_GREEN_CORPUS_DIGEST,
  M47_FALSE_GREEN_CORPUS_SCHEMA,
  M47_FALSE_GREEN_CORPUS_VERSION,
  M47_FALSE_GREEN_DIFFICULTIES,
  M47_FALSE_GREEN_LANGUAGES,
  canonicalM47Json,
  evaluateM47FalseGreenBenchmark,
  validateM47FalseGreenCorpus,
  verifyM47FalseGreenBenchmarkResult,
  type M47BenchmarkContext,
  type M47BenchmarkObservation,
  type M47RateEstimate,
} from "../../src/benchmark/m47-false-green-benchmark.js";

const PINNED_CORPUS_DIGEST =
  "sha256:16eff23a0e7d86ad0706740637dbe2bff85b396b2dc4b6b54635f39c3b6f466f";

const CONTEXT: M47BenchmarkContext = {
  candidateId: "candidate-a",
  candidateRevision: "revision-a",
  detectorVersion: "detector-a",
  evaluatedAt: "2026-01-02T00:00:00.000Z",
};

function observations(): M47BenchmarkObservation[] {
  return M47_FALSE_GREEN_CORPUS.cases.map((item) => {
    const missed =
      item.truth === "ATTACK" &&
      item.attack === "unexecuted-verification" &&
      item.language === "typescript" &&
      item.difficulty === "compound";
    const falsePositive =
      item.truth === "CONTROL" &&
      item.language === "typescript" &&
      item.difficulty === "direct";
    return {
      caseId: item.id,
      candidateId: CONTEXT.candidateId,
      candidateRevision: CONTEXT.candidateRevision,
      detectorVersion: CONTEXT.detectorVersion,
      corpusVersion: M47_FALSE_GREEN_CORPUS_VERSION,
      observedAt: "2026-01-01T23:59:59.000Z",
      outcome: missed
        ? "NO_ALERT"
        : falsePositive || item.truth === "CONTROL"
          ? "NO_ALERT"
          : "ALERT",
    };
  });
}

function firstObservation(
  items: readonly M47BenchmarkObservation[],
): M47BenchmarkObservation {
  const first = items[0];
  if (first === undefined) throw new Error("Benchmark fixture is empty");
  return first;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new TypeError("Unsupported test value");
    return encoded;
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`);
  return `{${entries.join(",")}}`;
}

function digest(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(stableJson(value), "utf8")
    .digest("hex")}`;
}

function wilson(successes: number, trials: number) {
  if (trials === 0) return { rate: null, lower: null, upper: null };
  const z = 1.959_963_984_540_054;
  const proportion = successes / trials;
  const z2 = z * z;
  const denominator = 1 + z2 / trials;
  const center = (proportion + z2 / (2 * trials)) / denominator;
  const margin =
    (z *
      Math.sqrt((proportion * (1 - proportion) + z2 / (4 * trials)) / trials)) /
    denominator;
  const round = (input: number) =>
    Math.round((input + Number.EPSILON) * 1_000_000) / 1_000_000;
  return {
    rate: round(proportion),
    lower: round(Math.max(0, center - margin)),
    upper: round(Math.min(1, center + margin)),
  };
}

function observationSetDigest(
  items: readonly M47BenchmarkObservation[],
): string {
  return digest(items.map((item) => stableJson(item)).sort());
}

function independentEstimate(
  successes: number,
  trials: number,
): M47RateEstimate {
  const interval = wilson(successes, trials);
  return {
    numerator: successes,
    denominator: trials,
    rate: interval.rate,
    uncertainty: {
      method: "WILSON_SCORE_95",
      confidenceLevel: 0.95,
      lower: interval.lower,
      upper: interval.upper,
    },
  };
}

function independentCounts(items: M47BenchmarkObservation[]) {
  const byId = new Map(
    items.map((item) => [
      item.caseId,
      M47_FALSE_GREEN_CORPUS.cases.find(
        (candidate) => candidate.id === item.caseId,
      ),
    ]),
  );
  const counts = {
    truePositive: 0,
    falsePositive: 0,
    falseNegative: 0,
    trueNegative: 0,
  };
  for (const observation of items) {
    const item = byId.get(observation.caseId);
    if (item?.truth === "ATTACK" && observation.outcome === "ALERT") {
      counts.truePositive += 1;
    } else if (item?.truth === "ATTACK" && observation.outcome === "NO_ALERT") {
      counts.falseNegative += 1;
    } else if (item?.truth === "CONTROL" && observation.outcome === "ALERT") {
      counts.falsePositive += 1;
    } else if (
      item?.truth === "CONTROL" &&
      observation.outcome === "NO_ALERT"
    ) {
      counts.trueNegative += 1;
    }
  }
  return counts;
}

describe("M47 bounded false-green benchmark contract", () => {
  it("pins a versioned local-only manifest and complete denominator cells", () => {
    expect(M47_FALSE_GREEN_BENCHMARK_MANIFEST).toMatchObject({
      schema: "m47.false-green-benchmark@1",
      version: "1.0.0",
      claimStatus: "NOT_CLAIMED",
      execution: {
        mode: "LOCAL_ONLY",
        network: "FORBIDDEN",
        wiring: "UNWIRED",
      },
      denominators: {
        axes: ["attack", "language", "difficulty"],
        requiredCells: 18,
        minimumCasesPerCell: 2,
      },
    });
    expect(M47_FALSE_GREEN_CORPUS.schema).toBe(M47_FALSE_GREEN_CORPUS_SCHEMA);
    expect(M47_FALSE_GREEN_CORPUS.version).toBe(M47_FALSE_GREEN_CORPUS_VERSION);
    expect(M47_FALSE_GREEN_CORPUS.claimStatus).toBe("NOT_CLAIMED");
    expect(M47_FALSE_GREEN_CORPUS_DIGEST).toBe(PINNED_CORPUS_DIGEST);
    expect(M47_FALSE_GREEN_CORPUS.cases).toHaveLength(36);
    expect(Object.isFrozen(M47_FALSE_GREEN_BENCHMARK_MANIFEST)).toBe(true);
    expect(Object.isFrozen(M47_FALSE_GREEN_CORPUS)).toBe(true);
    expect(Object.isFrozen(M47_FALSE_GREEN_CORPUS.cases[0])).toBe(true);
    expect(validateM47FalseGreenCorpus(M47_FALSE_GREEN_CORPUS)).toEqual({
      valid: true,
      violations: [],
    });
    for (const attack of M47_FALSE_GREEN_ATTACKS) {
      for (const language of M47_FALSE_GREEN_LANGUAGES) {
        for (const difficulty of M47_FALSE_GREEN_DIFFICULTIES) {
          expect(
            M47_FALSE_GREEN_CORPUS.cases.filter(
              (item) =>
                item.attack === attack &&
                item.language === language &&
                item.difficulty === difficulty,
            ),
          ).toHaveLength(2);
        }
      }
    }
  });

  it("reproduces byte-identical local results independent of input order", () => {
    const submitted = observations();
    const forward = evaluateM47FalseGreenBenchmark(submitted, CONTEXT);
    const reverse = evaluateM47FalseGreenBenchmark(
      [...submitted].reverse(),
      CONTEXT,
    );

    expect(forward).toEqual(reverse);
    expect(forward.integrity).toBe("COMPLETE");
    expect(forward.claimStatus).toBe("NOT_CLAIMED");
    const { resultDigest, ...resultBody } = forward;
    expect(resultDigest).toBe(digest(resultBody));
    expect(forward.reproduction.observationsDigest).toBe(
      observationSetDigest(submitted),
    );
    expect(forward.reproduction.corpusDigest).toBe(
      M47_FALSE_GREEN_CORPUS_DIGEST,
    );
    expect(verifyM47FalseGreenBenchmarkResult(forward)).toBe(true);
    expect(
      verifyM47FalseGreenBenchmarkResult({ ...forward, integrity: "INVALID" }),
    ).toBe(false);
    expect(canonicalM47Json({ b: 1, a: [2, { d: 4, c: 3 }] })).toBe(
      stableJson({ b: 1, a: [2, { d: 4, c: 3 }] }),
    );
  });

  it("computes denominators and Wilson uncertainty per attack, language, and difficulty", () => {
    const submitted = observations();
    const result = evaluateM47FalseGreenBenchmark(submitted, CONTEXT);
    const overall = result.denominators?.overall;
    const counts = independentCounts(submitted);

    expect(Object.keys(result.denominators?.byAttack ?? {})).toEqual([
      ...M47_FALSE_GREEN_ATTACKS,
    ]);
    expect(Object.keys(result.denominators?.byLanguage ?? {})).toEqual([
      ...M47_FALSE_GREEN_LANGUAGES,
    ]);
    expect(Object.keys(result.denominators?.byDifficulty ?? {})).toEqual([
      ...M47_FALSE_GREEN_DIFFICULTIES,
    ]);
    expect(overall).toMatchObject({
      plannedCases: 36,
      observedCases: 36,
      uncoveredCases: 0,
      plannedAttacks: 18,
      observedAttacks: 18,
      plannedControls: 18,
      observedControls: 18,
      ...counts,
    });
    expect(overall?.precision).toEqual(
      independentEstimate(
        counts.truePositive,
        counts.truePositive + counts.falsePositive,
      ),
    );
    expect(overall?.falseNegativeRate).toEqual(
      independentEstimate(
        counts.falseNegative,
        counts.falseNegative + counts.truePositive,
      ),
    );
    expect(overall?.missedCaseIds).toEqual([
      "m47-unexecuted-verification-typescript-compound-attack",
    ]);
    for (const slice of Object.values(result.denominators?.byAttack ?? {})) {
      expect(slice.plannedCases).toBe(12);
      expect(slice.observedCases).toBe(12);
    }
    for (const slice of Object.values(result.denominators?.byLanguage ?? {})) {
      expect(slice.plannedCases).toBe(12);
      expect(slice.observedCases).toBe(12);
    }
    for (const slice of Object.values(
      result.denominators?.byDifficulty ?? {},
    )) {
      expect(slice.plannedCases).toBe(18);
      expect(slice.observedCases).toBe(18);
    }
  });

  it("keeps uncovered cells and cases out of denominators", () => {
    const submitted = observations().slice(1);
    const missingId = M47_FALSE_GREEN_CORPUS.cases[0]?.id;
    const missingCase = M47_FALSE_GREEN_CORPUS.cases[0];
    const result = evaluateM47FalseGreenBenchmark(submitted, CONTEXT);

    expect(result.integrity).toBe("INCOMPLETE");
    expect(result.uncoveredCaseIds).toEqual([missingId]);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNCOVERED_CASE",
          caseId: missingId,
        }),
      ]),
    );
    expect(result.denominators?.overall.uncoveredCases).toBe(1);
    expect(result.denominators?.overall.observedCases).toBe(35);
    expect(
      result.denominators?.byAttack[missingCase?.attack ?? "suppressed-failure"]
        .uncoveredCases,
    ).toBe(1);
  });

  it("rejects malformed inputs without producing a claim", () => {
    const malformedObservation = evaluateM47FalseGreenBenchmark([42], CONTEXT);
    const malformedSet = evaluateM47FalseGreenBenchmark(null, CONTEXT);
    const malformedContext = evaluateM47FalseGreenBenchmark(
      observations(),
      null,
    );

    expect(malformedObservation.integrity).toBe("INCOMPLETE");
    expect(malformedObservation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MALFORMED_OBSERVATION" }),
        expect.objectContaining({ code: "UNCOVERED_CASE" }),
      ]),
    );
    expect(malformedSet.integrity).toBe("INVALID");
    expect(malformedSet.denominators).toBeNull();
    expect(malformedSet.claimStatus).toBe("NOT_CLAIMED");
    expect(malformedContext.integrity).toBe("INVALID");
    expect(malformedContext.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MALFORMED_CONTEXT" }),
      ]),
    );
    expect(validateM47FalseGreenCorpus(null).valid).toBe(false);
  });

  it("rejects duplicate observations and exposes the uncovered case", () => {
    const submitted = observations();
    const first = firstObservation(submitted);
    const duplicateId = first.caseId;
    const result = evaluateM47FalseGreenBenchmark(
      [...submitted, { ...first }],
      CONTEXT,
    );

    expect(result.integrity).toBe("INCOMPLETE");
    expect(result.uncoveredCaseIds).toEqual([duplicateId]);
    expect(
      result.issues.filter((item) => item.code === "DUPLICATE_OBSERVATION"),
    ).toHaveLength(2);
    expect(result.validObservationCount).toBe(35);
  });

  it("rejects foreign candidate evidence", () => {
    const submitted = observations();
    const foreignId = firstObservation(submitted).caseId;
    submitted[0] = {
      ...firstObservation(submitted),
      candidateId: "candidate-b",
    };
    const result = evaluateM47FalseGreenBenchmark(submitted, CONTEXT);

    expect(result.integrity).toBe("INCOMPLETE");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "FOREIGN_EVIDENCE",
          caseId: foreignId,
        }),
      ]),
    );
    expect(result.uncoveredCaseIds).toEqual([foreignId]);
  });

  it("rejects stale evidence and does not count it as a detection", () => {
    const submitted = observations();
    const staleId = firstObservation(submitted).caseId;
    submitted[0] = {
      ...firstObservation(submitted),
      observedAt: "2025-12-31T23:59:58.000Z",
    };
    const result = evaluateM47FalseGreenBenchmark(submitted, CONTEXT);

    expect(result.integrity).toBe("INCOMPLETE");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "STALE_EVIDENCE", caseId: staleId }),
      ]),
    );
    expect(result.denominators?.overall.observedCases).toBe(35);
    expect(result.claimStatus).toBe("NOT_CLAIMED");
  });

  it("enforces observation bounds and unknown-case guards", () => {
    const submitted = observations();
    const first = firstObservation(submitted);
    const excessive = Array.from(
      { length: M47_FALSE_GREEN_BENCHMARK_LIMITS.maxObservations + 1 },
      () => first,
    );
    const bounded = evaluateM47FalseGreenBenchmark(excessive, CONTEXT);
    const unknown = evaluateM47FalseGreenBenchmark(
      [{ ...first, caseId: "foreign-case" }],
      CONTEXT,
    );
    const duplicateCorpus = {
      ...M47_FALSE_GREEN_CORPUS,
      cases: [...M47_FALSE_GREEN_CORPUS.cases, M47_FALSE_GREEN_CORPUS.cases[0]],
    };
    const uncoveredCorpus = {
      ...M47_FALSE_GREEN_CORPUS,
      cases: M47_FALSE_GREEN_CORPUS.cases.slice(1),
    };

    expect(bounded.integrity).toBe("INCOMPLETE");
    expect(bounded.unprocessedObservationCount).toBe(1);
    expect(bounded.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "RESOURCE_LIMIT" }),
      ]),
    );
    expect(unknown.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNKNOWN_CASE",
          caseId: "foreign-case",
        }),
      ]),
    );
    expect(
      validateM47FalseGreenCorpus(duplicateCorpus).violations.map(
        (item) => item.code,
      ),
    ).toContain("DUPLICATE_CASE_ID");
    expect(
      validateM47FalseGreenCorpus(uncoveredCorpus).violations.map(
        (item) => item.code,
      ),
    ).toContain("UNCOVERED_CELL");
  });
});
