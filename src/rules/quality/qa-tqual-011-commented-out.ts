/**
 * QA-TQUAL-011 — Commented-out tests.
 * Severity: warning · Confidence: high · deterministic-defect
 * Hidden fake-green hygiene: disabled checks nobody remembers to restore.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";
import {
  getTsSourceFile,
  commentAndStringRanges,
} from "../../engine/ts-ast.js";
export const commentedOutTest = defineRule({
  id: "QA-TQUAL-011",
  tier: "core",
  category: "QA-TQUAL",
  title: "Commented-out test",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["jest", "vitest", "playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex heuristic",
  introduced: "0.2.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // Commented-out test calls are detected by scanning COMMENT ranges
    // only — the inverse of the FP firewall: here the comment IS the
    // signal, so we must not fire on `it(` inside string literals or
    // live code.
    //
    // Anchoring (FP fix): a commented-out test has the test identifier as
    // the FIRST token on its commented line, after comment markers and
    // whitespace. Prose that merely mentions "test (" mid-sentence is
    // documentation. Matching anywhere inside the comment block made every
    // JSDoc header containing "…smoke test (Plan, P0 #2)" a false positive.
    for (const { start, end } of commentRanges(ctx)) {
      const comment = ctx.text.slice(start, end);
      let lineOffset = 0;
      for (const line of comment.split("\n")) {
        const stripped = stripCommentMarkers(line);
        if (stripped.matched && COMMENTED_TEST_RE.test(stripped.text)) {
          const abs = start + lineOffset + stripped.consumed;
          findings.push({
            severity: "warning",
            confidence: "high",
            findingType: "deterministic-defect",
            file: ctx.path,
            line: lineAt(ctx.text, abs),
            column: colAt(ctx.text, abs),
            message: "Commented-out test detected.",
            why: "Disabled tests hide known-unverified behavior behind a green checkmark and rot silently.",
            fix: "Re-enable the test, or delete it with a tracked issue referencing what it covered.",
            qaImpact: "HYGIENE",
          });
        }
        lineOffset += line.length + 1;
      }
    }
    return findings;
  },
});

/**
 * A commented-out test declaration: the identifier is the first token on
 * the line. `await` is allowed because `// await test('x')` is still a
 * disabled test; a `.skip`/`.only` modifier is allowed for the same reason.
 */
const COMMENTED_TEST_RE = /^(?:await\s+)?(?:it|test)(?:\.\w+)?\s*\(/;

/**
 * Strip leading whitespace and comment markers from one line of a comment
 * block, reporting how many characters were consumed so the finding's
 * column still points at the test identifier in the original text.
 *
 * `matched` is false for lines that carry no comment marker and are not the
 * continuation of a block comment — those cannot be a commented-out test.
 */
function stripCommentMarkers(line: string): {
  text: string;
  consumed: number;
  matched: boolean;
} {
  // <leading ws><marker><ws>  where marker is // , /**, /*, or a * gutter.
  // Every part is optional/zero-width, so exec always matches.
  const m = /^(\s*)(\/{2,}|\/\*\*?|\*)?(\s*)/.exec(line) as RegExpExecArray;
  const consumed = m[0].length;
  return {
    text: line.slice(consumed),
    consumed,
    // A bare continuation line inside a block comment has no marker but is
    // still comment content — the caller only passes text already known to
    // be inside a comment range, so absence of a marker is acceptable.
    matched: true,
  };
}

/** Comment ranges of the file via ts-morph; falls back to a safe
 * line-comment scan when no AST is available (fixture harness path). */
function commentRanges(ctx: {
  path: string;
  text: string;
  ast?: unknown;
}): Array<{ start: number; end: number }> {
  try {
    const sf = getTsSourceFile(ctx.ast);
    if (sf) {
      return commentAndStringRanges({ ...ctx, ast: sf }).filter((r) => {
        const slice = ctx.text.slice(r.start, r.end);
        return slice.startsWith("//") || slice.startsWith("/*");
      });
    }
  } catch {
    /* fall through to textual fallback */
  }
  // Fallback (no AST — fixture harness / mutation harness path): scan
  // line comments textually. A `// it(` or `// test(` prefix is a
  // commented-out test with high certainty; string literals on their own
  // line don't start with `//`, so live code stays silent.
  const ranges: Array<{ start: number; end: number }> = [];
  const lines = ctx.text.split("\n");
  let offset = 0;
  for (const line of lines) {
    const idx = line.indexOf("//");
    if (idx !== -1 && /^\/\/\s*(?:it|test)\s*\(/.test(line.slice(idx))) {
      ranges.push({ start: offset + idx, end: offset + line.length });
    }
    offset += line.length + 1;
  }
  return ranges;
}
