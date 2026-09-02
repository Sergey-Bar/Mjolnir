/**
 * QA-PY-007 — pytest.raises without match.
 * Severity: warning · Confidence: medium · heuristic-risk
 * `with pytest.raises(ValueError):` accepts ANY ValueError from ANY line
 * in the block — including one raised by an unrelated bug. The test then
 * proves less than it appears to.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pyRaisesWithoutMatch = defineRule({
  id: "QA-PY-007",
  category: "QA-TQUAL",
  title: "pytest.raises without match",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FALSE-GREEN",
  appliesTo: "python",
  // Trust Metadata
  languages: ["python"],
  frameworks: ["pytest"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "LEXICAL",
  introduced: "0.3.0",
  tier: "quarantine",
  // Phase 2 retune (EVIDENCE-BACKED, detectorRevision 2 — §07): the
  // dominant measured FP cluster (8 of 13 FPs, docs/FP-AUDIT.md 65%
  // n=20) is `with pytest.raises(X) as exc_info:` followed by an
  // assert/expect on `exc_info.value` / `str(exc_info.value)` — the
  // message IS verified, just without match=. Those are skipped. The
  // genuinely vague raises blocks (no match=, no excinfo assertion)
  // still fire. Remaining FP residue: single-possible-exception blocks
  // ("match= would add no value") are not statically decidable.
  detectorRevision: 2,

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    const re = /pytest\.raises\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const openParen = m.index + m[0].length - 1;
      const closeParen = matchParen(text, openParen);
      if (closeParen === -1) continue;
      const args = text.slice(openParen + 1, closeParen);

      if (!/\bmatch\s*=/.test(args)) {
        // excinfo-assertion skip: `as exc_info` + a following assert/expect
        // on `exc_info.value` (or str(exc_info.value)) pins the failure to
        // the intended cause — the match= diagnosis does not hold.
        const after = text.slice(closeParen, closeParen + 120);
        const asMatch = /as\s+([A-Za-z_]\w*)/.exec(after);
        if (asMatch) {
          const name = asMatch[1] as string;
          const tail = text.slice(closeParen, m.index + 1600);
          const excinfoAssert = new RegExp(
            `(?:assert|expect)[^\\n]{0,120}(?:\\b${name}\\.value|\\bstr\\(${name}\\.value\\))`,
          ).test(tail);
          if (excinfoAssert) continue;
        }
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(text, m.index),
          column: colAt(text, m.index),
          message: "`pytest.raises` without a `match=` pattern.",
          why: "Without match=, any exception of that type anywhere in the block passes — including one raised by an unrelated bug before the code under test even runs.",
          fix: 'Add `match="expected message fragment"` to pin the failure to the intended cause.',
        });
      }
    }
    return findings;
  },
});

function matchParen(text: string, open: number): number {
  let depth = 0;
  let inStr: string | null = null;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") inStr = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
