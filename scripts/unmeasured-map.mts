import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { MEASURED_FP } from "../src/rules/measured-fp.generated.js";
import { RULES, RETIRED_RULE_IDS } from "../src/rules/index.js";

const active = RULES.filter((r) => !RETIRED_RULE_IDS.includes(r.id));
const unmeasured = active
  .filter((r) => MEASURED_FP[r.id] === undefined)
  .map((r) => r.id);
console.log(
  `unmeasured (${unmeasured.length}):`,
  unmeasured.join(", "),
);
const dir = "tests/corpus/baseline";
for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const counts = j.countsByRule ?? {};
  const hits = unmeasured.filter((id) => (counts[id] ?? 0) > 0);
  if (hits.length)
    console.log(
      f.replace(".json", ""),
      "->",
      hits.map((h) => `${h}:${counts[h]}`).join(" "),
    );
}
