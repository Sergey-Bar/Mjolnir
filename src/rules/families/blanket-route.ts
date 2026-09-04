/**
 * Blanket-route family (Phase 6 — Tempering Plan).
 * Detects route("**") / RouteAsync("**") blanket interception.
 *
 * Bug Map M-06 narrowing decision: NO narrowing. The measured FPs
 * (JV-108/CS-108 cohorts, 100% FP n=20 each, zero TPs) are contextual
 * route-API self-tests and fixture setup, not a mechanically
 * discriminable pattern — no exclusion is provable from the verdict
 * evidence. Stays quarantine-tier.
 *
 * Phase 2 quarantine-cluster triage: BOTH JV/CS variants are RETIRED
 * (docs/RULE-LIFECYCLE.md) — measured 100% FP (n=20 each,
 * docs/FP-AUDIT.md), zero TPs, and the file's own M-06 header concedes
 * no mechanical exclusion is provable. Severity downgraded to info
 * (non-blocking everywhere); code + fixtures stay, the frozen IDs are
 * never reused. A revival on an application-repo corpus would be a NEW
 * rule ID (lifecycle §2).
 */

import { defineRule, type QADoctorRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

function makeBlanketRoute(
  id: string,
  appliesTo: "java" | "csharp",
  ext: string,
  languages: string[],
  frameworks: string[],
  pattern: RegExp,
  methodName: string,
  fixMethod: string,
): QADoctorRule {
  return defineRule({
    id,
    category: "QA-PW",
    title: "Blanket route mock intercepts all requests",
    severity: "info",
    confidence: "medium",
    findingType: "heuristic-risk",
    qaImpact: "FLAKY-RISK",
    appliesTo,
    languages,
    frameworks,
    falsePositiveRisk: "high",
    autofix: false,
    detectionStrategy: "LEXICAL",
    introduced: "0.4.0",
    tier: "quarantine",
    run(ctx) {
      const text = ctx.text;
      const findings: Omit<Finding, "ruleId" | "category">[] = [];
      if (!ctx.path.endsWith(ext)) return findings;

      const re = new RegExp(pattern.source, pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const routePattern = m[1] as string;
        if (/^\*\*(?:\/\*)?$/.test(routePattern) || routePattern === "**/*") {
          findings.push({
            severity: "info",
            confidence: "medium",
            findingType: "heuristic-risk",
            qaImpact: "FLAKY-RISK",
            file: ctx.path,
            line: lineAt(text, m.index),
            column: colAt(text, m.index),
            message: `\`${methodName}("${routePattern}")\` — blanket interception of all requests.`,
            why: "Blanket route mocks hide real network errors and drift from the actual API contract — tests pass while the integration is broken.",
            fix: `Scope to the endpoint under test: \`${fixMethod}("**/api/orders")\` + \`route.${appliesTo === "java" ? "fallback" : "FallbackAsync"}()\`.`,
          });
        }
      }
      return findings;
    },
  });
}

export const blanketRouteFamily: QADoctorRule[] = [
  makeBlanketRoute(
    "QA-JV-111",
    "java",
    ".java",
    ["java"],
    ["junit", "testng"],
    /\.route\s*\(\s*"(\*\*(?:\/[^"]*)?)"/g,
    "page.route",
    "page.route",
  ),
  makeBlanketRoute(
    "QA-CS-111",
    "csharp",
    ".cs",
    ["csharp"],
    ["nunit", "xunit", "mstest", "playwright"],
    /\.RouteAsync\s*\(\s*"(\*\*(?:\/[^"]*)?)"/g,
    "page.RouteAsync",
    "page.RouteAsync",
  ),
];
