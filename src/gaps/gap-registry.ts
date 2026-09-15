/**
 * GAP-REGISTRY-001 — Gap Registry.
 *
 * Canonical registry of every GAP-* id referenced in the framework
 * scorecards. Each entry carries metadata for prioritization and
 * cross-reference.
 */

export type GapType =
  | "AST_ANALYSIS"
  | "SEMANTIC_UNDERSTANDING"
  | "LIFECYCLE_MODELING"
  | "FIXTURE_MODELING"
  | "MOCKING_SEMANTICS"
  | "PARALLELISM_SAFETY"
  | "TEST_DISCOVERY"
  | "ASSERTION_ANALYSIS"
  | "CI_INTEGRATION";

export type GapPriority = "P0" | "P1" | "P2" | "P3";

export interface GapEntry {
  readonly gapId: string;
  readonly frameworkId: string;
  readonly gapType: GapType;
  readonly priority: GapPriority;
  readonly title: string;
  readonly description: string;
  readonly blockingScorecardDimensions: readonly string[];
}

const pwGaps: GapEntry[] = [
  {
    gapId: "GAP-PW-001",
    frameworkId: "playwright",
    gapType: "AST_ANALYSIS",
    priority: "P1",
    title: "Playwright AST-based usage analysis",
    description:
      "Deepen AST analysis for Playwright-specific patterns (locators, page object models, custom fixtures).",
    blockingScorecardDimensions: ["astUsage"],
  },
  {
    gapId: "GAP-PW-002",
    frameworkId: "playwright",
    gapType: "FIXTURE_MODELING",
    priority: "P1",
    title: "Playwright fixture and lifecycle modeling",
    description:
      "Model Playwright's test.extend fixture chain and worker/test scope lifecycle for proper isolation analysis.",
    blockingScorecardDimensions: ["lifecycleModeling", "fixtureModeling"],
  },
  {
    gapId: "GAP-PW-003",
    frameworkId: "playwright",
    gapType: "MOCKING_SEMANTICS",
    priority: "P2",
    title: "Playwright mocking semantics",
    description:
      "Understand page.route, page.context, and API mocking patterns for proper test boundary detection.",
    blockingScorecardDimensions: ["mockingSemantics"],
  },
  {
    gapId: "GAP-PW-004",
    frameworkId: "playwright",
    gapType: "PARALLELISM_SAFETY",
    priority: "P2",
    title: "Playwright shared state analysis",
    description:
      "Detect shared state between parallel Playwright tests (shared storage state, global setup).",
    blockingScorecardDimensions: ["sharedStateAnalysis"],
  },
  {
    gapId: "GAP-PW-005",
    frameworkId: "playwright",
    gapType: "AST_ANALYSIS",
    priority: "P2",
    title: "Playwright parameterization analysis",
    description:
      "Detect and model parameterized Playwright tests (test.describe.parametrize, data-driven patterns).",
    blockingScorecardDimensions: ["parameterization"],
  },
  {
    gapId: "GAP-PW-006",
    frameworkId: "playwright",
    gapType: "PARALLELISM_SAFETY",
    priority: "P1",
    title: "Playwright worker safety analysis",
    description:
      "Analyze Playwright's worker parallelism model for port conflicts, shared file locks, and resource contention.",
    blockingScorecardDimensions: ["parallelismWorkerSafety"],
  },
];

function makeFrameworkGaps(
  frameworkId: string,
  prefix: string,
  gaps: Omit<GapEntry, "frameworkId">[],
): GapEntry[] {
  return gaps.map((g) => ({ ...g, frameworkId }));
}

