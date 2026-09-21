/**
 * Marker table registry (INTEL-009, plan §37.5).
 *
 * Extensible registry of framework-specific test markers (skip, focus,
 * retry, parameterize, fixture, category). Rules can query the registry
 * to determine what a marker means for a given framework without
 * hard-coding per-framework lookup tables.
 */

// ─── Types ───────────────────────────────────────────────────────────

export type MarkerSemantics =
  "skip" | "focus" | "retry" | "parameterize" | "fixture" | "category";

export interface MarkerDefinition {
  /** The marker token (annotation name, attribute, decorator). */
  marker: string;
  /** Framework this marker belongs to. */
  framework: string;
  /** What the marker means. */
  semantics: MarkerSemantics;
  /** Regex pattern to match the marker in source text. */
  pattern: string;
}

// ─── Built-in markers ────────────────────────────────────────────────

const MARKERS: MarkerDefinition[] = [
  // ── Jest / Vitest ──
  {
    marker: ".skip",
    framework: "jest",
    semantics: "skip",
    pattern: "\\.(?:skip)\\s*\\(",
  },
  {
    marker: ".only",
    framework: "jest",
    semantics: "focus",
    pattern: "\\.(?:only)\\s*\\(",
  },
  {
    marker: ".todo",
    framework: "jest",
    semantics: "category",
    pattern: "\\.(?:todo)\\s*\\(",
  },
  {
    marker: ".skip",
    framework: "vitest",
    semantics: "skip",
    pattern: "\\.(?:skip)\\s*\\(",
  },
  {
    marker: ".only",
    framework: "vitest",
    semantics: "focus",
    pattern: "\\.(?:only)\\s*\\(",
  },
  {
    marker: ".todo",
    framework: "vitest",
    semantics: "category",
    pattern: "\\.(?:todo)\\s*\\(",
  },
  {
    marker: ".concurrent",
    framework: "vitest",
    semantics: "category",
    pattern: "\\.(?:concurrent)\\s*\\(",
  },
  {
    marker: ".sequential",
    framework: "vitest",
    semantics: "category",
    pattern: "\\.(?:sequential)\\s*\\(",
  },
  {
    marker: "describe.each",
    framework: "jest",
    semantics: "parameterize",
    pattern: "\\bdescribe\\.each\\s*\\(",
  },
  {
    marker: "it.each",
    framework: "jest",
    semantics: "parameterize",
    pattern: "\\bit\\.each\\s*\\(",
  },
  {
    marker: "test.each",
    framework: "jest",
    semantics: "parameterize",
    pattern: "\\btest\\.each\\s*\\(",
  },
  {
    marker: "describe.each",
    framework: "vitest",
    semantics: "parameterize",
    pattern: "\\bdescribe\\.each\\s*\\(",
  },
  {
    marker: "it.each",
    framework: "vitest",
    semantics: "parameterize",
    pattern: "\\bit\\.each\\s*\\(",
  },

  // ── Playwright ──
  {
    marker: "test.skip",
    framework: "playwright",
    semantics: "skip",
    pattern: "\\btest\\.skip\\s*\\(",
  },
  {
    marker: "test.fixme",
    framework: "playwright",
    semantics: "skip",
    pattern: "\\btest\\.fixme\\s*\\(",
  },
  {
    marker: "test.fail",
    framework: "playwright",
    semantics: "category",
    pattern: "\\btest\\.fail\\s*\\(",
  },
  {
    marker: "test.slow",
    framework: "playwright",
    semantics: "category",
    pattern: "\\btest\\.slow\\s*\\(",
  },
  {
    marker: "test.only",
    framework: "playwright",
    semantics: "focus",
    pattern: "\\btest\\.only\\s*\\(",
  },
  {
    marker: "test.describe.configure",
    framework: "playwright",
    semantics: "category",
    pattern: "\\btest\\.describe\\.configure\\s*\\(",
  },
  {
    marker: "test.describe.serial",
    framework: "playwright",
    semantics: "category",
    pattern: "\\btest\\.describe\\.serial\\s*\\(",
  },
  {
    marker: "test.describe.parallel",
    framework: "playwright",
    semantics: "category",
    pattern: "\\btest\\.describe\\.parallel\\s*\\(",
  },
  {
    marker: "test.retry",
    framework: "playwright",
    semantics: "retry",
    pattern: "\\btest\\.retry\\s*\\(",
  },
  {
    marker: "test.use",
    framework: "playwright",
    semantics: "fixture",
    pattern: "\\btest\\.use\\s*\\(",
  },

  // ── Cypress ──
  {
    marker: ".skip",
    framework: "cypress",
    semantics: "skip",
    pattern: "\\.(?:skip)\\s*\\(",
  },
  {
    marker: ".only",
    framework: "cypress",
    semantics: "focus",
    pattern: "\\.(?:only)\\s*\\(",
  },

  // ── JUnit ──
  {
    marker: "@Disabled",
    framework: "junit",
    semantics: "skip",
    pattern: "@Disabled",
  },
  {
    marker: "@RepeatedTest",
    framework: "junit",
    semantics: "parameterize",
    pattern: "@RepeatedTest",
  },
  {
    marker: "@ParameterizedTest",
    framework: "junit",
    semantics: "parameterize",
    pattern: "@ParameterizedTest",
  },
  {
    marker: "@RetryingTest",
    framework: "junit",
    semantics: "retry",
    pattern: "@RetryingTest",
  },
  {
    marker: "@ExtendWith",
    framework: "junit",
    semantics: "fixture",
    pattern: "@ExtendWith",
  },
  {
    marker: "@Tag",
    framework: "junit",
    semantics: "category",
    pattern: "@Tag",
  },
  {
    marker: "@Nested",
    framework: "junit",
    semantics: "category",
    pattern: "@Nested",
  },
  {
    marker: "@TestMethodOrder",
    framework: "junit",
    semantics: "category",
    pattern: "@TestMethodOrder",
  },
  {
    marker: "@FixMethodOrder",
    framework: "junit",
    semantics: "category",
    pattern: "@FixMethodOrder",
  },

  // ── TestNG ──
  {
    marker: "@Test(enabled=false)",
    framework: "testng",
    semantics: "skip",
    pattern: "@Test\\s*\\([^)]*enabled\\s*=\\s*false",
  },
  {
    marker: "@Test(invocationCount)",
    framework: "testng",
    semantics: "retry",
    pattern: "@Test\\s*\\([^)]*invocationCount",
  },
  {
    marker: "@Test(dataProvider)",
    framework: "testng",
    semantics: "parameterize",
    pattern: "@Test\\s*\\([^)]*dataProvider",
  },
  {
    marker: "@DataProvider",
    framework: "testng",
    semantics: "parameterize",
    pattern: "@DataProvider",
  },
  {
    marker: "@Factory",
    framework: "testng",
    semantics: "parameterize",
    pattern: "@Factory",
  },
  {
    marker: "@Listeners",
    framework: "testng",
    semantics: "fixture",
    pattern: "@Listeners",
  },
  {
    marker: "@Groups",
    framework: "testng",
    semantics: "category",
    pattern: "@Groups",
  },

  // ── NUnit ──
  {
    marker: "[Ignore]",
    framework: "nunit",
    semantics: "skip",
    pattern: "\\[Ignore",
  },
  {
    marker: "[Retry]",
    framework: "nunit",
    semantics: "retry",
    pattern: "\\[Retry",
  },
  {
    marker: "[TestCase]",
    framework: "nunit",
    semantics: "parameterize",
    pattern: "\\[TestCase",
  },
  {
    marker: "[TestCaseSource]",
    framework: "nunit",
    semantics: "parameterize",
    pattern: "\\[TestCaseSource",
  },
  {
    marker: "[Values]",
    framework: "nunit",
    semantics: "parameterize",
    pattern: "\\[Values",
  },
  {
    marker: "[ValueSource]",
    framework: "nunit",
    semantics: "parameterize",
    pattern: "\\[ValueSource",
  },
  {
    marker: "[SetUp]",
    framework: "nunit",
    semantics: "fixture",
    pattern: "\\[SetUp",
  },
  {
    marker: "[TearDown]",
    framework: "nunit",
    semantics: "fixture",
    pattern: "\\[TearDown",
  },
  {
    marker: "[OneTimeSetUp]",
    framework: "nunit",
    semantics: "fixture",
    pattern: "\\[OneTimeSetUp",
  },
  {
    marker: "[OneTimeTearDown]",
    framework: "nunit",
    semantics: "fixture",
    pattern: "\\[OneTimeTearDown",
  },
  {
    marker: "[Category]",
    framework: "nunit",
    semantics: "category",
    pattern: "\\[Category",
  },
  {
    marker: "[Explicit]",
    framework: "nunit",
    semantics: "category",
    pattern: "\\[Explicit",
  },

  // ── xUnit ──
  {
    marker: "[Fact(Skip)]",
    framework: "xunit",
    semantics: "skip",
    pattern: "\\[Fact\\s*\\([^)]*Skip",
  },
  {
    marker: "[Theory(Skip)]",
    framework: "xunit",
    semantics: "skip",
    pattern: "\\[Theory\\s*\\([^)]*Skip",
  },
  {
    marker: "[Theory]",
    framework: "xunit",
    semantics: "parameterize",
    pattern: "\\[Theory",
  },
  {
    marker: "[InlineData]",
    framework: "xunit",
    semantics: "parameterize",
    pattern: "\\[InlineData",
  },
  {
    marker: "[MemberData]",
    framework: "xunit",
    semantics: "parameterize",
    pattern: "\\[MemberData",
  },
  {
    marker: "[ClassData]",
    framework: "xunit",
    semantics: "parameterize",
    pattern: "\\[ClassData",
  },
  {
    marker: "[Collection]",
    framework: "xunit",
    semantics: "category",
    pattern: "\\[Collection",
  },
  {
    marker: "[Trait]",
    framework: "xunit",
    semantics: "category",
    pattern: "\\[Trait",
  },
  {
    marker: "IClassFixture",
    framework: "xunit",
    semantics: "fixture",
    pattern: "\\bIClassFixture\\b",
  },
  {
    marker: "ICollectionFixture",
    framework: "xunit",
    semantics: "fixture",
    pattern: "\\bICollectionFixture\\b",
  },

  // ── pytest ──
  {
    marker: "@pytest.mark.skip",
    framework: "pytest",
    semantics: "skip",
    pattern: "@pytest\\.mark\\.skip",
  },
  {
    marker: "@pytest.mark.skipif",
    framework: "pytest",
    semantics: "skip",
    pattern: "@pytest\\.mark\\.skipif",
  },
  {
    marker: "@pytest.mark.xfail",
    framework: "pytest",
    semantics: "skip",
    pattern: "@pytest\\.mark\\.xfail",
  },
  {
    marker: "@pytest.mark.parametrize",
    framework: "pytest",
    semantics: "parameterize",
    pattern: "@pytest\\.mark\\.parametrize",
  },
  {
    marker: "@pytest.fixture",
    framework: "pytest",
    semantics: "fixture",
    pattern: "@pytest\\.fixture",
  },
  {
    marker: "@pytest.mark.usefixtures",
    framework: "pytest",
    semantics: "fixture",
    pattern: "@pytest\\.mark\\.usefixtures",
  },
  {
    marker: "@pytest.mark.category",
    framework: "pytest",
    semantics: "category",
    pattern: "@pytest\\.mark\\.\\w+",
  },
];

// ─── Registry operations ─────────────────────────────────────────────

/**
 * Register a new marker definition. Throws if the exact same
 * (marker, framework) pair already exists.
 */
export function registerMarker(def: MarkerDefinition): void {
  const exists = MARKERS.some(
    (m) => m.marker === def.marker && m.framework === def.framework,
  );
  if (exists) {
    throw new Error(
      `Marker "${def.marker}" already registered for framework "${def.framework}".`,
    );
  }
  MARKERS.push(def);
}

/**
 * Get all markers for a specific framework.
 */
export function getMarkersForFramework(framework: string): MarkerDefinition[] {
  return MARKERS.filter((m) => m.framework === framework);
}

/**
 * Get all registered markers.
 */
export function getAllMarkers(): readonly MarkerDefinition[] {
  return MARKERS;
}

/**
 * Total marker count. Exposed for validation and test assertions.
 */
export function getMarkerCount(): number {
  return MARKERS.length;
}
