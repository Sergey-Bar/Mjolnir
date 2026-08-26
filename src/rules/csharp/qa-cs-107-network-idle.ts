/**
 * QA-CS-107 — Playwright-.NET: networkidle waits.
 * Severity: warning · Confidence: high · deterministic-defect
 * page.WaitForLoadStateAsync(LoadState.NetworkIdle) is flaky by
 * design — same meaning as QA-PW-118/QA-PY-107/QA-JV-107, translated
 * to .NET's PascalCase enum (verified in
 * docs/JAVA-CSHARP-IDIOM-MAPPING.md against the official Playwright
 * .NET docs: `LoadState.NetworkIdle`, not a string literal).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const csNetworkIdle = defineRule({
  id: "QA-CS-107",
  category: "QA-PW",
  title: "networkidle wait (flaky by design)",
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

    const re = /\.WaitForLoadStateAsync\s*\(\s*LoadState\.NetworkIdle\s*\)/g;
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
        message: "`WaitForLoadStateAsync(LoadState.NetworkIdle)` used.",
        why: "Analytics, websockets, and polling make network idle never fire or fire randomly — a documented source of Playwright flakes.",
        fix: "Wait for the specific response (`page.WaitForResponseAsync(...)`) or assert on the rendered element with `await Assertions.Expect(locator).ToBeVisibleAsync()`.",
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