const jestGaps = makeFrameworkGaps("jest", "JEST", [
  {
    gapId: "GAP-JEST-002",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P1",
    title: "Jest semantic understanding",
    description:
      "Deepen understanding of Jest-specific patterns: describe/it nesting, test.each, describe.each.",
    blockingScorecardDimensions: ["semanticUnderstanding"],
  },
  {
    gapId: "GAP-JEST-003",
    gapType: "ASSERTION_ANALYSIS",
    priority: "P1",
    title: "Jest assertion understanding",
    description:
      "Model Jest expect() matchers, custom matchers, and assertion chains for defect detection.",
    blockingScorecardDimensions: ["assertionUnderstanding"],
  },
  {
    gapId: "GAP-JEST-004",
    gapType: "LIFECYCLE_MODELING",
    priority: "P1",
    title: "Jest lifecycle modeling",
    description:
      "Model beforeAll/beforeEach/afterAll/afterEach execution order and scope nesting.",
    blockingScorecardDimensions: ["lifecycleModeling"],
  },
  {
    gapId: "GAP-JEST-005",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Jest async semantics",
    description:
      "Detect async test patterns: async/await, done callback, Promise returns, and their misuse.",
    blockingScorecardDimensions: ["asyncSemantics"],
  },
  {
    gapId: "GAP-JEST-006",
    gapType: "FIXTURE_MODELING",
    priority: "P2",
    title: "Jest fixture modeling",
    description:
      "Model Jest manual fixtures, factory functions, and module-level shared state patterns.",
    blockingScorecardDimensions: ["fixtureModeling"],
  },
  {
    gapId: "GAP-JEST-007",
    gapType: "MOCKING_SEMANTICS",
    priority: "P1",
    title: "Jest mocking semantics",
    description:
      "Understand jest.mock, jest.fn, jest.spyOn, manual mocks, and module mock hoisting.",
    blockingScorecardDimensions: ["mockingSemantics"],
  },
  {
    gapId: "GAP-JEST-008",
    gapType: "PARALLELISM_SAFETY",
    priority: "P2",
    title: "Jest shared state analysis",
    description:
      "Detect shared mutable state between Jest workers: global variables, module cache, file system state.",
    blockingScorecardDimensions: ["sharedStateAnalysis"],
  },
  {
    gapId: "GAP-JEST-009",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Jest retry semantics",
    description:
      "Model jest.retryTimes and custom retry logic for flaky test detection.",
    blockingScorecardDimensions: ["retrySemantics"],
  },
  {
    gapId: "GAP-JEST-010",
    gapType: "AST_ANALYSIS",
    priority: "P2",
    title: "Jest parameterization analysis",
    description:
      "Detect test.each, describe.each, and data-driven test patterns.",
    blockingScorecardDimensions: ["parameterization"],
  },
  {
    gapId: "GAP-JEST-011",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Jest snapshot semantics",
    description:
      "Understand toMatchSnapshot, toMatchInlineSnapshot, and snapshot update lifecycle.",
    blockingScorecardDimensions: ["snapshotSemantics"],
  },
  {
    gapId: "GAP-JEST-012",
    gapType: "PARALLELISM_SAFETY",
    priority: "P1",
    title: "Jest worker safety analysis",
    description:
      "Analyze Jest's --workers parallelism for port conflicts and shared resource contention.",
    blockingScorecardDimensions: ["parallelismWorkerSafety"],
  },
  {
    gapId: "GAP-JEST-013",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Jest runtime evidence collection",
    description:
      "Collect runtime evidence from Jest test runs for corroboration of static findings.",
    blockingScorecardDimensions: ["runtimeEvidence"],
  },
  {
    gapId: "GAP-JEST-014",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Jest adversarial corpus",
    description:
      "Build adversarial test corpus targeting Jest-specific anti-patterns and edge cases.",
    blockingScorecardDimensions: ["adversarialCorpus"],
  },
  {
    gapId: "GAP-JEST-015",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Jest known limitation coverage",
    description:
      "Document and test known limitations of Jest analysis (ESM, worker_threads, etc.).",
    blockingScorecardDimensions: ["knownLimitationCoverage"],
  },
]);

const vitestGaps = makeFrameworkGaps("vitest", "VIT", [
  {
    gapId: "GAP-VIT-002",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P1",
    title: "Vitest semantic understanding",
    description:
      "Deepen understanding of Vitest-specific patterns (vi.mock, vi.fn, bench).",
    blockingScorecardDimensions: ["semanticUnderstanding"],
  },
  {
    gapId: "GAP-VIT-003",
    gapType: "ASSERTION_ANALYSIS",
    priority: "P1",
    title: "Vitest assertion understanding",
    description:
      "Model Vitest expect() API and Chai-compatible assertion chains.",
    blockingScorecardDimensions: ["assertionUnderstanding"],
  },
  {
    gapId: "GAP-VIT-004",
    gapType: "LIFECYCLE_MODELING",
    priority: "P1",
    title: "Vitest lifecycle modeling",
    description:
      "Model beforeAll/beforeEach/afterAll/afterEach and Vitest-specific hooks.",
    blockingScorecardDimensions: ["lifecycleModeling"],
  },
  {
    gapId: "GAP-VIT-005",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Vitest async semantics",
    description:
      "Detect async test patterns and Vitest-specific concurrent/sequential modifiers.",
    blockingScorecardDimensions: ["asyncSemantics"],
  },
  {
    gapId: "GAP-VIT-006",
    gapType: "FIXTURE_MODELING",
    priority: "P2",
    title: "Vitest fixture modeling",
    description:
      "Model Vitest fixture injection via useFixture and test.extend patterns.",
    blockingScorecardDimensions: ["fixtureModeling"],
  },
  {
    gapId: "GAP-VIT-007",
    gapType: "MOCKING_SEMANTICS",
    priority: "P1",
    title: "Vitest mocking semantics",
    description:
      "Understand vi.mock, vi.fn, vi.spyOn, vi.hoisted, and module mock hoisting.",
    blockingScorecardDimensions: ["mockingSemantics"],
  },
  {
    gapId: "GAP-VIT-008",
    gapType: "PARALLELISM_SAFETY",
    priority: "P2",
    title: "Vitest shared state analysis",
    description: "Detect shared state between Vitest forks/threads workers.",
    blockingScorecardDimensions: ["sharedStateAnalysis"],
  },
  {
    gapId: "GAP-VIT-009",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Vitest retry semantics",
    description: "Model Vitest retry configuration and inline retry options.",
    blockingScorecardDimensions: ["retrySemantics"],
  },
  {
    gapId: "GAP-VIT-010",
    gapType: "AST_ANALYSIS",
    priority: "P2",
    title: "Vitest parameterization analysis",
    description: "Detect test.each and data-driven test patterns in Vitest.",
    blockingScorecardDimensions: ["parameterization"],
  },
  {
    gapId: "GAP-VIT-011",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Vitest snapshot semantics",
    description:
      "Understand toMatchSnapshot, toMatchInlineSnapshot in Vitest context.",
    blockingScorecardDimensions: ["snapshotSemantics"],
  },
  {
    gapId: "GAP-VIT-012",
    gapType: "PARALLELISM_SAFETY",
    priority: "P1",
    title: "Vitest worker safety analysis",
    description:
      "Analyze Vitest's forks/threads pool parallelism for resource contention.",
    blockingScorecardDimensions: ["parallelismWorkerSafety"],
  },
  {
    gapId: "GAP-VIT-013",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Vitest runtime evidence collection",
    description:
      "Collect runtime evidence from Vitest test runs for corroboration.",
    blockingScorecardDimensions: ["runtimeEvidence"],
  },
  {
    gapId: "GAP-VIT-014",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Vitest adversarial corpus",
    description:
      "Build adversarial test corpus targeting Vitest-specific anti-patterns.",
    blockingScorecardDimensions: ["adversarialCorpus"],
  },
  {
    gapId: "GAP-VIT-015",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Vitest known limitation coverage",
    description: "Document and test known limitations of Vitest analysis.",
    blockingScorecardDimensions: ["knownLimitationCoverage"],
  },
]);

