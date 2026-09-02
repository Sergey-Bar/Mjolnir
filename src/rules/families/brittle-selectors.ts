/**
 * Brittle-selectors family (Phase 6 — Tempering Plan).
 * Detects XPath/structural CSS selectors across Java, C#, Python.
 *
 * Phase 2 quarantine-cluster triage: the measured 100% FP rows
 * (QA-JV-106/QA-CS-106 n=20, QA-PY-104 n=12) all predate Bug Map M-06's
 * pattern removal — every cited FP was the since-removed
 * querySelector/QuerySelectorAsync/query_selector id-lookup pattern, so
 * the measurements describe a detector that no longer ships. Per plan
 * §07 the detector revision is bumped to 2, which invalidates the stale
 * measurement (stale → provisional → re-measure) rather than trusting a
 * 100% FP recorded against retired detection logic. The surviving
 * xpath=/nth-child/absolute-path patterns are genuine anti-pattern
 * shapes (must-fire fixtures) and stay, quarantine-tier, until
 * re-measured on the surviving patterns.
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
    detectionStrategy: "LEXICAL",
    introduced: "0.4.0",
    // Quarantine-tier since tempering; the Phase 2 triage keeps tier
    // quarantine and bumps detectorRevision to 2 (the M-06 pattern
    // removal is a detection-logic change, plan §07) so the 100% FP
    // measurements taken against revision 1 go stale → provisional.
    tier: "quarantine",
    detectorRevision: 2,
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
      // Bug Map M-06 (narrowing): the `id via querySelector` pattern
      // (`\.querySelector\s*\(\s*"#`) was REMOVED — every measured FP for
      // QA-JV-106 (playwright-java, 100% FP n=20, zero TPs) was
      // ElementHandle-API self-tests calling querySelector('#source') on
      // their own fixtures; there are zero TPs for the family. xpath=,
      // nth-child and absolute-path patterns stay (no per-pattern
      // evidence either way); the family remains quarantine-tier.
    ],
    "Prefer role-based locators (`page.getByRole(...)`) or data-testid attributes.",
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
      // Bug Map M-06 (narrowing): the `id via QuerySelectorAsync` pattern
      // was REMOVED — same evidence class as QA-JV-106 (100% FP, zero
      // TPs, querySelector-style id lookups on self-owned DOM).
    ],
    "Prefer role-based locators (`page.GetByRole(...)`) or data-testid attributes.",
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
      // Bug Map M-06 (narrowing): the `id via query_selector` pattern
      // was REMOVED — every cited QA-PY-104 FP (100% FP n=12) was
      // `query_selector('#foo')` on `set_content` self-owned DOM inside
      // makepyfile strings; zero TPs for the family.
    ],
    "Prefer role-based locators (`get_by_role(...)`) or data-testid attributes.",
  ),
];
