import { buildRuleCensus } from "../src/rules/registry-census.js";

const census = buildRuleCensus();
const status =
  census.duplicateActiveIds.length === 0 &&
  census.retiredActiveIntersections.length === 0
    ? "PASS"
    : "FAIL";
console.log(JSON.stringify({ status, ...census }, null, 2));
if (status === "FAIL") process.exit(1);
