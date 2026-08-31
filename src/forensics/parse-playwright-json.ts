/**
 * Playwright JSON report ingestion (reporter: [['json']] output).
 *
 * Shape (relevant subset):
 * { suites: [{ suites: [...], specs: [{ title, file, line, tests:
 *   [{ projectName, results: [{ status, duration }] }] }] }] }
 *
 * We walk recursively and treat each spec's tests as one record per
 * project; attempts come from `results` in order.
 */

import type { Attempt, RunStatus, TestRecord } from "./types.js";

const MAX_DEPTH = 32;

interface PwResult {
  status?: string;
  duration?: number;
}

interface PwTest {
  results?: PwResult[];
}

interface PwSpec {
  title?: string;
  file?: string;
  tests?: PwTest[];
}

interface PwSuite {
  suites?: PwSuite[];
  specs?: PwSpec[];
}

function toStatus(raw: string | undefined): RunStatus {
  switch (raw) {
    case "passed":
      return "passed";
    case "failed":
      return "failed";
    case "timedOut":
      return "timedOut";
    case "skipped":
      return "skipped";
    case "interrupted":
      return "interrupted";
    default:
      return "interrupted";
  }
}

export function parsePlaywrightJson(json: unknown): TestRecord[] {
  const root = json as PwSuite;
  if (!root || typeof root !== "object") return [];
  const out: TestRecord[] = [];

  const walk = (suite: PwSuite, depth: number): void => {
    if (depth > MAX_DEPTH) return;
    if (!suite || typeof suite !== "object") return;
    // Bug-audit M3: a corrupt report can hold a non-array where an array
    // belongs (a number is not nullish, so `?? []` does not protect) —
    // iteration then throws a TypeError and the caller crashed with
    // exit 20 instead of the honest exit 2. Array.isArray guards make
    // the parser total over arbitrary JSON.
    const suites = Array.isArray(suite.suites) ? suite.suites : [];
    for (const child of suites) walk(child, depth + 1);
    const specs = Array.isArray(suite.specs) ? suite.specs : [];
    for (const spec of specs) {
      // Array ELEMENTS from a corrupt report can be null/primitives too
      // (caught by the arbitrary-JSON property test, B4.24).
      if (!spec || typeof spec !== "object") continue;
      const file = spec.file ?? "unknown";
      const tests = Array.isArray(spec.tests) ? spec.tests : [];
      for (const test of tests) {
        if (!test || typeof test !== "object") continue;
        const attempts: Attempt[] = [];
        let i = 0;
        const results = Array.isArray(test.results) ? test.results : [];
        for (const r of results) {
          if (!r || typeof r !== "object") continue;
          attempts.push({
            index: ++i,
            status: toStatus(r.status),
            durationMs: Number.isFinite(r.duration)
              ? Math.max(0, r.duration as number)
              : 0,
          });
        }
        if (attempts.length === 0) continue;
        out.push({ file, title: spec.title ?? "(unnamed)", attempts });
      }
    }
  };

  walk(root, 0);
  return out;
}
