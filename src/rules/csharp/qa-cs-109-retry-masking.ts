/**
 * QA-CS-109 — Retry masking test failures (C#: NUnit/xUnit).
 * Severity: warning · Confidence: high (NUnit) / medium (xUnit)
 *
 * Sprint 8 Task 34 (Master-Stabilization-Plan.md). Per the idiom-mapping
 * spike (docs/JAVA-CSHARP-IDIOM-MAPPING.md), NUnit and xUnit have
 * genuinely different retry mechanisms:
 *
 *   - NUnit has a FIRST-CLASS `[Retry(n)]` attribute
 *     (`NUnit.Framework.RetryAttribute`, verified against NUnit's own
 *     docs) — high-confidence, low false-positive-risk detection.
 *   - xUnit has NO first-class retry attribute at all. The ecosystem is
 *     fragmented across multiple third-party packages (xRetry's
 *     `[RetryFact]`/`[RetryTheory]`, xunit-retry, custom wrappers) that
 *     converge on a `RetryFact`/`RetryTheory` naming convention rather
 *     than a single canonical API — detection here is necessarily
 *     medium confidence, and this rule cannot verify which (if any)
 *     package actually backs the attribute in a given project.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const csRetryMasking = defineRule({
  id: "QA-CS-109",
  category: "QA-PW",
  title: "Retry masks test failures",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FLAKY-RISK",
  appliesTo: "csharp",
  // Trust Metadata
  languages: ["csharp"],
  frameworks: ["nunit", "xunit"],
  // Honest about the weaker of the two detection paths (xUnit's
  // convention-based, package-fragmented one) — see the file header.
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy:
    "regex pattern (framework-specific: NUnit [Retry(n)] attribute vs xUnit RetryFact/RetryTheory naming convention)",
  introduced: "0.4.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".cs")) return findings;

    // NUnit: [Retry(n)] — first-class, high-confidence detection.
    // [Retry(1)] is a documented no-op (runs exactly once) so it is
    // deliberately excluded — flagging it would be a false positive.
    const nunitRe = /\[Retry\s*\(\s*(\d+)\s*\)\s*\]/g;
    let m: RegExpExecArray | null;
    while ((m = nunitRe.exec(ctx.text)) !== null) {
      const count = Number(m[1]);
      if (count <= 1) continue;
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `NUnit \`[Retry(${count})]\` automatically re-runs a failing test.`,
        why: "Retrying until a test passes hides intermittent failures — the reported result no longer reflects whether the suite is actually reliable.",
        fix: "Remove the Retry attribute; investigate and fix the underlying flakiness instead.",
      });
    }

    // xUnit: fragmented third-party convention (RetryFact/RetryTheory).
    const xunitRe = /\[Retry(?:Fact|Theory)(?:\([^)]*\))?\]/g;
    while ((m = xunitRe.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "medium",
        findingType: "heuristic-risk",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `xUnit retry convention (\`${m[0]}\`) automatically re-runs a failing test.`,
        why: "xUnit has no first-class retry attribute — a third-party retry package used here hides intermittent failures the same way NUnit's [Retry] does.",
        fix: "Remove the retry attribute/package; investigate and fix the underlying flakiness instead.",
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
