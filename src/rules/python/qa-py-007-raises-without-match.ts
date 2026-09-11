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
import {
  getPythonTree,
  pythonWithRaisesBlocks,
} from "../../engine/python-ast.js";

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
  strategyJustification: {
    reasonCode: "runner-semantic",
    detail:
      "pytest.raises without match is a runner exception-contract " +
      "semantic; the detector matches the raises-call plus its " +
      "argumentless form — the runner's exception contract, not a syntax " +
      "property",
  },
  introduced: "0.3.0",
  tier: "quarantine",
  // Phase 2 retune wave 2 (EVIDENCE-BACKED, detectorRevision 3 — §07):
  // the rev-2 delta sample (20/20 FP) shows the excinfo assertion is
  // not always within a 1600-char window nor on an assert/expect line:
  // multi-line assert chains and `msg = str(exc_info.value)` followed by
  // asserts on `msg` also pin the failure. The excinfo skip now scans a
  // window scaled to the enclosing test body for ANY use of the excinfo
  // name (assert, expect, or assignment-then-assert).
  // detectorRevision 4 (P6 rework, plan 1789009691197 R3 — AST substrate):
  // when the tree-sitter python tree is available the detector fires only
  // on the risky shapes — a with-block holding ≥2 statements (an unrelated
  // bug can raise before the intended line) or a broad root exception
  // type (Exception/BaseException/ExceptionGroup — the type alone pins
  // nothing). Single-statement blocks with a specific exception type are
  // the adjudicated FP core (the intended line is the only line). The
  // regex fallback (no tree) keeps the rev-3 behavior.
  detectorRevision: 4,

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    // P6 AST arm (detectorRevision 4): when the tree-sitter python tree
    // is available, candidates come from the parsed with-statements and
    // the structural gates apply. Without a tree (parse-or-fallback,
    // §10.1) the rev-3 regex scan runs unchanged.
    const tree = getPythonTree(ctx.ast);
    if (tree) return astArm(ctx, tree);

    const text = ctx.codeText ?? ctx.text;
    const re = /pytest\.raises\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const openParen = m.index + m[0].length - 1;
      const closeParen = matchParen(text, openParen);
      if (closeParen === -1) continue;
      const args = text.slice(openParen + 1, closeParen);

      if (!/\bmatch\s*=/.test(args)) {
        // excinfo-assertion skip: `as exc_info` + any downstream USE of
        // the excinfo name (assert/expect on .value, `msg =
        // str(exc_info.value)` then assert on msg) pins the failure to
        // the intended cause — the match= diagnosis does not hold.
        const after = text.slice(closeParen, closeParen + 120);
        const asMatch = /as\s+([A-Za-z_]\w*)/.exec(after);
        if (asMatch) {
          const name = asMatch[1] as string;
          // Window scaled to a plausible test body; multi-line assert
          // chains and assignment-then-assert both land inside it.
          const tail = text.slice(closeParen, m.index + 2400);
          // eslint-disable-next-line security/detect-non-literal-regexp -- name is an [A-Za-z_]\w* identifier captured from `as <name>` — no metacharacters
          const uses = new RegExp(`\\b${name}\\b`).test(tail);
          if (uses) continue;
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

/**
 * AST arm (detectorRevision 4 — P6 rework): candidates come from the
 * parsed `with pytest.raises(...)` statements. Two structural gates
 * suppress the adjudicated FP core:
 *  - the with-block holds a SINGLE statement AND the exception type is
 *    specific → the intended line is the only line; the "unrelated bug
 *    raises first" diagnosis cannot hold;
 *  - the fallback's excinfo-use skip (`as exc` + downstream use) is
 *    mirrored on the raw text.
 * Broad root types (Exception/BaseException/…Group) always fire — the
 * type alone pins nothing.
 */
function astArm(
  ctx: { path: string; text: string; ast?: unknown },
  tree: NonNullable<ReturnType<typeof getPythonTree>>,
): Omit<Finding, "ruleId" | "category">[] {
  const raw = ctx.text;
  const findings: Omit<Finding, "ruleId" | "category">[] = [];
  for (const block of pythonWithRaisesBlocks(tree)) {
    if (block.hasMatch) continue;
    // excinfo-assertion skip (mirror of the fallback's window logic).
    const after = raw.slice(block.callEnd, block.callEnd + 120);
    const asMatch = /as\s+([A-Za-z_]\w*)/.exec(after);
    if (asMatch) {
      const name = asMatch[1] as string;
      const tail = raw.slice(block.callEnd, block.callEnd + 2400);
      // eslint-disable-next-line security/detect-non-literal-regexp -- name is an [A-Za-z_]\w* identifier captured from `as <name>` — no metacharacters
      if (new RegExp(`\\b${name}\\b`).test(tail)) continue;
    }
    // The P6 precision gate: single-statement block + specific exception
    // type = the adjudicated FP core.
    if (block.blockStatements < 2 && !block.broadException) continue;
    findings.push({
      severity: "warning",
      confidence: "medium",
      findingType: "heuristic-risk",
      qaImpact: "FALSE-GREEN",
      file: ctx.path,
      line: lineAt(raw, block.callStart),
      column: colAt(raw, block.callStart),
      message:
        "`pytest.raises` without a `match=` pattern" +
        (block.broadException
          ? " on a broad exception type."
          : ` over ${block.blockStatements} block statements.`),
      why: "Without match=, any exception of that type anywhere in the block passes — including one raised by an unrelated bug before the code under test even runs.",
      fix: 'Add `match="expected message fragment"` to pin the failure to the intended cause.',
    });
  }
  return findings;
}
