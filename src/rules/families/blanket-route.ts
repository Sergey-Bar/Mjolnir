/**
 * Blanket-route family (Phase 6 — Tempering Plan).
 * Detects route("**") / RouteAsync("**") blanket interception.
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
    severity: "warning",
    confidence: "medium",
    findingType: "heuristic-risk",
    qaImpact: "FLAKY-RISK",
    appliesTo,
    languages,
    frameworks,
    falsePositiveRisk: "medium",
    autofix: false,
    detectionStrategy: "regex pattern",
    introduced: "0.4.0",
    tier: "quarantine",
    run(ctx) {
      const text = ctx.text;
      const findings: Omit<Finding, "ruleId" | "category">[] = [];
      if (!ctx.path.endsWith(ext)) return findings;

      const re = new RegExp(pattern.source, pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const routePattern = m[1] ?? "";
        if (/^\*\*(?:\/\*)?$/.test(routePattern) || routePattern === "**/*") {
          findings.push({
            severity: "warning",
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
    /\.route\s*\(\s*"(\*\*(?:\/\*)?|\*\*\/[^"]*)"/g,
    "page.route",
    "page.route",
  ),
  makeBlanketRoute(
    "QA-CS-111",
    "csharp",
    ".cs",
    ["csharp"],
    ["nunit", "xunit", "mstest", "playwright"],
    /\.RouteAsync\s*\(\s*"(\*\*(?:\/\*)?|\*\*\/[^"]*)"/g,
    "page.RouteAsync",
    "page.RouteAsync",
  ),
];
