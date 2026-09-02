/**
 * QA-PW-112 — data-testid convention enforcement (default pattern:
 * kebab-case). Severity: info · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pwTestIdConvention = defineRule({
  id: "QA-PW-112",
  category: "QA-PW",
  title: "data-testid naming convention violation",
  severity: "info",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  introduced: "0.3.0",

  // Measured FP 100% (n=20): repos ship consistent camelCase/registry test-id conventions; style enforcement is not a defect.

  tier: "quarantine",

  run(ctx) {
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // getByTestId('...') — default testIdAttribute value should be
    // kebab-case so selectors stay predictable across the suite.
    const re = /getByTestId\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const id = m[1] as string;
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
        findings.push({
          severity: "info",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "HYGIENE",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `test id \`${id}\` violates kebab-case convention.`,
          why: "Mixed naming conventions in test ids make selector review and grep-based audits unreliable.",
          fix: `Rename to kebab-case (e.g. \`${id.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}\`) and update the component.`,
        });
      }
    }
    return findings;
  },
});
