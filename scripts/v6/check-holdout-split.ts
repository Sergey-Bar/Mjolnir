#!/usr/bin/env tsx
/**
 * `npm run holdout:split` — the committed held-out partition.
 *
 * `docs/claim-registry.json` blocks `rule-registry-census` with one sentence:
 * "Promoting this needs a classifier that has never seen the verdicts it is
 * scored against." This derives that partition, writes it to
 * `docs/HOLDOUT-SPLIT.json`, and fails if the file on disk disagrees.
 *
 * The split itself lives in `src/rules/measurement.ts` as pure functions, so
 * the assignment is a function of the repository id and the committed verdict
 * rows — not of anything in this file. What this script adds is the one thing
 * `src/` cannot do for itself: the DERIVATION of the protected set from
 * `isCoreCandidate`, which lives in `scripts/lib/`.
 *
 * Read-only by default, `--write` to record. That ordering is deliberate and is
 * the opposite of `check-fixture-quad`'s, for a reason worth stating: a split
 * that rewrites its own committed file on every run cannot be reviewed, because
 * a reviewer cannot tell an intended re-draw from a drifted one. Here the file
 * only changes when a person asks.
 *
 * Usage: tsx scripts/v6/check-holdout-split.ts [--root=<dir>] [--write]
 * Exit codes: 0 = the committed split matches a fresh derivation, 1 = it does
 * not (re-run with --write and read the diff), 2 = the derivation is unusable.
 */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

import {
  HOLDOUT_PERCENT,
  HOLDOUT_SALT,
  computeHoldoutSplit,
  type HoldoutProtected,
} from "../../src/rules/measurement.js";
import { coreCandidateRuleIds } from "../lib/core-candidates.js";

const DEFAULT_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const ROOT = (() => {
  const flag = process.argv.find((arg) => arg.startsWith("--root="));
  return flag === undefined
    ? DEFAULT_ROOT
    : resolve(flag.slice("--root=".length));
})();

const VERDICTS = join(ROOT, "tests", "corpus", "verdicts");
const REPORT = join(ROOT, "docs", "HOLDOUT-SPLIT.json");

/**
 * Files that are NOT corpus repositories and so are not part of the split.
 *
 * `positive-fixtures.jsonl` and `negative-fixtures.jsonl` hold the
 * scanner-executed fixture legs, and the two `*-ceiling.json` files are
 * ratchets rather than verdicts. Naming them keeps the partition a statement
 * about external codebases, which is what a held-out split has to mean if it
 * is going to say anything about generalisation.
 */
const NOT_A_CORPUS = new Set([
  "positive-fixtures",
  "negative-fixtures",
  "unclassified-ceiling",
  "unsure-ceiling",
  // Tombstones for retracted orphans. Not a corpus repository: a retraction is
  // a decision about a row, and the decision lives beside the corpus so the
  // sampler can de-dupe against it.
  "retracted",
]);

/** repository id -> (rule id -> committed row count). */
function countRowsByRepository(): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  if (!existsSync(VERDICTS)) {
    throw new Error(`${VERDICTS} does not exist — nothing to partition.`);
  }
  for (const name of readdirSync(VERDICTS)) {
    if (!name.endsWith(".jsonl")) continue;
    const repositoryId = name.slice(0, -".jsonl".length);
    if (NOT_A_CORPUS.has(repositoryId)) continue;
    const rows = out.get(repositoryId) ?? new Map<string, number>();
    for (const line of readFileSync(join(VERDICTS, name), "utf8").split("\n")) {
      if (!line.trim()) continue;
      let parsed: { ruleId?: unknown };
      try {
        parsed = JSON.parse(line) as { ruleId?: unknown };
      } catch {
        // A malformed row is not a row. The generator treats it the same way,
        // because a partition that counts unparseable lines is a partition of
        // something other than the corpus.
        continue;
      }
      if (typeof parsed.ruleId !== "string") continue;
      rows.set(parsed.ruleId, (rows.get(parsed.ruleId) ?? 0) + 1);
    }
    out.set(repositoryId, rows);
  }
  return out;
}

/**
 * The derived exclusion: repositories holding rows for a rule that more clean
 * samples would settle.
 *
 * Computed from `isCoreCandidate` on every run, which is the whole point — a
 * hand-written "do not move these" list is the one artefact that could
 * re-draw the split in its own favour without leaving a trace.
 */
function protectedRepositories(
  rowsByRepository: ReadonlyMap<string, ReadonlyMap<string, number>>,
): HoldoutProtected[] {
  const byRepository = new Map<string, Record<string, number>>();
  for (const ruleId of coreCandidateRuleIds()) {
    for (const [repositoryId, rows] of rowsByRepository) {
      const n = rows.get(ruleId) ?? 0;
      if (n <= 0) continue;
      const bucket = byRepository.get(repositoryId) ?? {};
      bucket[ruleId] = n;
      byRepository.set(repositoryId, bucket);
    }
  }
  return [...byRepository].map(([repositoryId, rowsByRule]) => ({
    repositoryId,
    rowsByRule,
    reason:
      "holds committed verdicts for a rule `isCoreCandidate` says more clean " +
      "samples would settle; moving it to holdout would empty the measurement " +
      "side of the evidence the core tier is waiting on",
  }));
}

const rowsByRepository = countRowsByRepository();
const protectedList = protectedRepositories(rowsByRepository);
const split = computeHoldoutSplit(rowsByRepository, protectedList);

