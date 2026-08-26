/**
 * QA-CS-105 — Playwright-.NET: WaitForTimeoutAsync hard sleep.
 * Severity: warning · Confidence: high · deterministic-defect
 * Same meaning as QA-PW-101/QA-JV-105/QA-PY-103, translated to the
 * PascalCase Async-suffixed .NET API (verified in
 * docs/JAVA-CSHARP-IDIOM-MAPPING.md — .NET Playwright is async-only,
 * there is no sync WaitForTimeout).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const csWaitForTimeout = defineRule({
  id: "QA-CS-105",
  category: "QA-PW",
  title: "WaitForTimeoutAsync hard sleep",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "csharp",
  // Trust Metadata
  languages: ["csharp"],
  frameworks: ["nunit", "xunit", "mstest", "playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.4.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".cs")) return findings;

    const re = /\.WaitForTimeoutAsync\s*\(/g;
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
        message: "`WaitForTimeoutAsync()` hard sleep.",
        why: "Fixed waits encode hope, not synchronization — too short flakes under load, too long slows every run.",
        fix: "Use `await Assertions.Expect(locator).ToBeVisibleAsync()` or `locator.WaitForAsync()` with auto-waiting.",
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
