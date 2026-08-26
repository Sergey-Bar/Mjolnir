/**
 * QA-JV-107 — Playwright-Java: networkidle waits.
 * Severity: warning · Confidence: high · deterministic-defect
 * page.waitForLoadState(LoadState.NETWORKIDLE) is flaky by design —
 * same meaning as QA-PW-118/QA-PY-107, translated to Java's enum-based
 * API (verified against the official Playwright Java docs in
 * docs/JAVA-CSHARP-IDIOM-MAPPING.md: the enum constant is
 * LoadState.NETWORKIDLE, not a string literal like Python's).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const jvNetworkIdle = defineRule({
  id: "QA-JV-107",
  category: "QA-PW",
  title: "networkidle wait (flaky by design)",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
  appliesTo: "java",
  // Trust Metadata
  languages: ["java"],
  frameworks: ["junit", "testng", "playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.4.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".java")) return findings;

    const re = /\.waitForLoadState\s*\(\s*LoadState\.NETWORKIDLE\s*\)/g;
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
        message: "`waitForLoadState(LoadState.NETWORKIDLE)` used.",
        why: "Analytics, websockets, and polling make network idle never fire or fire randomly — a documented source of Playwright flakes.",
        fix: "Wait for the specific response (`page.waitForResponse(...)`) or assert on the rendered element with `assertThat(locator).isVisible()`.",
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
