export const M37_CHANGE_INTELLIGENCE_SCHEMA =
  "m37.change-intelligence@1" as const;

export type FileChangeKind = "ADDED" | "MODIFIED" | "DELETED";
export type SemanticChangeKind =
  "BEHAVIOR" | "INTERFACE" | "CONFIGURATION" | "UNKNOWN";
export type ChangeCertainty = "DETERMINISTIC" | "HEURISTIC" | "UNKNOWN";

export interface SemanticChangeRecord {
  readonly kind: "SEMANTIC";
  readonly path: string;
  readonly change: FileChangeKind;
  readonly semanticKind: SemanticChangeKind;
  readonly certainty: ChangeCertainty;
}

export interface DependencyChangeRecord {
  readonly kind: "DEPENDENCY";
  readonly dependentPath: string;
  readonly dependencyPath: string;
  readonly change: "ADDED" | "MODIFIED" | "REMOVED";
}

export type ChangeRecord = SemanticChangeRecord | DependencyChangeRecord;

export interface CandidateBinding {
  readonly candidateId: string;
  readonly repositoryId: string;
  readonly headSha: string;
  readonly graphDigest: string;
}

export type EvidenceCompleteness = "COMPLETE" | "PARTIAL";

export interface BoundEvidence {
  readonly id: string;
  readonly binding: CandidateBinding;
  readonly completeness: EvidenceCompleteness;
  readonly scopePaths: readonly string[];
}

export type EvidenceInvalidationReason =
  | "INVALID_CANDIDATE_BINDING"
  | "FOREIGN_CANDIDATE"
  | "FOREIGN_REPOSITORY"
  | "STALE_HEAD"
  | "STALE_GRAPH"
  | "AFFECTED_SCOPE"
  | "PARTIAL_EVIDENCE"
  | "UNBOUND_EVIDENCE_SCOPE";

export type EvidenceInvalidationStatus = "CURRENT" | "INVALIDATED" | "REJECTED";

export interface EvidenceInvalidation {
  readonly evidenceId: string;
  readonly status: EvidenceInvalidationStatus;
  readonly candidate: CandidateBinding;
  readonly invalidatedPaths: readonly string[];
  readonly reasons: readonly EvidenceInvalidationReason[];
}

export type UncertaintyReason =
  | "INVALID_CHANGE_PATH"
  | "HEURISTIC_SEMANTIC_CHANGE"
  | "UNKNOWN_SEMANTIC_CHANGE"
  | "INVALID_CANDIDATE_BINDING"
  | "FOREIGN_CANDIDATE"
  | "FOREIGN_REPOSITORY"
  | "STALE_HEAD"
  | "STALE_GRAPH"
  | "PARTIAL_EVIDENCE"
  | "UNBOUND_EVIDENCE_SCOPE"
  | "FULL_EVIDENCE_MISSING"
  | "UNBOUND_SELECTOR"
  | "INCOMPLETE_TEST_MANIFEST"
  | "FULL_EVIDENCE_INCOMPLETE"
  | "EMPTY_TEST_SET";

export interface UncertaintyReport {
  readonly level: "NONE" | "LOW" | "HIGH";
  readonly reasons: readonly UncertaintyReason[];
}

export interface AffectedPathsResult {
  readonly paths: readonly string[];
  readonly uncertainty: UncertaintyReport;
}

const UNCERTAINTY_ORDER = [
  "INVALID_CHANGE_PATH",
  "HEURISTIC_SEMANTIC_CHANGE",
  "UNKNOWN_SEMANTIC_CHANGE",
  "INVALID_CANDIDATE_BINDING",
  "FOREIGN_CANDIDATE",
  "FOREIGN_REPOSITORY",
  "STALE_HEAD",
  "STALE_GRAPH",
  "PARTIAL_EVIDENCE",
  "UNBOUND_EVIDENCE_SCOPE",
  "FULL_EVIDENCE_MISSING",
  "UNBOUND_SELECTOR",
  "INCOMPLETE_TEST_MANIFEST",
  "FULL_EVIDENCE_INCOMPLETE",
  "EMPTY_TEST_SET",
] as const satisfies readonly UncertaintyReason[];

