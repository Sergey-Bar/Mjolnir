/**
 * Retry-masking family (Phase 6 — Tempering Plan).
 * Detects retry annotations/attributes that mask flaky tests.
 */

import { defineRule, type QADoctorRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const retryMaskingFamily: QADoctorRule[] = [
  defineRule({
    id: "QA-JV-109",
    category: "QA-PW",
    title: "Retry masks test failures",
    severity: "warning",
    confidence: "medium",
    findingType: "heuristic-risk",
    qaImpact: "FLAKY-RISK",
    appliesTo: "java",
    languages: ["java"],
    frameworks: ["junit", "testng"],
    falsePositiveRisk: "medium",
    autofix: false,
    detectionStrategy: "LEXICAL",
    introduced: "0.4.0",
    tier: "core",
    run(ctx) {
      const text = ctx.codeText ?? ctx.text;
      const findings: Omit<Finding, "ruleId" | "category">[] = [];
      if (!ctx.path.endsWith(".java")) return findings;

      // TestNG retryAnalyzer
      const testngRe = /@Test\s*\([^)]*retryAnalyzer\s*=\s*([\w.]+)\s*\.class/g;
      let m: RegExpExecArray | null;
      while ((m = testngRe.exec(text)) !== null) {
        findings.push({
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FLAKY-RISK",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `TestNG \`retryAnalyzer = ${m[1]}\` automatically re-runs a failing test.`,
          why: "Retrying until a test passes hides intermittent failures — the reported result no longer reflects whether the suite is actually reliable.",
          fix: "Remove the retryAnalyzer; fix the flake root cause, or quarantine the test explicitly.",
        });
      }
      // JUnit retry extensions
      const junitRe = /@RetryingTest\s*\(|@ExtendWith\s*\([^)]*Retry[^)]*\)/g;
      while ((m = junitRe.exec(text)) !== null) {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "FLAKY-RISK",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `JUnit rerun-extension convention (\`${m[0]}\`) automatically re-runs a failing test.`,
          why: "Retrying until a test passes hides intermittent failures — the reported result no longer reflects whether the suite is actually reliable.",
          fix: "Remove the retry extension; fix the flake root cause, or quarantine the test explicitly.",
        });
      }
      return findings;
    },
  }),
  defineRule({
    id: "QA-CS-109",
    category: "QA-PW",
    title: "Retry masks test failures",
    severity: "warning",
    confidence: "medium",
    findingType: "heuristic-risk",
    qaImpact: "FLAKY-RISK",
    appliesTo: "csharp",
    languages: ["csharp"],
    frameworks: ["nunit", "xunit", "mstest"],
    falsePositiveRisk: "medium",
    autofix: false,
    detectionStrategy: "LEXICAL",
    introduced: "0.4.0",
    tier: "extended",
    run(ctx) {
      const text = ctx.codeText ?? ctx.text;
      const findings: Omit<Finding, "ruleId" | "category">[] = [];
      if (!ctx.path.endsWith(".cs")) return findings;

      // NUnit [Retry(N)]
      const nunitRe = /\[Retry\s*\(\s*(\d+)\s*\)\s*\]/g;
      let m: RegExpExecArray | null;
      while ((m = nunitRe.exec(text)) !== null) {
        const count = Number(m[1]);
        if (count <= 1) continue;
        findings.push({
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FLAKY-RISK",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `NUnit \`[Retry(${count})]\` automatically re-runs a failing test.`,
          why: "Retrying until a test passes hides intermittent failures — the reported result no longer reflects whether the suite is actually reliable.",
          fix: "Remove the [Retry] attribute; fix the flake root cause, or quarantine the test explicitly.",
        });
      }
      // xUnit retry conventions
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
      const xunitRe = /\[Retry(?:Fact|Theory)(?:\([^)]*\))?\]/g;
      while ((m = xunitRe.exec(text)) !== null) {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "FLAKY-RISK",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `xUnit retry convention (\`${m[0]}\`) automatically re-runs a failing test.`,
          why: "Retrying until a test passes hides intermittent failures — the reported result no longer reflects whether the suite is actually reliable.",
          fix: "Remove the retry attribute; fix the flake root cause, or quarantine the test explicitly.",
        });
      }
      return findings;
    },
  }),
];
