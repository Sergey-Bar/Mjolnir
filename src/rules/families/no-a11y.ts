/**
 * No-a11y family (Phase 6 — Tempering Plan).
 * File-level absence heuristic: UI-interacting test has no a11y assertions.
 */

import { defineRule, type QADoctorRule } from "../rule.js";
import type { Finding } from "../../types.js";

function makeNoA11y(
  id: string,
  appliesTo: "java" | "csharp",
  ext: string,
  languages: string[],
  frameworks: string[],
  uiCheck: RegExp,
  a11yCheck: RegExp,
  fix: string,
): QADoctorRule {
  return defineRule({
    id,
    category: "QA-PW",
    title: "No accessibility assertions in UI test",
    severity: "info",
    confidence: "low",
    findingType: "heuristic-risk",
    qaImpact: "HYGIENE",
    appliesTo,
    languages,
    frameworks,
    falsePositiveRisk: "high",
    autofix: false,
    detectionStrategy: "LEXICAL",
    detectionNotes: "absence heuristic",
    introduced: "0.4.0",
    tier: "quarantine",
    run(ctx) {
      const text = ctx.codeText ?? ctx.text;
      const findings: Omit<Finding, "ruleId" | "category">[] = [];
      if (!ctx.path.endsWith(ext)) return findings;
      if (!uiCheck.test(text)) return findings;
      if (a11yCheck.test(text)) return findings;
      findings.push({
        severity: "info",
        confidence: "low",
        findingType: "heuristic-risk",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: 1,
        column: 1,
        message:
          "UI-interacting test file contains no accessibility assertions.",
        why: "Without axe or equivalent, accessibility regressions ship silently. One scan per page catches layout/contrast/ARIA issues that visual review misses.",
        fix,
      });
      return findings;
    },
  });
}

export const noA11yFamily: QADoctorRule[] = [
  makeNoA11y(
    "QA-JV-110",
    "java",
    ".java",
    ["java"],
    ["junit", "testng"],
    /\.navigate\s*\(|\.click\s*\(|\.fill\s*\(/i,
    /AxeBuilder|\.analyze\s*\(\s*\)|axeResults/i,
    "Add `com.deque.html.axe-core:playwright` and run `new AxeBuilder(page).analyze()` once per page-under-test.",
  ),
  makeNoA11y(
    "QA-CS-110",
    "csharp",
    ".cs",
    ["csharp"],
    ["nunit", "xunit", "mstest", "playwright"],
    /\.GotoAsync\s*\(|\.ClickAsync\s*\(|\.FillAsync\s*\(/i,
    /\.RunAxe\s*\(|AxeResult/i,
    "Add `Deque.AxeCore.Playwright` NuGet and call `await page.RunAxe()` once per page-under-test.",
  ),
];
