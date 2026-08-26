/**
 * QA-JV-109 — Retry masking test failures (Java: TestNG/JUnit).
 * Severity: warning · Confidence: medium/high (framework-dependent, see
 * below) · deterministic-defect (TestNG) / heuristic-risk (JUnit)
 *
 * Sprint 8 Task 34 (Master-Stabilization-Plan.md). Per the idiom-mapping
 * spike (docs/JAVA-CSHARP-IDIOM-MAPPING.md), TestNG and JUnit have
 * genuinely different retry mechanisms and cannot honestly share one
 * regex:
 *
 *   - TestNG has a FIRST-CLASS `retryAnalyzer` attribute directly on
 *     `@Test` — detection is high-confidence, low false-positive-risk,
 *     because there is no other reason to write this exact syntax.
 *   - JUnit has NO first-class retry API. The only way to retry a
 *     failing test is a third-party rerun-extension convention
 *     (`@RetryingTest` from junit-pioneer, or a custom
 *     `@ExtendWith(...Retry...)`) — detection here is necessarily
 *     medium confidence / medium false-positive risk, because these
 *     are conventions, not a language feature, and this rule cannot
 *     verify the referenced extension actually retries anything.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const jvRetryMasking = defineRule({
  id: "QA-JV-109",
  category: "QA-PW",
  title: "Retry masks test failures",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FLAKY-RISK",
  appliesTo: "java",
  // Trust Metadata
  languages: ["java"],
  frameworks: ["junit", "testng"],
  // Honest about the weaker of the two detection paths (JUnit's
  // convention-based one) — see the file header for why.
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy:
    "regex pattern (framework-specific: TestNG retryAnalyzer vs JUnit rerun-extension convention)",
  introduced: "0.4.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".java")) return findings;

    // TestNG: @Test(retryAnalyzer = SomeClass.class) — first-class,
    // high-confidence detection.
    const testngRe = /@Test\s*\([^)]*retryAnalyzer\s*=\s*([\w.]+)\s*\.class/g;
    let m: RegExpExecArray | null;
    while ((m = testngRe.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `TestNG \`retryAnalyzer = ${m[1]}\` automatically re-runs a failing test.`,
        why: "Retrying until a test passes hides intermittent failures — the reported result no longer reflects whether the suite is actually reliable.",
        fix: "Remove the retryAnalyzer; investigate and fix the underlying flakiness instead.",
      });
    }

    // JUnit: rerun-extension convention (junit-pioneer's @RetryingTest,
    // or a custom @ExtendWith referencing something retry-shaped).
    const junitRe = /@RetryingTest\s*\(|@ExtendWith\s*\([^)]*Retry[^)]*\)/g;
    while ((m = junitRe.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "medium",
        findingType: "heuristic-risk",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `JUnit rerun-extension convention (\`${m[0]}\`) automatically re-runs a failing test.`,
        why: "JUnit has no first-class retry API — a third-party rerun extension used here hides intermittent failures the same way TestNG's retryAnalyzer does.",
        fix: "Remove the retry extension; investigate and fix the underlying flakiness instead.",
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
