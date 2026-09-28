#!/usr/bin/env node
/**
 * Regenerate the path list in `scripts/check-unimported-modules.mjs`.
 *
 * Prints only the paths that are not yet on the committed list, so the diff a
 * reviewer reads is the new dead code and nothing else. An entry that already
 * exists keeps its hand-written class and reason — regenerating never
 * overwrites the explanation, because the explanation is the part a human
 * wrote and a generator cannot.
 *
 * Usage: node scripts/list-unimported-modules.mjs
 */

import { importGraphSnapshot } from "./lib/coverage-exemption-ledger.mjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const snapshot = importGraphSnapshot(ROOT);

const source = readFileSync(
  new URL("./check-unimported-modules.mjs", import.meta.url),
  "utf8",
);
const committed = new Set(
  [...source.matchAll(/^ {2}"(src\/[^"]+)":/gm)].map((m) => m[1]),
);

const unimported = snapshot.files
  .filter((p) => p.startsWith("src/"))
  .filter((p) => (snapshot.importedBy.get(p) ?? []).length === 0)
  .sort();

const added = unimported.filter((p) => !committed.has(p));
const removed = [...committed].filter((p) => !unimported.includes(p)).sort();

if (added.length === 0 && removed.length === 0) {
  console.log(
    JSON.stringify({ status: "CURRENT", committed: committed.size }, null, 2),
  );
  process.exit(0);
}

for (const path of added) {
  console.log(`  "${path}": "ORPHAN — ADD A REASON HERE",`);
}
for (const path of removed) {
  console.error(`  stale committed entry (now imported, or deleted): ${path}`);
}
console.error(
  `\n${added.length} to add, ${removed.length} stale. Paste the lines into COMMITTED, with a class and a reason.`,
);
process.exit(1);
