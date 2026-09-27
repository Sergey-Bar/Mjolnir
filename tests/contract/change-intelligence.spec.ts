import { describe, expect, it } from "vitest";
import {
  calculateAffectedPaths,
  compareSelectedToFull,
  invalidateStaleEvidence,
  M37_CHANGE_INTELLIGENCE_SCHEMA,
  type BoundEvidence,
  type CandidateBinding,
  type ChangeRecord,
  type FullTestEvidence,
  type SelectedTestEvidence,
} from "../../src/change-intelligence.js";

const candidate: CandidateBinding = {
  candidateId: "candidate-37",
  repositoryId: "qa-doctor",
  headSha: "head-37",
  graphDigest: "graph-37",
};

const changes: readonly ChangeRecord[] = [
  {
    kind: "SEMANTIC",
    path: "./src/core.ts",
    change: "MODIFIED",
    semanticKind: "BEHAVIOR",
    certainty: "DETERMINISTIC",
  },
  {
    kind: "DEPENDENCY",
    dependentPath: "src/api.ts",
    dependencyPath: "src/core.ts",
    change: "MODIFIED",
  },
  {
    kind: "DEPENDENCY",
    dependentPath: "tests/api.spec.ts",
    dependencyPath: "src/api.ts",
    change: "ADDED",
  },
];

const selected: SelectedTestEvidence = {
  binding: candidate,
  completeness: "COMPLETE",
  selectorDigest: "selector-37",
  selectedTestIds: ["test:api"],
  deselectedTestIds: ["test:unit"],
  results: [{ testId: "test:api", outcome: "PASSED" }],
};

const full: FullTestEvidence = {
  binding: candidate,
  completeness: "COMPLETE",
  executedAllTests: true,
  results: [
    { testId: "test:unit", outcome: "PASSED" },
    { testId: "test:api", outcome: "PASSED" },
  ],
};

function evidence(overrides: Partial<BoundEvidence> = {}): BoundEvidence {
  return {
    id: "evidence-default",
    binding: candidate,
    completeness: "COMPLETE",
    scopePaths: ["docs/unused.md"],
    ...overrides,
  };
}

describe("M37 change records and affected paths", () => {
  it("calculates deterministic transitive impact for semantic and dependency changes", () => {
    const result = calculateAffectedPaths(changes);

    expect(result).toEqual({
      paths: ["src/api.ts", "src/core.ts", "tests/api.spec.ts"],
      uncertainty: { level: "NONE", reasons: [] },
    });
  });

  it("keeps invalid paths out while exposing uncertainty", () => {
    const result = calculateAffectedPaths([
      {
        kind: "SEMANTIC",
        path: "../outside.ts",
        change: "MODIFIED",
        semanticKind: "BEHAVIOR",
        certainty: "DETERMINISTIC",
      },
      {
        kind: "SEMANTIC",
        path: "src/heuristic.ts",
        change: "MODIFIED",
        semanticKind: "BEHAVIOR",
        certainty: "HEURISTIC",
      },
    ]);

    expect(result.paths).toEqual(["src/heuristic.ts"]);
    expect(result.uncertainty).toEqual({
      level: "HIGH",
      reasons: ["INVALID_CHANGE_PATH", "HEURISTIC_SEMANTIC_CHANGE"],
    });
  });

  it("is independent of record and edge order", () => {
    const reversed = [...changes].reverse();

    expect(calculateAffectedPaths(reversed)).toEqual(
      calculateAffectedPaths(changes),
    );
  });
});

describe("M37 stale-evidence invalidation", () => {
  it("invalidates affected and stale evidence while rejecting foreign or partial evidence", () => {
    const result = invalidateStaleEvidence(
      [
        evidence({ id: "current-unaffected" }),
        evidence({
          id: "affected",
          scopePaths: ["src/core.ts", "docs/unused.md"],
        }),
        evidence({
          id: "stale-head",
          binding: { ...candidate, headSha: "head-36" },
          scopePaths: ["docs/unused.md"],
        }),
        evidence({
          id: "foreign",
          binding: { ...candidate, candidateId: "candidate-36" },
        }),
        evidence({ id: "partial", completeness: "PARTIAL" }),
        evidence({ id: "unbound", scopePaths: [] }),
      ],
      candidate,
      calculateAffectedPaths(changes).paths,
    );

    expect(
      result.map(({ evidenceId, status, reasons }) => ({
        evidenceId,
        status,
        reasons,
      })),
    ).toEqual([
      {
        evidenceId: "affected",
        status: "INVALIDATED",
        reasons: ["AFFECTED_SCOPE"],
      },
      { evidenceId: "current-unaffected", status: "CURRENT", reasons: [] },
      {
        evidenceId: "foreign",
        status: "REJECTED",
        reasons: ["FOREIGN_CANDIDATE"],
      },
      {
        evidenceId: "partial",
        status: "REJECTED",
        reasons: ["PARTIAL_EVIDENCE"],
      },
      {
        evidenceId: "stale-head",
        status: "INVALIDATED",
        reasons: ["STALE_HEAD"],
      },
      {
        evidenceId: "unbound",
        status: "REJECTED",
        reasons: ["UNBOUND_EVIDENCE_SCOPE"],
      },
    ]);
    expect(
      result.find(({ evidenceId }) => evidenceId === "affected")
        ?.invalidatedPaths,
    ).toEqual(["src/core.ts"]);
    expect(
      result.find(({ evidenceId }) => evidenceId === "stale-head")
        ?.invalidatedPaths,
    ).toEqual(["docs/unused.md"]);
  });

  it("orders invalidations deterministically", () => {
    const records = [
      evidence({ id: "z" }),
      evidence({
        id: "a",
        binding: { ...candidate, graphDigest: "old-graph" },
      }),
      evidence({ id: "m", completeness: "PARTIAL" }),
    ];

    expect(
      invalidateStaleEvidence(records, candidate, ["src/core.ts"]),
    ).toEqual(
      invalidateStaleEvidence([...records].reverse(), candidate, [
        "src/core.ts",
      ]),
    );
  });
});

