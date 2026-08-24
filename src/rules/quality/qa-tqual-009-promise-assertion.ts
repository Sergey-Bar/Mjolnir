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

import { defineRule } from '../rule.js';
import type { Finding } from '../../types.js';

export const unawaitedPromiseAssertion = defineRule({
  id: 'QA-TQUAL-009',
  category: 'QA-TQUAL',
  title: 'Assertion in promise chain that is never awaited',
  severity: 'error',
  confidence: 'high',
  findingType: 'deterministic-defect',
  appliesTo: 'test-files',
  run(ctx) {
    const findings: Omit<Finding, 'ruleId' | 'category'>[] = [];

    // Find `.then(...)` callbacks containing expect(...) where the chain
    // head is not awaited/returned.
    const thenRe = /\.then\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = thenRe.exec(ctx.text)) !== null) {
      // Walk backwards over chained lines (`.method(...)` continuations)
      // to find the statement head, then check for await/return.
      let stmtStart = m.index;
      while (stmtStart > 0) {
        const lineStart = ctx.text.lastIndexOf('\n', stmtStart - 1) + 1;
        const prevLine = ctx.text.slice(lineStart, stmtStart).trimEnd();
        // Previous line ends with an operator or opening — chain continues upward.
        if (/(?:\.|\(|\[|,|:|=)$/.test(prevLine) || /^\s*\.\w/.test(ctx.text.slice(stmtStart - (stmtStart - lineStart), stmtStart))) {
          stmtStart = lineStart;
          // If that line itself starts with await/return, stop early.
          if (/^\s*(?:await|return)\b/.test(prevLine)) break;
          continue;
        }
        stmtStart = lineStart;
        break;
      }
      const head = ctx.text.slice(stmtStart, m.index);
      const awaited = /(?:^|[^\w.])(?:await|return)\s/.test(head) || /^\s*(?:await|return)\b/.test(head);

      // Find the callback body braces.
      const openBrace = ctx.text.indexOf('{', m.index);
      if (openBrace === -1) continue;
      const closeBrace = matchBrace(ctx.text, openBrace);
      if (closeBrace === -1) continue;

      const body = ctx.text.slice(openBrace, closeBrace + 1);
      if (/expect\s*\(/.test(body) && !awaited) {
        findings.push({
          severity: 'error',
          confidence: 'high',
          findingType: 'deterministic-defect',
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: 'Assertion inside a `.then()` whose promise is never awaited or returned.',
          why: 'The assertion executes but its result — including failures — is discarded. The test passes even when the check would fail.',
          fix: 'Await the promise (`await ...`), return it from the test, or convert to async/await with a top-level expect.',
        });
        // One finding per file keeps noise down; position at first offender.
        break;
      }
    }
    return findings;
  },
});

function matchBrace(text: string, open: number): number {
  let depth = 0;
  let inStr: string | null = null;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === '\\') i++;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') inStr = ch;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === '\n') line++;
  return line;
}

function colAt(text: string, index: number): number {
  const lastBreak = text.lastIndexOf('\n', index - 1);
  return index - lastBreak;
}
