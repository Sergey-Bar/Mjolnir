/**
 * Verdict applier for the §11.1 verdict-harvesting loop.
 *
 * Input: a JSON decisions file mapping repo -> "ruleId|file|line" ->
 * { verdict, note }. Only rows with a BLANK verdict are filled —
 * a committed verdict is immutable (tests/corpus/verdicts/README.md), so
 * this can never overwrite an adjudicated row. Rows the decisions file
 * names that do not exist in the jsonl are reported as unknown and fail
 * the run (typo protection: a verdict for a row that was never sampled
 * measures nothing).
 *
 * ## RETRACT — the orphan rule, which had no mechanism
 *
 * `tests/corpus/verdicts/README.md` says an orphaned row "must be removed",
 * and before this there was no way to do that with this tool: it could only
 * FILL blanks, and an orphan is a blank row whose cited line no longer holds
 * the finding's premise. The two available workarounds were both wrong —
 * editing the committed `.jsonl` by hand (which is the immutability rule the
 * tool exists to enforce, done with a text editor instead of through it), or
 * recording a verdict on a row whose finding is not there.
 *
 * A verdict on a non-finding is worse than a stray row, because it becomes
 * evidence: it moves `n` and `fpRate` for a rule on the strength of a finding
 * that does not exist. Three rows in `keycloak-keycloak.jsonl` were exactly
 * that shape — the line above held the `@Ignore`, the cited line held `@Test`,
 * and the same annotation was already adjudicated one line up.
 *
 * So `verdict: "RETRACT"` removes the row and records nothing. It may only
 * touch a BLANK row, for the same immutability reason: a committed verdict is
 * never removed, only an unclassified one. That asymmetry is the point — the
 * tool can un-sample a row it should never have sampled, and can do nothing at
 * all to a row a person judged.
 *
 * Usage: npx tsx scripts/lib/apply-verdicts.ts <decisions.json> [--verdicts-dir=<dir>]
 */

import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const DEFAULT_VERDICTS_DIR = join(ROOT, "tests", "corpus", "verdicts");

/**
 * `--verdicts-dir=` is not a convenience — it is the only way this tool can be
 * TESTED.
 *
 * The script writes into the corpus it is pointed at, and it anchored that path
 * to its own location so a caller could not redirect it. That made the RETRACT
 * path untestable: the contract suite had no way to exercise "deletes a blank
 * row" and "refuses to delete a settled row" without writing into the real
 * `tests/corpus/verdicts/*.jsonl` while a parallel worker was reading them.
 * This is the same argument `scripts/check-gate-tiers.mjs` gives for its own
 * `--root=` flag, and it is why the flag exists rather than a fixture tree
 * copied over the real one.
 */
const VERDICTS_DIR = (() => {
  const flag = process.argv.find((arg) => arg.startsWith("--verdicts-dir="));
  return flag === undefined
    ? DEFAULT_VERDICTS_DIR
    : resolve(flag.slice("--verdicts-dir=".length));
})();

type DecisionVerdict = "TP" | "FP" | "UNSURE" | "RETRACT";

interface Decision {
  verdict: DecisionVerdict;
  note: string;
}

/**
 * Tombstones for retracted rows, appended alongside the corpus.
 *
 * A retraction that leaves no trace does not stick. `corpus-sample.ts` de-dupes
 * on the `ruleId|file|line` keys present in a repository's verdict file, so the
 * moment an orphan row is removed, the next sampling pass finds the same
 * finding again and re-appends it — which is not a hypothetical: `QA-JV-101`'s
 * `JWETest.java:74` was retracted, and the very next sweep put it straight back.
 * An orphan rule that regenerates its own evidence is not an orphan rule.
 *
 * So the retraction is recorded, in a file the sampler reads alongside the
 * verdicts. It is deliberately NOT a row in the `.jsonl`: a tombstone there
 * would be a row with no verdict, which is the exact state the sweep is
 * supposed to stop producing.
 */
const RETRACTIONS = join(VERDICTS_DIR, "retracted.jsonl");

