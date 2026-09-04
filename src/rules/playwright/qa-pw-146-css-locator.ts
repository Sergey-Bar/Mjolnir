/**
 * QA-PW-146 — CSS/XPath string selector where Playwright's locator
 * standard expects a normalized locator (plan §17.3).
 * Severity: warning · Confidence: medium · heuristic-risk
 *
 * Playwright's own standard for locators (the one `locator.normalize()`
 * and the docs prescribe): prefer the user-facing getters —
 * getByRole, getByLabel, getByText, getByTestId, getByPlaceholder —
 * over CSS/XPath strings. String selectors couple tests to markup the
 * user never sees; the role/testid/text getters survive redesigns.
 * This rule fills the TS gap: the brittle-selectors family covers
 * Java/C#/Python, and QA-PW-112 (test-id case style) was retired —
 * this rule is the locator.normalize() alignment, not a style police.
 *
 * Autofix posture: NOT auto-fixable — the normalized getter depends on
 * the app's semantics (role? label? test id?) which only a human knows.
 * The fix field carries the concrete normalization suggestion.
 *
 * Trust Metadata: BORN QUARANTINE (plan §17 exit gate — provenance and
 * framework-standards rules are measured before leaving provisional).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

/**
 * String-selector shapes the Playwright docs steer away from, inside
 * the locator APIs that accept normalized locators:
 *   css= / xpath= engine prefixes; bare id/class/attr CSS (#a, .b,
 *   [data-x]; div > span chains); nth-child structure.
 * Excludes text= (a legitimate text engine) and URL-ish strings.
 */
const STRING_SELECTOR_RE =
  /\.(?:locator|waitForSelector)\s*\(\s*['"](?!text=|https?:)(?:css=|xpath=|\/{2}|#|\.[-\w]|\[[\w-]+=|[^'"]*:nth-child)[^'"]*['"]/g;
/** page.$ / page.$$ (raw engine handles, not normalized locators). */
const RAW_HANDLE_RE = /\bpage\s*\.\s*\$\$?\s*\(\s*['"][^'"]+['"]/g;

const WHY =
  "String CSS/XPath selectors couple the test to markup the user never sees — they break on any refactor and can silently select the wrong element after a redesign.";
const FIX =
  "Normalize to Playwright's user-facing getters: getByRole('button', { name: '…' }), getByLabel('…'), getByTestId('…'), or getByText('…') — they survive markup refactors and match what a user actually perceives.";

export const pwLocatorNormalize = defineRule({
  id: "QA-PW-146",
  category: "QA-PW",
  title: "CSS/XPath string selector instead of a normalized locator",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "LEXICAL",
  detectionNotes:
    "string-selector shapes (css=/xpath= engines, bare id/class/attr CSS, nth-child) inside .locator()/waitForSelector()/page.$ APIs, on the RAW text view (the selector text lives inside string literals, which the code-only view blanks)",
  introduced: "0.6.0",
  tier: "quarantine",
  detectorRevision: 1,

  run(ctx) {
    // RAW text — the selector text lives INSIDE string literals, which
    // the code-only view blanks. (Comment-prose false positives are the
    // quarantine-tier trade; the fixture firewall pins the behavior.)
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    const res = [STRING_SELECTOR_RE, RAW_HANDLE_RE];
    for (const re of res) {
      const run = new RegExp(re.source, "g");
      let m: RegExpExecArray | null;
      while ((m = run.exec(text)) !== null) {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "HYGIENE",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message:
            "CSS/XPath string selector where a normalized locator is expected.",
          why: WHY,
          fix: FIX,
        });
      }
    }
    return findings;
  },
});
