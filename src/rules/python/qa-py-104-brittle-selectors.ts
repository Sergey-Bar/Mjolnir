/**
 * QA-PY-104 — Playwright-Python: XPath/CSS-chain brittle selectors.
 * Severity: warning · Confidence: medium · heuristic-risk
 * Same meaning as QA-PW-004, translated to get_by/xpath syntax.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pyPwBrittleSelectors = defineRule({
  id: "QA-PY-104",
  category: "QA-PW",
  title: "Brittle selector in Playwright test",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest-playwright", "playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.8",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    const patterns: Array<{ re: RegExp; label: string }> = [
      {
        re: /locator\s*\(\s*['"]xpath=/g,
        label: "xpath= selector",
      },
      {
        re: /locator\s*\(\s*['"][^'"]*(?:nth-child|nth-of-type)/g,
        label: "nth-child CSS chain",
      },
      {
        re: /locator\s*\(\s*['"]\/(?:html|div)\//g,
        label: "absolute DOM path",
      },
      {
        re: /query_selector\s*\(\s*['"]#/g,
        label: "id via query_selector",
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
          fix: "Prefer role-based locators (`get_by_role`) or data-testid attributes.",
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
