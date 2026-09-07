/**
 * Scan a corpus target and dump per-rule finding counts + full finding
 * list for the 21 unmeasured rules — the harvest input for top-ups.
 * Usage: npx tsx tests/corpus/tmp-harvest-21.mts local:tests/corpus/positive-fixtures
 */
import { runScan } from "../../src/cli.js";
import { join } from "node:path";

const arg = process.argv[2] ?? "";
const target = arg.startsWith("local:")
  ? join(process.cwd(), arg.slice("local:".length))
  : arg;

const UNMEASURED = new Set([
  "QA-CS-104","QA-CS-106","QA-CS-107","QA-CS-109","QA-CYP-002","QA-CYP-003",
  "QA-ENV-001","QA-JV-106","QA-JV-107","QA-PW-102","QA-PW-116","QA-PW-124",
  "QA-PW-125","QA-PW-147","QA-PY-101","QA-PY-102","QA-PY-104","QA-PY-106",
  "QA-PY-107","QA-PY-108","QA-SE-001","QA-SE-002","QA-SE-003",
]);

const result = await runScan({
  target,
  json: true,
  verbose: false,
  maxDurationMs: 600_000,
  scopeChanged: false,
  format: "json",
  strict: true,
});

console.log("partial:", result.partial, "reasons:", JSON.stringify(result.analysisStatus.truncationReasons ?? []));
const byRule = new Map<string, Array<{ file: string; line: number; message: string }>>();
for (const f of result.findings) {
  if (!UNMEASURED.has(f.ruleId)) continue;
  const arr = byRule.get(f.ruleId) ?? [];
  arr.push({ file: f.file, line: f.line, message: f.message });
  byRule.set(f.ruleId, arr);
}
for (const id of [...UNMEASURED].sort()) {
  const arr = byRule.get(id) ?? [];
  console.log(`\n=== ${id}: ${arr.length} finding(s) ===`);
  for (const f of arr) {
    console.log(`  ${f.file}:${f.line} — ${f.message.slice(0, 100)}`);
  }
}
