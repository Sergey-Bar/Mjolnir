/**
 * QA-PW-107 — toBeVisible() on detached-prone nodes instead of
 * viewport-aware assertions.
 * Severity: info · Confidence: low · heuristic-risk
 * An element can be "visible" per DOM heuristics yet scrolled out of
 * view — the user still can't see it.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

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
  detectionStrategy: "LEXICAL",
  introduced: "0.3.0",
  // RETIRED (docs/RULE-LIFECYCLE.md — Phase 2 quarantine-cluster triage):
  // measured 100% FP (n=20, docs/FP-AUDIT.md) with zero TPs — the rule's
  // premise is wrong on real code, not its tuning. Severity downgraded to
  // info (non-blocking everywhere); code + fixtures stay, the frozen ID
  // is never reused. Successor ideas ship under NEW rule IDs (lifecycle §2).
  tier: "quarantine",

  run(ctx) {
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // Heuristic: visibility asserted on toast/banner/modal/tooltip nodes,
    // which are exactly the ones that render off-viewport or animate in.
    // Args matched loosely (no nested parens needed for locator chains).
    // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
    const re = /expect\(([^()]*(?:\([^()]*\)[^()]*)*)\)\.toBeVisible\(\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const args = m[1] as string;
      if (
        /toast|banner|modal|tooltip|snackbar|notification|alert/i.test(args)
      ) {
        findings.push({
          severity: "info",
          confidence: "low",
          findingType: "heuristic-risk",
          qaImpact: "HYGIENE",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
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
