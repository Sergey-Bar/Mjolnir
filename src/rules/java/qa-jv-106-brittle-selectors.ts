/**
 * QA-JV-106 — Playwright-Java: brittle XPath/CSS-chain selectors.
 * Severity: warning · Confidence: medium · heuristic-risk
 * Same meaning as QA-PW-004/QA-PY-104, translated to the Java Locator API
 * (Sprint 8 Task 32, idiom mapping verified in
 * docs/JAVA-CSHARP-IDIOM-MAPPING.md).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const jvBrittleSelectors = defineRule({
  id: "QA-JV-106",
  category: "QA-PW",
  title: "Brittle selector in Playwright test",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  appliesTo: "java",
  // Trust Metadata
  languages: ["java"],
  frameworks: ["junit", "testng", "playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.4.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".java")) return findings;

    const patterns: Array<{ re: RegExp; label: string }> = [
      {
        re: /\.locator\s*\(\s*"xpath=/g,
        label: "xpath= selector",
      },
      {
        re: /\.locator\s*\(\s*"[^"]*:nth-child/g,
        label: "nth-child CSS chain",
      },
      {
        re: /\.locator\s*\(\s*"\/\/(?:html|div)\//g,
        label: "absolute XPath (bare // shorthand)",
      },
      {
        re: /\.querySelector\s*\(\s*"#/g,
        label: "id via querySelector",
      },
    ];

    for (const { re, label } of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(ctx.text)) !== null) {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "HYGIENE",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: `Brittle selector (${label}).`,
          why: "XPath paths and structural CSS break on any markup refactor and silently select the wrong element after redesigns.",
          fix: "Prefer role-based locators (`page.getByRole(...)`) or data-testid attributes.",
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
