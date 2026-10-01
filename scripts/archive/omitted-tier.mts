import { RULES } from "../src/rules/index.js";
import { hasValidMeasurement } from "../src/rules/measurement.js";

for (const r of RULES) {
  if (r.tier === undefined && !hasValidMeasurement(r)) console.log(r.id);
}
