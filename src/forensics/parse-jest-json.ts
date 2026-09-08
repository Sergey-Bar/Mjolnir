/**
 * Jest JSON report ingestion (product-gap-remediation master plan P4,
 * plan 1788853205786 — flag 7, decision 5).
 *
 * Shape (`jest --json --outputFile=report.json`, relevant subset):
 * { testResults: [{ testFilePath, testResults: [{ ancestorTitles,
 *   title, status, duration, location: { line, column } }] }] }
 *
 * Honest degradation is the design, not a limitation to hide: Jest's
 * JSON carries the FINAL status per test — `jest.retryTimes()` attempts
 * are not recorded — so every record has exactly ONE attempt and
 * TRUE-FLAKE cannot fire from this source (analyze.ts's passedOnRetry
 * requires attempts >= 2). A report that cannot show retries must not
 * imply a clean retry history.
 *
 * Status mapping: Jest's closed status enum maps onto RunStatus;
 * `pending` / `todo` / `disabled` are non-executing states → skipped
 * (a test that did not run is not a passing test).
 */

import type { Attempt, RunStatus, TestRecord } from "./types.js";

interface JestAssertion {
  title?: string;
  status?: string;
  duration?: number;
  location?: { line?: number; column?: number };
}

interface JestTestResult {
  testFilePath?: string;
  testResults?: JestAssertion[];
}

interface JestJsonReport {
  testResults?: JestTestResult[];
}

function toStatus(raw: string | undefined): RunStatus {
  switch (raw) {
    case "passed":
      return "passed";
    case "failed":
      return "failed";
    case "skipped":
    case "pending":
    case "todo":
    case "disabled":
      return "skipped";
    default:
      // Jest's JSON never emits timedOut/interrupted as final statuses;
      // an unknown value is an unknown run outcome, reported honestly.
      return "interrupted";
  }
}

/**
 * Sniff: does this parsed JSON have the Jest shape? Exported for the
 * discovery dispatcher (run.ts) — Jest and Vitest share the top-level
 * `testResults` name; the discriminator is the per-file array's member
 * name (`testResults` = Jest, `assertionResults` = Vitest).
 */
export function looksLikeJestJson(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const testResults = (json as JestJsonReport).testResults;
  if (!Array.isArray(testResults) || testResults.length === 0) return false;
  return testResults.some(
    (r) => r && typeof r === "object" && Array.isArray(r.testResults),
  );
}

export function parseJestJson(json: unknown): TestRecord[] {
  if (!json || typeof json !== "object") return [];
  const root = json as JestJsonReport;
  const files = Array.isArray(root.testResults) ? root.testResults : [];
  const out: TestRecord[] = [];

  for (const fileResult of files.slice(0, 10_000)) {
    if (!fileResult || typeof fileResult !== "object") continue;
    const assertions = Array.isArray(fileResult.testResults)
      ? fileResult.testResults
      : [];
    // Repo-relative path when Jest gives one; "unknown" keeps the
    // TestRecord contract (file is a required identity field).
    const file = fileResult.testFilePath ?? "unknown";
    for (const assertion of assertions) {
      if (!assertion || typeof assertion !== "object") continue;
      const durationMs =
        Number.isFinite(assertion.duration) &&
        (assertion.duration as number) >= 0
          ? Math.round(assertion.duration as number)
          : 0;
      const attempt: Attempt = {
        index: 1,
        status: toStatus(assertion.status),
        durationMs,
      };
      // Jest location.line is 1-based (the JSON reporter emits editor
      // coordinates). Carry it when present so runtime corroboration can
      // tie findings to the executed test (plan §16 contract).
      const line =
        typeof assertion.location?.line === "number" &&
        assertion.location.line > 0
          ? assertion.location.line
          : undefined;
      const title = assertion.title ?? "(unnamed)";
      // ancestorTitles are Jest's describe nesting — the record's title
      // stays the test's own name (the leaderboard renders file + title).
      out.push({
        file,
        title,
        attempts: [attempt],
        ...(line !== undefined ? { line } : {}),
      });
    }
  }
  return out;
}
