/**
 * Forensics types (Upgrade-Plan-v2 Part 2 §2.3 / Master Plan R4).
 *
 * Runtime evidence layer: ingest real run results (Playwright JSON report,
 * JUnit XML) and derive reliability facts that static analysis cannot see:
 * retries, flakiness, slow tests, failure rates.
 */

export type RunStatus =
  "passed" | "failed" | "timedOut" | "skipped" | "interrupted";

/** One attempt of one test in one run. */
export interface Attempt {
  /** 1-based attempt number within the test's execution. */
  index: number;
  status: RunStatus;
  durationMs: number;
}

/** A single executed test, possibly retried. */
export interface TestRecord {
  /** Repo-relative spec path when known ("unknown" for JUnit class names). */
  file: string;
  title: string;
  attempts: Attempt[];
  /**
   * 1-based spec declaration line when the report format carries it
   * (Playwright JSON spec.location). Plan §16: enables test-level
   * runtime corroboration — a finding's line falling inside a test's
   * declaration span ties the static finding to the executed test.
   */
  line?: number;
}

/** Derived per-test reliability facts. */
export interface TestVerdict {
  file: string;
  title: string;
  attempts: number;
  finalStatus: RunStatus;
  totalDurationMs: number;
  /**
   * TRUE-FLAKE: passed only on attempt >= 2 — not a passing test,
   * a lucky test.
   */
  passedOnRetry: boolean;
  /** Failed at least once across attempts. */
  everFailed: boolean;
  skipped: boolean;
  /**
   * 1-based spec declaration line when known (plan §16). Enables
   * test-level runtime corroboration: a finding between this line and
   * the next declared test's line in the same file belongs to this
   * test. Undefined when the report format omits locations (JUnit).
   */
  line?: number;
}

export interface ForensicsReport {
  source: "playwright-json" | "junit-xml";
  totalTests: number;
  failed: number;
  skipped: number;
  retriedTests: number;
  flakyTests: number;
  totalDurationMs: number;
  verdicts: TestVerdict[];
}
