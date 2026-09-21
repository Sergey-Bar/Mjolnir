/**
 * Golden expectations generator — run: npm run golden:update
 * Writes tests/golden/golden-expected.json (per-rule-ID counts, S4).
 *
 * Bug-audit H4/G3: the generator used to run rules on raw `text` while
 * the verifier passed `codeText` — expectations were measured on a
 * different code path than the one checking them. Both now share
 * `scanGolden()` from harness.ts, and generation ABORTS when any rule
 * crashes (the old swallow made a crash mutually consistent and
 * therefore invisible).
 *
 * Exported `main()` exists so tests can reproduce the committed file
 * byte-for-byte (the gen↔verify parity check).
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { scanGolden } from "./harness.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN_ROOT = join(HERE, "repo");
const EXPECTED_PATH = join(HERE, "golden-expected.json");

export function main(outPath: string = EXPECTED_PATH): void {
  const { expectations, crashed } = scanGolden(GOLDEN_ROOT);
  if (crashed.length > 0) {
    console.error(
      `Golden generation ABORTED — ${crashed.length} rule crash(es) on the golden corpus:`,
    );
    for (const c of crashed) console.error(`  ${c.ruleId} on ${c.file}`);
    throw new Error(
      "a locked golden expectation must never be measured through a crashing rule",
    );
  }
  writeFileSync(outPath, JSON.stringify(expectations, null, 2) + "\n");
  console.log("Golden expectations written:", outPath);
}

// Only auto-run when invoked directly (npm run golden:update), never on
// import from the parity test.
const invokedDirectly =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