const pytestGaps = makeFrameworkGaps("pytest", "PY", [
  {
    gapId: "GAP-PY-001",
    gapType: "AST_ANALYSIS",
    priority: "P1",
    title: "Pytest AST-based usage analysis",
    description:
      "Deepen Python AST analysis for pytest patterns (conftest, fixtures, markers).",
    blockingScorecardDimensions: ["astUsage"],
  },
  {
    gapId: "GAP-PY-002",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P1",
    title: "Pytest semantic understanding",
    description:
      "Model pytest-specific patterns: parametrize, marks, xfail, skipif.",
    blockingScorecardDimensions: ["semanticUnderstanding"],
  },
  {
    gapId: "GAP-PY-003",
    gapType: "ASSERTION_ANALYSIS",
    priority: "P1",
    title: "Pytest assertion understanding",
    description:
      "Understand pytest assert rewriting and custom assertion helpers.",
    blockingScorecardDimensions: ["assertionUnderstanding"],
  },
  {
    gapId: "GAP-PY-004",
    gapType: "LIFECYCLE_MODELING",
    priority: "P1",
    title: "Pytest lifecycle modeling",
    description:
      "Model pytest fixture setup/teardown, scopes (function/class/module/session), and autouse.",
    blockingScorecardDimensions: ["lifecycleModeling"],
  },
  {
    gapId: "GAP-PY-005",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Pytest async semantics",
    description:
      "Detect pytest-asyncio patterns: async def tests, async fixtures, event loop scope.",
    blockingScorecardDimensions: ["asyncSemantics"],
  },
  {
    gapId: "GAP-PY-006",
    gapType: "FIXTURE_MODELING",
    priority: "P1",
    title: "Pytest fixture modeling",
    description:
      "Deeply model pytest's fixture system: dependency chains, factories, finalizers.",
    blockingScorecardDimensions: ["fixtureModeling"],
  },
  {
    gapId: "GAP-PY-007",
    gapType: "MOCKING_SEMANTICS",
    priority: "P2",
    title: "Pytest mocking semantics",
    description:
      "Understand unittest.mock integration, monkeypatch, and pytest-mock patterns.",
    blockingScorecardDimensions: ["mockingSemantics"],
  },
  {
    gapId: "GAP-PY-008",
    gapType: "PARALLELISM_SAFETY",
    priority: "P2",
    title: "Pytest shared state analysis",
    description:
      "Detect shared state between pytest-xdist workers and module-level globals.",
    blockingScorecardDimensions: ["sharedStateAnalysis"],
  },
  {
    gapId: "GAP-PY-009",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Pytest retry semantics",
    description: "Model pytest-rerunfailures and custom retry decorators.",
    blockingScorecardDimensions: ["retrySemantics"],
  },
  {
    gapId: "GAP-PY-010",
    gapType: "AST_ANALYSIS",
    priority: "P2",
    title: "Pytest parameterization analysis",
    description:
      "Detect @pytest.mark.parametrize and indirect parameterization patterns.",
    blockingScorecardDimensions: ["parameterization"],
  },
  {
    gapId: "GAP-PY-011",
    gapType: "PARALLELISM_SAFETY",
    priority: "P1",
    title: "Pytest worker safety analysis",
    description:
      "Analyze pytest-xdist parallelism for database, port, and file system conflicts.",
    blockingScorecardDimensions: ["parallelismWorkerSafety"],
  },
  {
    gapId: "GAP-PY-012",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Pytest runtime evidence collection",
    description: "Collect runtime evidence from pytest runs for corroboration.",
    blockingScorecardDimensions: ["runtimeEvidence"],
  },
  {
    gapId: "GAP-PY-013",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Pytest adversarial corpus",
    description:
      "Build adversarial test corpus targeting pytest-specific anti-patterns.",
    blockingScorecardDimensions: ["adversarialCorpus"],
  },
  {
    gapId: "GAP-PY-014",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Pytest known limitation coverage",
    description: "Document and test known limitations of pytest analysis.",
    blockingScorecardDimensions: ["knownLimitationCoverage"],
  },
]);

