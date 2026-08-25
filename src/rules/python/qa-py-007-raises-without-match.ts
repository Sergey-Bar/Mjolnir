/**
 * QA-PY-007 — pytest.raises without match.
 * Severity: warning · Confidence: medium · heuristic-risk
 * `with pytest.raises(ValueError):` accepts ANY ValueError from ANY line
 * in the block — including one raised by an unrelated bug. The test then
 * proves less than it appears to.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

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
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    const re = /pytest\.raises\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      const openParen = m.index + m[0].length - 1;
      const closeParen = matchParen(ctx.text, openParen);
      if (closeParen === -1) continue;
      const args = ctx.text.slice(openParen + 1, closeParen);

      if (!/\bmatch\s*=/.test(args)) {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
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

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

function colAt(text: string, index: number): number {
  const lastBreak = text.lastIndexOf("\n", index - 1);
  return index - lastBreak;
}
