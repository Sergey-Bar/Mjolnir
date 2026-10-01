import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { MEASURED_FP } from "../src/rules/measured-fp.generated.js";
import { RULES, RETIRED_RULE_IDS } from "../src/rules/index.js";

const active = RULES.filter((r) => !RETIRED_RULE_IDS.includes(r.id));
const unmeasured = active
  .filter((r) => MEASURED_FP[r.id] === undefined)
  .map((r) => r.id);

const counts = new Map<
  string,
  { tp: number; fp: number; unsure: number; blank: number }
>();
for (const id of unmeasured)
  counts.set(id, { tp: 0, fp: 0, unsure: 0, blank: 0 });

for (const f of readdirSync("tests/corpus/verdicts").filter((f) =>
  f.endsWith(".jsonl"),
)) {
  for (const line of readFileSync(
    join("tests/corpus/verdicts", f),
    "utf8",
  ).split("\n")) {
    if (!line.trim()) continue;
    const j = JSON.parse(line);
    const c = counts.get(j.ruleId);
    if (!c) continue;
    if (j.verdict === "TP") c.tp++;
    else if (j.verdict === "FP") c.fp++;
    else if (j.verdict === "UNSURE") c.unsure++;
    else c.blank++;
  }
}

for (const [id, c] of counts) {
  const n = c.tp + c.fp;
  const rate = n > 0 ? (c.fp / n).toFixed(2) : "-";
  console.log(
    `${id}  TP:${c.tp} FP:${c.fp} UNSURE:${c.unsure} blank:${c.blank}  → n=${n} fpRate=${rate} ${n >= 10 ? "MEASURED-eligible" : "needs " + (10 - n)}`,
  );
}
