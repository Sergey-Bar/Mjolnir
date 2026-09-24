#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { join, resolve } from "node:path";
import { parse } from "yaml";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];

const localRequired = [
  "npm run build",
  "npm run typecheck",
  "npm run lint",
  "npm run test:property",
  "npm run test:fuzz",
  "npm run coverage:ratchet",
  "npm run audit:ci",
  "npm run brand:doctor",
  "npm run brand:doctor:selftest",
  "npm run brand:fonts:check",
  "npm run site:doctor",
  "npm run ci-local:parity",
];

const prePushRequired = [
  "npm run typecheck",
  "npm run lint",
  "npm run ci-local:parity",
];

const prePushForbidden = ["--no-verify", "git push"];

const remoteRequired = [
  "npm ci",
  "npm run build",
  "npm run typecheck",
  "npm run lint",
  "npm run brand:doctor",
  "npm run brand:doctor:selftest",
  "npm run brand:fonts:check",
  "npm run audit:ci",
  "npm run test:coverage:ci",
  "npm run coverage:ratchet",
  "npm run test:property",
  "npm run site:doctor",
];

const certifyRequired = ["npm run test", "npx vitest run tests/contract/"];
const certifyCiRequired = [
  "npm run test:coverage:ci",
  "npx vitest run tests/contract/",
];
const buildTestCanonical = [
  ["npm ci"],
  ["npm run typecheck"],
  ["npm run lint"],
  ["npm run brand:doctor"],
  ["npm run brand:doctor:selftest"],
  ["npm run brand:fonts:check"],
  ["npm run audit:ci", "npm audit --audit-level=moderate"],
  ["npm test", "npm run test:coverage:ci"],
  ["npm run coverage:ratchet"],
];

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripExpression(value) {
  const trimmed = String(value).trim();
  return trimmed.startsWith("${{") && trimmed.endsWith("}}")
    ? trimmed.slice(3, -2).trim()
    : trimmed;
}

function conditionIsActive(value) {
  if (value === undefined || value === null || value === true) return true;
  if (value === false) return false;
  if (typeof value !== "string") return false;
  const normalized = stripExpression(value).trim().toLowerCase();
  return (
    ["", "true", "success()", "always()"].includes(normalized) ||
    normalized.includes("matrix.")
  );
}

function isContinueOnError(value) {
  if (value === undefined || value === null || value === false) return false;
  const normalized = stripExpression(value).trim().toLowerCase();
  if (String(value).trim().startsWith("${{")) return true;
  return normalized !== "false";
}

function stripComment(line) {
  let quote = "";
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if ((character === "'" || character === '"') && quote === "") {
      quote = character;
      continue;
    }
    if (character === quote) {
      quote = "";
      continue;
    }
    if (
      character === "#" &&
      quote === "" &&
      (index === 0 || /\s/.test(line[index - 1]))
    ) {
      return line.slice(0, index);
    }
  }
  return line;
}

