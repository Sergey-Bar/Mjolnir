/**
 * The fixture quad, read from the filesystem.
 *
 * A rule earns `M3_FIXTURE_VERIFIED` by proving four things about its own
 * fixtures, not one:
 *
 *   | leg            | fixture                                  | claims                       |
 *   | -------------- | ---------------------------------------- | ---------------------------- |
 *   | MUST-FIRE      | `positive-fixtures/<ruleId>/`             | the rule FIRES on this       |
 *   | MUST-NOT-FIRE  | `negative-fixtures/<ruleId>/`             | the rule is SILENT on this    |
 *   | RECALL         | a classified verdict in `verdicts/`      | firing is a property of the  |
 *   |                |                                         | fixture, not of the corpus   |
 *   | PRECISION      | the negative fixture's verdict is `TN`   | silence is checked, not      |
 *   |                |                                         | assumed                      |
 *
 * `must-fire` and `must-not-fire` are the two legs the tree already has; the
 * other two are what the corpus supplies. A rule is VERIFIED only when all
 * four are present — which is why the tier is empty today and why the honest
 * statement about why is a measurement rather than a constant.
 *
 * WHY THIS IS A MODULE
 *
 * There were two independent answers to "does this rule have a fixture quad",
 * one in `capability-registry.ts` and one in `ecosystem-probe.ts`, and both
 * were hardcoded `false` (the registry's) or a directory proxy (the probe's).
 * Two answers to one question is two truths, and they already disagreed: the
 * proxy counted four files in a fixture directory, which is a claim about the
 * fixture's SIZE rather than about the rule's behaviour. Fixing one and not the
 * other would have left the census and the registry disagreeing about the same
 * capability, which is the failure this repository exists to detect.
 *
 * The proxy is kept, but it is named for what it is and it is reported
 * separately — it never upgrades maturity on its own, and it is not the answer
 * to this function.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { RULES } from "../rules/index.js";

export const POSITIVE_DIR = "tests/corpus/positive-fixtures";
export const NEGATIVE_DIR = "tests/corpus/negative-fixtures";
export const VERDICTS_DIR = "tests/corpus/verdicts";

/** The four legs, named. A named leg is one a maintainer can go and add. */
export const QUAD_LEGS = [
  "MUST-FIRE",
  "MUST-NOT-FIRE",
  "RECALL",
  "PRECISION",
] as const;
export type QuadLeg = (typeof QUAD_LEGS)[number];

export interface QuadReport {
  ruleId: string;
  /** Legs this rule satisfies today. */
  present: QuadLeg[];
  /** Legs it does not, which is the work list. */
  missing: QuadLeg[];
  /** All four. The only state that earns M3. */
  complete: boolean;
}

function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function hasFiles(dir: string): boolean {
  try {
    return existsSync(dir) && listFilesRecursive(dir).length > 0;
  } catch {
    return false;
  }
}

/** Classified verdicts recorded against a rule. */
function verdictsFor(
  root: string,
  ruleId: string,
): { tp: number; fp: number; tn: number } {
  const dir = join(root, VERDICTS_DIR);
  if (!existsSync(dir)) return { tp: 0, fp: 0, tn: 0 };
  let tp = 0;
  let fp = 0;
  let tn = 0;
  for (const file of listVerdictFiles(dir)) {
    let text: string;
    try {
      text = readFileSync(join(dir, file), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as { ruleId?: string; verdict?: string };
        if (entry.ruleId !== ruleId) continue;
        if (entry.verdict === "TP") tp += 1;
        if (entry.verdict === "FP") fp += 1;
        if (entry.verdict === "TN") tn += 1;
      } catch {
        // A malformed verdict line is not a classified verdict.
      }
    }
  }
  return { tp, fp, tn };
}

/**
 * Every `.jsonl` under the verdicts directory, RECURSIVELY.
 *
 * Recursive because `tests/corpus/verdicts/quad/` holds the per-rule files
 * this repository generates by EXECUTING the scanner
 * (`npm run corpus:quad:verdicts`). The first version read only the top level
 * and reported `PRECISION: 0` with 7,666 executed verdict rows sitting on disk
 * one directory down — a probe that silently skips a directory of evidence
 * reads as a finding, and that is worse than one that fails.
 *
 * `archive/` is excluded, and that is a decision rather than an oversight: it
 * holds verdicts from superseded corpus generations, and counting them would
 * report a rule as measured against evidence that has been withdrawn. A
 * supersession is the opposite of corroboration.
 */
