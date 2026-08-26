/**
 * QA-JV-104 — Playwright page shared via static field.
 * Severity: warning · Confidence: medium · heuristic-risk
 * A static Page in Java Playwright is shared across parallel tests —
 * order-dependent flakes by construction.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const jvSharedPage = defineRule({
  id: "QA-JV-104",
  category: "QA-PW",
  title: "Static/shared Playwright page across tests",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FLAKY-RISK",
  appliesTo: "java",
  // Trust Metadata
  languages: ["java"],
  frameworks: ["junit", "testng", "playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.8",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".java")) return findings;

    // static Page/Browser/Playwright fields — shared mutable browser state.
    const re =
      /^\s*(?:private|public|protected)?\s*static\s+(?:final\s+)?(?:Page|Browser|BrowserContext|Playwright)\b/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "medium",
        findingType: "heuristic-risk",
        qaImpact: "FLAKY-RISK",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `\`static ${(m[0] ?? "").trim().split(/\s+/).pop()}\` — browser state shared across tests.`,
        why: "Parallel test execution shares the JVM's statics: one test navigating or closing the page corrupts every other test's session.",
        fix: "Create the Page per test (@BeforeEach) or use Playwright's JUnit extension `@InjectPage`.",
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
