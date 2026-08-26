/**
 * QA-TQUAL-011 — Commented-out tests.
 * Severity: warning · Confidence: high · deterministic-defect
 * Hidden fake-green hygiene: disabled checks nobody remembers to restore.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
export const commentedOutTest = defineRule({
  id: "QA-TQUAL-011",
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
    const re = /(?:^|[^\w$])(?:it|test)\s*\(/g;

    for (const { start, end } of commentRanges(ctx)) {
      const comment = ctx.text.slice(start, end);
      let m: RegExpExecArray | null;
      re.lastIndex = 0;
      while ((m = re.exec(comment)) !== null) {
        const abs = start + m.index;
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
    }
    return findings;
  },
});

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

import {
  getTsSourceFile,
  commentAndStringRanges,
} from "../../engine/ts-ast.js";

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

function colAt(text: string, index: number): number {
  const lastBreak = text.lastIndexOf("\n", index - 1);
  return index - lastBreak;
}
