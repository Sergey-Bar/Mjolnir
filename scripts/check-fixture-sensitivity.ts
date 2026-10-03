/**
 * Is a rule's MUST-NOT-FIRE fixture actually its defect, neutralised?
 *
 * THE QUESTION
 *
 * The fixture quad counts four legs, and two of them are counted as evidence
 * that a rule is precise: a must-fire fixture and a must-not-fire fixture.
 * `docs/PRECISION-RATCHET.json` records 32 rules as holding a PRECISION leg,
 * and its own note is candid that this is "a wiring proof, not an accuracy
 * proof, and a self-derived one".
 *
 * That note is right, and it can be given a number. A must-not-fire fixture
 * only proves anything about the RULE's sensitivity when it is the same program
 * with the defect removed — a neutralised mutant. When it is a different
 * program that merely happens not to trigger, the pair shows the detector is
 * directional (it fires on the case built for it, silent on unrelated code) and
 * says nothing about whether the predicate is sensitive to the defect itself.
 * Both look identical to a presence check, and the quad is a presence check.
 *
 * So this measures the divergence between each rule's closest positive/negative
 * fixture pair and classifies it. The finding, measured on this tree:
 *
 *   40 live rules carry both legs.
 *   2  are plausible neutralised mutants (divergence <= 0.25): QA-PW-144 at
 *      1 changed line of 7 (0.143) and QA-PW-116 at 1 of 5 (0.2).
 *   38 are a different program (divergence > 0.25). The next nearest is 0.552
 *      (QA-CS-109, 16 changed lines of 29), and the furthest diverge by more
 *      lines than either file contains, because a hand-written neutral fixture
 *      also renames the class and rewrites the bodies.
 *
 * Which is the honest answer to "does the detector set have teeth", and it is
 * not the answer the quad implies. Nothing here is a failure today: the pairs
 * are not wrong, they are weaker than being counted as precision evidence. So
 * this is a RATCHET with a floor at the true count, not a gate — it fails on a
 * rule REGRESSING out of the mutant set or on a new rule shipping without one,
 * and it does not go red on the 38 that were always like this.
 *
 * WHY NOT GENERATE THE MUTANTS
 *
 * Generating them is the stronger version and is the right eventual answer: it
 * makes the pair a derivation instead of a second hand-written artifact that
 * can drift from the first. It needs a per-rule recipe for what the defect is,
 * which is knowledge no tree can supply. Until those recipes exist, measuring
 * the pairs that do exist is the honest floor — and it names the work.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { RULES } from "../src/rules/index.js";

import { isMainModule } from "./lib/is-main-module.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

export const POSITIVE_DIR = "tests/corpus/positive-fixtures";
export const NEGATIVE_DIR = "tests/corpus/negative-fixtures";
export const RATCHET_PATH = "docs/SENSITIVITY-RATCHET.json";

/**
 * Divergence at or below which a negative fixture counts as a neutralised
 * mutant rather than as unrelated code.
 *
 * 0.25 sits in the empty space between the two pairs that ARE mutants
 * (0.143 and 0.2) and the nearest that is not (0.552) — so the cut comes from
 * the measurement rather than from a preference, and it is a named constant so
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

function filesUnder(dir: string): string[] {
  if (!existsSync(join(ROOT, dir))) return [];
  const out: string[] = [];
  const walk = (rel: string): void => {
    for (const entry of readdirSync(join(ROOT, rel), { withFileTypes: true })) {
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
): {
  changed: number;
  lines: number;
  ratio: number;
} {
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
  const live = new Set(RULES.map((r) => r.id));
  return [...live].sort();
}

export function measure(ruleId: string): Sensitivity | null {
  const pos = filesUnder(join(POSITIVE_DIR, ruleId));
  const neg = filesUnder(join(NEGATIVE_DIR, ruleId));
  if (pos.length === 0 || neg.length === 0) return null;
  let best: Sensitivity | null = null;
  for (const p of pos) {
    for (const n of neg) {
      const { changed, lines, ratio } = lineDivergence(
        readFileSync(join(ROOT, p), "utf8"),
        readFileSync(join(ROOT, n), "utf8"),
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

/** Every live rule with both legs, measured. */
export function measureAll(): Sensitivity[] {
  return ruleIds()
    .map(measure)
    .filter((s): s is Sensitivity => s !== null)
    .sort(
      (a, b) => a.divergence - b.divergence || a.ruleId.localeCompare(b.ruleId),
    );
}

export function mutants(rows: Sensitivity[]): string[] {
  return rows.filter((r) => r.classification === "MUTANT").map((r) => r.ruleId);
}

