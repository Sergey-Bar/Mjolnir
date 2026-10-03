/**
 * `mjolnir ci adapters` — CI Adapters (SDET-4).
 *
 * Generates CI configuration for GitHub Actions, GitLab CI,
 * and Jenkins from a single source of truth: the Mjölnir scan.
 *
 * Subcommands:
 *   github  — generate GitHub Actions workflow YAML
 *   gitlab  — generate GitLab CI YAML
 *   jenkins — generate Jenkins Jenkinsfile Groovy
 */

import { writeFileAtomic } from "../lib/fs-atomic.js";
import { join, resolve } from "node:path";

import type { Output } from "../cli-io.js";
import { EXIT_CLEAN, EXIT_INTERNAL, EXIT_USAGE } from "../exit-codes.js";
import { ENGINE_VERSION } from "../engine/version.js";

const SCAN_COMMAND = `npx --yes mjolnir-qa@${ENGINE_VERSION} --blocking error`;

/**
 * Every provider this command can emit a template for.
 *
 * Exported because the v6 inventory publishes `counts.ciProviders` — "how
 * many CI providers does Mjölnir support" is a question about this switch, and
 * for 5.x it was answered by counting support-matrix cells whose id contained
 * the string `CI`. Adding a cell could raise the number; deleting the code
 * could not lower it.
 */
export const CI_PROVIDERS = ["github", "gitlab", "jenkins"] as const;
export type CiProvider = (typeof CI_PROVIDERS)[number];

/**
 * Least privilege for a read-only scan job.
 *
 * A workflow with no `permissions:` key inherits the repository's default
 * `GITHUB_TOKEN` scope, which on many repositories is `contents: write`.
 * This generator emits a job that only reads code, so the block is
 * declared rather than inherited — the same choice, and the same
 * structurally-tested assertion, as src/integrations/ci-install.ts, which
 * is the sibling emitter in this repository that gets it right.
 */
function generateGitHubWorkflow(): string {
  return `name: QA Check
on: [push, pull_request]
permissions:
  contents: read
jobs:
  qa:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
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
  if (!(CI_PROVIDERS as readonly string[]).includes(adapter)) {
    io.err(`Usage: mjolnir ci adapters <${CI_PROVIDERS.join("|")}> [target]`);
    return EXIT_USAGE;
  }
  if (argv.length > 2 || argv.slice(1).some((arg) => arg.startsWith("-"))) {
    io.err(`Usage: mjolnir ci adapters <${CI_PROVIDERS.join("|")}> [target]`);
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
    // Atomic (audit S9): a truncated Jenkinsfile or workflow file is a
    // half-written CI definition that still parses as a file.
    writeFileAtomic(join(target, filename), output);
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