function appendRetraction(key: string, repo: string, note: string): void {
  const payload = {
    key,
    repo,
    verdict: "RETRACT",
    retractedAt: new Date().toISOString().slice(0, 10),
    note,
  };
  appendFileSync(RETRACTIONS, JSON.stringify(payload) + "\n", "utf8");
}

const decisionsPath = process.argv[2];
if (!decisionsPath || decisionsPath.startsWith("--"))
  throw new Error(
    "usage: apply-verdicts.ts <decisions.json> [--verdicts-dir=<dir>]",
  );

const decisions = JSON.parse(readFileSync(decisionsPath, "utf8")) as Record<
  string,
  Record<string, Decision>
>;

/**
 * Keys beginning with `_` are METADATA, not repositories.
 *
 * A decisions file that records why it exists — the pinned commit, the method,
 * what the author read — needs somewhere to put that, and `tests/corpus/verdicts/
 * proposed/keycloak-keycloak.json` puts it under `_meta`. Without this skip the
 * applier walks `_meta` as if it were a corpus repository, opens
 * `tests/corpus/verdicts/_meta.jsonl`, and dies with ENOENT — a failure that
 * names a missing file rather than the real problem, which is the shape this
 * tool exists to avoid.
 */
const repositoryDecisions = Object.fromEntries(
  Object.entries(decisions).filter(
    ([key]) => !key.startsWith("_") && key !== "default",
  ),
);

let applied = 0;
let retracted = 0;
const unknown: string[] = [];
const immutable: string[] = [];

for (const [repo, rows] of Object.entries(repositoryDecisions)) {
  const path = join(VERDICTS_DIR, `${repo}.jsonl`);
  const lines = readFileSync(path, "utf8").split("\n");
  const out: string[] = [];
  const wanted = new Set(Object.keys(rows));
  const matched = new Set<string>();
  for (const line of lines) {
    if (!line.trim()) {
      out.push(line);
      continue;
    }
    const row = JSON.parse(line) as {
      ruleId: string;
      file: string;
      line: number;
      verdict: string;
      note?: string;
    };
    const key = `${row.ruleId}|${row.file}|${row.line}`;
    if (!wanted.has(key)) {
      out.push(line);
      continue;
    }
    matched.add(key);
    const d = rows[key];
    if (d === undefined) {
      // `wanted` is built from `rows`, so this is unreachable — but a
      // decisions file that resolves to `undefined` here would otherwise be a
      // silent no-op row, and this tool's whole job is to make silent no-ops
      // impossible.
      unknown.push(`${repo}: ${key}`);
      out.push(line);
      continue;
    }
    if (row.verdict !== "") {
      // Immutable-once-committed: leave settled rows untouched, and say so
      // rather than passing silently. A decisions file aimed at a row that
      // was already judged reads as applied if nothing is printed, and the
      // next reader concludes the classification landed.
      if (d.verdict === "RETRACT") {
        immutable.push(
          `${repo}: ${key} is already classified ${row.verdict} — a committed verdict is immutable and cannot be retracted`,
        );
      }
      out.push(line);
      continue;
    }
    if (d.verdict === "RETRACT") {
      retracted++;
      appendRetraction(key, repo, d.note);
      continue; // drop the line entirely — an orphan is not evidence
    }
    row.verdict = d.verdict;
    row.note = d.note;
    out.push(JSON.stringify(row));
    applied++;
  }
  for (const k of wanted) {
    if (!matched.has(k)) unknown.push(`${repo}: ${k}`);
  }
  writeFileSync(path, out.join("\n"));
}

console.log(
  `applied ${applied} verdict(s), retracted ${retracted} orphaned row(s)` +
    (applied + retracted === 0 ? " — nothing to do" : ""),
);
if (unknown.length > 0) {
  console.error(`unknown rows (${unknown.length}):`);
  for (const u of unknown) console.error("  " + u);
  process.exit(1);
}
if (immutable.length > 0) {
  console.error(`refused (${immutable.length}):`);
  for (const m of immutable) console.error("  " + m);
  process.exit(1);
}
