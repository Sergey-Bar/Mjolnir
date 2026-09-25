import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const root = process.argv[2] ?? process.cwd();
const read = (file) =>
  readFileSync(join(root, ".github", "workflows", file), "utf8");
const mjolnir = read("mjolnir.yml");
const ci = read("ci.yml");
const merge = read("merge-verify.yml");
const errors = [];
if (!mjolnir.includes("outcome=partial"))
  errors.push("PR scan does not mark partial analysis");
if (!mjolnir.includes('2) echo "::warning::'))
  errors.push("PR scan does not make partial analysis advisory");
if (!ci.includes("test:coverage:ci"))
  errors.push("primary CI coverage gate is missing");
if (!ci.includes("coverage:ratchet"))
  errors.push("coverage ratchet gate is missing");
if (!merge.includes("ci-local:parity"))
  errors.push("merge verification does not run CI parity");
const prWorkflow = parse(mjolnir);
const scanJob = prWorkflow?.jobs?.scan;
if (scanJob?.permissions?.["pull-requests"] === "write") {
  errors.push("read-only scan job has pull-request write permission");
}
if (errors.length > 0) {
  console.error(JSON.stringify({ status: "FAIL", errors }, null, 2));
  process.exit(1);
}
console.log(
  JSON.stringify({ status: "PASS", standard: "CI-STANDARD" }, null, 2),
);
