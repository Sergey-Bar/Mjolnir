/**
 * QA-PW-107 — toBeVisible() on detached-prone nodes instead of
 * viewport-aware assertions.
 * Severity: info · Confidence: low · heuristic-risk
 * An element can be "visible" per DOM heuristics yet scrolled out of
 * view — the user still can't see it.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pwVisibleNotInViewport = defineRule({
  id: "QA-PW-107",
  category: "QA-PW",
  title: "toBeVisible where toBeInViewport fits better",
  severity: "info",
  confidence: "low",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "high",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // Heuristic: visibility asserted on toast/banner/modal/tooltip nodes,
    // which are exactly the ones that render off-viewport or animate in.
    // Args matched loosely (no nested parens needed for locator chains).
    const re = /expect\(([^()]*(?:\([^()]*\)[^()]*)*)\)\.toBeVisible\(\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      const args = m[1] ?? "";
      if (
        /(?:toast|banner|modal|tooltip|snackbar|notification|alert)/i.test(args)
      ) {
        findings.push({
          severity: "info",
          confidence: "low",
          findingType: "heuristic-risk",
          qaImpact: "HYGIENE",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message:
            "`toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.",
          why: "Toasts and banners can be 'visible' in the DOM while rendered off-screen; the user sees nothing but the test passes.",
          fix: "Assert `toBeInViewport()` when what matters is that the user actually sees it.",
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