const HIGH_UNCERTAINTY = new Set<UncertaintyReason>([
  "INVALID_CHANGE_PATH",
  "UNKNOWN_SEMANTIC_CHANGE",
  "INVALID_CANDIDATE_BINDING",
  "FOREIGN_CANDIDATE",
  "FOREIGN_REPOSITORY",
  "STALE_HEAD",
  "STALE_GRAPH",
  "PARTIAL_EVIDENCE",
  "UNBOUND_EVIDENCE_SCOPE",
  "FULL_EVIDENCE_MISSING",
  "UNBOUND_SELECTOR",
  "INCOMPLETE_TEST_MANIFEST",
  "FULL_EVIDENCE_INCOMPLETE",
  "EMPTY_TEST_SET",
]);

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function uncertainty(
  reasons: ReadonlySet<UncertaintyReason>,
): UncertaintyReport {
  const ordered = UNCERTAINTY_ORDER.filter((reason) => reasons.has(reason));
  const level =
    ordered.length === 0
      ? "NONE"
      : ordered.some((reason) => HIGH_UNCERTAINTY.has(reason))
        ? "HIGH"
        : "LOW";
  return { level, reasons: ordered };
}

function normalizeRepoPath(value: string): string | undefined {
  let normalized = value.trim().replaceAll("\\", "/");
  while (normalized.startsWith("./")) normalized = normalized.slice(2);
  if (normalized.length === 0 || normalized.startsWith("/")) return undefined;
  if (
    normalized.length >= 3 &&
    normalized[0] !== undefined &&
    normalized[1] === ":" &&
    normalized[2] === "/"
  ) {
    return undefined;
  }
  const parts = normalized.split("/");
  if (
    parts.some((part) => part.length === 0 || part === "." || part === "..")
  ) {
    return undefined;
  }
  return parts.join("/");
}

function canonicalIds(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
    compareText,
  );
}

export function calculateAffectedPaths(
  changes: readonly ChangeRecord[],
): AffectedPathsResult {
  const uncertaintyReasons = new Set<UncertaintyReason>();
  const affected = new Set<string>();
  const dependents = new Map<string, Set<string>>();

  for (const change of changes) {
    if (change.kind === "SEMANTIC") {
      const path = normalizeRepoPath(change.path);
      if (path === undefined) {
        uncertaintyReasons.add("INVALID_CHANGE_PATH");
        continue;
      }
      if (change.semanticKind === "UNKNOWN" || change.certainty === "UNKNOWN") {
        uncertaintyReasons.add("UNKNOWN_SEMANTIC_CHANGE");
      } else if (change.certainty === "HEURISTIC") {
        uncertaintyReasons.add("HEURISTIC_SEMANTIC_CHANGE");
      }
      affected.add(path);
      continue;
    }

    const dependentPath = normalizeRepoPath(change.dependentPath);
    const dependencyPath = normalizeRepoPath(change.dependencyPath);
    if (dependentPath === undefined || dependencyPath === undefined) {
      uncertaintyReasons.add("INVALID_CHANGE_PATH");
      continue;
    }
    affected.add(dependentPath);
    affected.add(dependencyPath);
    const paths = dependents.get(dependencyPath) ?? new Set<string>();
    paths.add(dependentPath);
    dependents.set(dependencyPath, paths);
  }

  const queue = [...affected];
  for (let index = 0; index < queue.length; index += 1) {
    const path = queue[index];
    if (path === undefined) continue;
    for (const dependentPath of dependents.get(path) ?? []) {
      if (affected.has(dependentPath)) continue;
      affected.add(dependentPath);
      queue.push(dependentPath);
    }
  }

  return {
    paths: [...affected].sort(compareText),
    uncertainty: uncertainty(uncertaintyReasons),
  };
}

function validBinding(binding: CandidateBinding): boolean {
  return (
    binding.candidateId.trim().length > 0 &&
    binding.repositoryId.trim().length > 0 &&
    binding.headSha.trim().length > 0 &&
    binding.graphDigest.trim().length > 0
  );
}

function addBindingProblems(
  actual: CandidateBinding,
  expected: CandidateBinding,
  reasons: Set<UncertaintyReason>,
): void {
  if (!validBinding(expected)) {
    reasons.add("INVALID_CANDIDATE_BINDING");
    return;
  }
  if (actual.candidateId !== expected.candidateId) {
    reasons.add("FOREIGN_CANDIDATE");
  }
  if (actual.repositoryId !== expected.repositoryId) {
    reasons.add("FOREIGN_REPOSITORY");
  }
  if (actual.headSha !== expected.headSha) reasons.add("STALE_HEAD");
  if (actual.graphDigest !== expected.graphDigest) reasons.add("STALE_GRAPH");
}

