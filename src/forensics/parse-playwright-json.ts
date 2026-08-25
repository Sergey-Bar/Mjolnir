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
    for (const child of suite.suites ?? []) walk(child, depth + 1);
    for (const spec of suite.specs ?? []) {
      const file = spec.file ?? "unknown";
      for (const test of spec.tests ?? []) {
        const attempts: Attempt[] = [];
        let i = 0;
        for (const r of test.results ?? []) {
          attempts.push({
            index: ++i,
            status: toStatus(r.status),
            durationMs: Number.isFinite(r.duration)
              ? Math.max(0, r.duration ?? 0)
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
