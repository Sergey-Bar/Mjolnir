import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { parseGitLabCi } from "../adapters/gitlab-ci.js";
import { parseYamlGuarded } from "../discovery/yaml-guards.js";
import type { Finding } from "../types.js";
import {
  CLI_COMMAND_NAMES,
  CLI_NON_SCAN_COMMANDS,
} from "./cli-command-names.js";
import {
  computeSuppressionGovernanceGate,
  DEFAULT_SUPPRESSION_POLICY,
  type SuppressionPolicyConfig,
} from "./suppression-governance.js";
import type {
  SuppressionEntry,
  SuppressionFinding,
} from "./suppression-integrity.js";

export interface CIWorkflowCheck {
  name: string;
  status: "pass" | "fail" | "warn";
  detail: string;
}

export interface CIWorkflowIntegrityReport {
  workflow: string;
  checks: CIWorkflowCheck[];
  passed: number;
  failed: number;
  warned: number;
  overallStatus: "healthy" | "degraded" | "broken";
}

const CI_WORKFLOW_FILES = [
  ".github/workflows/ci.yml",
  ".github/workflows/test.yml",
  ".github/workflows/qa.yml",
  ".gitlab-ci.yml",
  ".gitlab-ci.yaml",
  "Jenkinsfile",
] as const;

export const CLI_COMMAND_REGISTRY = CLI_COMMAND_NAMES;
export { CLI_NON_SCAN_COMMANDS };

const OPTIONS_WITH_VALUES = new Set([
  "--base",
  "--blocking",
  "--category",
  "--config",
  "--fail-on",
  "--format",
  "--max-duration",
  "--output",
  "--rules",
  "--scope",
  "--width",
]);

const GITLAB_RESERVED_KEYS = new Set([
  "after_script",
  "before_script",
  "cache",
  "default",
  "image",
  "include",
  "services",
  "stages",
  "variables",
  "workflow",
]);

type RecordValue = Record<string, unknown>;
type ConditionState = "active" | "disabled" | "dynamic";
type WorkflowAnalysis = {
  hasGate: boolean;
  hasCandidate: boolean;
  hasNonGatingCandidate: boolean;
};

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function conditionState(value: unknown): ConditionState {
  if (value === undefined || value === null || value === true) return "active";
  if (value === false) return "disabled";
  if (typeof value !== "string") return "dynamic";
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("${{")) return "dynamic";
  if (normalized === "false") return "disabled";
  if (["", "true", "always()", "success()"].includes(normalized)) {
    return "active";
  }
  return "dynamic";
}

function isContinueOnError(value: unknown): boolean {
  if (value === undefined || value === null || value === false) return false;
  if (value === true) return true;
  if (typeof value !== "string") return true;
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("${{")) return true;
  return normalized !== "false";
}

function parseGithubJobs(content: string): Record<string, RecordValue> {
  const document = parseYamlGuarded(content, {
    invalidPrefix: "Invalid workflow YAML",
    rootMessage: "Workflow root must be a mapping",
    depthMessage: "Workflow nesting depth exceeds limit",
  });
  if (document === null || document === undefined) return {};
  if (!isRecord(document)) {
    throw new Error("Workflow root must be a mapping");
  }
  const jobs = document.jobs;
  if (jobs === undefined || jobs === null) return {};
  if (!isRecord(jobs)) {
    throw new Error('"jobs" must be a mapping');
  }
  const result: Record<string, RecordValue> = Object.create(null) as Record<
    string,
    RecordValue
  >;
  for (const [name, value] of Object.entries(jobs)) {
    if (isRecord(value)) result[name] = value;
  }
  return result;
}

function isEnvironmentName(name: string): boolean {
  const first = name.charCodeAt(0);
  if (!(
    (first >= 65 && first <= 90) ||
    (first >= 97 && first <= 122) ||
    first === 95
  )) {
    return false;
  }
  for (let index = 1; index < name.length; index++) {
    const code = name.charCodeAt(index);
    if (!(
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      code === 95
    )) {
      return false;
    }
  }
  return true;
}

