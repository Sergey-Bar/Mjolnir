/**
 * QA-TQUAL-009 — Unawaited assertion inside a promise chain.
 * Severity: error · Confidence: high · deterministic-defect
 *
 * `fetch().then(r => expect(r.ok).toBe(true))` — the expect runs, but
 * nothing awaits the chain, so a rejection (or the assertion itself)
 * never influences the test result. eslint-plugin-jest calls this
 * `valid-expect-in-promise`; it is one of the most-loved rules because
 * it catches tests that pass while their checks silently vanish.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";
import { getTsSourceFile } from "../../engine/ts-ast.js";
import ts from "ts-morph";

export const unawaitedPromiseAssertion = defineRule({
  id: "QA-TQUAL-009",
  category: "QA-TQUAL",
  title: "Assertion in promise chain that is never awaited",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["jest", "vitest", "playwright"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  strategyJustification: {
    reasonCode: "runner-semantic",
    detail:
      "un-awaited promise assertions are runner async semantics; the " +
      "detector matches the assertion-call shapes inside promise chains " +
      "on the code-only text — the async contract is runner behavior",
  },
  introduced: "0.2.0",

  // Measured 2026-09-02 (corpus wave 5): tier set from the measured envelope (plan §11.2).
  // detectorRevision 2 (P6 rework, plan 1789009691197 R3 — AST substrate):
  // the adjudicated FP core (11 of 14) is Cypress command chains —
  // `cy.request(...).then(...)` is queued and awaited by the Cypress
  // driver, so the assertion DOES gate the test — plus one deliberate
  // `void` fire-and-forget. With the ts-morph tree available the detector
  // skips chains whose root receiver is `cy` (Cypress) and chains wrapped
  // in a VoidExpression; without a tree the rev-1 line-walk runs
  // unchanged (parse-or-fallback §10.1).
  tier: "quarantine",
  detectorRevision: 2,
  run(ctx) {
    const sourceFile = getTsSourceFile(ctx.ast);
    if (sourceFile) return astArm(ctx, sourceFile);
    return regexArm(ctx);
  },
});

/** The rev-1 line-walk detector — the parse-or-fallback path (§10.1). */
function regexArm(ctx: {
  path: string;
  text: string;
  codeText?: string;
}): Omit<Finding, "ruleId" | "category">[] {
  const text = ctx.codeText ?? ctx.text;
  const findings: Omit<Finding, "ruleId" | "category">[] = [];

  // Find `.then(...)` callbacks containing expect(...) where the chain
  // head is not awaited/returned.
  const thenRe = /\.then\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = thenRe.exec(text)) !== null) {
    // The `.then(` argument list — bound every check to it so an arrow
    // with an expression body (`.then(r => expect(r).toBe(1))`) or a
    // sibling `.then(res => res.text())` never reaches into an
    // unrelated `{ … }` further down the file.
    const argsOpen = m.index + m[0].length - 1; // index of the '('
    const argsClose = matchParen(text, argsOpen);
    if (argsClose === -1) continue;
    const callbackText = text.slice(argsOpen + 1, argsClose);

    // An assertion has to be a real `expect(...)` / `assert...` call in
    // THIS callback — `res.text()` and `.map(...)` no longer count.
    // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
    if (!/\bexpect\s*\(|\bassert(?:\.\w+)?\s*\(/.test(callbackText)) continue;

    // Walk backwards over chained lines (`.method(...)` continuations)
    // to find the statement head, then check for await/return.
    // Bug-audit M0 #1 (HIGH): the old walk could assign `stmtStart =
    // lineStart` when `.then(` was already the first token on its line —
    // zero backward progress, so the loop re-entered the identical
    // branch forever and the whole scan hung (the per-file budget only
    // checks BETWEEN rules). The walk now always moves strictly back.
    let stmtStart = m.index;
    while (stmtStart > 0) {
      const lineStart = text.lastIndexOf("\n", stmtStart - 1) + 1;
      // Text on the current line up to where we are — for the first
      // iteration this is everything before `.then`, e.g. `  await foo()`
      // or, when the `.then` is on its own line, just indentation.
      const curLineHead = text.slice(lineStart, stmtStart).trimEnd();
      if (lineStart === 0) {
        stmtStart = lineStart;
        break;
      }
      // Start of the line BEFORE lineStart. `lastIndexOf("\n",
      // lineStart - 2)` with a negative fromIndex searches from the END
      // of the string (the M0 #12 class of bug) — special-case it.
      const prevLineStart =
        lineStart === 1 ? 0 : text.lastIndexOf("\n", lineStart - 2) + 1;
      const prevLine = text.slice(prevLineStart, lineStart).trimEnd();
      // Progress invariant: prevLineStart < lineStart <= stmtStart, so
      // every absorption strictly decreases stmtStart — the walk always
      // terminates without an explicit guard.
      // Chain continues upward when either: this line's head is empty /
      // starts with a `.` continuation, or the previous line ends with an
      // operator / opening token.
      if (
        curLineHead === "" ||
        /^\.\w/.test(curLineHead) ||
        /(?:[.([,:=]|&&|\|\|)$/.test(prevLine)
      ) {
        if (/^\s*(?:await|return)\b/.test(prevLine)) {
          stmtStart = prevLineStart;
          break;
        }
        // Absorb the previous line and keep walking — always progress.
        stmtStart = prevLineStart;
        continue;
      }
      stmtStart = lineStart;
      break;
    }
    const head = text.slice(stmtStart, m.index);
    // `await` / `return` anywhere in the chain head, including
    // `await Promise.all(` / `const x = await foo()` wrapping the chain.
    const awaited = /(?:^|[^\w.])(?:await|return)\s/.test(head);

    if (!awaited) {
      findings.push({
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "FALSE-GREEN",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message:
          "Assertion inside a `.then()` whose promise is never awaited or returned.",
        why: "The assertion executes but its result — including failures — is discarded. The test passes even when the check would fail.",
        fix: "Await the promise (`await ...`), return it from the test, or convert to async/await with a top-level expect.",
      });
      // One finding per file keeps noise down; position at first offender.
      break;
    }
  }
  return findings;
}

/**
 * AST arm (detectorRevision 2 — P6 rework): structural skip for the two
 * adjudicated FP classes the line-walk cannot see —
 *  - Cypress command chains: the chain's ROOT receiver is `cy`
 *    (`cy.request(...).then(...)`); Cypress queues and awaits its own
 *    commands, so the assertion DOES gate the test;
 *  - `void`-wrapped chains: a deliberate fire-and-forget marker.
 * Everything else the rev-1 diagnosis covers still fires, one per file.
 */
function astArm(
  ctx: { path: string; text: string },
  sourceFile: NonNullable<ReturnType<typeof getTsSourceFile>>,
): Omit<Finding, "ruleId" | "category">[] {
  const findings: Omit<Finding, "ruleId" | "category">[] = [];
  const thenCalls = sourceFile
    .getDescendantsOfKind(ts.SyntaxKind.PropertyAccessExpression)
    .filter(
      (p) =>
        p.getName() === "then" &&
        p.getParent()?.getKind() === ts.SyntaxKind.CallExpression,
    );

  for (const thenAccess of thenCalls) {
    const call = thenAccess.getParent() as ts.CallExpression;
    const callbackText = call.getText();
    // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
    if (!/\bexpect\s*\(|\bassert(?:\.\w+)?\s*\(/.test(callbackText)) continue;

    // Root receiver of the chain: unwrap PropertyAccess/Call/As-expression
    // expressions to the leftmost identifier.
    let root: ts.Node | undefined = thenAccess.getExpression();
    for (let guard = 0; root && guard < 200; guard++) {
      if (
        ts.Node.isPropertyAccessExpression(root) ||
        ts.Node.isCallExpression(root) ||
        ts.Node.isAsExpression(root)
      ) {
        root = root.getExpression();
        continue;
      }
      break;
    }
    if (root && ts.Node.isIdentifier(root) && root.getText() === "cy") {
      continue;
    }

    // Ancestor gates: any await/return/yield up the chain, or a deliberate
    // `void` marker, means the result is handled — skip.
    let handled = false;
    for (const anc of thenAccess.getAncestors()) {
      const k = anc.getKind();
      if (
        k === ts.SyntaxKind.AwaitExpression ||
        k === ts.SyntaxKind.ReturnStatement ||
        k === ts.SyntaxKind.YieldExpression
      ) {
        handled = true;
        break;
      }
      if (k === ts.SyntaxKind.VoidExpression) {
        handled = true;
        break;
      }
      if (k === ts.SyntaxKind.SourceFile) break;
    }
    if (handled) continue;

    const pos = thenAccess.getStart();
    const { line, column } = sourceFile.getLineAndColumnAtPos(pos);
    findings.push({
      severity: "error",
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: "FALSE-GREEN",
      file: ctx.path,
      line,
      column,
      message:
        "Assertion inside a `.then()` whose promise is never awaited or returned.",
      why: "The assertion executes but its result — including failures — is discarded. The test passes even when the check would fail.",
      fix: "Await the promise (`await ...`), return it from the test, or convert to async/await with a top-level expect.",
    });
    // One finding per file keeps noise down; position at first offender.
    break;
  }
  return findings;
}

/** Index of the `)` matching the `(` at `open`, or -1. Skips strings. */
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
