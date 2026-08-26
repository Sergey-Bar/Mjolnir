/**
 * "Fix this first" prioritization (Master-Stabilization-Plan Sprint 5,
 * Task 20).
 *
 * Ranks findings by score-gain-per-effort rather than raw severity, so
 * output says not just what is wrong but where to start. Display-only:
 * never alters scores, findings, or exit codes — purely a re-ordering
 * and annotation for the terminal reporter.
 *
 * Score gain: `deductionFor(finding)` — the exact, already-computed,
 * evidence-discounted point value fixing this one finding would recover
 * (a warning at E1 genuinely recovers half as much as one at E2; this
 * reuses the scorer's own honest math rather than inventing a second,
 * possibly-inconsistent number).
 *
 * Effort: the only effort signal this project has that isn't invented —
 * `RuleMeta.autofix`. A finding `qa-doctor fix` can resolve mechanically
 * is genuinely lower effort than one requiring a human to read code and
 * decide what "correct" looks like. This is a coarse two-tier signal
 * (autofixable / not), not a fabricated effort-hours estimate — inventing
 * a fake precision here would violate the same honesty principle the
 * rest of the scorer already enforces (Honesty Core: no invented numbers).
 */

import { deductionFor } from "./scorer.js";
import { RULES } from "../rules/index.js";
import type { Finding } from "../types.js";

export interface PrioritizedFinding {
  finding: Finding;
  /** Points this finding is actually costing the score right now. */
  scoreGain: number;
  /** From the rule's own declared Trust Metadata — never invented. */
  autofixable: boolean;
}

const AUTOFIX_BY_RULE = new Map(RULES.map((r) => [r.id, r.autofix === true]));

/**
 * Deterministic ranking: highest score-gain first; ties broken by
 * autofixable-first (truly free wins surface before manual ones of
 * equal value); remaining ties broken by file → line → ruleId, the
 * same canonical order compareFindings already uses, so the ordering
 * never depends on input array order or object identity.
 */
export function prioritize(findings: readonly Finding[]): PrioritizedFinding[] {
  return findings
    .map((finding) => ({
      finding,
      scoreGain: deductionFor(finding),
      autofixable: AUTOFIX_BY_RULE.get(finding.ruleId) === true,
    }))
    .sort((a, b) => {
      if (a.scoreGain !== b.scoreGain) return b.scoreGain - a.scoreGain;
      if (a.autofixable !== b.autofixable) return a.autofixable ? -1 : 1;
      if (a.finding.file !== b.finding.file)
        return a.finding.file < b.finding.file ? -1 : 1;
      if (a.finding.line !== b.finding.line)
        return a.finding.line - b.finding.line;
      return a.finding.ruleId < b.finding.ruleId ? -1 : 1;
    });
}

/** Top N prioritized findings — what "fix this first" surfaces by default. */
export function topFixes(
  findings: readonly Finding[],
  n = 3,
): PrioritizedFinding[] {
  return prioritize(findings)
    .filter((p) => p.scoreGain > 0) // an E0 finding costs nothing to "fix"
    .slice(0, n);
}
