import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..", "..");
const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const modelPath = getArg("--model");
const dataFlowPath = getArg("--data-flow");
const strict = args.includes("--strict");
if (!modelPath || !dataFlowPath) {
  console.error(
    "usage: validate-threat-model.mjs --model <path> --data-flow <path> [--strict]",
  );
  process.exit(2);
}
const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const readJson = (path) =>
  JSON.parse(readFileSync(resolve(root, path), "utf8"));
const fail = (message) => {
  console.error(`threat-model: ${message}`);
  process.exit(1);
};
const requiredString = (value, label) => {
  if (typeof value !== "string" || value.trim() === "")
    fail(`${label} is required`);
};
const requiredArray = (value, label) => {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
};
const model = readJson(modelPath);
const dataFlows = readJson(dataFlowPath);
if (!isRecord(model) || model.schemaVersion !== 1)
  fail("model schemaVersion must be 1");
if (!isRecord(dataFlows) || dataFlows.schemaVersion !== 1)
  fail("data-flow schemaVersion must be 1");
requiredArray(model.scenarios, "model.scenarios");
requiredArray(dataFlows.flows, "data-flows.flows");
if (model.legalConclusions !== undefined) {
  requiredArray(model.legalConclusions, "model.legalConclusions");
  if (model.legalConclusions.length > 0)
    fail("unsupported legal conclusions are not allowed");
}
const evidencePaths = new Set();
for (const [index, scenarioValue] of model.scenarios.entries()) {
  if (!isRecord(scenarioValue))
    fail(`model.scenarios[${index}] must be an object`);
  requiredString(scenarioValue.id, `model.scenarios[${index}].id`);
  requiredString(scenarioValue.risk, `model.scenarios[${index}].risk`);
  requiredString(scenarioValue.status, `model.scenarios[${index}].status`);
  requiredString(scenarioValue.owner, `model.scenarios[${index}].owner`);
  requiredString(
    scenarioValue.abuseScenario,
    `model.scenarios[${index}].abuseScenario`,
  );
  requiredArray(scenarioValue.evidence, `model.scenarios[${index}].evidence`);
  if (scenarioValue.evidence.length === 0)
    fail(`model.scenarios[${index}].evidence is empty`);
  for (const evidence of scenarioValue.evidence) {
    requiredString(evidence, `model.scenarios[${index}].evidence entry`);
    if (isAbsolute(evidence) || evidence.split(/[\\/]/).includes("..")) {
      fail(`evidence path escapes the repository: ${evidence}`);
    }
    const full = resolve(root, evidence);
    const rel = relative(root, full);
    if (rel.startsWith("..") || !existsSync(full))
      fail(`evidence path is missing: ${evidence}`);
    evidencePaths.add(evidence);
  }
  if (
    scenarioValue.status !== "tested" &&
    scenarioValue.status !== "not-applicable"
  ) {
    fail(`model.scenarios[${index}].status must be tested or not-applicable`);
  }
  if (scenarioValue.status === "not-applicable") {
    requiredString(
      scenarioValue.rationale,
      `model.scenarios[${index}].rationale`,
    );
  }
}
const requiredClassifications = new Set([
  "source",
  "test",
  "finding",
  "evidence",
  "prompt",
  "log",
  "artifact",
  "backup",
  "metadata",
]);
const seenClassifications = new Set();
const requiredFlowFields = [
  "id",
  "classification",
  "origin",
  "destination",
  "operator",
  "boundary",
  "permittedPurpose",
  "protection",
  "accessRole",
  "retention",
  "deletion",
  "failureBehavior",
  "network",
  "consent",
  "approvedPurpose",
];
for (const [index, flowValue] of dataFlows.flows.entries()) {
  if (!isRecord(flowValue))
    fail(`data-flows.flows[${index}] must be an object`);
  for (const field of requiredFlowFields) {
    if (!(field in flowValue))
      fail(`data-flows.flows[${index}].${field} is required`);
  }
  for (const field of requiredFlowFields.filter(
    (value) => value !== "network",
  )) {
    requiredString(flowValue[field], `data-flows.flows[${index}].${field}`);
  }
  if (typeof flowValue.network !== "boolean")
    fail(`data-flows.flows[${index}].network must be boolean`);
  const classification = flowValue.classification;
  if (!requiredClassifications.has(classification)) {
    fail(`data-flows.flows[${index}].classification is unsupported`);
  }
  seenClassifications.add(classification);
  if (
    flowValue.network &&
    (flowValue.consent !== "explicit" || !flowValue.approvedPurpose)
  ) {
    fail(
      `network flow ${flowValue.id} requires explicit consent and an approved purpose`,
    );
  }
  if (
    classification === "source" &&
    flowValue.network &&
    flowValue.consent !== "explicit"
  ) {
    fail(`source upload ${flowValue.id} requires explicit consent`);
  }
  if (strict && flowValue.network && flowValue.boundary !== "network") {
    fail(`network flow ${flowValue.id} must declare the network boundary`);
  }
}
for (const classification of requiredClassifications) {
  if (!seenClassifications.has(classification))
    fail(`missing data flow classification: ${classification}`);
}
console.log(
  JSON.stringify({
    status: "PASS",
    model: model.modelId,
    scenarios: model.scenarios.length,
    flows: dataFlows.flows.length,
    evidencePaths: evidencePaths.size,
    strict,
  }),
);