function stripEnvironmentAssignments(command: string): string {
  let normalized = command.trim();
  while (true) {
    const equals = normalized.indexOf("=");
    const space = normalized.search(/\s/);
    if (equals <= 0 || (space >= 0 && equals > space)) break;
    const name = normalized.slice(0, equals);
    if (!isEnvironmentName(name)) break;
    let end = equals + 1;
    const quote = normalized[end];
    if (quote === '"' || quote === "'") {
      const closing = normalized.indexOf(quote, end + 1);
      if (closing < 0) break;
      end = closing + 1;
    } else {
      const nextSpace = normalized.slice(end).search(/\s/);
      end = nextSpace < 0 ? normalized.length : end + nextSpace;
    }
    normalized = normalized.slice(end).trimStart();
  }
  return normalized;
}

function normalizeCommand(command: string): string {
  let normalized = command.trim();
  const prefixes = [
    "if ",
    "then ",
    "do ",
    "else ",
    "elif ",
    "while ",
    "until ",
  ];
  if (normalized.startsWith("!")) return "";
  while (prefixes.some((prefix) => normalized.startsWith(prefix))) {
    normalized = normalized.slice(normalized.indexOf(" ") + 1).trimStart();
  }
  normalized = stripEnvironmentAssignments(normalized);
  for (const prefix of ["sudo ", "command ", "exec ", "env "]) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length).trimStart();
      break;
    }
  }
  return stripEnvironmentAssignments(normalized).trim();
}

function isMjolnirPackage(token: string): boolean {
  return (
    token === "mjolnir" ||
    token === "mjolnir.cmd" ||
    token === "mjolnir-qa" ||
    token === "mjolnir-qa.cmd" ||
    token.startsWith("mjolnir@") ||
    token.startsWith("mjolnir-qa@") ||
    /^https?:\/\/[^ ]*\/mjolnir-qa(?:-|\/)/i.test(token)
  );
}

function commandInvocation(command: string): { args: string } | null {
  const tokens = normalizeCommand(command).split(/\s+/).filter(Boolean);
  let runnerIndex = -1;
  if (tokens[0] && isMjolnirPackage(tokens[0])) {
    runnerIndex = 0;
  } else if (tokens[0] === "npx") {
    const optionsWithValues = new Set([
      "--cache",
      "--package",
      "-p",
      "--registry",
    ]);
    for (let index = 1; index < tokens.length; index++) {
      const token = tokens[index];
      if (!token) continue;
      if (token.length === 2 && token[0] === "-" && token[1] === "-") {
        continue;
      }
      if (optionsWithValues.has(token)) {
        index++;
        continue;
      }
      if (token.startsWith("-")) continue;
      if (isMjolnirPackage(token)) runnerIndex = index;
      break;
    }
  } else if (tokens[0] === "npm" && tokens[1] === "exec") {
    const optionsWithValues = new Set(["--package", "-p"]);
    for (let index = 2; index < tokens.length; index++) {
      const token = tokens[index];
      if (!token) continue;
      if (token.length === 2 && token[0] === "-" && token[1] === "-") {
        continue;
      }
      if (optionsWithValues.has(token)) {
        index++;
        continue;
      }
      if (token.startsWith("-")) continue;
      if (isMjolnirPackage(token)) runnerIndex = index;
      break;
    }
  } else if (tokens[0] === "npm" && tokens[1] === "run") {
    if (tokens[2] === "self-scan") runnerIndex = 2;
  } else if (
    tokens[0] === "node" &&
    (tokens[1] === "dist/cli.mjs" || tokens[1] === "./dist/cli.mjs")
  ) {
    runnerIndex = 1;
  }
  return runnerIndex >= 0
    ? { args: tokens.slice(runnerIndex + 1).join(" ") }
    : null;
}

function firstPositional(args: string): string | null {
  const tokens = args.split(/\s+/).filter(Boolean);
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (!token || /^(?:[<>]|>>?)$/.test(token)) continue;
    if (token.startsWith("-")) {
      if (!token.includes("=") && OPTIONS_WITH_VALUES.has(token)) index++;
      continue;
    }
    return token;
  }
  return null;
}

function isPotentialScanInvocation(command: string): boolean {
  const invocation = commandInvocation(command);
  if (!invocation) return false;
  if (/(?:^|\s)(?:-h|--help|--version|-v)(?=\s|$)/.test(invocation.args)) {
    return false;
  }
  const positional = firstPositional(invocation.args);
  return positional === null || !CLI_NON_SCAN_COMMANDS.has(positional);
}

