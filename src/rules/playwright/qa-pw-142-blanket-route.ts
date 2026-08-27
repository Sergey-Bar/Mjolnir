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
import { lineAt, colAt } from "../shared/positions.js";
import { isInsideEmbeddedCode } from "../shared/masking.js";

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
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!/\.(spec|test)\.[tj]sx?$/.test(ctx.path)) return findings;

    const re = /\.route\s*\(\s*['"](\*\*(?:\/\*)?|\*\*\/[^'"]*)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const pattern = m[1] ?? "";
      // Reads raw text because the route glob is string content. Skip when the
      // whole expression is itself quoted — a code sample, not a live route.
      if (isInsideEmbeddedCode(ctx, m.index)) continue;
      // A catch-all glob intercepts every request on the page.
      if (/^\*\*(?:\/\*)?$/.test(pattern) || pattern === "**/*") {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "FLAKY-RISK",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `\`page.route('${pattern}')\` — blanket interception of all requests.`,
          why: "Catch-all route mocks swallow third-party calls inconsistently across tests: some get mocks, some hit the network. The result depends on test order and which routes were registered first.",
          fix: "Intercept specific endpoints (`page.route('**/api/orders')`) and pass unmatched requests through with `route.fallback()` or `route.continue()`.",
        });
      }
    }
    return findings;
  },
});
