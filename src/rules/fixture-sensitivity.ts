import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { RULES } from "./index.js";

/**
 * Is a rule's MUST-NOT-FIRE fixture plausibly its MUST-FIRE fixture with the
 * defect neutralised?
 *
 * This lives in `src/` rather than in the gate script because the fifth
 * conformity leg (`PREDICATE_SENSITIVE` in `./conformity.ts`) needs the same
 * measurement. Two implementations of one metric is two things to keep in
 * sync, and the failure mode is silent: the leg and the nightly arm report
 * different numbers for the same rule and neither notices.
 *
 * WHAT IT MEASURES, AND WHAT IT DOES NOT
 *
 * A negative fixture is evidence about the PREDICATE only when it is the
 * positive fixture with the defect removed. When it is a different program that
 * merely does not trigger, the pair shows the detector is directional — it
 * fires on the case built for it and is quiet on unrelated code — and says
 * nothing about whether the predicate responds to the defect at all.
 *
 * So this measures how far the two files diverge, which needs no knowledge of
 * what the defect is. It does NOT prove sensitivity; it measures the
 * precondition for sensitivity. A MUTANT classification means "worth
 * believing", not "proven". Proving it needs the mutant GENERATED, which needs
 * a per-rule recipe, and that work is named rather than faked.
 */

export const POSITIVE_DIR = "tests/corpus/positive-fixtures";
export const NEGATIVE_DIR = "tests/corpus/negative-fixtures";
export const RATCHET_PATH = "docs/SENSITIVITY-RATCHET.json";

/**
 * Divergence at or below which a negative fixture counts as a neutralised
 * mutant rather than as unrelated code.
 *
 * 0.25 sits in the empty space between the two pairs that ARE mutants (0.143
 * and 0.2) and the nearest that is not (0.552) — so the cut comes from the
 * measurement rather than from a preference, and it is a named constant so
 * changing it is a visible decision instead of a silent re-tune.
 *
 * KNOWN LIMITATION, measured rather than assumed: `lineDivergence` sums
 * |count difference| over a line MULTISET, so an ADDED line contributes 1 and
 * a SUBSTITUTED line contributes 2 (one removed, one added). The same
 * neutralisation — removing a defect — therefore costs twice as much if it is
 * written as a substitution (`@Disabled` -> `@Enabled`) as if it is written as
 * an added line. Measured on a four-line fixture: addition 0.2, substitution
 * 0.5, a 2.5x difference.
 *
 * Both current classifications are correct on inspection — QA-PW-144's negative
 * adds a `firefox` project to a single-engine config, QA-PW-116's adds
 * `globalSetup` to a `storageState` with no expiry strategy — so this is a
 * metric-design limitation, not a wrong answer. It is recorded because the
 * alternative is a threshold that silently means two different things depending
 * on how the next author writes their fixture. Making the two shapes
 * commensurate (Levenshtein over the line sequence, or counting EDIT SITES
 * rather than differing lines) is the real fix and is not done here.
 */
export const MUTANT_MAX_DIVERGENCE = 0.25;

export type Classification = "MUTANT" | "DIVERGENT";

export interface Sensitivity {
  ruleId: string;
  classification: Classification;
  divergence: number;
  changedLines: number;
  lines: number;
  positive: string;
  negative: string;
}

function filesUnder(root: string, dir: string): string[] {
  if (!existsSync(join(root, dir))) return [];
  const out: string[] = [];
  const walk = (rel: string): void => {
    for (const entry of readdirSync(join(root, rel), {
      withFileTypes: true,
    })) {
      const next = join(rel, entry.name);
      if (entry.isDirectory()) walk(next);
      else if (entry.isFile()) out.push(next);
    }
  };
  walk(dir);
  return out.sort();
}

/**
 * Multiset difference over normalised lines.
 *
 * Order-insensitive on purpose: a fixture pair that reorders two methods is
 * still the same program, and a detector that cares about order is the unusual
 * case that should be argued for in prose rather than assumed here. Whitespace
 * is normalised so a reformat is not mistaken for a semantic change.
 */
export function lineDivergence(
  a: string,
  b: string,
): { changed: number; lines: number; ratio: number } {
  const norm = (s: string): string[] =>
    s
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  const left = norm(a);
  const right = norm(b);
  const counts = new Map<string, number>();
  for (const l of left) counts.set(l, (counts.get(l) ?? 0) + 1);
  for (const l of right) counts.set(l, (counts.get(l) ?? 0) - 1);
  let changed = 0;
  for (const n of counts.values()) changed += Math.abs(n);
  const lines = Math.max(left.length, right.length, 1);
  return { changed, lines, ratio: Math.round((changed / lines) * 1000) / 1000 };
}

/** The rule's own directory name, not every directory under the fixtures root. */
function ruleIds(): string[] {
  return [...new Set(RULES.map((r) => r.id))].sort();
}

/** The closest pair for one rule, or null when a leg is missing. */
export function measure(root: string, ruleId: string): Sensitivity | null {
  const pos = filesUnder(root, join(POSITIVE_DIR, ruleId));
  const neg = filesUnder(root, join(NEGATIVE_DIR, ruleId));
  if (pos.length === 0 || neg.length === 0) return null;
  let best: Sensitivity | null = null;
  for (const p of pos) {
    for (const n of neg) {
      const { changed, lines, ratio } = lineDivergence(
        readFileSync(join(root, p), "utf8"),
        readFileSync(join(root, n), "utf8"),
      );
      if (best === null || ratio < best.divergence) {
        best = {
          ruleId,
          classification:
            ratio <= MUTANT_MAX_DIVERGENCE ? "MUTANT" : "DIVERGENT",
          divergence: ratio,
          changedLines: changed,
          lines,
          positive: p.slice(POSITIVE_DIR.length + 1),
          negative: n.slice(NEGATIVE_DIR.length + 1),
        };
      }
    }
  }
  return best;
}

/** Convenience for callers holding a root, like the conformity leg. */
export function sensitivityOf(
  root: string,
  ruleId: string,
): Sensitivity | null {
  return measure(root, ruleId);
}

/** Every live rule with both legs, measured. */
export function measureAll(root: string): Sensitivity[] {
  // Plain codepoint comparison, NOT `localeCompare`: the sort feeds a committed
  // ratchet and a generated document, and a locale-aware comparator makes that
  // output depend on the machine's locale. `tests/contract/deterministic-ordering.spec.ts`
  // enforces this across `src/`.
  const byId = (a: Sensitivity, b: Sensitivity): number =>
    a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0;
  return ruleIds()
    .map((id) => measure(root, id))
    .filter((s): s is Sensitivity => s !== null)
    .sort((a, b) => a.divergence - b.divergence || byId(a, b));
}

export function mutants(rows: Sensitivity[]): string[] {
  return rows.filter((r) => r.classification === "MUTANT").map((r) => r.ruleId);
}
