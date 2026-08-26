/**
 * QA-PY-101 — Playwright-Python: sync API in async test (or vice versa).
 * Severity: warning · Confidence: high · deterministic-defect
 * Mixing `playwright.sync_api` calls inside an async test deadlocks the
 * event loop — the classic Playwright-Python hang.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pyPwSyncAsyncMix = defineRule({
  id: "QA-PY-101",
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
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    // Only meaningful for files that use the sync API explicitly.
    if (!/from\s+playwright\.sync_api\s+import/.test(ctx.text)) return findings;

    // An async def test_* inside a sync-API file is almost always a hang.
    const re = /async\s+def\s+(test_\w+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `Async test \`${m[1]}\` in a file importing playwright.sync_api.`,
        why: "Calling the synchronous Playwright API from an async function blocks the event loop and hangs the run; the two APIs cannot be mixed.",
        fix: "Use pytest-playwright's injected page fixture with plain (non-async) tests, or import from playwright.async_api consistently.",
      });
    }
    return findings;
  },
});

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

function colAt(text: string, index: number): number {
  const lastBreak = text.lastIndexOf("\n", index - 1);
  return index - lastBreak;
}
