/**
 * ReDoS timing audit (Test Hardening Plan, P1).
 *
 * `fuzz.spec.ts` proves rules don't crash on one hand-picked adversarial
 * snippet. It says nothing about catastrophic backtracking: a regex can
 * survive every fixture and every fuzz snippet and still hang for minutes
 * on a shape of input nobody happened to write down — the classic ReDoS
 * failure mode. This generalizes the check: throw large, structurally
 * pathological (but syntactically ordinary-looking) source at every
 * registered rule and assert the WHOLE ruleset stays within a timing
 * budget that only makes sense for linear-ish regex work, never for
 * exponential backtracking.
 *
 * A budget this generous (10s for 45 rules × 6 inputs, i.e. hundreds of
 * regex passes over 20k-200k char strings) still fails hard and fast on
 * real catastrophic backtracking, which blows up exponentially — a
 * genuinely vulnerable pattern would take this well past the age of the
 * universe on these inputs, not a few seconds over budget.
 */

import { describe, expect, it } from "vitest";
import { RULES } from "../src/rules/index.js";

function repeatToLength(unit: string, targetLength: number): string {
  return unit.repeat(Math.ceil(targetLength / unit.length));
}

// Shapes known to trigger catastrophic backtracking in naive patterns
// like (a+)+, (a|a)*, ([\s\S]*)+ when a match ultimately fails: a long
// run of an "almost matching" character followed by one character that
// breaks the match, forcing the engine to explore combinatorially many
// ways of grouping the run before giving up.
const PATHOLOGICAL_SHAPES: Array<[string, string]> = [
  ["long-a-run-no-terminator", `${"a".repeat(60_000)}!`],
  ["long-whitespace-run", `${" ".repeat(60_000)}x`],
  ["deeply-nested-parens", `${"(".repeat(20_000)}x${")".repeat(20_000)}`],
  [
    "long-alternation-bait",
    repeatToLength("aaaaaaaaaaaaaaaaaaaab", 60_000) + "!",
  ],
  [
    "long-dotstar-chain",
    `it("${"x".repeat(40_000)}", () => { expect(1).toBe(1) })`,
  ],
  ["long-quoted-string-run", `const s = "${"\\\\".repeat(30_000)}";`],
  [
    // QA-PW-004's data-testid/aria lookahead: an unterminated selector
    // string whose content is a run of alternation-matching prefixes —
    // the alternation matches at every backtrack position, so an
    // UNBOUNDED guard rescans the whole remainder each time (quadratic).
    // The bounded guard must stay linear-ish on this shape.
    "locator-alternation-bait",
    `page.locator("aria-${"aria-".repeat(12_500)}")`,
  ],
];

// Generous but exponential-catching: linear regex work over this much
// text, across every rule, is comfortably sub-second in practice; only
// real backtracking blowups would approach this ceiling.
const TOTAL_BUDGET_MS = 10_000;

describe("ReDoS timing gate: no rule catastrophically backtracks", () => {
  it("every registered rule survives every pathological shape within budget", () => {
    const start = performance.now();
    for (const [, text] of PATHOLOGICAL_SHAPES) {
      for (const rule of RULES) {
        // Crash isolation is a separate concern (fuzz.spec.ts); here we
        // only care about time, so swallow any throw and keep timing.
        try {
          rule.run({ path: "evil.spec.ts", text });
        } catch {
          /* not this test's job */
        }
      }
    }
    const elapsed = performance.now() - start;
    expect(
      elapsed,
      `ruleset took ${elapsed.toFixed(0)}ms across ${
        PATHOLOGICAL_SHAPES.length
      } pathological inputs × ${RULES.length} rules — that's consistent ` +
        `with catastrophic regex backtracking somewhere in the ruleset. ` +
        `Bisect by shape/rule to find the offending pattern.`,
    ).toBeLessThan(TOTAL_BUDGET_MS);
  });

  it("each individual rule stays fast in isolation (pinpoints the offender)", () => {
    const slow: Array<{ id: string; shape: string; ms: number }> = [];
    const PER_RULE_BUDGET_MS = 1_500;
    for (const [shapeName, text] of PATHOLOGICAL_SHAPES) {
      for (const rule of RULES) {
        const start = performance.now();
        try {
          rule.run({ path: "evil.spec.ts", text });
        } catch {
          /* crash isolation is fuzz.spec.ts's job, not this one */
        }
        const ms = performance.now() - start;
        if (ms > PER_RULE_BUDGET_MS) {
          slow.push({ id: rule.id, shape: shapeName, ms: Math.round(ms) });
        }
      }
    }
    expect(
      slow,
      `rule(s) took over ${PER_RULE_BUDGET_MS}ms on a single input — ` +
        `each of these is a ReDoS candidate to bisect individually: ` +
        JSON.stringify(slow, null, 2),
    ).toEqual([]);
  });
});