function containsExecutableCommand(run, command) {
  const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(?:^|&&|\\|\\||;|\\n)\\s*(?:then\\s+|do\\s+)?${escaped}(?=\\s|$)`,
    "m",
  );
  return run
    .split(/\r?\n/)
    .map(stripComment)
    .some((line) => pattern.test(line));
}

function isExecutableRun(run) {
  const handlesFailure = /\bPIPESTATUS\b/.test(run) && /\bexit\b/.test(run);
  if (/\bset\s+\+e\b/.test(run) && !handlesFailure) return false;
  if (/\|\||(?:^|[;\n])\s*&\s*(?:$|[;\n])/.test(run)) return false;
  const singlePipe = /(?:^|[^|])\|(?!\|)/.test(run);
  if (
    singlePipe &&
    !/\bset\s+(?:-[^\s]+\s+)*-o\s+pipefail\b/.test(run) &&
    !handlesFailure
  ) {
    return false;
  }
  return (
    handlesFailure ||
    !/\bif\s+(?!true\b|success\(\)\b|always\(\)\b)[^;\n]+;/.test(run)
  );
}

function hasActiveCommand(workflow, command) {
  if (!isRecord(workflow) || !isRecord(workflow.jobs)) return false;
  return Object.values(workflow.jobs).some((job) => {
    if (!isRecord(job) || !conditionIsActive(job.if)) return false;
    if (!Array.isArray(job.steps)) return false;
    return job.steps.some((step) => {
      if (!isRecord(step) || typeof step.run !== "string") return false;
      if (!conditionIsActive(step.if)) return false;
      const continueOnError =
        step["continue-on-error"] ?? job["continue-on-error"];
      if (isContinueOnError(continueOnError)) return false;
      if (!isExecutableRun(step.run)) return false;
      return containsExecutableCommand(step.run, command);
    });
  });
}

function hasActiveJobCommand(workflow, jobName, command) {
  if (!isRecord(workflow) || !isRecord(workflow.jobs)) return false;
  return hasActiveCommand(
    { jobs: { [jobName]: workflow.jobs[jobName] } },
    command,
  );
}

function readWorkflow(path, label) {
  if (!existsSync(path)) {
    failures.push(`${label}: missing ${path}`);
    return null;
  }
  try {
    const parsed = parse(readFileSync(path, "utf8"));
    if (!isRecord(parsed)) {
      failures.push(`${label}: YAML root is not a mapping`);
      return null;
    }
    return parsed;
  } catch (error) {
    failures.push(
      `${label}: invalid YAML (${error instanceof Error ? error.message : String(error)})`,
    );
    return null;
  }
}

function checkCommand(workflow, command, label) {
  if (!workflow || !hasActiveCommand(workflow, command)) {
    failures.push(`${label}: missing active step for ${command}`);
  }
}

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const scripts = pkg.scripts ?? {};
const ciLocal = scripts["ci-local"] ?? "";
const certify = scripts.certify ?? "";
const certifyCi = scripts["certify:ci"] ?? "";

for (const command of localRequired) {
  if (!ciLocal.includes(command) && !certifyCi.includes(command)) {
    failures.push(`ci-local chain: missing ${command}`);
  }
}
for (const command of certifyRequired) {
  if (!certify.includes(command)) failures.push(`certify: missing ${command}`);
}
for (const command of certifyCiRequired) {
  if (!certifyCi.includes(command))
    failures.push(`certify:ci: missing ${command}`);
}
if (!ciLocal.includes("npm run certify:ci")) {
  failures.push(
    "ci-local: must use certify:ci to avoid a second full-suite run",
  );
}
if (ciLocal.includes("npm run test:coverage:ci")) {
  failures.push("ci-local: test:coverage:ci is already run by certify:ci");
}
const coverageRuns = (certifyCi.match(/npm run test:coverage:ci/g) ?? [])
  .length;
if (coverageRuns !== 1) {
  failures.push(
    `certify:ci: expected one full coverage run, found ${coverageRuns}`,
  );
}

const ci = readWorkflow(join(ROOT, ".github/workflows/ci.yml"), "ci.yml");
const merge = readWorkflow(
  join(ROOT, ".github/workflows/merge-verify.yml"),
  "merge-verify.yml",
);
const fuzz = readWorkflow(join(ROOT, ".github/workflows/fuzz.yml"), "fuzz.yml");
for (const command of remoteRequired) {
  checkCommand(ci, command, "ci.yml");
  checkCommand(merge, command, "merge-verify.yml");
}
for (const variants of buildTestCanonical) {
  if (
    !variants.some((variant) => hasActiveJobCommand(ci, "build-test", variant))
  ) {
    failures.push(
      `ci.yml build-test: missing active gate ${variants.join(" or ")}`,
    );
  }
  if (
    !variants.some((variant) =>
      hasActiveJobCommand(merge, "merge-verify", variant),
    )
  ) {
    failures.push(`merge-verify: missing active gate ${variants.join(" or ")}`);
  }
}
if (!hasActiveCommand(ci, "node dist/cli.mjs . --json")) {
  failures.push("ci.yml: missing active self-scan gate");
}
if (!hasActiveCommand(ci, "npm run docs:regen")) {
  failures.push("ci.yml: missing active generated-docs gate");
}
checkCommand(fuzz, "npm run test:fuzz", "fuzz.yml");

const hookPath = join(ROOT, ".husky/pre-push");
if (!existsSync(hookPath)) {
  failures.push(`pre-push hook: missing ${hookPath}`);
} else {
  const hook = readFileSync(hookPath, "utf8");
  for (const command of prePushRequired) {
    if (!containsExecutableCommand(hook, command)) {
      failures.push(`pre-push hook: missing ${command}`);
    }
  }
  if (containsExecutableCommand(hook, "npm run ci-local")) {
    failures.push("pre-push hook: forbidden npm run ci-local");
  }
  for (const command of prePushForbidden) {
    if (hook.includes(command)) {
      failures.push(`pre-push hook: forbidden ${command}`);
    }
  }
  if (!/^set -e(?:\s|$)/m.test(hook)) {
    failures.push("pre-push hook: missing fail-fast set -e");
  }
}

if (failures.length > 0) {
  console.error("CI/local parity check failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("CI/local parity: OK");