const junitGaps = makeFrameworkGaps("junit", "JU", [
  {
    gapId: "GAP-JU-001",
    gapType: "AST_ANALYSIS",
    priority: "P1",
    title: "JUnit AST-based usage analysis",
    description:
      "Deepen Java AST analysis for JUnit 5 patterns (annotations, extensions, nested classes).",
    blockingScorecardDimensions: ["astUsage"],
  },
  {
    gapId: "GAP-JU-002",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P1",
    title: "JUnit semantic understanding",
    description:
      "Model JUnit 5-specific patterns: @Nested, @Tag, @DisplayName, conditionals.",
    blockingScorecardDimensions: ["semanticUnderstanding"],
  },
  {
    gapId: "GAP-JU-003",
    gapType: "ASSERTION_ANALYSIS",
    priority: "P1",
    title: "JUnit assertion understanding",
    description:
      "Understand JUnit Assertions, AssertJ, and Hamcrest assertion patterns.",
    blockingScorecardDimensions: ["assertionUnderstanding"],
  },
  {
    gapId: "GAP-JU-004",
    gapType: "LIFECYCLE_MODELING",
    priority: "P1",
    title: "JUnit lifecycle modeling",
    description:
      "Model @BeforeAll/@BeforeEach/@AfterAll/@AfterEach and extension lifecycle.",
    blockingScorecardDimensions: ["lifecycleModeling"],
  },
  {
    gapId: "GAP-JU-005",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "JUnit async semantics",
    description: "Detect CompletableFuture, @Timeout, and async test patterns.",
    blockingScorecardDimensions: ["asyncSemantics"],
  },
  {
    gapId: "GAP-JU-006",
    gapType: "FIXTURE_MODELING",
    priority: "P2",
    title: "JUnit fixture modeling",
    description:
      "Model JUnit 5 extension-based fixtures and TestInstance lifecycle.",
    blockingScorecardDimensions: ["fixtureModeling"],
  },
  {
    gapId: "GAP-JU-007",
    gapType: "MOCKING_SEMANTICS",
    priority: "P2",
    title: "JUnit mocking semantics",
    description: "Understand Mockito/MockBean integration patterns with JUnit.",
    blockingScorecardDimensions: ["mockingSemantics"],
  },
  {
    gapId: "GAP-JU-008",
    gapType: "PARALLELISM_SAFETY",
    priority: "P2",
    title: "JUnit shared state analysis",
    description:
      "Detect shared state between JUnit parallel test classes and static fields.",
    blockingScorecardDimensions: ["sharedStateAnalysis"],
  },
  {
    gapId: "GAP-JU-009",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "JUnit retry semantics",
    description: "Model JUnit retry extensions and custom retry rules.",
    blockingScorecardDimensions: ["retrySemantics"],
  },
  {
    gapId: "GAP-JU-010",
    gapType: "AST_ANALYSIS",
    priority: "P2",
    title: "JUnit parameterization analysis",
    description:
      "Detect @ParameterizedTest, @MethodSource, @CsvSource patterns.",
    blockingScorecardDimensions: ["parameterization"],
  },
  {
    gapId: "GAP-JU-011",
    gapType: "PARALLELISM_SAFETY",
    priority: "P1",
    title: "JUnit worker safety analysis",
    description:
      "Analyze JUnit parallel execution configuration for resource contention.",
    blockingScorecardDimensions: ["parallelismWorkerSafety"],
  },
  {
    gapId: "GAP-JU-012",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "JUnit runtime evidence collection",
    description:
      "Collect runtime evidence from JUnit test runs for corroboration.",
    blockingScorecardDimensions: ["runtimeEvidence"],
  },
  {
    gapId: "GAP-JU-013",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "JUnit adversarial corpus",
    description:
      "Build adversarial test corpus targeting JUnit-specific anti-patterns.",
    blockingScorecardDimensions: ["adversarialCorpus"],
  },
  {
    gapId: "GAP-JU-014",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "JUnit known limitation coverage",
    description: "Document and test known limitations of JUnit analysis.",
    blockingScorecardDimensions: ["knownLimitationCoverage"],
  },
]);

const nunitGaps = makeFrameworkGaps("nunit", "NU", [
  {
    gapId: "GAP-NU-001",
    gapType: "AST_ANALYSIS",
    priority: "P1",
    title: "NUnit AST-based usage analysis",
    description:
      "Deepen C# AST analysis for NUnit patterns (attributes, TestFixture, SetUp/TearDown).",
    blockingScorecardDimensions: ["astUsage"],
  },
  {
    gapId: "GAP-NU-002",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P1",
    title: "NUnit semantic understanding",
    description:
      "Model NUnit-specific patterns: [TestCase], [TestFixture], [Category], [Property].",
    blockingScorecardDimensions: ["semanticUnderstanding"],
  },
  {
    gapId: "GAP-NU-003",
    gapType: "ASSERTION_ANALYSIS",
    priority: "P1",
    title: "NUnit assertion understanding",
    description:
      "Understand NUnit Assert.That constraint model and classic assertions.",
    blockingScorecardDimensions: ["assertionUnderstanding"],
  },
  {
    gapId: "GAP-NU-004",
    gapType: "LIFECYCLE_MODELING",
    priority: "P1",
    title: "NUnit lifecycle modeling",
    description:
      "Model [SetUp]/[TearDown]/[OneTimeSetUp]/[OneTimeTearDown] lifecycle.",
    blockingScorecardDimensions: ["lifecycleModeling"],
  },
  {
    gapId: "GAP-NU-005",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "NUnit async semantics",
    description: "Detect async Task test methods and NUnit async patterns.",
    blockingScorecardDimensions: ["asyncSemantics"],
  },
  {
    gapId: "GAP-NU-006",
    gapType: "FIXTURE_MODELING",
    priority: "P2",
    title: "NUnit fixture modeling",
    description:
      "Model NUnit fixture injection and dependency injection patterns.",
    blockingScorecardDimensions: ["fixtureModeling"],
  },
  {
    gapId: "GAP-NU-007",
    gapType: "MOCKING_SEMANTICS",
    priority: "P2",
    title: "NUnit mocking semantics",
    description: "Understand NSubstitute/Moq integration patterns with NUnit.",
    blockingScorecardDimensions: ["mockingSemantics"],
  },
  {
    gapId: "GAP-NU-008",
    gapType: "PARALLELISM_SAFETY",
    priority: "P2",
    title: "NUnit shared state analysis",
    description: "Detect shared state between NUnit parallel test fixtures.",
    blockingScorecardDimensions: ["sharedStateAnalysis"],
  },
  {
    gapId: "GAP-NU-009",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "NUnit retry semantics",
    description: "Model NUnit retry attributes and custom retry logic.",
    blockingScorecardDimensions: ["retrySemantics"],
  },
  {
    gapId: "GAP-NU-010",
    gapType: "AST_ANALYSIS",
    priority: "P2",
    title: "NUnit parameterization analysis",
    description:
      "Detect [TestCase], [ValueSource], [TestCaseSource] parameterization patterns.",
    blockingScorecardDimensions: ["parameterization"],
  },
  {
    gapId: "GAP-NU-011",
    gapType: "PARALLELISM_SAFETY",
    priority: "P1",
    title: "NUnit worker safety analysis",
    description:
      "Analyze NUnit parallelizable attribute for resource contention.",
    blockingScorecardDimensions: ["parallelismWorkerSafety"],
  },
  {
    gapId: "GAP-NU-012",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "NUnit runtime evidence collection",
    description:
      "Collect runtime evidence from NUnit test runs for corroboration.",
    blockingScorecardDimensions: ["runtimeEvidence"],
  },
  {
    gapId: "GAP-NU-013",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "NUnit adversarial corpus",
    description:
      "Build adversarial test corpus targeting NUnit-specific anti-patterns.",
    blockingScorecardDimensions: ["adversarialCorpus"],
  },
  {
    gapId: "GAP-NU-014",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "NUnit known limitation coverage",
    description: "Document and test known limitations of NUnit analysis.",
    blockingScorecardDimensions: ["knownLimitationCoverage"],
  },
]);

