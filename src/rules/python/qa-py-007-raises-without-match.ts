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
  // on the risky shapes — a with-block holding ≥2 statements or a broad
  // root exception type.
  // detectorRevision 5 (EVIDENCE-BACKED, 6.0 — n=12 adjudicated): the
  // rev-4 gate never fired for NESTED code, because `pythonWithRaisesBlocks`
  // found the raises call by walking a with-statement's whole subtree and
  // then measured that with's block. A `with pytest.raises(...)` inside
  // `with saved_fd(1):` inherited the outer block's statement count, so the
  // "single statement" shape — the adjudicated FP core — was scored as
  // multi-statement. Seven of the eleven adjudicated findings were exactly
  // that shape, and pytest-dev/pytest nests its capture tests inside
  // `with saved_fd(...)`, so it measured 75% FP while its unit fixtures
  // passed. `pythonWithRaisesBlocks` now requires the raises call to be a
  // DIRECT context manager of the with it measures.
  //
  // The second change is the gate itself: a single-statement block is now
  // exempt REGARDLESS of exception type. The rev-4 note said "broad root
  // types always fire — the type alone pins nothing", which is true only
  // when the block has other lines: an earlier line can raise the broad
  // type before the intended one. With one statement there is no earlier
  // line, so the diagnosis cannot hold however broad the type is. The two
  // remaining adjudicated findings were `pytest.raises(Exception)` and
  // `(BaseException)` around a one-line body whose only action is the
  // intended raise.
  //
  // Re-measured against the same pinned corpus after the fix: the rule
  // fires on 2 of the 12 recorded findings, and both are the adjudicated
  // TRUE POSITIVES (pytest-dev/pytest `testing/test_recwarn.py:123` and
  // `:127`). 0 false positives, down from 9.
  //
  // The 75% figure is therefore WITHDRAWN, not corrected in place: the
  // verdicts behind it were taken at revision 4, so `detector-hashes.json`
  // keeps `QA-PY-007: 4` and this rule declares 5, which makes the
  // measurement stale and the rule UNMEASURED. That is the correct end state
  // rather than a loss — a 75% rate for a detector that no longer exists
  // would be the claim to stop making, exactly as a 9-of-79 rule claiming
  // `core` was.
  //
  // What earns a measurement back is a fresh corpus sample at revision 5.
  // The evidence says it will be a good one: 2 of 2 surviving findings are
  // true positives, and the FP clusters the fix removes were 7 nested
  // single-statement blocks and 2 broad-type single-statement blocks.
  detectorRevision: 5,

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
 * AST arm (detectorRevision 5 — P6 rework, widened on adjudicated evidence):
 * candidates come from the parsed `with pytest.raises(...)` statements, and
 * the raises call must be a DIRECT context manager of the with whose block
 * is measured (see `pythonWithRaisesBlocks` for why).
 *
 * The gate: a block with fewer than two statements is exempt. That covers
 * the adjudicated FP core — pytest-dev/pytest nests its capture tests inside
 * `with saved_fd(1):`, and every one of those was scored as multi-statement
 * until the block resolution was fixed. A broad root type (Exception /
 * BaseException / …Group) still fires on a MULTI-statement block, where an
 * earlier line can raise it before the intended one.
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
    // The P6 precision gate, widened at rev 5: a single-statement block is
    // exempt whatever the exception type, because the "an unrelated bug can
    // raise first" diagnosis needs an earlier line and a one-line body has
    // none. The broad-type escape only ever mattered for multi-statement
    // blocks, where an earlier line CAN raise the broad type.
    if (block.blockStatements < 2) continue;
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
