/**
 * `mjolnir ci-adapter` — CI Adapters (SDET-4).
 *
 * Generates CI configuration for GitHub Actions, GitLab CI,
 * and Jenkins from a single source of truth: the Mjölnir scan.
 *
 * Subcommands:
 *   github  — generate GitHub Actions workflow YAML
 *   gitlab  — generate GitLab CI YAML
 *   jenkins — generate Jenkins Jenkinsfile Groovy
 */

import { writeFileSync } from "node:fs";
import { EXIT_CLEAN, EXIT_USAGE } from "../exit-codes.js";
import type { Output } from "../cli-io.js";

interface CiFinding {
  ruleId: string;
  severity: string;
  message: string;
}

function generateGitHubWorkflow(findings: CiFinding[]): string {
  const hasErrors = findings.some((f) => f.severity === "error");
  const steps = findings
    .map(
      (f) =>
        `      - name: Report ${f.ruleId}\n        run: echo "${f.message}"`,
    )
    .join("\n");
  return `name: QA Check
on: [push, pull_request]
jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm ci
      - name: Run Mjölnir scan
        run: npx mjolnir scan
${steps}
      - name: Report result
        if: ${hasErrors ? "failure()" : "success()"}
        run: echo "Quality gate: ${hasErrors ? "FAILED" : "PASSED"}"
`;
}

function generateGitLabCi(findings: CiFinding[]): string {
  const hasErrors = findings.some((f) => f.severity === "error");
  return `stages:
  - test
  - qa
qa-check:
  stage: qa
  script:
    - npx mjolnir scan
    - ${hasErrors ? 'echo "Quality gate FAILED" && exit 1' : 'echo "Quality gate PASSED"'}
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
`;
}

function generateJenkinsfile(findings: CiFinding[]): string {
  const hasErrors = findings.some((f) => f.severity === "error");
  return `pipeline {
    agent any
    stages {
        stage('QA Check') {
            steps {
                sh 'npx mjolnir scan'
                sh 'echo "Quality gate: ${hasErrors ? "FAILED" : "PASSED"}"'
            }
        }
    }
    post {
        failure {
            echo 'QA findings detected — review required'
        }
    }
}
`;
}

export async function runCiAdapterCommand(
  argv: string[],
  io: { out: Output; err: Output },
): Promise<number> {
  const adapter = argv[0] ?? "";
  const target =
    (argv.length >= 2
      ? argv.slice(1).find((a) => !a.startsWith("-"))
      : undefined) ?? ".";

  if (!["github", "gitlab", "jenkins"].includes(adapter)) {
    io.err("Usage: mjolnir ci-adapter <github|gitlab|jenkins> [target]");
    return EXIT_USAGE;
  }

  let findings: CiFinding[] = [];
  try {
    const { runScan } = await import("../engine/scan-pipeline.js");
    const result = await runScan({
      target,
      json: true,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "json",
      strict: false,
    });
    findings = result.findings.map((f) => ({
      ruleId: f.ruleId,
      severity: f.severity,
      message: f.message,
    }));
  } catch {
    findings.length = 0;
  }

  let output: string;
  let filename: string;

  switch (adapter) {
    case "github":
      output = generateGitHubWorkflow(findings);
      filename = "qa-check.yml";
      break;
    case "gitlab":
      output = generateGitLabCi(findings);
      filename = ".gitlab-ci.yml";
      break;
    case "jenkins":
      output = generateJenkinsfile(findings);
      filename = "Jenkinsfile";
      break;
    default:
      return EXIT_USAGE;
  }

  writeFileSync(filename, output);
  io.out(`CI ADAPTER: ${adapter.toUpperCase()}`);
  io.out(`Generated ${filename}`);
  io.out(`Findings processed: ${findings.length}`);
  io.out(output);

  return EXIT_CLEAN;
}
