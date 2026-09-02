/**
 * QA-PW-004 — Brittle CSS/XPath selectors vs role-based locators.
 * Severity: warning · Confidence: medium · heuristic-risk
 *
 * Chained CSS classes and XPath break on any DOM refactor. Playwright's
 * own docs recommend role/text-based locators (getByRole, getByText).
 */

import { defineRule } from "../rule.js";
import {
  getTsSourceFile,
  commentAndStringRanges,
} from "../../engine/ts-ast.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";
import { isMasked } from "../shared/masking.js";

export const brittleSelectors = defineRule({
  id: "QA-PW-004",
  category: "QA-PW",
  title: "Brittle selector instead of role-based locator",
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
  detectionNotes: "regex pattern + inside-string oracle",
  introduced: "0.1.0",

  // Measured 2026-09-02 (corpus wave 5): tier set from the measured envelope (plan §11.2).
  tier: "quarantine",
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // This rule matches against RAW text on purpose: the selector it judges
    // lives inside the string argument, so masking string contents would
    // blind it (see the deliberate exclusion from the Phase 1 migration).
    //
    // The cost of reading raw text is that a locator call written as test
    // DATA also matches — `classifyLocator("page.locator('xpath=//div')")`
    // is a call to classifyLocator, not to locator. `isMaskedAt` below is
    // the discriminator: if codeText blanked the position where the match
    // begins, the entire expression is inside a string literal (or a
    // comment), so it is data or prose, not a live locator call.
    const text = ctx.codeText ? ctx.text : stripComments(ctx);

    // page.locator('.a.b.c') — multi-class chains
    // page.locator('div > span > a') — deep structural chains
    // page.$x(...) / xpath= — raw XPath
    //
    // Bug Map M-06 (tempered exclusion): a selector that identifies its
    // element by a data-testid / data-test / aria-* attribute is the
    // locator idiom Playwright itself recommends — grafana verdicts cite
    // exactly these as false positives. The lookahead after each opening
    // quote skips any selector string carrying such an attribute; the
    // negated classes cannot cross the closing quote, so the guard only
    // sees the selector's own content. Tempered by design: a structural
    // chain that ALSO carries a test id is no longer reported. The bare
    // `$x(` alternative stays unguarded — it takes an XPath EXPRESSION
    // argument, not a quoted selector string.
    //
    // Review fix (ReDoS): both scan distances are BOUNDED. An unbounded
    // `[^'"`]*(?:data-test|aria-)[\w-]*` pair is quadratic on untrusted
    // content — in a run like `aria-aria-aria-…` with no `=`, the
    // alternation matches at every backtrack position and `[\w-]*` then
    // re-scans the whole remainder each time (measured O(m²): >1s at
    // 100KB, hours at multi-MB, and the per-file budget only checks
    // between rules, not inside one exec call). 200 chars covers any
    // real selector; the attribute-name cap is 50 (longest real aria
    // attribute is far shorter).
    const TEST_ID_GUARD_CSS =
      "(?![^'\"`\\n]{0,200}(?:data-test|aria-)[\\w-]{0,50}\\s*=)";
    const TEST_ID_GUARD_STRUCT =
      "(?![^\"'`>\\n]{0,200}(?:data-test|aria-)[\\w-]{0,50}\\s*=)";
    const patterns = [
      {
        re: new RegExp(
          `locator\\s*\\(\\s*['"\`]${TEST_ID_GUARD_CSS}[^'"\`]*\\.[\\w-]+\\.[\\w-][^'"\`]*['"\`]\\s*\\)`,
          "g",
        ),
        label: "multi-class CSS selector",
      },
      {
        re: new RegExp(
          `locator\\s*\\(\\s*['"\`]${TEST_ID_GUARD_STRUCT}[^"'\`>]*>[^"'\`>]*>[^"'\`]*['"\`]\\s*\\)`,
          "g",
        ),
        label: "deep structural CSS selector",
      },
      {
        re: new RegExp(
          `\\$x\\s*\\(|locator\\s*\\(\\s*['"\`]${TEST_ID_GUARD_CSS}xpath=`,
          "g",
        ),
        label: "XPath selector",
      },
    ];

    for (const { re, label } of patterns) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        // The locator identifier itself is live code in a real call, so it
        // is never masked. Masked here means the whole call is quoted.
        if (isMasked(ctx, m.index)) continue;
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: `Brittle ${label}: \`${m[0].slice(0, 60)}\`.`,
          why: "Structural selectors break on any DOM refactor and fail without telling you which behavior regressed.",
          fix: "Prefer role-based locators: getByRole(), getByText(), getByLabel().",
          qaImpact: "HYGIENE",
        });
      }
    }
    return findings;
  },
});

/** Comment ranges via ts-morph scanner; falls back to a conservative
 * line-comment scan when no AST is available. Positions are preserved so
 * line/column math stays valid against the original text. Only used when
 * codeText is unavailable — codeText already blanks comments. */
function stripComments(ctx: {
  path: string;
  text: string;
  ast?: unknown;
}): string {
  try {
    const sf = getTsSourceFile(ctx.ast);
    if (sf) {
      const ranges = commentAndStringRanges({ ...ctx, ast: sf }).filter((r) => {
        const slice = ctx.text.slice(r.start, r.end);
        return slice.startsWith("//") || slice.startsWith("/*");
      });
      const chars = [...ctx.text];
      for (const r of ranges) {
        for (let i = r.start; i < r.end && i < chars.length; i++) {
          if (chars[i] !== "\n" && chars[i] !== "\r") chars[i] = " ";
        }
      }
      return chars.join("");
    }
  } catch {
    /* fall through */
  }
  // Fallback: blank `// …` line comments only — block comments without an
  // AST are rare in test files and under-blanking is safer than over-
  // stripping real code.
  return ctx.text.replace(/\/\/[^\n]*/g, (cm) => " ".repeat(cm.length));
}