const xunitGaps = makeFrameworkGaps("xunit", "XU", [
  {
    gapId: "GAP-XU-001",
    gapType: "AST_ANALYSIS",
    priority: "P1",
    title: "xUnit AST-based usage analysis",
    description:
      "Deepen C# AST analysis for xUnit patterns (IClassFixture, ICollectionFixture).",
    blockingScorecardDimensions: ["astUsage"],
  },
  {
    gapId: "GAP-XU-002",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P1",
    title: "xUnit semantic understanding",
    description:
      "Model xUnit-specific patterns: [Fact], [Theory], [InlineData], [MemberData].",
    blockingScorecardDimensions: ["semanticUnderstanding"],
  },
  {
    gapId: "GAP-XU-003",
    gapType: "ASSERTION_ANALYSIS",
    priority: "P1",
    title: "xUnit assertion understanding",
    description:
      "Understand xUnit Assert class and FluentAssertions integration.",
    blockingScorecardDimensions: ["assertionUnderstanding"],
  },
  {
    gapId: "GAP-XU-004",
    gapType: "LIFECYCLE_MODELING",
    priority: "P1",
    title: "xUnit lifecycle modeling",
    description:
      "Model xUnit constructor/Dispose lifecycle and IAsyncLifetime.",
    blockingScorecardDimensions: ["lifecycleModeling"],
  },
  {
    gapId: "GAP-XU-005",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "xUnit async semantics",
    description: "Detect async Task test methods and IAsyncLifetime patterns.",
    blockingScorecardDimensions: ["asyncSemantics"],
  },
  {
    gapId: "GAP-XU-006",
    gapType: "FIXTURE_MODELING",
    priority: "P2",
    title: "xUnit fixture modeling",
    description:
      "Model xUnit class/collection fixtures and shared context patterns.",
    blockingScorecardDimensions: ["fixtureModeling"],
  },
  {
    gapId: "GAP-XU-007",
    gapType: "MOCKING_SEMANTICS",
    priority: "P2",
    title: "xUnit mocking semantics",
    description: "Understand NSubstitute/Moq integration patterns with xUnit.",
    blockingScorecardDimensions: ["mockingSemantics"],
  },
  {
    gapId: "GAP-XU-008",
    gapType: "PARALLELISM_SAFETY",
    priority: "P2",
    title: "xUnit shared state analysis",
    description: "Detect shared state between xUnit parallel test collections.",
    blockingScorecardDimensions: ["sharedStateAnalysis"],
  },
  {
    gapId: "GAP-XU-009",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "xUnit retry semantics",
    description: "Model xUnit retry attributes and custom retry logic.",
    blockingScorecardDimensions: ["retrySemantics"],
  },
  {
    gapId: "GAP-XU-010",
    gapType: "AST_ANALYSIS",
    priority: "P2",
    title: "xUnit parameterization analysis",
    description:
      "Detect [Theory], [InlineData], [MemberData], [ClassData] patterns.",
    blockingScorecardDimensions: ["parameterization"],
  },
  {
    gapId: "GAP-XU-011",
    gapType: "PARALLELISM_SAFETY",
    priority: "P1",
    title: "xUnit worker safety analysis",
    description:
      "Analyze xUnit parallel test collection configuration for contention.",
    blockingScorecardDimensions: ["parallelismWorkerSafety"],
  },
  {
    gapId: "GAP-XU-012",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "xUnit runtime evidence collection",
    description:
      "Collect runtime evidence from xUnit test runs for corroboration.",
    blockingScorecardDimensions: ["runtimeEvidence"],
  },
  {
    gapId: "GAP-XU-013",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "xUnit adversarial corpus",
    description:
      "Build adversarial test corpus targeting xUnit-specific anti-patterns.",
    blockingScorecardDimensions: ["adversarialCorpus"],
  },
  {
    gapId: "GAP-XU-014",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "xUnit known limitation coverage",
    description: "Document and test known limitations of xUnit analysis.",
    blockingScorecardDimensions: ["knownLimitationCoverage"],
  },
]);

