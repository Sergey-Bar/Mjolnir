/**
 * QA-PW-116 — storageState reuse without expiry strategy.
 * Severity: warning · Confidence: medium · heuristic-risk
 * A long-lived auth storageState silently expires mid-suite and every
 * test fails with the same confusing 401.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

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
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // storageState configured in a config file or setup spec.
    const re = /storageState\s*:\s*['"][^'"]+['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      // Look for a nearby freshness mechanism in the whole file: an explicit
      // expiry check, OR the canonical Playwright auth pattern — a `setup`
      // project / `*.setup.ts` / `globalSetup` that regenerates the state
      // every run (project dependencies make it run first).
      const hasRefresh =
        /refresh|renew|regenerate|expiresAt|maxAge|ttl/i.test(text) ||
        /\.setup\.[jt]sx?\b|name\s*:\s*['"]setup['"]|\bdependencies\s*:|\bglobalSetup\b/i.test(
          text,
        );
      if (!hasRefresh) {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "FLAKY-RISK",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
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
