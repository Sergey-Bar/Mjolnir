/**
 * Trust Benchmark Schema (ENGINE-011 + RULE-MEASURE-001 support).
 *
 * Defines the trust classification dimensions and benchmark dataset
 * schema used to validate rule trust metadata against a curated
 * benchmark corpus. Each entry captures 11 boolean trust dimensions
 * that together characterize the test health of a finding/rule
 * combination.
 */

/**
 * The 11 trust dimensions a benchmark entry classifies.
 * Each is a boolean answering a specific trust question.
 */
export interface TrustClassification {
  /** Finding has a measured FP rate (n ≥ 10). */
  measured: boolean;
  /** Measurement was taken at the current detector revision. */
  revisionFresh: boolean;
  /** Finding's rule is in the core tier (not quarantine/extended). */
  coreTier: boolean;
  /** Finding carries runtime corroboration (L3+). */
  runtimeCorroborated: boolean;
  /** Finding's evidence level is E2 (strong static evidence). */
  strongEvidence: boolean;
  /** Finding's confidence is "high". */
  highConfidence: boolean;
  /** Finding's false-positive risk is declared "low". */
  lowFpRisk: boolean;
  /** Finding's rule has an AST detection path. */
  hasAstPath: boolean;
  /** Finding's rule has a strategy justification (depth adjudication). */
  depthJustified: boolean;
  /** Finding comes from a measured rule with FP rate ≤ 10%. */
  lowMeasuredFp: boolean;
  /** Finding's rule has fixtures (must-fire + must-not-fire). */
  fixtureVerified: boolean;
}

export interface TrustBenchmarkEntry {
  /** Rule ID this benchmark entry evaluates. */
  ruleId: string;
  /** The 11 trust dimensions. */
  classification: TrustClassification;
  /** Human-readable notes on why each dimension has its value. */
  notes?: Record<string, string>;
}

export interface TrustBenchmarkDataset {
  /** Schema version for the benchmark dataset. */
  version: number;
  /** When the dataset was generated. */
  generatedAt: string;
  /** The benchmark entries. */
  entries: TrustBenchmarkEntry[];
}

/** Required dimension keys for validation. */
export const TRUST_DIMENSION_KEYS: readonly (keyof TrustClassification)[] = [
  "measured",
  "revisionFresh",
  "coreTier",
  "runtimeCorroborated",
  "strongEvidence",
  "highConfidence",
  "lowFpRisk",
  "hasAstPath",
  "depthJustified",
  "lowMeasuredFp",
  "fixtureVerified",
];

export interface BenchmarkViolation {
  entryIndex: number;
  ruleId: string;
  field: string;
  message: string;
}

/**
 * Validate a single benchmark entry. Returns violations (empty = valid).
 */
export function validateBenchmarkEntry(
  entry: TrustBenchmarkEntry,
  index: number,
): BenchmarkViolation[] {
  const violations: BenchmarkViolation[] = [];
  const add = (field: string, message: string) =>
    violations.push({
      entryIndex: index,
      ruleId: entry.ruleId,
      field,
      message,
    });

  if (!entry.ruleId || typeof entry.ruleId !== "string") {
    add("ruleId", "missing or non-string ruleId");
  }

  if (!entry.classification || typeof entry.classification !== "object") {
    add("classification", "missing or non-object classification");
    return violations;
  }

  for (const key of TRUST_DIMENSION_KEYS) {
    if (typeof entry.classification[key] !== "boolean") {
      add(
        `classification.${key}`,
        `expected boolean, got ${typeof entry.classification[key]}`,
      );
    }
  }

  return violations;
}

/**
 * Validate a full benchmark dataset. Returns violations (empty = valid).
 */
export function validateBenchmarkDataset(
  dataset: TrustBenchmarkDataset,
): BenchmarkViolation[] {
  const violations: BenchmarkViolation[] = [];

  if (typeof dataset.version !== "number" || dataset.version < 1) {
    violations.push({
      entryIndex: -1,
      ruleId: "",
      field: "version",
      message: `invalid version: ${String(dataset.version)}`,
    });
  }

  if (!dataset.generatedAt || typeof dataset.generatedAt !== "string") {
    violations.push({
      entryIndex: -1,
      ruleId: "",
      field: "generatedAt",
      message: "missing or non-string generatedAt",
    });
  }

  if (!Array.isArray(dataset.entries)) {
    violations.push({
      entryIndex: -1,
      ruleId: "",
      field: "entries",
      message: "entries is not an array",
    });
    return violations;
  }

  for (let i = 0; i < dataset.entries.length; i++) {
    const entry = dataset.entries[i];
    if (entry) {
      violations.push(...validateBenchmarkEntry(entry, i));
    }
  }

  return violations;
}
