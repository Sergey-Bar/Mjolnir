/**
 * QA-PY-101 — Playwright-Python: sync API in async test (or vice versa).
 * Severity: warning · Confidence: high · deterministic-defect
 * Mixing `playwright.sync_api` calls inside an async test deadlocks the
 * event loop — the classic Playwright-Python hang.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pyPwSyncAsyncMix = defineRule({
  id: "QA-PY-101",
  tier: "core",
  category: "QA-PW",
  title: "Sync/async Playwright API mix",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest-playwright", "playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex heuristic",
  introduced: "0.3.8",

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    // Only meaningful for files that use the sync API explicitly.
    if (!/from\s+playwright\.sync_api\s+import/.test(text)) return findings;

    // An async def test_* inside a sync-API file is almost always a hang.
    const re = /async\s+def\s+(test_\w+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: `Async test \`${m[1]}\` in a file importing playwright.sync_api.`,
        why: "Calling the synchronous Playwright API from an async function blocks the event loop and hangs the run; the two APIs cannot be mixed.",
        fix: "Use pytest-playwright's injected page fixture with plain (non-async) tests, or import from playwright.async_api consistently.",
      });
    }
    return findings;
  },
});
