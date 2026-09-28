#!/usr/bin/env node
/**
 * Show the CODE behind every unclassified verdict, at the pinned commit.
 *
 * WHY THIS EXISTS
 *
 * A verdict row in `tests/corpus/verdicts/*.jsonl` is a judgment: "this
 * finding, on this line of this file, at this corpus commit, is a true
 * positive or a false positive." `tests/corpus/verdicts/README.md` makes a
 * committed verdict IMMUTABLE. So the cost of a wrong one is permanent and
 * the cost of a blank one is only that the row is dropped from the FP table
 * (which under-reports the rate and, below `MEASURED_THRESHOLD`, drops the
 * rule from the artifact entirely).
 *
 * That asymmetry is why nobody should classify 28 rows from a list of rule
 * IDs. Classifying properly needs three things side by side: the rule's
 * actual PREDICATE (not its title), the finding's surrounding lines (not the
 * one line a table shows), and the code AT THE PINNED COMMIT (not `main`,
 * which may have moved). Today there is no way to get all three without
 * cloning two repositories by hand — so the rows stay blank, and the rules
 * stay unmeasured, and the reason is tooling rather than judgement.
 *
 * This is that tooling. It reads the corpus registry for each repo's pinned
 * SHA, fetches the exact file at that SHA, and prints the finding's line with
 * real context.
 *
 *   node scripts/verdict-context.mjs               # every unclassified row
 *   node scripts/verdict-context.mjs QA-PY-004     # one rule
 *   node scripts/verdict-context.mjs --rule=QA-PY-004 --context=8
 *
 * It prints; it never writes. A verdict is a human's (or a careful agent's)
 * call, and a tool that fills 28 immutable rows in one pass is a tool that
 * will eventually be wrong about one of them.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const VERDICTS_DIR = join(ROOT, "tests", "corpus", "verdicts");
const CORPUS_FILE = join(ROOT, "tests", "corpus", "audit.ts");
const CONTEXT = 6;

/** repo name -> { url, ref } from the committed corpus registry. */
function corpusRefs() {
  const source = readFileSync(CORPUS_FILE, "utf8");
  const refs = new Map();
  // The registry is a literal array, so the entries are readable without
  // executing it — which matters, because executing it would scan the
  // repositories.
  const entries = [
    ...source.matchAll(
      /name:\s*"([^"]+)",\s*url:\s*"([^"]+)",\s*ref:\s*"([0-9a-f]{7,40})"/g,
    ),
  ];
  for (const [, name, url, ref] of entries) {
    refs.set(`${name}.jsonl`, { name, url: url.replace(/\.git$/, ""), ref });
  }
  return refs;
}

/** `pallets/click` + SHA -> a raw.githubusercontent URL. */
function rawUrl(url, ref, path) {
  // `https://github.com/owner/repo.git` -> `owner/repo`
  const m = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/.exec(url);
  if (m === null) return null;
  return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${ref}/${path}`;
}

async function fetchAt(url) {
  try {
    // `globalThis.fetch` rather than a bare `fetch`: the global exists on
    // Node 18+, but this repo's eslint config does not declare it for
    // `.mjs`, and a bare `fetch` is a `no-undef` error. Spelling it out is
    // also honest about what this depends on.
    const res = await globalThis.fetch(url, { redirect: "follow" });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith("--")) ?? null;
const contextArg = args.find((a) => a.startsWith("--context="));
const context =
  contextArg === undefined ? CONTEXT : Number(contextArg.split("=")[1]);

const refs = corpusRefs();
if (refs.size === 0) {
  console.error(
    "verdict-context: no corpus entries parsed from tests/corpus/audit.ts. " +
      "The registry is read as text, not executed, so a change to its shape " +
      "silently yields zero entries here — which would look like 'no " +
      "unclassified rows'. That is why this exits non-zero rather than " +
      "printing an empty report.",
  );
  process.exit(2);
}

const files = readdirSync(VERDICTS_DIR).filter((f) => f.endsWith(".jsonl"));
const rows = [];
for (const file of files) {
  const text = readFileSync(join(VERDICTS_DIR, file), "utf8");
  for (const line of text.split("\n").filter(Boolean)) {
    const row = JSON.parse(line);
    if (row.verdict !== "" && row.verdict !== undefined) continue;
    if (only !== null && row.ruleId !== only) continue;
    rows.push({ corpusFile: file, ...row });
  }
}

if (rows.length === 0) {
  console.log(
    only === null
      ? "No unclassified verdict rows. Every sampled finding has a verdict."
      : `No unclassified rows for ${only}.`,
  );
  process.exit(0);
}

console.log(
  `${rows.length} unclassified row(s)` +
    (only === null ? " across all rules" : ` for ${only}`) +
    `\nShowing ±${context} lines at the corpus's PINNED commit. ` +
    `Nothing is written; a verdict is a judgement call.\n`,
);

const cache = new Map();
let unfetchable = 0;

for (const row of rows) {
  const repo = refs.get(row.corpusFile);
  console.log("=".repeat(78));
  console.log(`${row.ruleId}  ${row.corpusFile}  ${row.file}:${row.line}`);
  if (repo === undefined) {
    console.log(
      "  no corpus entry for this file — the verdict filename does not match " +
        "a `name:` in tests/corpus/audit.ts",
    );
    unfetchable += 1;
    continue;
  }
  const url = rawUrl(repo.url, repo.ref, row.file);
  if (url === null) {
    console.log(`  cannot build a raw URL for ${repo.url}`);
    unfetchable += 1;
    continue;
  }
  const key = url;
  if (!cache.has(key)) cache.set(key, await fetchAt(url));
  const body = cache.get(key);
  if (body === null) {
    console.log(`  could not fetch ${row.file} at ${repo.ref.slice(0, 8)}`);
    unfetchable += 1;
    continue;
  }
  const lines = body.split("\n");
  const from = Math.max(1, row.line - context);
  const to = Math.min(lines.length, row.line + context);
  for (let n = from; n <= to; n += 1) {
    const marker = n === row.line ? ">>" : "  ";
    console.log(`${marker} ${String(n).padStart(5)} | ${lines[n - 1] ?? ""}`);
  }
  console.log(`  (corpus ${repo.name} @ ${repo.ref.slice(0, 12)})`);
}

if (unfetchable > 0) {
  console.log(
    `\n${unfetchable} row(s) could not be shown. That is a fact about the ` +
      `fetch, not about the finding — a row that cannot be displayed cannot ` +
      `be classified, and a blank row is cheaper than a wrong one.`,
  );
}
