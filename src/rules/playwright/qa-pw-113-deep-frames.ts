/**
 * QA-PW-113 — frameLocator chains > 2 deep.
 * Severity: warning · Confidence: medium · heuristic-risk
 * Deep iframe piercing signals embedded-app architecture the tests
 * shouldn't be coupled to; each level multiplies flake surface.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pwDeepFrameLocator = defineRule({
  id: "QA-PW-113",
  category: "QA-PW",
  title: "frameLocator chain deeper than 2",
  severity: "warning",
  confidence: "high",
  findingType: "heuristic-risk",
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

    // Count consecutive .frameLocator( occurrences in one expression.
    const re = /(?:\.frameLocator\s*\([^)]*\)\s*){3,}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: "warning",
        confidence: "high",
        findingType: "heuristic-risk",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `frameLocator chained ${count(m[0])} levels deep.`,
        why: "Each nested iframe multiplies timing and attachment flake; tests this coupled to embedding structure break on every layout change.",
        fix: "Expose a stable handle to the innermost content (postMessage bridge, test hook, or flatten the frames).",
      });
    }
    return findings;
  },
});

function count(fragment: string): number {
  return (fragment.match(/frameLocator\s*\(/g) ?? []).length;
}

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

function colAt(text: string, index: number): number {
  const lastBreak = text.lastIndexOf("\n", index - 1);
  return index - lastBreak;
}