const cypressGaps = makeFrameworkGaps("cypress", "CY", [
  {
    gapId: "GAP-CY-001",
    gapType: "AST_ANALYSIS",
    priority: "P1",
    title: "Cypress AST-based usage analysis",
    description:
      "Deepen AST analysis for Cypress patterns (cy.*, custom commands, Cypress.Commands).",
    blockingScorecardDimensions: ["astUsage"],
  },
  {
    gapId: "GAP-CY-002",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P1",
    title: "Cypress semantic understanding",
    description:
      "Model Cypress-specific patterns: describe/context/it, .only/.skip, cy.intercept.",
    blockingScorecardDimensions: ["semanticUnderstanding"],
  },
  {
    gapId: "GAP-CY-003",
    gapType: "ASSERTION_ANALYSIS",
    priority: "P1",
    title: "Cypress assertion understanding",
    description:
      "Understand Cypress Chai assertions, .should(), and custom assertion chains.",
    blockingScorecardDimensions: ["assertionUnderstanding"],
  },
  {
    gapId: "GAP-CY-004",
    gapType: "LIFECYCLE_MODELING",
    priority: "P1",
    title: "Cypress lifecycle modeling",
    description:
      "Model Cypress before/after hooks and Cypress event lifecycle.",
    blockingScorecardDimensions: ["lifecycleModeling"],
  },
  {
    gapId: "GAP-CY-005",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Cypress async semantics",
    description:
      "Detect Cypress command chaining, async pitfalls, and return value patterns.",
    blockingScorecardDimensions: ["asyncSemantics"],
  },
  {
    gapId: "GAP-CY-006",
    gapType: "FIXTURE_MODELING",
    priority: "P2",
    title: "Cypress fixture modeling",
    description: "Model cy.fixture, Cypress.env, and support file fixtures.",
    blockingScorecardDimensions: ["fixtureModeling"],
  },
  {
    gapId: "GAP-CY-007",
    gapType: "MOCKING_SEMANTICS",
    priority: "P1",
    title: "Cypress mocking semantics",
    description:
      "Understand cy.intercept, cy.stub, cy.spy for API/network mocking.",
    blockingScorecardDimensions: ["mockingSemantics"],
  },
  {
    gapId: "GAP-CY-008",
    gapType: "PARALLELISM_SAFETY",
    priority: "P2",
    title: "Cypress shared state analysis",
    description:
      "Detect shared state between Cypress spec files and test isolation issues.",
    blockingScorecardDimensions: ["sharedStateAnalysis"],
  },
  {
    gapId: "GAP-CY-009",
    gapType: "AST_ANALYSIS",
    priority: "P2",
    title: "Cypress parameterization analysis",
    description:
      "Detect Cypress data-driven test patterns and custom parameterization.",
    blockingScorecardDimensions: ["parameterization"],
  },
  {
    gapId: "GAP-CY-010",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Cypress snapshot semantics",
    description:
      "Understand Cypress screenshot comparison and visual regression patterns.",
    blockingScorecardDimensions: ["snapshotSemantics"],
  },
  {
    gapId: "GAP-CY-011",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Cypress runtime evidence collection",
    description:
      "Collect runtime evidence from Cypress test runs for corroboration.",
    blockingScorecardDimensions: ["runtimeEvidence"],
  },
  {
    gapId: "GAP-CY-012",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Cypress adversarial corpus",
    description:
      "Build adversarial test corpus targeting Cypress-specific anti-patterns.",
    blockingScorecardDimensions: ["adversarialCorpus"],
  },
  {
    gapId: "GAP-CY-013",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Cypress known limitation coverage",
    description: "Document and test known limitations of Cypress analysis.",
    blockingScorecardDimensions: ["knownLimitationCoverage"],
  },
]);

