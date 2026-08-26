/**
 * QA-JV-111 — page.route() blanket-mocking instead of scoped intercepts.
 * Severity: warning · Confidence: medium · heuristic-risk
 * Sprint 8 Task 35 (Master-Stabilization-Plan.md). Ports cleanly across
 * languages per the idiom-mapping spike (docs/JAVA-CSHARP-IDIOM-MAPPING.md)
 * — same meaning as QA-PW-142, only the surrounding syntax differs.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const jvBlanketRouteMock = defineRule({
  id: "QA-JV-111",
  category: "QA-PW",
  title: "Blanket route mock",
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
  detectionStrategy: "regex heuristic",
  introduced: "0.4.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".java")) return findings;

    const re = /\.route\s*\(\s*"(\*\*(?:\/\*)?|\*\*\/[^"]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      const pattern = m[1] ?? "";
      if (/^\*\*(?:\/\*)?$/.test(pattern) || pattern === "**/*") {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "FLAKY-RISK",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: `\`page.route("${pattern}")\` — blanket interception of all requests.`,
          why: "Catch-all route mocks swallow third-party calls inconsistently across tests: some get mocks, some hit the network. The result depends on test order and which routes were registered first.",
          fix: 'Intercept specific endpoints (`page.route("**/api/orders")`) and pass unmatched requests through with `route.fallback()` or `route.resume()`.',
        });
      }
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
