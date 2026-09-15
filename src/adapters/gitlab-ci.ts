/**
 * GitLab CI Adapter (CI-008).
 *
 * Detects and parses `.gitlab-ci.yml` files to surface CI
 * verification risks. Three initial rules: allow_failure detection,
 * empty test stage, exit code suppression.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { parse as parseYaml } from "yaml";

export interface GitLabCiJob {
  stage?: string;
  script?: string[];
  allow_failure?: boolean | { exit_codes: number[] };
  rules?: GitLabCiRule[];
  artifacts?: {
    reports?: {
      junit?: string | string[];
      coverage_report?: { coverage_format?: string; path?: string };
    };
  };
  when?: string;
  [key: string]: unknown;
}

export interface GitLabCiRule {
  if?: string;
  when?: string;
  allow_failure?: boolean;
  [key: string]: unknown;
}

export interface GitLabCiConfig {
  stages?: string[];
  [jobName: string]: GitLabCiJob | string[] | string | undefined;
}

export interface GitLabCiVerificationRisk {
  type: "allow-failure" | "empty-test-stage" | "exit-code-suppression";
  description: string;
  jobName: string;
  severity: "error" | "warning" | "info";
}

export function detectGitLabCi(rootDir: string): string | null {
  const ymlPath = join(rootDir, ".gitlab-ci.yml");
  const yamlPath = join(rootDir, ".gitlab-ci.yaml");
  if (existsSync(ymlPath)) return ymlPath;
  if (existsSync(yamlPath)) return yamlPath;
  return null;
}

export function parseGitLabCi(content: string): GitLabCiConfig {
  const parsed: unknown = parseYaml(content);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("GitLab CI YAML is not a valid object.");
  }
  return parsed as GitLabCiConfig;
}

function getJobs(config: GitLabCiConfig): Array<[string, GitLabCiJob]> {
  const reserved = new Set([
    "stages",
    "variables",
    "default",
    "include",
    "workflow",
    "image",
    "services",
    "before_script",
    "after_script",
    "cache",
  ]);
  const jobs: Array<[string, GitLabCiJob]> = [];
  for (const [key, value] of Object.entries(config)) {
    if (reserved.has(key)) continue;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      jobs.push([key, value]);
    }
  }
  return jobs;
}

export function detectGitLabCiRisks(
  config: GitLabCiConfig,
): GitLabCiVerificationRisk[] {
  const risks: GitLabCiVerificationRisk[] = [];
  const jobs = getJobs(config);
  const testStages = new Set(["test", "tests", "testing", "verify", "check"]);
  const configuredStages = config.stages ?? [];
  const hasTestStage = configuredStages.some((s) =>
    testStages.has(s.toLowerCase()),
  );

  for (const [name, job] of jobs) {
    if (job.allow_failure !== undefined && job.allow_failure !== false) {
      risks.push({
        type: "allow-failure",
        description:
          `Job "${name}" uses allow_failure, which can mask test failures ` +
          `and produce misleading green pipelines.`,
        jobName: name,
        severity: "warning",
      });
    }

    if (
      job.script &&
      job.script.length > 0 &&
      job.script.some(
        (line) =>
          line.includes("|| true") ||
          line.includes("|| :") ||
          line.match(/\bexit\s+0\b/),
      )
    ) {
      risks.push({
        type: "exit-code-suppression",
        description:
          `Job "${name}" suppresses exit codes in its script (` +
          `|| true / exit 0), which hides real failures.`,
        jobName: name,
        severity: "error",
      });
    }
  }

  if (hasTestStage) {
    const jobsInTestStage = jobs.filter(
      ([, job]) =>
        job.stage !== undefined && testStages.has(job.stage.toLowerCase()),
    );
    if (jobsInTestStage.length === 0) {
      risks.push({
        type: "empty-test-stage",
        description: "A test stage is declared but no jobs are assigned to it.",
        jobName: "(global)",
        severity: "warning",
      });
    }
  }

  return risks;
}
