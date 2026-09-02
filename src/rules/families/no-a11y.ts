/**
 * No-a11y family (Phase 6 — Tempering Plan).
 * File-level absence heuristic: UI-interacting test has no a11y assertions.
 *
 * Phase 2 quarantine-cluster triage: BOTH variants are RETIRED
 * (docs/RULE-LIFECYCLE.md) — measured 100% FP (n=20 each,
 * docs/FP-AUDIT.md) where every verdict row carries the same root
 * cause: a11y assertions are optional coverage, so a file-level absence
 * heuristic fires on essentially every UI test file by construction.
 * Absence of optional coverage is not a defect finding — the premise,
 * not the tuning, is wrong. Severity was already info (non-blocking);
 * code + fixtures stay, the frozen IDs are never reused. A successor
 * idea (a11y-coverage reporting rather than per-file flagging) ships
 * under NEW rule IDs (lifecycle §2).
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
    // RETIRED (docs/RULE-LIFECYCLE.md — Phase 2 quarantine-cluster
    // triage): measured 100% FP (n=20) with zero TPs; see the header.
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
