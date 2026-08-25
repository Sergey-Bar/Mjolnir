/**
 * QA-PW-116 — storageState reuse without expiry strategy.
 * Severity: warning · Confidence: medium · heuristic-risk
 * A long-lived auth storageState silently expires mid-suite and every
 * test fails with the same confusing 401.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pwStorageStateNoExpiry = defineRule({
  id: "QA-PW-116",
  category: "QA-PW",
  title: "storageState without expiry strategy",
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
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // storageState configured in a config file or setup spec.
    const re = /storageState\s*:\s*['"][^'"]+['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      // Look for a nearby freshness mechanism in the whole file:
      // a setup project regenerating it, or an expiry check.
      const hasRefresh =
        /(?:refresh|renew|regenerate|expiresAt|maxAge|ttl)/i.test(ctx.text);
      if (!hasRefresh) {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "FLAKY-RISK",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message:
            "`storageState` used without a visible expiry/refresh strategy.",
          why: "Auth cookies/tokens expire; when they do, every test using the stale state fails identically and the suite looks catastrophically broken.",
          fix: "Regenerate the state in a setup project per run, or assert validity before reuse.",
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
