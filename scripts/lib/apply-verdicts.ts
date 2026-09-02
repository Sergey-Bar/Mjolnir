/**
 * Verdict applier for the §11.1 verdict-harvesting loop.
 *
 * Input: a JSON decisions file mapping repo -> "ruleId|file|line" ->
 * { verdict, note }. Only rows with a BLANK verdict are filled — a
 * committed verdict is immutable (tests/corpus/verdicts/README.md), so
 * this can never overwrite an adjudicated row. Rows the decisions file
 * names that do not exist in the jsonl are reported as unknown and fail
 * the run (typo protection: a verdict for a row that was never sampled
 * measures nothing).
 *
 * Usage: npx tsx scripts/lib/apply-verdicts.ts <decisions.json>
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const VERDICTS_DIR = join(ROOT, "tests", "corpus", "verdicts");

interface Decision {
  verdict: "TP" | "FP";
  note: string;
}

const decisionsPath = process.argv[2];
if (!decisionsPath)
  throw new Error("usage: apply-verdicts.ts <decisions.json>");

const decisions = JSON.parse(readFileSync(decisionsPath, "utf8")) as Record<
  string,
  Record<string, Decision>
>;

let applied = 0;
const unknown: string[] = [];

for (const [repo, rows] of Object.entries(decisions)) {
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
    if (row.verdict !== "") {
      // Immutable-once-committed: leave settled rows untouched.
      out.push(line);
      continue;
    }
    const d = rows[key] as Decision;
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

console.log(`applied ${applied} verdict(s)`);
if (unknown.length > 0) {
  console.error(`unknown rows (${unknown.length}):`);
  for (const u of unknown) console.error("  " + u);
  process.exit(1);
}
