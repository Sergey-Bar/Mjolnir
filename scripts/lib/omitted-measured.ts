/**
 * Finds rules with an OMITTED tier that now carry a valid measurement.
 * Per the D3 Steps 1+2 contract (tests/rules.registry.spec.ts), a
 * measured rule must declare its tier explicitly — omitted tier is only
 * legal for unmeasured (PROVISIONAL) rules.
 */
import { RULES } from "../../src/rules/index.js";
import { hasValidMeasurement } from "../../src/rules/measurement.js";

for (const r of RULES) {
  if (r.tier === undefined && hasValidMeasurement(r)) {
    console.log(r.id);
  }
}