const seleniumGaps = makeFrameworkGaps("selenium", "SE", [
  {
    gapId: "GAP-SE-001",
    gapType: "TEST_DISCOVERY",
    priority: "P1",
    title: "Selenium test discovery",
    description:
      "Implement basic discovery of Selenium test files across Java, TypeScript, and Python.",
    blockingScorecardDimensions: ["discovery"],
  },
  {
    gapId: "GAP-SE-002",
    gapType: "AST_ANALYSIS",
    priority: "P1",
    title: "Selenium AST-based usage analysis",
    description:
      "Deepen AST analysis for Selenium WebDriver patterns (findElement, By.*, PageFactory).",
    blockingScorecardDimensions: ["astUsage"],
  },
  {
    gapId: "GAP-SE-003",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P1",
    title: "Selenium semantic understanding",
    description:
      "Model Selenium-specific patterns: WebDriver setup, session management, timeouts.",
    blockingScorecardDimensions: ["semanticUnderstanding"],
  },
  {
    gapId: "GAP-SE-004",
    gapType: "ASSERTION_ANALYSIS",
    priority: "P2",
    title: "Selenium assertion understanding",
    description:
      "Understand assertion patterns used alongside Selenium (JUnit, TestNG, pytest).",
    blockingScorecardDimensions: ["assertionUnderstanding"],
  },
  {
    gapId: "GAP-SE-005",
    gapType: "LIFECYCLE_MODELING",
    priority: "P2",
    title: "Selenium lifecycle modeling",
    description:
      "Model WebDriver session lifecycle: setup, navigation, teardown, quit.",
    blockingScorecardDimensions: ["lifecycleModeling"],
  },
  {
    gapId: "GAP-SE-006",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Selenium async semantics",
    description: "Detect implicit/explicit waits and async Selenium patterns.",
    blockingScorecardDimensions: ["asyncSemantics"],
  },
  {
    gapId: "GAP-SE-007",
    gapType: "FIXTURE_MODELING",
    priority: "P2",
    title: "Selenium fixture modeling",
    description: "Model WebDriver/ChromeDriver/GeckoDriver fixture management.",
    blockingScorecardDimensions: ["fixtureModeling"],
  },
  {
    gapId: "GAP-SE-008",
    gapType: "PARALLELISM_SAFETY",
    priority: "P2",
    title: "Selenium shared state analysis",
    description:
      "Detect shared state between Selenium tests (driver instances, ports, files).",
    blockingScorecardDimensions: ["sharedStateAnalysis"],
  },
  {
    gapId: "GAP-SE-009",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Selenium retry semantics",
    description:
      "Model Selenium-specific retry patterns (stale element, timeout retries).",
    blockingScorecardDimensions: ["retrySemantics"],
  },
  {
    gapId: "GAP-SE-010",
    gapType: "AST_ANALYSIS",
    priority: "P2",
    title: "Selenium parameterization analysis",
    description:
      "Detect parameterized Selenium tests via host framework parameterization.",
    blockingScorecardDimensions: ["parameterization"],
  },
  {
    gapId: "GAP-SE-011",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Selenium runtime evidence collection",
    description:
      "Collect runtime evidence from Selenium test runs for corroboration.",
    blockingScorecardDimensions: ["runtimeEvidence"],
  },
  {
    gapId: "GAP-SE-012",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Selenium adversarial corpus",
    description:
      "Build adversarial test corpus targeting Selenium-specific anti-patterns.",
    blockingScorecardDimensions: ["adversarialCorpus"],
  },
  {
    gapId: "GAP-SE-013",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "Selenium known limitation coverage",
    description: "Document and test known limitations of Selenium analysis.",
    blockingScorecardDimensions: ["knownLimitationCoverage"],
  },
]);

const testngGaps = makeFrameworkGaps("testng", "TN", [
  {
    gapId: "GAP-TN-001",
    gapType: "TEST_DISCOVERY",
    priority: "P1",
    title: "TestNG test discovery",
    description:
      "Implement basic discovery of TestNG test files via annotations and XML config.",
    blockingScorecardDimensions: ["discovery"],
  },
  {
    gapId: "GAP-TN-002",
    gapType: "AST_ANALYSIS",
    priority: "P1",
    title: "TestNG AST-based usage analysis",
    description:
      "Deepen Java AST analysis for TestNG patterns (@Test, @BeforeClass, groups).",
    blockingScorecardDimensions: ["astUsage"],
  },
  {
    gapId: "GAP-TN-003",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P1",
    title: "TestNG semantic understanding",
    description:
      "Model TestNG-specific patterns: groups, dependsOnMethods, priority, dataProviders.",
    blockingScorecardDimensions: ["semanticUnderstanding"],
  },
  {
    gapId: "GAP-TN-004",
    gapType: "ASSERTION_ANALYSIS",
    priority: "P2",
    title: "TestNG assertion understanding",
    description: "Understand TestNG Assert class and SoftAssert patterns.",
    blockingScorecardDimensions: ["assertionUnderstanding"],
  },
  {
    gapId: "GAP-TN-005",
    gapType: "LIFECYCLE_MODELING",
    priority: "P2",
    title: "TestNG lifecycle modeling",
    description:
      "Model @BeforeSuite/@BeforeClass/@BeforeMethod and their counterparts.",
    blockingScorecardDimensions: ["lifecycleModeling"],
  },
  {
    gapId: "GAP-TN-006",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "TestNG async semantics",
    description:
      "Detect async test patterns in TestNG (Futures, async invocation).",
    blockingScorecardDimensions: ["asyncSemantics"],
  },
  {
    gapId: "GAP-TN-007",
    gapType: "FIXTURE_MODELING",
    priority: "P2",
    title: "TestNG fixture modeling",
    description: "Model TestNG IInvokedMethodListener, ITestListener fixtures.",
    blockingScorecardDimensions: ["fixtureModeling"],
  },
  {
    gapId: "GAP-TN-008",
    gapType: "PARALLELISM_SAFETY",
    priority: "P2",
    title: "TestNG shared state analysis",
    description:
      "Detect shared state between TestNG parallel tests and static fields.",
    blockingScorecardDimensions: ["sharedStateAnalysis"],
  },
  {
    gapId: "GAP-TN-009",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "TestNG retry semantics",
    description: "Model TestNG IRetryAnalyzer and retry patterns.",
    blockingScorecardDimensions: ["retrySemantics"],
  },
  {
    gapId: "GAP-TN-010",
    gapType: "AST_ANALYSIS",
    priority: "P2",
    title: "TestNG parameterization analysis",
    description:
      "Detect @DataProvider, @Parameters, and XML-based parameterization.",
    blockingScorecardDimensions: ["parameterization"],
  },
  {
    gapId: "GAP-TN-011",
    gapType: "PARALLELISM_SAFETY",
    priority: "P1",
    title: "TestNG worker safety analysis",
    description:
      "Analyze TestNG parallel suite configuration for resource contention.",
    blockingScorecardDimensions: ["parallelismWorkerSafety"],
  },
  {
    gapId: "GAP-TN-012",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "TestNG runtime evidence collection",
    description:
      "Collect runtime evidence from TestNG test runs for corroboration.",
    blockingScorecardDimensions: ["runtimeEvidence"],
  },
  {
    gapId: "GAP-TN-013",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "TestNG adversarial corpus",
    description:
      "Build adversarial test corpus targeting TestNG-specific anti-patterns.",
    blockingScorecardDimensions: ["adversarialCorpus"],
  },
  {
    gapId: "GAP-TN-014",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P2",
    title: "TestNG known limitation coverage",
    description: "Document and test known limitations of TestNG analysis.",
    blockingScorecardDimensions: ["knownLimitationCoverage"],
  },
]);

