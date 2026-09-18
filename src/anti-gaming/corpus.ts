/**
 * ANTI-GAME-001 — Anti-Gaming Scenario Corpus.
 *
 * Scenarios that describe adversarial gaming attempts against the QA Doctor
 * scoring and detection engine. Each scenario documents a specific gaming
 * vector, the expected detection response, and the corrected behavior that
 * QA Doctor must enforce to maintain score integrity.
 */

export interface AntiGamingScenario {
  readonly id: string;
  readonly description: string;
  readonly gamingAttempt: string;
  readonly expectedScoreChange:
    "UNCHANGED" | "CAPPED" | "DECREASED" | "OBSERVED_ONLY";
  readonly expectedDetection: string;
  readonly correctedBehavior: string;
}

export const ANTI_GAMING_SCENARIOS: readonly AntiGamingScenario[] = [
  {
    id: "AG-001",
    description: "Add meaningless assertions to inflate assertion coverage",
    gamingAttempt:
      "Add tautological assertions (expect(true).toBe(true)) that pass trivially without exercising real logic",
    expectedScoreChange: "UNCHANGED",
    expectedDetection: "tautological_assertion_detected",
    correctedBehavior:
      "Scorer ignores tautological assertions; assertion-quality heuristic flags them as non-semantic",
  },
  {
    id: "AG-002",
    description: "Add superficial test files to inflate line-coverage metrics",
    gamingAttempt:
      "Create test files that import production modules and touch shallow entry points without asserting behavior",
    expectedScoreChange: "OBSERVED_ONLY",
    expectedDetection: "coverage_observed_but_trust_unchanged",
    correctedBehavior:
      "Coverage metric is recorded but trust score weight is gated by evidence-level heuristic; shallow-touch tests remain E0",
  },
  {
    id: "AG-003",
    description:
      "Split a single finding across multiple files to dilute per-file finding density",
    gamingAttempt:
      "Distribute evidence of one issue across several report sections or files so no single file triggers a threshold",
    expectedScoreChange: "UNCHANGED",
    expectedDetection: "root_cause_tracking_active",
    correctedBehavior:
      "Findings are deduplicated by root-cause fingerprint; splitting does not reduce aggregated severity",
  },
  {
    id: "AG-004",
    description: "Suppress noisy rules to lower the finding count",
    gamingAttempt:
      "Add lint-suppression comments or config entries that silence rules producing legitimate findings",
    expectedScoreChange: "CAPPED",
    expectedDetection: "suppression_recorded_score_capped",
    correctedBehavior:
      "Suppressions are recorded in the report; the score is capped at the last unsuppressed level and cannot rise above it",
  },
  {
    id: "AG-005",
    description:
      "Rename test files to appear structural without changing content",
    gamingAttempt:
      "Rename or move test files so that file-name heuristic detection no longer matches them",
    expectedScoreChange: "UNCHANGED",
    expectedDetection: "structural_detection_unaffected",
    correctedBehavior:
      "Detection uses AST-level and content-hash signals, not filename alone; renames do not bypass detection",
  },
  {
    id: "AG-006",
    description: "Add empty mocks to inflate mock-usage metrics",
    gamingAttempt:
      "Create mock implementations that are empty stubs returning defaults, never exercised by any assertion",
    expectedScoreChange: "UNCHANGED",
    expectedDetection: "meaningless_mocking_detected",
    correctedBehavior:
      "Mock-quality rules detect stubs with no assertion coverage; empty mocks do not contribute to mocking score",
  },
  {
    id: "AG-007",
    description:
      "Manipulate CI structure to produce a green badge without verification",
    gamingAttempt:
      "Configure CI workflows with skip conditions, empty stages, or success-only gates that always report green",
    expectedScoreChange: "UNCHANGED",
    expectedDetection: "non_verification_workflow_detected",
    correctedBehavior:
      "CI-structure rules detect empty stages, unconditional skips, and missing assertion steps; score reflects actual verification depth",
  },
] as const;

export function validateAntiGamingScenario(scenario: AntiGamingScenario): {
  readonly valid: boolean;
  readonly errors: readonly string[];
} {
  const errors: string[] = [];

  if (!scenario.id || scenario.id.trim().length === 0) {
    errors.push("scenario.id must be non-empty");
  }
  if (!scenario.description || scenario.description.trim().length === 0) {
    errors.push("scenario.description must be non-empty");
  }
  if (!scenario.gamingAttempt || scenario.gamingAttempt.trim().length === 0) {
    errors.push("scenario.gamingAttempt must be non-empty");
  }

  const validChanges = [
    "UNCHANGED",
    "CAPPED",
    "DECREASED",
    "OBSERVED_ONLY",
  ] as const;
  if (!validChanges.includes(scenario.expectedScoreChange)) {
    errors.push(
      `scenario.expectedScoreChange must be one of ${validChanges.join(", ")}; got "${scenario.expectedScoreChange}"`,
    );
  }

  if (
    !scenario.expectedDetection ||
    scenario.expectedDetection.trim().length === 0
  ) {
    errors.push("scenario.expectedDetection must be non-empty");
  }
  if (
    !scenario.correctedBehavior ||
    scenario.correctedBehavior.trim().length === 0
  ) {
    errors.push("scenario.correctedBehavior must be non-empty");
  }

  return { valid: errors.length === 0, errors };
}

export function validateAntiGamingCorpus(
  corpus: readonly AntiGamingScenario[],
): {
  readonly valid: boolean;
  readonly errors: readonly string[];
} {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const scenario of corpus) {
    const result = validateAntiGamingScenario(scenario);
    for (const err of result.errors) {
      errors.push(`[${scenario.id ?? "UNKNOWN"}] ${err}`);
    }

    if (seenIds.has(scenario.id)) {
      errors.push(`Duplicate scenario id: ${scenario.id}`);
    }
    seenIds.add(scenario.id);
  }

  return { valid: errors.length === 0, errors };
}
