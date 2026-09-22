// @ts-check
// check-property-runs.mjs — enforce a minimum run count on every
// fast-check property in the suite.
//
// vitest has no top-level minRuns option (it would be a typecheck error
// in the config), so the floor is enforced here: every fc.assert call
// must declare numRuns >= MIN_RUNS, and every property must carry the
// shared SEED constant so failures are reproducible.
//
// A property that declares 50 runs in a 200-run floor is a property
// that has not been thought about. This catches that.
//
// Usage:  node scripts/check-property-runs.mjs
// Exit:   0 = all properties meet the floor · 1 = drift detected

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIN_RUNS = 200;

function main() {
  const spec = fs.readFileSync(
    path.join(ROOT, "tests/scope/property-invariants.spec.ts"),
    "utf8",
  );

  // Every fc.assert(..., { numRuns: N }) call.
  const assertCalls = [...spec.matchAll(/numRuns:\s*(\d+)/g)].map((m) =>
    parseInt(m[1], 10),
  );

  if (assertCalls.length === 0) {
    console.error("no fc.assert calls found — is this a property test file?");
    process.exit(1);
  }

  let ok = true;
  console.log(`property assertions: ${assertCalls.length}`);
  for (const n of assertCalls) {
    const flag = n < MIN_RUNS ? "  <-- BELOW FLOOR" : "";
    if (n < MIN_RUNS) ok = false;
    console.log(`  numRuns: ${n}${flag}`);
  }

  if (!spec.includes("const SEED =")) {
    ok = false;
    console.error(
      "\nDRIFT: no shared SEED constant — property failures are not reproducible",
    );
  } else {
    console.log("\nshared SEED constant: present");
  }

  const below = assertCalls.filter((n) => n < MIN_RUNS);
  if (below.length) {
    console.error(
      `\nDRIFT: ${below.length} property assertion(s) below the ${MIN_RUNS} floor`,
    );
  }

  if (ok) {
    console.log(`\nproperty run-count floor (${MIN_RUNS}): OK`);
  } else {
    console.error(
      `\nproperty run-count floor (${MIN_RUNS}): FAILED — see above`,
    );
    process.exit(1);
  }
}

main();
