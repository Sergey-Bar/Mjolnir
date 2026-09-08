/**
 * Vitest JSON report ingestion (product-gap-remediation master plan P4,
 * plan 1788853205786 — flag 7, decision 5).
 *
 * Shape (`vitest --reporter=json`, relevant subset):
 * { testResults: [{ filepath, status, assertionResults: [{ ancestorTitles,
 *   title, status, duration, location: { line, column } }] }] }
 *
 * Vitest mirrors Jest's JSON shape with one decisive difference: the
 * per-file array is `assertionResults`, not `testResults` — that key is
 * the discovery discriminator (looksLikeJestJson vs this module).
 *
 * Honest degradation: Vitest's JSON records `retryCount` on retried
 * tests but NOT the intermediate attempt statuses — synthesizing them
 * would fabricate evidence. Every record therefore carries exactly ONE
 * attempt (the final outcome) and TRUE-FLAKE cannot fire from this
 * source. A report that cannot show the attempts must not imply a clean
 * retry history.
 */

import type { Attempt, RunStatus, TestRecord } from "./types.js";

interface VitestAssertion {
  title?: string;
  status?: string;
  duration?: number;
  location?: { line?: number; column?: number };
}

interface VitestFileResult {
  filepath?: string;
  assertionResults?: VitestAssertion[];
}

interface VitestJsonReport {
  testResults?: VitestFileResult[];
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
      // Unknown value = unknown run outcome, reported honestly.
      return "interrupted";
  }
}

/** Sniff: the Vitest variant of the Jest-shaped report (see module doc). */
export function looksLikeVitestJson(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const testResults = (json as VitestJsonReport).testResults;
  if (!Array.isArray(testResults) || testResults.length === 0) return false;
  return testResults.some(
    (r) => r && typeof r === "object" && Array.isArray(r.assertionResults),
  );
}

export function parseVitestJson(json: unknown): TestRecord[] {
  if (!json || typeof json !== "object") return [];
  const root = json as VitestJsonReport;
  const files = Array.isArray(root.testResults) ? root.testResults : [];
  const out: TestRecord[] = [];

  for (const fileResult of files.slice(0, 10_000)) {
    if (!fileResult || typeof fileResult !== "object") continue;
    const assertions = Array.isArray(fileResult.assertionResults)
      ? fileResult.assertionResults
      : [];
    const file = fileResult.filepath ?? "unknown";
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
      // Vitest location.line is 1-based (editor coordinates).
      const line =
        typeof assertion.location?.line === "number" &&
        assertion.location.line > 0
          ? assertion.location.line
          : undefined;
      out.push({
        file,
        title: assertion.title ?? "(unnamed)",
        attempts: [attempt],
        ...(line !== undefined ? { line } : {}),
      });
    }
  }
  return out;
}
