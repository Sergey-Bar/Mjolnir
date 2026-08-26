/**
 * QA-CS-106 — Playwright-.NET: brittle XPath/CSS-chain selectors.
 * Severity: warning · Confidence: medium · heuristic-risk
 * Same meaning as QA-PW-004/QA-PY-104/QA-JV-106, translated to the
 * PascalCase .NET Locator API.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const csBrittleSelectors = defineRule({
  id: "QA-CS-106",
  category: "QA-PW",
  title: "Brittle selector in Playwright test",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  appliesTo: "csharp",
  // Trust Metadata
  languages: ["csharp"],
  frameworks: ["nunit", "xunit", "mstest", "playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.4.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".cs")) return findings;

    const patterns: Array<{ re: RegExp; label: string }> = [
      {
        re: /\.Locator\s*\(\s*"xpath=/g,
        label: "xpath= selector",
      },
      {
        re: /\.Locator\s*\(\s*"[^"]*:nth-child/g,
        label: "nth-child CSS chain",
      },
      {
        re: /\.Locator\s*\(\s*"\/\/(?:html|div)\//g,
        label: "absolute XPath (bare // shorthand)",
      },
      {
        re: /\.QuerySelectorAsync\s*\(\s*"#/g,
        label: "id via QuerySelectorAsync",
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
          fix: "Prefer role-based locators (`page.GetByRole(...)`) or data-testid attributes.",
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