function listVerdictFiles(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === "archive") continue;
      out.push(
        ...listVerdictFiles(join(dir, entry.name), `${prefix}${entry.name}/`),
      );
    } else if (entry.name.endsWith(".jsonl")) {
      out.push(`${prefix}${entry.name}`);
    }
  }
  return out;
}

/**
 * Which legs a rule satisfies, read from the tree.
 *
 * PRECISION requires an explicit `TN` on the negative fixture. The first
 * version accepted "no FP was recorded", which a tree with no verdicts at all
 * satisfies — so a rule with a positive fixture, a negative fixture and one
 * recall verdict came back with FOUR legs, and the test asserting three of four
 * failed. Absence of an accusation is not a finding of innocence; the negative
 * fixture has to have been CLASSIFIED as silent, which is the work the leg
 * describes.
 */
export function quadFor(
  ruleId: string,
  root: string = process.cwd(),
): QuadReport {
  const { tp, fp, tn } = verdictsFor(root, ruleId);
  const present: QuadLeg[] = [];
  if (hasFiles(join(root, POSITIVE_DIR, ruleId))) present.push("MUST-FIRE");
  if (hasFiles(join(root, NEGATIVE_DIR, ruleId))) present.push("MUST-NOT-FIRE");
  if (tp > 0) present.push("RECALL");
  if (tn > 0 && fp === 0) present.push("PRECISION");
  const missing = QUAD_LEGS.filter((leg) => !present.includes(leg));
  return { ruleId, present, missing, complete: missing.length === 0 };
}

/** Does a rule satisfy all four legs? The only question M3 turns on. */
export function ruleHasCompleteQuad(
  ruleId: string,
  root: string = process.cwd(),
): boolean {
  return quadFor(ruleId, root).complete;
}

/**
 * The per-family quad census, for entries that are not rule-scoped.
 *
 * A capability like `ci.provider.github-actions` has no `QA-CI-*` id of its
 * own, so its quad is its family's.
 *
 * The basis is `some`, and it is named in one place because the two resolvers
 * used to disagree about it — which is the exact defect this module exists to
 * remove. The registry asks `live.some(rule => …)`; a first version of the
 * census side asked for `every`, so one rule with a complete quad advertised
 * M3 through the registry while the census called the same capability
 * unverified. With `maturity` sourced from the census and `proven` from the
 * registry, that disagreement surfaces as a spurious `OVER_CLAIMED_MATURITY`.
 *
 * `some` is the right reading for a CAPABILITY. A framework is not un-fixtured
 * because one of its thirty rules has no negative fixture; the claim being
 * made is "we have fixtures for this ecosystem", and a ratio is a better
 * instrument for that than a threshold. `rules:quad:check` publishes the
 * per-capability ratio so `some` is visible rather than implied.
 *
 * An empty rule list is 0 of 0, and `capabilityQuadComplete` reads that as
 * FALSE rather than vacuously true. A capability with no rules has no fixture
 * evidence, and reading the empty case as a pass is the shape of defect the
 * whole file is about.
 */
export function capabilityQuadComplete(
  ruleIds: readonly string[],
  root: string = process.cwd(),
): boolean {
  return countCompleteQuads(ruleIds, root).complete > 0;
}

/**
 * How many of a capability's rules have a complete quad, out of how many.
 *
 * `capabilityQuadComplete` is this comparison, and the ratio is what the
 * capability-coverage report prints. They live together because the first
 * version of that report re-implemented the predicate inline — a gate that
 * re-states the rule it checks is a gate free to disagree with it.
 */
export function countCompleteQuads(
  ruleIds: readonly string[],
  root: string = process.cwd(),
): { complete: number; total: number } {
  return {
    complete: ruleIds.filter((id) => ruleHasCompleteQuad(id, root)).length,
    total: ruleIds.length,
  };
}

/** Every live rule, with its work list. The input to the Wave 3 backfill. */
export function quadCensus(root: string = process.cwd()): QuadReport[] {
  return RULES.map((rule) => quadFor(rule.id, root));
}