function normalizeScope(paths: readonly string[]): string[] | undefined {
  if (paths.length === 0) return undefined;
  const normalized: string[] = [];
  for (const path of paths) {
    const value = normalizeRepoPath(path);
    if (value === undefined) return undefined;
    normalized.push(value);
  }
  return canonicalIds(normalized);
}

export function invalidateStaleEvidence(
  evidence: readonly BoundEvidence[],
  candidate: CandidateBinding,
  affectedPaths: readonly string[],
): EvidenceInvalidation[] {
  const affected = new Set(canonicalIds(affectedPaths));
  const candidateValid = validBinding(candidate);

  return [...evidence]
    .sort((left, right) => compareText(left.id, right.id))
    .map((item): EvidenceInvalidation => {
      const foreignCandidate =
        item.binding.candidateId !== candidate.candidateId;
      const foreignRepository =
        item.binding.repositoryId !== candidate.repositoryId;
      const staleHead = item.binding.headSha !== candidate.headSha;
      const staleGraph = item.binding.graphDigest !== candidate.graphDigest;
      const reasons: EvidenceInvalidationReason[] = [];
      if (!candidateValid) reasons.push("INVALID_CANDIDATE_BINDING");
      if (foreignCandidate) reasons.push("FOREIGN_CANDIDATE");
      if (foreignRepository) reasons.push("FOREIGN_REPOSITORY");
      if (staleHead) reasons.push("STALE_HEAD");
      if (staleGraph) reasons.push("STALE_GRAPH");

      const scope = normalizeScope(item.scopePaths);
      if (scope === undefined) reasons.push("UNBOUND_EVIDENCE_SCOPE");
      if (item.completeness === "PARTIAL") reasons.push("PARTIAL_EVIDENCE");

      const stale = staleHead || staleGraph;
      const impacted = (scope ?? []).filter((path) => affected.has(path));
      if (impacted.length > 0) reasons.push("AFFECTED_SCOPE");

      const rejected =
        !candidateValid ||
        foreignCandidate ||
        foreignRepository ||
        item.completeness === "PARTIAL" ||
        scope === undefined;
      const invalidatedPaths = rejected ? [] : stale ? scope : impacted;

      return {
        evidenceId: item.id,
        status: rejected
          ? "REJECTED"
          : stale || impacted.length > 0
            ? "INVALIDATED"
            : "CURRENT",
        candidate,
        invalidatedPaths,
        reasons,
      };
    });
}

export type TestOutcome = "PASSED" | "FAILED";

export interface TestExecutionResult {
  readonly testId: string;
  readonly outcome: TestOutcome;
}

export interface SelectedTestEvidence {
  readonly binding: CandidateBinding;
  readonly completeness: EvidenceCompleteness;
  readonly selectorDigest: string;
  readonly selectedTestIds: readonly string[];
  readonly deselectedTestIds: readonly string[];
  readonly results: readonly TestExecutionResult[];
}

export interface FullTestEvidence {
  readonly binding: CandidateBinding;
  readonly completeness: EvidenceCompleteness;
  readonly executedAllTests: boolean;
  readonly results: readonly TestExecutionResult[];
}

export type DifferentialVerdict =
  "EQUIVALENT" | "DIVERGENT" | "INCONCLUSIVE" | "REJECTED";

export interface TestOutcomeDifference {
  readonly testId: string;
  readonly selected: TestOutcome;
  readonly full: TestOutcome;
}

export interface DifferentialAggregate {
  readonly selected: "PASSED" | "FAILED" | null;
  readonly full: "PASSED" | "FAILED" | null;
  readonly equivalent: boolean;
  readonly deselectedFailures: readonly string[];
}

