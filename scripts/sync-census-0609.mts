import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { RULES } from "../src/rules/index.js";
import { MEASURED_FP } from "../src/rules/measured-fp.generated.js";
import { declaredDetectorRevision } from "../src/rules/measurement.js";

// 1) Rebuild the detector-revisions sidecar EXACTLY from the measured
// set + declared revisions — guarantees zero strays, zero missing.
const sidecar: Record<string, number> = {};
for (const rule of RULES) {
  if (MEASURED_FP[rule.id] === undefined) continue;
  sidecar[rule.id] = declaredDetectorRevision(rule);
}
const sidecarPath = "tests/corpus/detector-revisions.json";
writeFileSync(
  sidecarPath,
  JSON.stringify(sidecar, null, 2) + "\n",
  "utf8",
);
console.log(`sidecar rebuilt: ${Object.keys(sidecar).length} entries`);

// 2) tone-blunt: drop dead keys for rules no longer registered.
const bluntPath = "src/reporter/tone-blunt.ts";
let blunt = readFileSync(bluntPath, "utf8");
const registered = new Set(RULES.map((r) => r.id));
let bluntRemoved = 0;
for (const key of [...registered.keys()]) void key;
const keyRe = / {2}"(QA-[A-Z0-9-]+)":(?:[^\n]*\n(?:    "[^\n]*"\n)?\s*,)?| {2}"(QA-[A-Z0-9-]+)": "[^"]*",\n/g;
const found = new Set<string>();
for (const m of blunt.matchAll(/"(QA-[A-Z0-9-]+)":/g)) found.add(m[1]);
for (const id of found) {
  if (!registered.has(id)) {
    // Remove the entry: `"ID":` followed by either a quoted block or an
    // indented continuation, ending with a comma line.
    const re = new RegExp(
      `  "${id}":(?:\\n    "[^"]*"(?:,|\\);))|  "${id}": "[^"]*",\\n`,
    );
    const before = blunt;
    blunt = blunt.replace(re, "");
    if (blunt !== before) bluntRemoved++;
  }
}
writeFileSync(bluntPath, blunt, "utf8");
console.log(`tone-blunt: removed ${bluntRemoved} dead keys`);

// 3) Regenerate FP-AUDIT (heading census) + capability matrix are run
// by the repo's npm scripts afterward — listed here for the operator.
console.log("next: npm run fp-audit:generate && npm run docs:counts && npm run docs:capability");
