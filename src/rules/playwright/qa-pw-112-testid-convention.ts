/**
 * QA-PW-112 — data-testid convention enforcement (default pattern:
 * kebab-case). Severity: info · Confidence: high · deterministic-defect
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

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
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // getByTestId('...') — default testIdAttribute value should be
    // kebab-case so selectors stay predictable across the suite.
    const re = /getByTestId\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      const id = m[1] ?? "";
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
        findings.push({
          severity: "info",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "HYGIENE",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: `test id \`${id}\` violates kebab-case convention.`,
          why: "Mixed naming conventions in test ids make selector review and grep-based audits unreliable.",
          fix: `Rename to kebab-case (e.g. \`${id.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}\`) and update the component.`,
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