export interface SelectedVsFullDifferential {
  readonly schemaVersion: typeof M37_CHANGE_INTELLIGENCE_SCHEMA;
  readonly verdict: DifferentialVerdict;
  readonly candidate: CandidateBinding;
  readonly selectorDigest: string;
  readonly selectedTestIds: readonly string[];
  readonly deselectedTestIds: readonly string[];
  readonly fullTestIds: readonly string[];
  readonly differences: readonly TestOutcomeDifference[];
  readonly aggregate: DifferentialAggregate;
  readonly uncertainty: UncertaintyReport;
}

interface IdInventory {
  readonly ids: string[];
  readonly set: ReadonlySet<string>;
  readonly duplicate: boolean;
  readonly invalid: boolean;
}

function inventoryIds(values: readonly string[]): IdInventory {
  const ids = values.map((value) => value.trim());
  const set = new Set(ids.filter(Boolean));
  return {
    ids: [...set].sort(compareText),
    set,
    duplicate: set.size !== ids.filter(Boolean).length,
    invalid: ids.some((value) => value.length === 0),
  };
}

interface ResultInventory {
  readonly map: ReadonlyMap<string, TestOutcome>;
  readonly ids: string[];
  readonly duplicate: boolean;
  readonly invalid: boolean;
}

function inventoryResults(
  results: readonly TestExecutionResult[],
): ResultInventory {
  const map = new Map<string, TestOutcome>();
  let duplicate = false;
  let invalid = false;
  for (const result of results) {
    const id = result.testId.trim();
    if (
      id.length === 0 ||
      (result.outcome !== "PASSED" && result.outcome !== "FAILED")
    ) {
      invalid = true;
      continue;
    }
    if (map.has(id)) duplicate = true;
    map.set(id, result.outcome);
  }
  return {
    map,
    ids: [...map.keys()].sort(compareText),
    duplicate,
    invalid,
  };
}

function aggregate(
  results: readonly TestExecutionResult[],
): "PASSED" | "FAILED" | null {
  if (results.length === 0) return null;
  let valid = true;
  let failed = false;
  for (const result of results) {
    if (result.testId.trim().length === 0) valid = false;
    if (result.outcome === "FAILED") failed = true;
    if (result.outcome !== "PASSED" && result.outcome !== "FAILED")
      valid = false;
  }
  return valid ? (failed ? "FAILED" : "PASSED") : null;
}

function differentialResult(input: {
  readonly candidate: CandidateBinding;
  readonly verdict: DifferentialVerdict;
  readonly selected: SelectedTestEvidence;
  readonly selectedTestIds: readonly string[];
  readonly deselectedTestIds: readonly string[];
  readonly fullTestIds: readonly string[];
  readonly differences?: readonly TestOutcomeDifference[];
  readonly selectedAggregate: "PASSED" | "FAILED" | null;
  readonly fullAggregate: "PASSED" | "FAILED" | null;
  readonly equivalent: boolean;
  readonly deselectedFailures?: readonly string[];
  readonly uncertainty: UncertaintyReport;
}): SelectedVsFullDifferential {
  return {
    schemaVersion: M37_CHANGE_INTELLIGENCE_SCHEMA,
    verdict: input.verdict,
    candidate: input.candidate,
    selectorDigest: input.selected.selectorDigest,
    selectedTestIds: input.selectedTestIds,
    deselectedTestIds: input.deselectedTestIds,
    fullTestIds: input.fullTestIds,
    differences: input.differences ?? [],
    aggregate: {
      selected: input.selectedAggregate,
      full: input.fullAggregate,
      equivalent: input.equivalent,
      deselectedFailures: input.deselectedFailures ?? [],
    },
    uncertainty: input.uncertainty,
  };
}

