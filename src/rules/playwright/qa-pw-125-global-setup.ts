/**
 * QA-PW-125 — globalSetup mutating shared external state.
 * Severity: warning · Confidence: medium · heuristic-risk
 * Global setup that seeds/migrates shared DBs or external services
 * poisons other pipelines running against the same environment.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pwGlobalSetupSharedState = defineRule({
  id: "QA-PW-125",
  category: "QA-PW",
  title: "Global setup mutating shared state",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "LEXICAL",
  detectionNotes: "regex heuristic",
  introduced: "0.3.0",

  run(ctx) {
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // In a global-setup-like file (or config referencing one), flag writes
    // to shared resources: DB migrations/seeds against non-local hosts.
    const isSetupLike =
      /globalSetup|global-setup|globalTeardown/.test(text) ||
      /(?:global[-.]?setup|seed|migrate)[\w.-]*\.[tj]s$/.test(ctx.path);
    if (!isSetupLike) return findings;

    const re =
      /(?:execSync|exec|spawn|query|request)\s*\(\s*[`'"][^`'"]*(?:migrate|migration|seed|TRUNCATE|DROP\s+(?:TABLE|DATABASE)|DELETE\s+FROM)[^`'"]*[`'"]/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      // Ephemeral/local targets are fine — check the surrounding statement
      // AND the preceding comment line (where intent is usually documented).
      const lineStart = text.lastIndexOf("\n", m.index) + 1;
      const lineEnd = text.indexOf("\n", m.index);
      const prevLineStart = text.lastIndexOf("\n", lineStart - 2) + 1;
      const contextWindow = text.slice(
        Math.max(prevLineStart - 200, 0),
        lineEnd === -1 ? undefined : lineEnd,
      );
      if (
        /localhost|127\.0\.0\.1|testcontainers|docker compose|ephemeral/i.test(
          contextWindow,
        )
      ) {
        continue;
      }
      findings.push({
        severity: "warning",
        confidence: "medium",
        findingType: "heuristic-risk",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: `Global setup mutates shared state: \`${m[0].slice(0, 60)}…\`.`,
        why: "Migrations/seeds/deletes against a shared environment break every other pipeline and developer pointing at it — and the damage happens before any test runs.",
        fix: "Target an ephemeral per-run environment (testcontainers, branch DB) instead of shared infrastructure.",
      });
    }
    return findings;
  },
});
