/**
 * QA-PY-004 — Bare truthiness assert on complex object.
 * Severity: warning · Confidence: medium · heuristic-risk
 * `assert result` passes for ANY truthy value — including a wrong one.
 * It verifies almost nothing about behavior.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

export const pyBareTruthinessAssert = defineRule({
  id: "QA-PY-004",
  category: "QA-TQUAL",
  title: "Bare truthiness assert on complex object",
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
  // Phase 2 retune wave 2 (EVIDENCE-BACKED, detectorRevision 3 — §07):
  // the rev-2 delta sample extends the predicate vocabulary with the
  // newly-measured FP shapes: membership/aggregate predicates
  // (any()/all() over comprehension checks), pytest's path predicates
  // (p.exists()/p.isdir()/p.check() — the check IS the assertion), mock
  // bookkeeping (.called), and truthiness followed by a precise assert
  // in the same test (an existence guard, not the only check).
  detectorRevision: 3,

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    // `assert <identifier-or-call>` with no comparison/boolean operator.
    // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
    const re = /^[ \t]*assert\s+([A-Za-z_][\w.]*(?:\([^()]*\))?)[ \t]*$/gm;

    // Calls whose return value is a meaningful boolean predicate — the
    // truthiness IS the check, so flagging them as "bare" is wrong.
    // Wave 2 additions per the rev-2 delta sample: any()/all() aggregates,
    // pytest path predicates (exists/isdir/check), re.match/search,
    // isinstance, and string-content predicates.
    const predicateRe =
      /^(?:(?:any|all|isinstance)\s*\(|[\w.]*\.(?:startswith|endswith|exists|isdir|isfile|islink|ismount|check|isdigit|isalpha|isalnum|isnumeric|isdecimal|isspace|islower|isupper|istitle|isidentifier|isprintable|isascii)\s*\(|re\.(?:match|search|fullmatch)\s*\()/;

    // A truthiness assert that is a GUARD followed by real use of the
    // same value within the SAME test is not the suite's only evidence:
    // `assert result.exception` + `assert "..." in result.stderr` pins
    // the failure; `assert copied_text` + `re.match(..., copied_text)`
    // pins the content. Scoped to the enclosing test body (until the
    // next `def` or 15 lines) — the measured cluster always pins within
    // 1-2 lines, and a whole-file scan would let an unrelated later test
    // suppress a genuine finding.
    const isGuardFollowedByRealUse = (
      text: string,
      matchIndex: number,
      target: string,
    ): boolean => {
      // The capture regex only admits [A-Za-z_][\w.]* targets (plus an
      // optional (...) tail), so the root is always an identifier —
      // split always yields that head, no guard needed.
      const root = target.split(".")[0] as string;
      // Search strictly AFTER this assert's own line — the line itself
      // always contains the root and would self-match.
      const lineEnd = text.indexOf("\n", matchIndex);
      if (lineEnd === -1) return false;
      const after = text.slice(lineEnd + 1);
      // Body window: up to the next def (any indent) or 15 lines.
      const lines = after.split("\n");
      const window: string[] = [];
      for (let i = 0; i < lines.length && window.length < 15; i++) {
        const l = lines[i] as string;
        if (/^\s*def\s/.test(l) && window.length > 0) break;
        window.push(l);
      }
      // eslint-disable-next-line security/detect-non-literal-regexp -- root is an identifier — the capture regex only admits [A-Za-z_][\w.]* targets
      const usesRoot = new RegExp(`\\b${root}\\b`);
      return window.some((l) => usesRoot.test(l));
    };

    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const target = m[1] as string;
      // Skip obviously-boolean names (is_/has_/can_ conventions).
      if (/^(?:is|has|can|should|was|were)_/.test(target)) continue;
      // Skip boolean-predicate calls (the measured FP clusters).
      if (predicateRe.test(target)) continue;
      // Skip mock bookkeeping (`assert mock.called`) — the call record IS
      // the observable contract.
      if (/\.called$/.test(target)) continue;
      // Skip existence guards followed by real use of the same value in
      // the same test (wave-2 cluster: `assert stdout` then
      // `stdout.readline()`; `assert copied_text` then re.match).
      if (isGuardFollowedByRealUse(text, m.index, target)) continue;
      findings.push({
        severity: "warning",
        confidence: "medium",
        findingType: "heuristic-risk",
        qaImpact: "FALSE-GREEN",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: `Bare truthiness assert: \`assert ${target}\`.`,
        why: "This passes for any truthy value — a wrong object, wrong count, or partially-built result all slip through. It verifies existence, not correctness.",
        fix: "Assert the specific expected value or property: `assert result.id == expected`, `assert len(items) == 3`.",
      });
    }
    return findings;
  },
});