export function compareSelectedToFull(
  candidate: CandidateBinding,
  selected: SelectedTestEvidence,
  full?: FullTestEvidence,
): SelectedVsFullDifferential {
  const reasons = new Set<UncertaintyReason>();
  addBindingProblems(selected.binding, candidate, reasons);
  if (selected.completeness === "PARTIAL") reasons.add("PARTIAL_EVIDENCE");

  const selectedIds = inventoryIds(selected.selectedTestIds);
  const deselectedIds = inventoryIds(selected.deselectedTestIds);
  const selectedResults = inventoryResults(selected.results);
  if (
    selectedIds.duplicate ||
    selectedIds.invalid ||
    deselectedIds.duplicate ||
    deselectedIds.invalid ||
    selectedResults.duplicate ||
    selectedResults.invalid
  ) {
    reasons.add("INCOMPLETE_TEST_MANIFEST");
  }
  for (const testId of selectedIds.set) {
    if (deselectedIds.set.has(testId)) reasons.add("INCOMPLETE_TEST_MANIFEST");
  }
  if (
    selectedResults.ids.length !== selectedIds.set.size ||
    selectedIds.set.size !== selectedResults.map.size ||
    selectedIds.ids.some((testId) => !selectedResults.map.has(testId))
  ) {
    reasons.add("INCOMPLETE_TEST_MANIFEST");
  }
  if (selectedIds.ids.length === 0) reasons.add("EMPTY_TEST_SET");
  if (selected.selectorDigest.trim().length === 0) {
    reasons.add("UNBOUND_SELECTOR");
  }

  const selectedAggregate = aggregate(selected.results);
  if (full === undefined) {
    if (reasons.size > 0) {
      return differentialResult({
        candidate,
        verdict: "REJECTED",
        selected,
        selectedTestIds: selectedIds.ids,
        deselectedTestIds: deselectedIds.ids,
        fullTestIds: [],
        selectedAggregate,
        fullAggregate: null,
        equivalent: false,
        uncertainty: uncertainty(reasons),
      });
    }
    reasons.add("FULL_EVIDENCE_MISSING");
    return differentialResult({
      candidate,
      verdict: "INCONCLUSIVE",
      selected,
      selectedTestIds: selectedIds.ids,
      deselectedTestIds: deselectedIds.ids,
      fullTestIds: [],
      selectedAggregate,
      fullAggregate: null,
      equivalent: false,
      uncertainty: uncertainty(reasons),
    });
  }

  addBindingProblems(full.binding, candidate, reasons);
  if (full.completeness === "PARTIAL") reasons.add("PARTIAL_EVIDENCE");
  if (!full.executedAllTests) reasons.add("FULL_EVIDENCE_INCOMPLETE");
  const fullResults = inventoryResults(full.results);
  if (fullResults.duplicate || fullResults.invalid) {
    reasons.add("INCOMPLETE_TEST_MANIFEST");
  }
  if (fullResults.ids.length === 0) reasons.add("EMPTY_TEST_SET");

  for (const testId of fullResults.ids) {
    if (!selectedIds.set.has(testId) && !deselectedIds.set.has(testId)) {
      reasons.add("INCOMPLETE_TEST_MANIFEST");
    }
  }
  for (const testId of [...selectedIds.ids, ...deselectedIds.ids]) {
    if (!fullResults.map.has(testId)) reasons.add("INCOMPLETE_TEST_MANIFEST");
  }

  const fullAggregate = aggregate(full.results);
  if (reasons.size > 0) {
    return differentialResult({
      candidate,
      verdict: "REJECTED",
      selected,
      selectedTestIds: selectedIds.ids,
      deselectedTestIds: deselectedIds.ids,
      fullTestIds: fullResults.ids,
      selectedAggregate,
      fullAggregate,
      equivalent: false,
      uncertainty: uncertainty(reasons),
    });
  }

  const differences: TestOutcomeDifference[] = [];
  for (const testId of selectedIds.ids) {
    const selectedOutcome = selectedResults.map.get(testId);
    const fullOutcome = fullResults.map.get(testId);
    if (selectedOutcome === undefined || fullOutcome === undefined) continue;
    if (selectedOutcome !== fullOutcome) {
      differences.push({
        testId,
        selected: selectedOutcome,
        full: fullOutcome,
      });
    }
  }
  differences.sort((left, right) => compareText(left.testId, right.testId));

  const deselectedFailures = fullResults.ids.filter(
    (testId) =>
      deselectedIds.set.has(testId) && fullResults.map.get(testId) === "FAILED",
  );
  const equivalent =
    differences.length === 0 &&
    selectedAggregate === fullAggregate &&
    deselectedFailures.length === 0;
  return differentialResult({
    candidate,
    verdict: equivalent ? "EQUIVALENT" : "DIVERGENT",
    selected,
    selectedTestIds: selectedIds.ids,
    deselectedTestIds: deselectedIds.ids,
    fullTestIds: fullResults.ids,
    differences,
    selectedAggregate,
    fullAggregate,
    equivalent,
    deselectedFailures,
    uncertainty: uncertainty(new Set()),
  });
}
