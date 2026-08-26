/**
 * QA-PW-142 — page.route() blanket-mocking instead of scoped intercepts.
 * Severity: warning · Confidence: medium · heuristic-risk
 * Upgrade-Plan-v3 Phase 1 layer 2 (network/API mocking hygiene). A glob
 * like a double-star catch-all intercepts everything — third-party calls
 * silently return mocks in some tests and real responses in others,
 * producing order-dependent network behavior.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pwBlanketRouteMock = defineRule({
  id: "QA-PW-142",
  category: "QA-PW",
  title: "Blanket route mock",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FLAKY-RISK",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex heuristic",
  introduced: "0.3.8",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!/\.(spec|test)\.[tj]sx?$/.test(ctx.path)) return findings;

    const re = /\.route\s*\(\s*['"](\*\*(?:\/\*)?|\*\*\/[^'"]*)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      const pattern = m[1] ?? "";
      // A catch-all glob intercepts every request on the page.
      if (/^\*\*(?:\/\*)?$/.test(pattern) || pattern === "**/*") {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "FLAKY-RISK",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: `\`page.route('${pattern}')\` — blanket interception of all requests.`,
          why: "Catch-all route mocks swallow third-party calls inconsistently across tests: some get mocks, some hit the network. The result depends on test order and which routes were registered first.",
          fix: "Intercept specific endpoints (`page.route('**/api/orders')`) and pass unmatched requests through with `route.fallback()` or `route.continue()`.",
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