/**
 * Rows contributed by a set of repositories.
 *
 * The inner reduce is typed rather than inferred because
 * `rowsByRepository` is built from `JSON.parse` — an untyped `any` reaching a
 * return value would make the whole ratchet's arithmetic unverified by the
 * compiler, which for a file whose job is to be trusted about a count is the
 * one place the annotation matters.
 */
const sumRows = (repositories: readonly string[]): number =>
  repositories.reduce((total, repositoryId) => {
    const rows =
      rowsByRepository.get(repositoryId) ?? new Map<string, number>();
    let sum = 0;
    for (const n of rows.values()) sum += n;
    return total + sum;
  }, 0);

/**
 * Rows by rule, per partition — the number that decides whether the split is
 * USEFUL rather than merely disjoint. A holdout that covers four rules
 * validates nothing; this makes that visible instead of leaving it to be
 * discovered when a number looks too good.
 */
function rowsByRule(repositories: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const repositoryId of repositories) {
    for (const [ruleId, n] of rowsByRepository.get(repositoryId) ?? []) {
      out[ruleId] = (out[ruleId] ?? 0) + n;
    }
  }
  return Object.fromEntries(Object.entries(out).sort());
}

const holdoutRowsByRule = rowsByRule(split.holdout);
const measurementRowsByRule = rowsByRule(split.measurement);

const document = {
  schemaVersion: 1,
  salt: HOLDOUT_SALT,
  holdoutPercent: HOLDOUT_PERCENT,
  rationale: [
    "The unit is the CORPUS REPOSITORY, never the row. Rows in one file are",
    "findings from one codebase, one team, one idiom; a per-row split puts the",
    "same file — often the same test — in both halves, which is leakage wearing",
    "a partition's clothes, and a per-row split can be searched until the",
    "held-out half agrees with the measurement half.",
    "",
    "The assignment is a SALTED HASH of the repository id, not a committed",
    "list. A list can be re-drawn the moment it is inconvenient and nothing in",
    "the tree would show it. Changing `salt` above is a one-line diff that",
    "invalidates every published rate, which is the correct cost for changing",
    "the split.",
    "",
    "One exclusion, and it is DERIVED rather than declared: a repository",
    "holding rows for a rule `isCoreCandidate` says more clean samples would",
    "settle stays in measurement, because moving it would empty the",
    "measurement side of the evidence the core tier is waiting on. Deriving it",
    "means it moves with the candidate set and cannot be edited into place.",
    "",
    "THE HOLDOUT VALIDATES; IT DOES NOT GATE. Core promotion reads the",
    "measurement partition. Requiring n >= 35 clean holdout rows would consume",
    "whole repositories — the Java corpora are appsmith and keycloak — so a",
    "gating holdout would be sized by the corpus rather than by the question.",
    "The holdout's job is to be a second number a reader can compare against",
    "the first.",
    "",
    "Re-derive with `npm run holdout:split`; it fails if this file and a fresh",
    "derivation disagree. Re-drawing the split means changing `salt`, which is",
    "a visible decision rather than a quiet one.",
  ].join("\n"),
  holdout: split.holdout,
  measurement: split.measurement,
  protected: split.protected,
  buckets: split.buckets,
  counts: {
    repositories: rowsByRepository.size,
    holdoutRepositories: split.holdout.length,
    measurementRepositories: split.measurement.length,
    rows: sumRows([...rowsByRepository.keys()]),
    holdoutRows: sumRows(split.holdout),
    measurementRows: sumRows(split.measurement),
    holdoutRules: Object.keys(holdoutRowsByRule).length,
    measurementRules: Object.keys(measurementRowsByRule).length,
  },
  rowsByRule: {
    holdout: holdoutRowsByRule,
    measurement: measurementRowsByRule,
  },
  /** Which corpus repositories are excluded from the split, and why. */
  excludedFromSplit: [...NOT_A_CORPUS].sort(),
  digest: `sha256:${createHash("sha256")
    .update(
      JSON.stringify({
        holdout: split.holdout,
        measurement: split.measurement,
        salt: HOLDOUT_SALT,
      }),
    )
    .digest("hex")}`,
};

if (process.argv.includes("--write")) {
  writeFileSync(REPORT, JSON.stringify(document, null, 2) + "\n", "utf8");
  console.log(
    `holdout:split: wrote ${REPORT} — ${split.holdout.length} holdout / ${split.measurement.length} measurement repositories, ` +
      `${document.counts.holdoutRows}/${document.counts.rows} rows`,
  );
  process.exit(0);
}

if (!existsSync(REPORT)) {
  console.error(
    `holdout:split: ${REPORT} does not exist. Run with --write, and read the diff before committing it.`,
  );
  process.exit(2);
}

const committed = readFileSync(REPORT, "utf8");
const live = JSON.stringify(document, null, 2) + "\n";
if (committed !== live) {
  console.error(
    "holdout:split: docs/HOLDOUT-SPLIT.json does not match a fresh derivation.\n" +
      "Either the verdict corpus changed, `isCoreCandidate` moved, or the split was edited.\n" +
      "Re-run with --write and read the diff — if the holdout set moved, that is a decision, not a cleanup.",
  );
  process.exit(1);
}

console.log(
  `holdout:split: PASS — ${split.holdout.length} holdout / ${split.measurement.length} measurement repositories ` +
    `(${document.counts.holdoutRows} of ${document.counts.rows} rows; ` +
    `${document.counts.holdoutRules} of ${document.counts.measurementRules} rules covered by holdout). ` +
    `${protectedList.length} repository(ies) protected from the holdout because they hold rows for a core candidate.`,
);