export function loadRatchet(): { floor: number; mutants: string[] } {
  const path = join(ROOT, RATCHET_PATH);
  if (!existsSync(path)) return { floor: 0, mutants: [] };
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    floor?: number;
    mutants?: string[];
  };
  return { floor: raw.floor ?? 0, mutants: raw.mutants ?? [] };
}

export function check(): {
  status: "PASS" | "FAIL";
  floor: number;
  live: number;
  recorded: number;
  paired: number;
  details: string[];
} {
  const rows = measureAll();
  const live = mutants(rows);
  const ratchet = loadRatchet();
  const problems: string[] = [];

  // The floor is the count of rules that HOLD the property. Losing one is a
  // regression in the evidence and fails; gaining one is recorded by
  // `--update` and never fails, because improving is not a defect.
  if (live.length < ratchet.floor) {
    problems.push(
      `${live.length} rule(s) hold a neutralised-mutant negative fixture, ` +
        `below the recorded floor of ${ratchet.floor} — a fixture pair stopped ` +
        `being a mutant. Either the fixture was rewritten and the pair no ` +
        `longer proves anything (restore it), or the loss is deliberate, in ` +
        `which case lower "floor" in ${RATCHET_PATH} BY HAND: --update only ` +
        `ever raises the floor, so a regression can never be absorbed by ` +
        `re-running a command.`,
    );
  }
  const lost = ratchet.mutants.filter((id) => !live.includes(id));
  if (lost.length > 0) {
    problems.push(
      `these rules were recorded as neutralised mutants and no longer measure ` +
        `as one: ${lost.join(", ")}`,
    );
  }

  return {
    status: problems.length === 0 ? "PASS" : "FAIL",
    floor: ratchet.floor,
    live: live.length,
    recorded: ratchet.mutants.length,
    paired: rows.length,
    details: problems,
  };
}

export function update(): number {
  const rows = measureAll();
  const found = mutants(rows);
  const ratchet = loadRatchet();
  const floor = Math.max(found.length, ratchet.floor);
  const doc = {
    floor,
    mutants: found,
    paired: rows.length,
    // SOURCE_DATE_EPOCH for the same reason the PRECISION ratchet honours it:
    // determinism is a maintained invariant here, and a gate that rewrites its
    // own committed artifact with a fresh timestamp on every run would show up
    // as drift the moment someone made the tree reproducible.
    updatedAt: process.env.SOURCE_DATE_EPOCH
      ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
      : new Date().toISOString(),
    note:
      "Live rules whose MUST-NOT-FIRE fixture is plausibly the must-fire " +
      "fixture with the defect neutralised — divergence <= " +
      `${MUTANT_MAX_DIVERGENCE} of non-blank lines, measured on the closest ` +
      "positive/negative pair. WHAT THIS IS NOT: a claim that the other rules " +
      "are imprecise. Their negative fixtures are a different program that " +
      "happens not to trigger, which shows the detector is directional and " +
      "does NOT show the predicate is sensitive to the defect. That gap is " +
      "real and closing it needs a per-rule recipe for what the defect IS, " +
      "so the mutant can be generated rather than hand-written a second time. " +
      "Criteria and the full per-rule classification: " +
      "`npm run check-fixture-quad`, which prints this arm beside PRECISION.",
  };
  writeFileSync(join(ROOT, RATCHET_PATH), `${JSON.stringify(doc, null, 2)}\n`);
  console.log(
    `wrote ${RATCHET_PATH}: ${found.length} mutant pair(s), floor ${floor}, ` +
      `of ${rows.length} paired rules`,
  );
  return 0;
}

function main(argv: string[]): number {
  if (argv.includes("--update")) return update();
  const rows = measureAll();
  const report = check();
  const divergent = rows.length - report.live;
  console.log(
    JSON.stringify(
      {
        ...report,
        divergent,
        threshold: MUTANT_MAX_DIVERGENCE,
        // The five closest and the five furthest: the shape of the
        // distribution is the finding, and a single count hides it.
        closest: rows.slice(0, 5).map((r) => `${r.ruleId} ${r.divergence}`),
        furthest: rows.slice(-5).map((r) => `${r.ruleId} ${r.divergence}`),
        note:
          "A rule is MUTANT only when its negative fixture is plausibly the " +
          "positive fixture with the defect removed. See docs/SENSITIVITY-RATCHET.json.",
      },
      null,
      2,
    ),
  );
  for (const d of report.details) console.error(`  ${d}`);
  return report.status === "PASS" ? 0 : 1;
}

if (isMainModule(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