function isScanInvocation(command: string): boolean {
  if (!isPotentialScanInvocation(command)) return false;
  const invocation = commandInvocation(command);
  if (!invocation) return false;
  return !/(?:^|\s)--blocking(?:=|\s+)none(?=\s|$)/.test(invocation.args);
}

function isMjolnirInvocation(command: string): boolean {
  return isPotentialScanInvocation(command);
}

function runParts(
  run: string,
): Array<{ command: string; terminator?: string }> {
  const result: Array<{ command: string; terminator?: string }> = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let escaped = false;
  const push = (terminator?: string) => {
    if (current.trim() && !current.trim().startsWith("#")) {
      result.push(
        terminator ? { command: current, terminator } : { command: current },
      );
    }
    current = "";
  };
  for (let index = 0; index < run.length; index++) {
    const character = run[index] ?? "";
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      current += character;
      escaped = true;
      continue;
    }
    if (quote) {
      current += character;
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      current += character;
      continue;
    }
    if (character === ";" || character === "\n" || character === "\r") {
      push(";");
      continue;
    }
    if (character === "&" && run[index + 1] === "&") {
      push("&&");
      index++;
      continue;
    }
    if (character === "|" && run[index + 1] === "|") {
      push("||");
      index++;
      continue;
    }
    if (character === "&" || character === "|") {
      push(character);
      continue;
    }
    current += character;
  }
  push();
  return result;
}

function hasSinglePipe(run: string): boolean {
  return runParts(run).filter((part) => part.terminator === "|").length === 1;
}

function hasPipefail(run: string): boolean {
  const tokens = run.trim().split(/\s+/);
  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index] !== "set") continue;
    let hasPipefailOption = false;
    for (let next = index + 1; next < tokens.length; next++) {
      const token = tokens[next] ?? "";
      if (token.length >= 8 && token.startsWith("pipefail")) {
        return hasPipefailOption;
      }
      if (!token.startsWith("-")) break;
      if (token.length > 1 && token[0] === "-" && token.includes("o")) {
        hasPipefailOption = true;
      }
    }
  }
  return false;
}

function hasDynamicShellCondition(run: string): boolean {
  return runParts(run).some(({ command }) => {
    const tokens = command.trim().split(/\s+/);
    const control = tokens[0];
    if (control && ["while", "until", "for", "case"].includes(control)) {
      return true;
    }
    const ifIndex = tokens.indexOf("if");
    if (ifIndex < 0 || ifIndex === tokens.length - 1) return false;
    const condition = tokens.slice(ifIndex + 1).join(" ");
    return (
      condition !== "true" &&
      condition !== "success()" &&
      condition !== "always()"
    );
  });
}

function runHasScanGate(run: string): boolean {
  if (/\bset\s+\+e\b/.test(run)) return false;
  if (hasSinglePipe(run) && !hasPipefail(run)) return false;
  if (hasDynamicShellCondition(run)) return false;
  const parts = runParts(run);
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (!part || part.terminator === "||" || part.terminator === "&") {
      continue;
    }
    if (!isScanInvocation(part.command)) continue;
    const next = parts[index + 1]?.command.trim();
    if (
      part.terminator === ";" &&
      next !== undefined &&
      /^(?:true|:|exit\s+0)$/.test(next)
    ) {
      return false;
    }
    return true;
  }
  return false;
}

function runHasMjolnirCommand(run: string): boolean {
  return runParts(run).some(({ command }) => isMjolnirInvocation(command));
}

function analyzeGithubWorkflow(content: string): WorkflowAnalysis {
  const jobs = parseGithubJobs(content);
  let hasGate = false;
  let hasCandidate = false;
  let hasNonGatingCandidate = false;
  for (const job of Object.values(jobs)) {
    const jobState = conditionState(job.if);
    const steps = Array.isArray(job.steps) ? job.steps : [];
    for (const rawStep of steps) {
      if (!isRecord(rawStep) || typeof rawStep.run !== "string") continue;
      if (!runHasMjolnirCommand(rawStep.run)) continue;
      hasCandidate = true;
      const stepState = conditionState(rawStep.if);
      const continueOnError = isContinueOnError(
        rawStep["continue-on-error"] ?? job["continue-on-error"],
      );
      if (
        jobState === "active" &&
        stepState === "active" &&
        !continueOnError &&
        runHasScanGate(rawStep.run)
      ) {
        hasGate = true;
      } else {
        hasNonGatingCandidate = true;
      }
    }
  }
  return { hasGate, hasCandidate, hasNonGatingCandidate };
}