const gitlabCiGaps = makeFrameworkGaps("gitlab-ci", "GL", [
  {
    gapId: "GAP-GL-001",
    gapType: "TEST_DISCOVERY",
    priority: "P0",
    title: "GitLab CI pipeline discovery",
    description:
      "Implement basic discovery and parsing of .gitlab-ci.yml pipeline definitions.",
    blockingScorecardDimensions: ["discovery"],
  },
  {
    gapId: "GAP-GL-002",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P0",
    title: "GitLab CI semantic understanding",
    description:
      "Model GitLab CI-specific patterns: stages, jobs, rules, includes, extends.",
    blockingScorecardDimensions: ["semanticUnderstanding"],
  },
  {
    gapId: "GAP-GL-003",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P1",
    title: "GitLab CI error classification",
    description:
      "Classify GitLab CI job failures: exit codes, retry, allow_failure, when.",
    blockingScorecardDimensions: ["errorClassification"],
  },
  {
    gapId: "GAP-GL-004",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P1",
    title: "GitLab CI retry semantics",
    description:
      "Model GitLab CI retry: and:when patterns and max retry limits.",
    blockingScorecardDimensions: ["retrySemantics"],
  },
  {
    gapId: "GAP-GL-005",
    gapType: "AST_ANALYSIS",
    priority: "P1",
    title: "GitLab CI parameterization analysis",
    description:
      "Detect GitLab CI parallel:matrix, variables, and environment parameterization.",
    blockingScorecardDimensions: ["parameterization"],
  },
  {
    gapId: "GAP-GL-006",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P1",
    title: "GitLab CI runtime evidence collection",
    description: "Collect runtime evidence from GitLab CI pipelines via API.",
    blockingScorecardDimensions: ["runtimeEvidence"],
  },
  {
    gapId: "GAP-GL-007",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P1",
    title: "GitLab CI adversarial corpus",
    description: "Build adversarial corpus targeting GitLab CI anti-patterns.",
    blockingScorecardDimensions: ["adversarialCorpus"],
  },
  {
    gapId: "GAP-GL-008",
    gapType: "SEMANTIC_UNDERSTANDING",
    priority: "P1",
    title: "GitLab CI known limitation coverage",
    description: "Document and test known limitations of GitLab CI analysis.",
    blockingScorecardDimensions: ["knownLimitationCoverage"],
  },
  {
    gapId: "GAP-GL-009",
    gapType: "CI_INTEGRATION",
    priority: "P1",
    title: "GitLab CI integration",
    description:
      "Implement GitLab CI integration: badge, PR comments, MR annotations.",
    blockingScorecardDimensions: ["ciIntegration"],
  },
  {
    gapId: "GAP-GL-010",
    gapType: "TEST_DISCOVERY",
    priority: "P1",
    title: "GitLab CI config discovery",
    description:
      "Implement auto-detection of .gitlab-ci.yml and CI config loading.",
    blockingScorecardDimensions: ["configDiscovery"],
  },
]);

const githubActionsGaps: GapEntry[] = [];
const azureDevopsGaps: GapEntry[] = [];
const jenkinsGaps: GapEntry[] = [];

export const GAP_REGISTRY: readonly GapEntry[] = [
  ...pwGaps,
  ...jestGaps,
  ...vitestGaps,
  ...pytestGaps,
  ...junitGaps,
  ...nunitGaps,
  ...xunitGaps,
  ...cypressGaps,
  ...seleniumGaps,
  ...testngGaps,
  ...githubActionsGaps,
  ...azureDevopsGaps,
  ...jenkinsGaps,
  ...gitlabCiGaps,
] as const;

export function getGapById(gapId: string): GapEntry | undefined {
  return GAP_REGISTRY.find((g) => g.gapId === gapId);
}

export function getGapsByFramework(frameworkId: string): readonly GapEntry[] {
  return GAP_REGISTRY.filter((g) => g.frameworkId === frameworkId);
}

export function getGapsByType(gapType: GapType): readonly GapEntry[] {
  return GAP_REGISTRY.filter((g) => g.gapType === gapType);
}

export function getGapsByPriority(priority: GapPriority): readonly GapEntry[] {
  return GAP_REGISTRY.filter((g) => g.priority === priority);
}

export function getOpenGaps(): readonly GapEntry[] {
  return GAP_REGISTRY;
}

export interface GapRegistryValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateGapRegistry(): GapRegistryValidationResult {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const gap of GAP_REGISTRY) {
    if (seen.has(gap.gapId)) {
      errors.push(`Duplicate gapId: ${gap.gapId}`);
    }
    seen.add(gap.gapId);

    if (!gap.gapId.match(/^GAP-[A-Z]+-\d{3}$/)) {
      errors.push(`Invalid gapId format: ${gap.gapId}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateScorecardCoverage(
  scorecardGapIds: readonly string[],
  registry: readonly GapEntry[] = GAP_REGISTRY,
): { covered: readonly string[]; missing: readonly string[] } {
  const registryIds = new Set(registry.map((g) => g.gapId));
  const covered: string[] = [];
  const missing: string[] = [];

  for (const id of scorecardGapIds) {
    if (registryIds.has(id)) {
      covered.push(id);
    } else {
      missing.push(id);
    }
  }

  return { covered, missing };
}
