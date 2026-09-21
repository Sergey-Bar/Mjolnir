/**
 * Semantic Model API (INTEL-001) — typed access to the 14 QA semantic
 * concepts from the qa-model (plan §37.1).
 *
 * Wraps the qa-model vocabulary into a consumer-facing API with
 * per-concept metadata, framework applicability, and lookup helpers.
 * The engine's rule execution can wire this config into concept-aware
 * detection paths.
 */

// ─── Public types ────────────────────────────────────────────────────

/**
 * The 14 semantic concepts the model exposes. These are the
 * consumer-facing names — the underlying QaConcept union in qa-model.ts
 * uses a more granular decomposition (setup/teardown vs lifecycle,
 * network-interaction vs action, etc.) that extractors produce.
 */
export type SemanticConceptName =
  | "test"
  | "suite"
  | "assertion"
  | "action"
  | "navigation"
  | "wait"
  | "retry"
  | "locator"
  | "lifecycle"
  | "fixture"
  | "mock"
  | "parameterization"
  | "shared-state"
  | "async";
export interface SemanticConcept {
  /** Concept identifier. */
  name: SemanticConceptName;
  /** Human-readable description of what this concept represents. */
  description: string;
  /** Frameworks where this concept is meaningful. */
  applicableFrameworks: string[];
}

export interface SemanticModelConfig {
  /**
   * Which concepts to activate during rule execution. When omitted,
   * all 14 concepts are active.
   */
  activeConcepts?: SemanticConceptName[];
  /**
   * Framework scope — when set, concepts are filtered to those
   * applicable to at least one of these frameworks.
   */
  frameworks?: string[];
}

// ─── Concept registry ────────────────────────────────────────────────

const CONCEPTS: readonly SemanticConcept[] = [
  {
    name: "test",
    description:
      "A runnable test with a body — the fundamental unit of verification.",
    applicableFrameworks: [
      "jest",
      "vitest",
      "mocha",
      "playwright",
      "cypress",
      "junit",
      "testng",
      "nunit",
      "xunit",
      "mstest",
      "pytest",
    ],
  },
  {
    name: "suite",
    description: "Suite-level grouping/lifecycle anchor (describe/context).",
    applicableFrameworks: [
      "jest",
      "vitest",
      "mocha",
      "playwright",
      "cypress",
      "junit",
      "testng",
      "nunit",
      "xunit",
      "mstest",
      "pytest",
    ],
  },
  {
    name: "assertion",
    description:
      "Verification call or thrown expectation that determines pass/fail.",
    applicableFrameworks: [
      "jest",
      "vitest",
      "mocha",
      "playwright",
      "cypress",
      "junit",
      "testng",
      "nunit",
      "xunit",
      "mstest",
      "pytest",
    ],
  },
  {
    name: "action",
    description: "User-driven UI interaction (click, fill, type, select).",
    applicableFrameworks: ["playwright", "cypress", "selenium", "webdriverio"],
  },
  {
    name: "navigation",
    description: "Page or document navigation (goto, navigate, back, forward).",
    applicableFrameworks: ["playwright", "cypress", "selenium", "webdriverio"],
  },
  {
    name: "wait",
    description: "Synchronization call (sleep, waitFor*, waitForSelector).",
    applicableFrameworks: [
      "playwright",
      "cypress",
      "selenium",
      "webdriverio",
      "jest",
      "vitest",
      "junit",
      "testng",
    ],
  },
  {
    name: "retry",
    description: "Retry policy anchor — automatic re-execution on failure.",
    applicableFrameworks: [
      "jest",
      "vitest",
      "playwright",
      "cypress",
      "junit",
      "testng",
      "nunit",
      "xunit",
    ],
  },
  {
    name: "locator",
    description:
      "Element query construction (CSS, XPath, role-based selectors).",
    applicableFrameworks: ["playwright", "cypress", "selenium", "webdriverio"],
  },
  {
    name: "lifecycle",
    description:
      "Suite-level grouping and lifecycle anchors (beforeAll, afterAll, setup, teardown).",
    applicableFrameworks: [
      "jest",
      "vitest",
      "mocha",
      "playwright",
      "junit",
      "testng",
      "nunit",
      "xunit",
      "mstest",
      "pytest",
    ],
  },
  {
    name: "fixture",
    description:
      "Shared context provider (pytest fixture, Playwright fixtures, test-data factories).",
    applicableFrameworks: ["playwright", "pytest", "junit", "testng"],
  },
  {
    name: "mock",
    description:
      "Test-double construction (jest.mock, Mockito, unittest.mock).",
    applicableFrameworks: [
      "jest",
      "vitest",
      "mocha",
      "junit",
      "testng",
      "pytest",
      "nunit",
      "xunit",
    ],
  },
  {
    name: "parameterization",
    description:
      "Data-driven or parameterized test execution (ParameterizedTest, @pytest.mark.parametrize).",
    applicableFrameworks: [
      "jest",
      "vitest",
      "junit",
      "testng",
      "nunit",
      "xunit",
      "pytest",
      "playwright",
    ],
  },
  {
    name: "shared-state",
    description:
      "Cross-test shared state — module-level globals, class-level fields, shared fixtures.",
    applicableFrameworks: [
      "jest",
      "vitest",
      "mocha",
      "junit",
      "testng",
      "pytest",
      "nunit",
      "xunit",
    ],
  },
  {
    name: "async",
    description:
      "Asynchronous test execution patterns (async/await, promises, callbacks, CompletableFuture).",
    applicableFrameworks: [
      "jest",
      "vitest",
      "mocha",
      "playwright",
      "cypress",
      "junit",
      "testng",
      "pytest",
    ],
  },
];

const CONCEPT_BY_NAME = new Map<SemanticConceptName, SemanticConcept>(
  CONCEPTS.map((c) => [c.name, c]),
);

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Retrieve a single concept by name. Returns undefined for unknown names.
 */
export function getSemanticConcept(
  name: SemanticConceptName,
): SemanticConcept | undefined {
  return CONCEPT_BY_NAME.get(name);
}

/**
 * Retrieve all registered concepts, optionally filtered by the
 * config's active concept list and framework scope.
 */
export function getAllConcepts(
  config?: SemanticModelConfig,
): SemanticConcept[] {
  let concepts: readonly SemanticConcept[] = CONCEPTS;

  if (config?.activeConcepts !== undefined) {
    const active = new Set(config.activeConcepts);
    concepts = concepts.filter((c) => active.has(c.name));
  }

  if (config?.frameworks !== undefined && config.frameworks.length > 0) {
    const fws = new Set(config.frameworks);
    concepts = concepts.filter((c) =>
      c.applicableFrameworks.some((fw) => fws.has(fw)),
    );
  }

  return [...concepts];
}

/**
 * Total number of registered semantic concepts. Exposed for validation
 * and test assertions.
 */
export const SEMANTIC_CONCEPT_COUNT = CONCEPTS.length;