function asCommands(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return typeof value === "string" ? [value] : [];
}

function gitlabRuleState(rules: unknown): ConditionState {
  if (!Array.isArray(rules)) return "dynamic";
  let unconditional = false;
  for (const rawRule of rules) {
    if (!isRecord(rawRule)) continue;
    if (
      rawRule.allow_failure !== undefined &&
      rawRule.allow_failure !== false
    ) {
      return "disabled";
    }
    const when = rawRule.when;
    if (when === "never") continue;
    if (when === "manual" || when === "delayed" || when === "on_failure") {
      return "dynamic";
    }
    const state = conditionState(rawRule.if);
    if (state === "active" && rawRule.if === undefined) unconditional = true;
    else if (state !== "disabled") return "dynamic";
  }
  return unconditional ? "active" : "disabled";
}

function gitlabJobState(job: RecordValue): ConditionState {
  const allowFailure = job.allow_failure;
  if (allowFailure !== undefined && allowFailure !== false) return "disabled";
  const when = job.when;
  if (
    when === "never" ||
    when === "manual" ||
    when === "delayed" ||
    when === "on_failure"
  ) {
    return "disabled";
  }
  if (job.only !== undefined || job.except !== undefined) return "dynamic";
  if (job.rules !== undefined) return gitlabRuleState(job.rules);
  return "active";
}

function analyzeGitlabWorkflow(content: string): WorkflowAnalysis {
  const config = parseGitLabCi(content);
  const globalCommands = [
    ...asCommands(config.before_script).map((command) => ({
      command,
      advisory: false,
    })),
    ...asCommands(config.after_script).map((command) => ({
      command,
      advisory: true,
    })),
  ];
  const workflowState =
    isRecord(config.workflow) && config.workflow.rules !== undefined
      ? gitlabRuleState(config.workflow.rules)
      : "active";
  let hasGate = false;
  let hasCandidate = false;
  let hasNonGatingCandidate = false;
  for (const [name, value] of Object.entries(config)) {
    if (GITLAB_RESERVED_KEYS.has(name) || !isRecord(value)) continue;
    const state = gitlabJobState(value);
    const commands: Array<{ command: string; advisory: boolean }> = [
      ...globalCommands,
      ...asCommands(value.before_script).map((command) => ({
        command,
        advisory: false,
      })),
      ...asCommands(value.script).map((command) => ({
        command,
        advisory: false,
      })),
      ...asCommands(value.after_script).map((command) => ({
        command,
        advisory: true,
      })),
    ];
    for (const { command, advisory } of commands) {
      if (!runHasMjolnirCommand(command)) continue;
      hasCandidate = true;
      if (
        !advisory &&
        workflowState === "active" &&
        state === "active" &&
        runHasScanGate(command)
      ) {
        hasGate = true;
      } else {
        hasNonGatingCandidate = true;
      }
    }
  }
  return { hasGate, hasCandidate, hasNonGatingCandidate };
}

export function detectCIWorkflows(root: string = "."): string[] {
  return CI_WORKFLOW_FILES.filter((workflow) =>
    existsSync(join(root, workflow)),
  );
}

