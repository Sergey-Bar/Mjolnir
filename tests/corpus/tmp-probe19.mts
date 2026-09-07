import { pyPwHardSleep } from "../../src/rules/python/qa-py-102-pw-hard-sleep.js";
import { runScan } from "../../src/cli.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "tests", "corpus", "positive-fixtures", "QA-PY-102");
const text = readFileSync(join(dir, "test_hard_sleep.py"), "utf8");

// 1. Direct rule run on the RAW text (no codeText key — falls back to text).
const raw = pyPwHardSleep.run({ path: "test_hard_sleep.py", text } as never);
console.log("1. raw-text run:", raw.length);

// 2. Direct rule run with codeText = raw (mimics the adapter's lazy getter).
const withCode = pyPwHardSleep.run({
  path: "test_hard_sleep.py",
  text,
  codeText: text,
} as never);
console.log("2. codeText=raw run:", withCode.length);

// 3. Full scan of the dir.
const res = await runScan({
  target: dir,
  json: true,
  verbose: false,
  maxDurationMs: 600_000,
  scopeChanged: false,
  format: "json",
  strict: true,
});
const py102 = res.findings.filter((f) => f.ruleId === "QA-PY-102");
console.log("3. scan PY-102 findings:", py102.length);
for (const f of py102) console.log("   ", f.file, f.line);

