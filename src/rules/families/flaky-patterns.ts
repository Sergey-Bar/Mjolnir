/**
 * Flaky-pattern detection families (INTEL-004, plan §37.2).
 *
 * Defines structured flaky-pattern families that rules can reference
 * for detection strategies, metadata, and evidence classification.
 * Each family describes a class of flakiness and the patterns that
 * indicate its presence.
 */

// ─── Types ───────────────────────────────────────────────────────────

export type EvidenceLevel = "E0" | "E1" | "E2";

export interface FlakyPatternFamily {
  /** Unique family identifier. */
  id: string;
  /** Human-readable description. */
  description: string;
  /** How this pattern is detected. */
  detectionStrategy: "LEXICAL" | "AST" | "SEMANTIC" | "RUNTIME";
  /** Frameworks where this pattern is applicable. */
  applicableFrameworks: string[];
  /**
   * Evidence level the detection carries:
   * E0 — observation only; E1 — heuristic; E2 — deterministic.
   */
  evidenceLevel: EvidenceLevel;
  /** Regex source patterns to look for (source strings, not compiled). */
  patterns: string[];
}

// ─── Family definitions ──────────────────────────────────────────────

export const FLAKY_PATTERN_FAMILIES: readonly FlakyPatternFamily[] = [
  {
    id: "UNAWAITED_ASYNC",
    description:
      "An async operation (Promise, Task, Future) whose result is not " +
      "awaited or returned — the test completes before the operation, " +
      "making pass/fail nondeterministic.",
    detectionStrategy: "AST",
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
    evidenceLevel: "E2",
    patterns: [
      "\\b(?:it|test)\\s*\\(\\s*['\"][^'\"]*['\"]\\s*,\\s*(?:async\\s+)?\\(",
      "(?<!await\\s)(?<!return\\s)\\b(?:fetch|axios|request|http\\w*\\.get|http\\w*\\.post)\\s*\\(",
      "\\bnew\\s+Promise\\s*\\(",
    ],
  },
  {
    id: "NONDETERMINISTIC_INPUT",
    description:
      "Test relies on nondeterministic input (Date.now(), Math.random(), " +
      "UUID generation, current time) without fixed seeding or mocking.",
    detectionStrategy: "LEXICAL",
    applicableFrameworks: [
      "jest",
      "vitest",
      "mocha",
      "playwright",
      "junit",
      "testng",
      "nunit",
      "xunit",
      "pytest",
    ],
    evidenceLevel: "E1",
    patterns: [
      "\\bDate\\.now\\s*\\(",
      "\\bnew\\s+Date\\s*\\(\\s*\\)",
      "\\bMath\\.random\\s*\\(",
      "\\buuid\\s*\\(",
      "\\bUUID\\.randomUUID\\s*\\(",
      "\\bSystem\\.currentTimeMillis\\s*\\(",
      "\\bLocalDateTime\\.now\\s*\\(",
      "\\bdatetime\\.now\\s*\\(",
    ],
  },
  {
    id: "UNMOCKED_EXTERNAL_DEPENDENCY",
    description:
      "Test calls an external service (HTTP, database, filesystem, " +
      "message queue) without mocking — network latency, service " +
      "availability, or data state can cause intermittent failures.",
    detectionStrategy: "LEXICAL",
    applicableFrameworks: [
      "jest",
      "vitest",
      "mocha",
      "playwright",
      "junit",
      "testng",
      "nunit",
      "xunit",
      "pytest",
    ],
    evidenceLevel: "E1",
    patterns: [
      "\\b(?:fetch|axios|request)\\s*\\(\\s*['\"]https?://",
      "\\bhttp(?:s)?\\.get\\s*\\(",
      "\\bhttp(?:s)?\\.request\\s*\\(",
      "\\bHttpClient\\.",
      "\\bRestTemplate\\.",
      "\\bWebClient\\.",
      "\\brequests\\.get\\s*\\(",
      "\\brequests\\.post\\s*\\(",
      "\\burllib\\.request\\.",
      "\\bDriverManager\\.getConnection\\s*\\(",
      "\\bcreateConnection\\s*\\(",
      "\\bMongoClient\\s*\\(",
    ],
  },
  {
    id: "HARD_SLEEP",
    description:
      "Fixed-duration sleep or delay used to wait for state — fragile " +
      "under load, slow everywhere. Wait-for-condition or locator " +
      "auto-wait should replace it.",
    detectionStrategy: "LEXICAL",
    applicableFrameworks: [
      "playwright",
      "cypress",
      "selenium",
      "webdriverio",
      "junit",
      "testng",
      "nunit",
      "xunit",
      "pytest",
    ],
    evidenceLevel: "E2",
    patterns: [
      "\\bThread\\.sleep\\s*\\(",
      "\\bTask\\.Delay\\s*\\(",
      "\\btime\\.sleep\\s*\\(",
      "\\bcy\\.wait\\s*\\(\\s*\\d+",
      "\\bnew\\s+FluentWait\\b",
      "\\bWebDriverWait\\b",
    ],
  },
];

/**
 * Count of registered flaky-pattern families. Exposed for test
 * assertions and validation.
 */
export const FLAKY_PATTERN_FAMILY_COUNT = FLAKY_PATTERN_FAMILIES.length;