describe("M37 selected-vs-full differential", () => {
  it("proves candidate-bound equivalence only with complete full evidence", () => {
    const result = compareSelectedToFull(candidate, selected, full);

    expect(result).toEqual({
      schemaVersion: M37_CHANGE_INTELLIGENCE_SCHEMA,
      verdict: "EQUIVALENT",
      candidate,
      selectorDigest: "selector-37",
      selectedTestIds: ["test:api"],
      deselectedTestIds: ["test:unit"],
      fullTestIds: ["test:api", "test:unit"],
      differences: [],
      aggregate: {
        selected: "PASSED",
        full: "PASSED",
        equivalent: true,
        deselectedFailures: [],
      },
      uncertainty: { level: "NONE", reasons: [] },
    });
  });

  it("never proves equivalence without full evidence", () => {
    const result = compareSelectedToFull(candidate, selected);

    expect(result.verdict).toBe("INCONCLUSIVE");
    expect(result.uncertainty).toEqual({
      level: "HIGH",
      reasons: ["FULL_EVIDENCE_MISSING"],
    });
    expect(result.aggregate.equivalent).toBe(false);
  });

  it("rejects foreign, stale, and partial evidence", () => {
    const foreign = compareSelectedToFull(
      candidate,
      { ...selected, binding: { ...candidate, repositoryId: "other-repo" } },
      full,
    );
    const stale = compareSelectedToFull(candidate, selected, {
      ...full,
      binding: { ...candidate, graphDigest: "old-graph" },
    });
    const partial = compareSelectedToFull(candidate, selected, {
      ...full,
      completeness: "PARTIAL",
      executedAllTests: false,
    });

    expect(foreign.verdict).toBe("REJECTED");
    expect(foreign.uncertainty.reasons).toContain("FOREIGN_REPOSITORY");
    expect(stale.verdict).toBe("REJECTED");
    expect(stale.uncertainty.reasons).toContain("STALE_GRAPH");
    expect(partial.verdict).toBe("REJECTED");
    expect(partial.uncertainty.reasons).toEqual(
      expect.arrayContaining(["PARTIAL_EVIDENCE", "FULL_EVIDENCE_INCOMPLETE"]),
    );
  });

  it("reports differential failures instead of equivalence", () => {
    const hiddenFailure = compareSelectedToFull(candidate, selected, {
      ...full,
      results: [
        { testId: "test:unit", outcome: "FAILED" },
        { testId: "test:api", outcome: "PASSED" },
      ],
    });
    const outcomeMismatch = compareSelectedToFull(
      candidate,
      {
        ...selected,
        results: [{ testId: "test:api", outcome: "FAILED" }],
      },
      full,
    );

    expect(hiddenFailure.verdict).toBe("DIVERGENT");
    expect(hiddenFailure.aggregate.deselectedFailures).toEqual(["test:unit"]);
    expect(outcomeMismatch.verdict).toBe("DIVERGENT");
    expect(outcomeMismatch.differences).toEqual([
      { testId: "test:api", selected: "FAILED", full: "PASSED" },
    ]);
  });

  it("rejects incomplete selection manifests", () => {
    const result = compareSelectedToFull(candidate, selected, {
      ...full,
      results: [
        ...full.results,
        { testId: "test:unclassified", outcome: "PASSED" },
      ],
    });

    expect(result.verdict).toBe("REJECTED");
    expect(result.uncertainty.reasons).toContain("INCOMPLETE_TEST_MANIFEST");
  });

  it("is deterministic under test and evidence ordering changes", () => {
    const reorderedSelected: SelectedTestEvidence = {
      ...selected,
      deselectedTestIds: ["test:z", "test:a"],
      selectedTestIds: ["test:z", "test:a"],
      results: [
        { testId: "test:z", outcome: "PASSED" },
        { testId: "test:a", outcome: "PASSED" },
      ],
    };
    const reorderedFull: FullTestEvidence = {
      ...full,
      results: [
        { testId: "test:z", outcome: "PASSED" },
        { testId: "test:a", outcome: "PASSED" },
      ],
    };

    expect(
      compareSelectedToFull(candidate, reorderedSelected, reorderedFull),
    ).toEqual(
      compareSelectedToFull(
        candidate,
        {
          ...reorderedSelected,
          selectedTestIds: [...reorderedSelected.selectedTestIds].reverse(),
          deselectedTestIds: [...reorderedSelected.deselectedTestIds].reverse(),
          results: [...reorderedSelected.results].reverse(),
        },
        {
          ...reorderedFull,
          results: [...reorderedFull.results].reverse(),
        },
      ),
    );
  });
});