function inspectWorkflow(
  content: string,
  workflowName: string,
): CIWorkflowCheck {
  try {
    if (workflowName === "Jenkinsfile") {
      return {
        name: workflowName,
        status: "warn",
        detail:
          "Jenkins pipeline detected; blocking scan verification is unsupported",
      };
    }
    const analysis = workflowName.startsWith(".gitlab-ci.")
      ? analyzeGitlabWorkflow(content)
      : analyzeGithubWorkflow(content);
    if (analysis.hasGate && !analysis.hasNonGatingCandidate) {
      return {
        name: workflowName,
        status: "pass",
        detail: "CI workflow contains a guaranteed blocking Mjölnir scan",
      };
    }
    if (analysis.hasCandidate) {
      return {
        name: workflowName,
        status: "fail",
        detail:
          "Mjölnir command is disabled, conditional, or allowed to fail; no guaranteed blocking scan",
      };
    }
  } catch (error) {
    return {
      name: workflowName,
      status: "fail",
      detail: `Invalid CI workflow YAML/provider: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  return {
    name: workflowName,
    status: "warn",
    detail: "No Mjölnir command detected in this CI workflow",
  };
}

export function checkWorkflowContainsScan(
  workflowContent: string,
  workflowName = "ci.yml",
): boolean {
  try {
    const candidatePath = resolve(workflowName, workflowContent);
    const pathInput =
      !workflowContent.includes("\n") && existsSync(candidatePath);
    const content = pathInput
      ? readFileSync(candidatePath, "utf8")
      : workflowContent;
    const providerName = pathInput ? basename(candidatePath) : workflowName;
    const analysis =
      providerName.endsWith(".gitlab-ci.yml") ||
      providerName.endsWith(".gitlab-ci.yaml")
        ? analyzeGitlabWorkflow(content)
        : analyzeGithubWorkflow(content);
    return analysis.hasGate && !analysis.hasNonGatingCandidate;
  } catch {
    return false;
  }
}

export function checkSuppressionIntegrity(
  suppressions: SuppressionEntry[],
  findings: readonly SuppressionFinding[],
  policy: SuppressionPolicyConfig = DEFAULT_SUPPRESSION_POLICY,
  knownRuleIds?: ReadonlySet<string>,
  now: Date = new Date(),
): CIWorkflowCheck {
  const result = computeSuppressionGovernanceGate(
    suppressions,
    findings,
    policy,
    knownRuleIds,
    now,
  );
  return result.passed
    ? {
        name: "suppression-integrity",
        status: "pass",
        detail: `Suppression integrity passed: ${suppressions.length} suppression(s), ${findings.length} finding(s)`,
      }
    : {
        name: "suppression-integrity",
        status: "fail",
        detail: result.policyViolations.join("; "),
      };
}

export function computeVerificationIntelligence(
  root: string = ".",
  suppressions: SuppressionEntry[] = [],
  findings: readonly Finding[] = [],
  policy: SuppressionPolicyConfig = DEFAULT_SUPPRESSION_POLICY,
  knownRuleIds?: ReadonlySet<string>,
  now: Date = new Date(),
): CIWorkflowIntegrityReport {
  const workflows = detectCIWorkflows(root);
  const checks: CIWorkflowCheck[] = [];

  if (workflows.length === 0) {
    checks.push({
      name: "ci-workflow",
      status: "fail",
      detail: "No CI workflow files detected in repository",
    });
  } else {
    for (const workflow of workflows) {
      try {
        checks.push(
          inspectWorkflow(readFileSync(join(root, workflow), "utf8"), workflow),
        );
      } catch (error) {
        checks.push({
          name: workflow,
          status: "fail",
          detail: `Unable to read CI workflow: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    }
  }

  if (suppressions.length > 0) {
    checks.push(
      checkSuppressionIntegrity(
        suppressions,
        findings,
        policy,
        knownRuleIds,
        now,
      ),
    );
  }

  const passed = checks.filter((check) => check.status === "pass").length;
  const failed = checks.filter((check) => check.status === "fail").length;
  const warned = checks.filter((check) => check.status === "warn").length;
  const overallStatus =
    failed > 0 ? "broken" : warned > 0 ? "degraded" : "healthy";

  return {
    workflow: workflows.length > 0 ? workflows.join(", ") : "none",
    checks,
    passed,
    failed,
    warned,
    overallStatus,
  };
}

export function renderCIIntegrityReport(
  report: CIWorkflowIntegrityReport,
): string {
  const lines = [
    "CI Workflow Integrity Report",
    `Workflow: ${report.workflow}`,
    `Status: ${report.overallStatus.toUpperCase()}`,
    `Passed: ${report.passed}, Failed: ${report.failed}, Warned: ${report.warned}`,
    "",
  ];

  for (const check of report.checks) {
    const icon =
      check.status === "pass" ? "✓" : check.status === "fail" ? "✗" : "⚠";
    lines.push(`${icon} ${check.name}: ${check.detail}`);
  }

  return lines.join("\n").trimEnd();
}
