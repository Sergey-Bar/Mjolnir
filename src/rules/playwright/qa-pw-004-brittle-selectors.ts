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
  detectionStrategy: "regex pattern",
  introduced: "0.1.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // Selector literals ARE strings — so unlike other rules we cannot
    // blank string contents wholesale. Instead we strip COMMENTS only:
    // `// never do locator('.a.b.c')` in prose must not fire, while real
    // locator('...') calls keep their evidence.
    const text = stripComments(ctx);
    // page.locator('.a.b.c') — multi-class chains
    // page.locator('div > span > a') — deep structural chains
    // page.$x(...) / xpath= — raw XPath
    const patterns = [
      {
        re: /locator\s*\(\s*['"`][^'"`]*\.[\w-]+\.[\w-]+[^'"`]*['"`]\s*\)/g,
        label: "multi-class CSS selector",
      },
      {
        re: /locator\s*\(\s*['"`][^'"`]*>[^'"`]*>[^'"`]*['"`]\s*\)/g,
        label: "deep structural CSS selector",
      },
      {
        re: /\$x\s*\(|locator\s*\(\s*['"`]xpath=/g,
        label: "XPath selector",
      },
    ];

    for (const { re, label } of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
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
 * line/column math stays valid against the original text. */
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

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

function colAt(text: string, index: number): number {
  const lastBreak = text.lastIndexOf("\n", index - 1);
  return index - lastBreak;
}
