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

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { isMainModule } from "./lib/is-main-module.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// Re-exported, not re-declared. The fifth conformity leg
// (`PREDICATE_SENSITIVE` in src/rules/conformity.ts) reads the same
// measurement, and two implementations of one metric is two things to keep in
// sync with a silent failure mode: the leg and this gate would report different
// numbers for the same rule and neither would notice.
import {
  MUTANT_MAX_DIVERGENCE,
  RATCHET_PATH,
  mutants,
  measureAll,
} from "../src/rules/fixture-sensitivity.js";

export {
  MUTANT_MAX_DIVERGENCE,
  NEGATIVE_DIR,
  POSITIVE_DIR,
  RATCHET_PATH,
  lineDivergence,
  measure,
  measureAll,
  mutants,
  sensitivityOf,
  type Classification,
  type Sensitivity,
} from "../src/rules/fixture-sensitivity.js";

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
  const rows = measureAll(ROOT);
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
  const rows = measureAll(ROOT);
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
  const rows = measureAll(ROOT);
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
