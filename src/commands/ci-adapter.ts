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
import { join, resolve } from "node:path";

import type { Output } from "../cli-io.js";
import { EXIT_CLEAN, EXIT_INTERNAL, EXIT_USAGE } from "../exit-codes.js";
import { ENGINE_VERSION } from "../engine/version.js";

const SCAN_COMMAND = `npx --yes mjolnir-qa@${ENGINE_VERSION} --blocking error`;

function generateGitHubWorkflow(): string {
  return `name: QA Check
on: [push, pull_request]
jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - name: Install dependencies
        run: npm ci
      - name: Run Mjölnir scan
        run: ${SCAN_COMMAND}
`;
}

function generateGitLabCi(): string {
  return `stages:
  - test
  - qa
qa-check:
  stage: qa
  script:
    - ${SCAN_COMMAND}
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
`;
}

function generateJenkinsfile(): string {
  return `pipeline {
    agent any
    stages {
        stage('QA Check') {
            steps {
                sh '${SCAN_COMMAND}'
            }
        }
    }
}
`;
}

export function runCiAdapterCommand(
  argv: string[],
  io: { out: Output; err: Output },
): number {
  const adapter = argv[0] ?? "";
  if (!["github", "gitlab", "jenkins"].includes(adapter)) {
    io.err("Usage: mjolnir ci-adapter <github|gitlab|jenkins> [target]");
    return EXIT_USAGE;
  }
  if (argv.length > 2 || argv.slice(1).some((arg) => arg.startsWith("-"))) {
    io.err("Usage: mjolnir ci-adapter <github|gitlab|jenkins> [target]");
    return EXIT_USAGE;
  }
  const target = resolve(argv[1] ?? ".");

  let output: string;
  let filename: string;

  switch (adapter) {
    case "github":
      output = generateGitHubWorkflow();
      filename = "qa-check.yml";
      break;
    case "gitlab":
      output = generateGitLabCi();
      filename = ".gitlab-ci.yml";
      break;
    case "jenkins":
      output = generateJenkinsfile();
      filename = "Jenkinsfile";
      break;
    default:
      return EXIT_USAGE;
  }

  try {
    writeFileSync(join(target, filename), output);
  } catch (error) {
    io.err(
      `Unable to write CI template: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return EXIT_INTERNAL;
  }
  io.out(`CI ADAPTER: ${adapter.toUpperCase()}`);
  io.out(`Generated ${join(target, filename)}`);
  io.out(output);

  return EXIT_CLEAN;
}
