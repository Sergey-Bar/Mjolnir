/**
 * QA-PW-124 — Projects defined but no smoke/regression split.
 * Severity: info · Confidence: high · deterministic-defect
 * One monolithic project forces full-suite-or-nothing; PR feedback dies.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pwNoProjectSplit = defineRule({
  id: "QA-PW-124",
  category: "QA-PW",
  title: "No smoke/regression project split",
  severity: "info",
  confidence: "high",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "regex heuristic",
  introduced: "0.3.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    const base = ctx.path.split("/").pop() ?? "";
    if (!/^playwright\.config\.(ts|js|mjs|cts)$/.test(base)) return findings;

    const hasProjects = /projects\s*:\s*\[/.test(ctx.text);
    if (!hasProjects) return findings;

    const names = [...ctx.text.matchAll(/name\s*:\s*['"]([^'"]+)['"]/g)].map(
      (m) => (m[1] ?? "").toLowerCase(),
    );
    const hasSmoke = names.some(
      (n) => n.includes("smoke") || n.includes("critical"),
    );
    const hasRegression = names.some(
      (n) =>
        n.includes("regression") || n.includes("full") || n.includes("all"),
    );
    if (hasProjects && !(hasSmoke && hasRegression)) {
      findings.push({
        severity: "info",
        confidence: "high",
        findingType: "heuristic-risk",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(ctx.text, /projects\s*:/.exec(ctx.text)?.index ?? 0),
        column: 1,
        message: "Projects defined without a smoke/regression split.",
        why: "Without a fast smoke project, every commit runs the whole suite — PR feedback slows down and people start skipping CI.",
        fix: "Add a `smoke` project (testIgnore filter on critical paths) alongside the full regression project.",
      });
    }
    return findings;
  },
});

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}
