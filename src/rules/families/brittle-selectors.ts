/**
 * Brittle-selectors family (Phase 6 — Tempering Plan).
 * Detects XPath/structural CSS selectors across Java, C#, Python.
 */

import { defineRule, type QADoctorRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

interface SelectorPattern {
  re: RegExp;
  label: string;
}

function makeBrittleSelectors(
  id: string,
  appliesTo: "java" | "csharp" | "python",
  ext: string,
  languages: string[],
  frameworks: string[],
  patterns: SelectorPattern[],
  fix: string,
  tier?: "core" | "extended" | "quarantine",
): QADoctorRule {
  return defineRule({
    id,
    category: "QA-PW",
    title: "Brittle selector instead of role-based locator",
    severity: "warning",
    confidence: "medium",
    findingType: "heuristic-risk",
    qaImpact: "HYGIENE",
    appliesTo,
    languages,
    frameworks,
    falsePositiveRisk: "medium",
    autofix: false,
    detectionStrategy: "regex pattern",
    introduced: "0.4.0",
    ...(tier ? { tier } : {}),
    run(ctx) {
      const text = ctx.text; // needs string content (selectors are inside quotes)
      const findings: Omit<Finding, "ruleId" | "category">[] = [];
      if (!ctx.path.endsWith(ext)) return findings;

      for (const { re, label } of patterns) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          findings.push({
            severity: "warning",
            confidence: "medium",
            findingType: "heuristic-risk",
            qaImpact: "HYGIENE",
            file: ctx.path,
            line: lineAt(text, m.index),
            column: colAt(text, m.index),
            message: `Brittle selector (${label}).`,
            why: "XPath paths and structural CSS break on any markup refactor and silently select the wrong element after redesigns.",
            fix,
          });
        }
      }
      return findings;
    },
  });
}

export const brittleSelectorsFamily: QADoctorRule[] = [
  makeBrittleSelectors(
    "QA-JV-106",
    "java",
    ".java",
    ["java"],
    ["junit", "testng"],
    [
      { re: /\.locator\s*\(\s*"xpath=/g, label: "xpath= selector" },
      {
        re: /\.locator\s*\(\s*"[^"]*:nth-child/g,
        label: "nth-child CSS chain",
      },
      { re: /\.locator\s*\(\s*"\/\/(?:html|div)\//g, label: "absolute XPath" },
      { re: /\.querySelector\s*\(\s*"#/g, label: "id via querySelector" },
    ],
    "Prefer role-based locators (`page.getByRole(...)`) or data-testid attributes.",
    "quarantine",
  ),
  makeBrittleSelectors(
    "QA-CS-106",
    "csharp",
    ".cs",
    ["csharp"],
    ["nunit", "xunit", "mstest", "playwright"],
    [
      { re: /\.Locator\s*\(\s*"xpath=/g, label: "xpath= selector" },
      {
        re: /\.Locator\s*\(\s*"[^"]*:nth-child/g,
        label: "nth-child CSS chain",
      },
      { re: /\.Locator\s*\(\s*"\/\/(?:html|div)\//g, label: "absolute XPath" },
      {
        re: /\.QuerySelectorAsync\s*\(\s*"#/g,
        label: "id via QuerySelectorAsync",
      },
    ],
    "Prefer role-based locators (`page.GetByRole(...)`) or data-testid attributes.",
    "quarantine",
  ),
  makeBrittleSelectors(
    "QA-PY-104",
    "python",
    ".py",
    ["python"],
    ["pytest-playwright", "playwright"],
    [
      { re: /locator\s*\(\s*['"]xpath=/g, label: "xpath= selector" },
      {
        re: /locator\s*\(\s*['"][^'"]*(?:nth-child|nth-of-type)/g,
        label: "nth-child CSS chain",
      },
      {
        re: /locator\s*\(\s*['"]\/(?:html|div)\//g,
        label: "absolute DOM path",
      },
      { re: /query_selector\s*\(\s*['"]#/g, label: "id via query_selector" },
    ],
    "Prefer role-based locators (`get_by_role(...)`) or data-testid attributes.",
    // Measured FP 100% (n=12, docs/FP-AUDIT.md 2026-08-31): sampled
    // call sites are query_selector on markup the same test just created
    // via set_content, inside makepyfile string templates. North-star law.
    "quarantine",
  ),
];
