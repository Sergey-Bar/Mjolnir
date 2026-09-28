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
  strategyJustification: {
    reasonCode: "runner-semantic",
    detail:
      "bare truthiness asserts (assert obj) are assertion-semantics on " +
      "the code-only text; the detector matches the bare-assert shapes — " +
      "the AST re-derives the same call",
  },
  introduced: "0.3.0",
  tier: "quarantine",
  // Phase 2 retune wave 2 (EVIDENCE-BACKED, detectorRevision 3 — §07):
  // the rev-2 delta sample extends the predicate vocabulary with the
  // newly-measured FP shapes: membership/aggregate predicates
  // (any()/all() over comprehension checks), pytest's path predicates
  // (p.exists()/p.isdir()/p.check() — the check IS the assertion), mock
  // bookkeeping (.called), and truthiness followed by a precise assert
  // in the same test (an existence guard, not the only check).
  //
  // detectorRevision 4 (6.0, EVIDENCE-BACKED — n=42 adjudicated): revisions 2
  // and 3 answered each measured FP cluster by ADDING ITS METHOD NAME to
  // `predicateRe`. Ten clusters later the list still missed pytest's own
  // exception-info predicates, and 10 of the 12 adjudicated findings were
  // `assert exc_info.group_contains(...)` / `assert excinfo.errisinstance(...)`.
  // A vocabulary of names is the wrong shape for the fact being expressed:
  // the list says "these calls return a meaningful boolean", which is a
  // property of CALLS, not of any particular spelling.
  //
  // The rule's own premise already carries the structural criterion: "this
  // passes for ANY truthy value — including a wrong one". A CALL does not pass
  // for any truthy value — it passes for whatever that call computed. A bare
  // identifier or an attribute chain does. So the gate is the call itself:
  //
  //   `assert result`                 -> flagged  (truthiness of an object)
  //   `assert result.exception`       -> flagged  (truthiness of a sub-object)
  //   `assert exc_info.group_contains(X)` -> exempt (the call IS the check)
  //   `assert p.exists()`             -> exempt
  //   `assert len(items)`             -> exempt
  //
  // The trade is explicit: `assert make_thing()` where the callee returns a
  // complex object is now exempt, and that is a real (small) loss of recall.
  // It is smaller than the alternative, which is a list that has to be
  // extended once per library that returns something.
  //
  // The second change: a CONSTANT is not a complex object. `assert False` is
  // how a test manufactures an AssertionError to assert on its traceback, and
  // one adjudicated finding is exactly that.
  //
  // Re-measured against the same pinned corpus after the fix: the rule fires
  // on 0 of the 12 adjudicated findings, down from 12. The 66.7% figure is
  // therefore WITHDRAWN rather than corrected in place — its verdicts are
  // revision 3, this rule is revision 4, so the measurement reads stale and
  // the rule is UNMEASURED until a fresh sample at revision 4.
  //
  // What earns a measurement back is a corpus re-run, and the recall evidence
  // says it will be a useful one: `tests/fixtures/QA-PY-004/must-fire/` holds
  // the shapes the rule exists for (bare identifier, attribute chain, deep
  // attribute chain, a non-conventional name) and all of them still fire.
  // "Zero false positives" is only half a result — a detector that stopped
  // firing would score the same and be worth nothing — so the recall side is
  // asserted in the fixtures rather than assumed from the FP count.
  detectorRevision: 4,

  run(ctx) {
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!ctx.path.endsWith(".py")) return findings;

    // `assert <identifier-or-attribute>` or `assert <call>`, with no
    // comparison or boolean operator.
    // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/rules/redos-gate.spec.ts
    const re = /^[ \t]*assert\s+([A-Za-z_][\w.]*(?:\([^()]*\))?)[ \t]*$/gm;

    /**
     * Constants. `assert False` / `assert None` are deliberate mechanisms —
     * a test that manufactures an exception to assert on its shape — not a
     * truthiness check whose wrong value would slip through.
     */
    const isConstant = (target: string): boolean =>
      /^(?:True|False|None|NotImplemented|Ellipsis)$/.test(target) ||
      /^["'\d]/.test(target);

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
      const root = target.match(/^[a-z_]\w*/i)?.[0];
      if (!root) return false;
      return window.some((line) => {
        const tokens: string[] = line.match(/[a-z_]\w*/gi) ?? [];
        return tokens.some((token) => token === root);
      });
    };

    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const target = m[1] as string;
      // A CALL is the check, not a truthiness test on a complex object. This
      // replaces the hand-maintained method-name vocabulary of revisions 2
      // and 3 — see the header for why a name list was the wrong shape.
      if (target.includes("(")) continue;
      // A constant is a deliberate assertion, not an object whose wrong value
      // would slip through.
      if (isConstant(target)) continue;
      // Skip obviously-boolean names (is_/has_/can_ conventions).
      if (/^(?:is|has|can|should|was|were)_/.test(target)) continue;
      // Skip mock bookkeeping (`assert mock.called`) — the call record IS
      // the observable contract. An attribute chain, so the call rule above
      // does not cover it.
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
