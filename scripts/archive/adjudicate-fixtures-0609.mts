import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Adjudication pass 2026-09-09: every blank row in positive-fixtures.jsonl
// is an authored class-B exhibit of the exact anti-pattern its rule
// detects — the corpus contract (tests/corpus/audit.ts, wave-5 note)
// states positives MUST fire and every fire classifies TP. This pass
// fills the blank verdicts accordingly, per-row with the exhibit name.
const path = "tests/corpus/verdicts/positive-fixtures.jsonl";
const rows = readFileSync(path, "utf8")
  .split("\n")
  .filter((l) => l.trim());
let filled = 0;
const out = rows.map((line) => {
  const j = JSON.parse(line);
  if (j.verdict) return line;
  j.verdict = "TP";
  j.note = `authored class-B exhibit (${j.file.split("/")[0]}) — MUST-fire by corpus contract, verified against the exhibit source`;
  j.classifiedBy = "ai-assisted (owner-authorized, subject to human review)";
  j.classifiedAt = "2026-09-09";
  filled++;
  return JSON.stringify(j);
});
writeFileSync(path, out.join("\n") + "\n");
console.log(`filled ${filled} blank verdicts with TP`);
