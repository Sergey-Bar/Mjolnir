import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  CLI_COMMAND_NAMES,
  CLI_NON_SCAN_COMMANDS as SHARED_NON_SCAN_COMMANDS,
} from "../../src/commands/registry.js";
import {
  CLI_COMMAND_REGISTRY,
  CLI_NON_SCAN_COMMANDS,
  checkSuppressionIntegrity,
  checkWorkflowContainsScan,
  computeVerificationIntelligence,
  detectCIWorkflows,
  renderCIIntegrityReport,
} from "../../src/engine/verification-intelligence.js";
import { DEFAULT_SUPPRESSION_POLICY } from "../../src/engine/suppression-governance.js";

const roots: string[] = [];

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "mjolnir-ci-integrity-"));
  roots.push(value);
  return value;
}

function workflow(run: string, job = "  test:\n"): string {
  return `name: ci\non: push\njobs:\n${job}    steps:\n      - run: ${JSON.stringify(run)}\n`;
}

afterEach(() => {
  for (const value of roots.splice(0)) {
    rmSync(value, { recursive: true, force: true });
  }
});

describe("verification intelligence", () => {
  it("uses the shared CLI command registry", () => {
    expect(new Set(CLI_COMMAND_REGISTRY)).toEqual(new Set(CLI_COMMAND_NAMES));
    expect(CLI_NON_SCAN_COMMANDS).toBe(SHARED_NON_SCAN_COMMANDS);
    expect(CLI_NON_SCAN_COMMANDS.has("scan")).toBe(false);
  });

  it("recognizes supported provider invocations and shell prefixes", () => {
    for (const run of [
      "npx --yes mjolnir-qa@1.0.0 .",
      "npm exec -- mjolnir .",
      "CI=1 sudo mjolnir .",
      "UPPER=value mjolnir .",
      "A1=value mjolnir .",
      "_UNDERSCORE=value mjolnir .",
      'QUOTED="value with spaces" mjolnir .',
      "npx --package pinned mjolnir .",
      "npx --cache cache-dir mjolnir .",
      "npx -- mjolnir .",
      "npm exec --package pinned mjolnir .",
      "npm exec -p pinned mjolnir .",
      "npm exec -- mjolnir .",
      "mjolnir --json",
      "mjolnir > mjolnir.json",
      "if true; then mjolnir .; fi",
      "mjolnir --config mjolnir.config.json .",
      "set -o pipefail; mjolnir . | tee mjolnir.log",
    ]) {
      expect(checkWorkflowContainsScan(workflow(run), "ci.yml"), run).toBe(
        true,
      );
    }
  });

  it("fails a workflow when any scan candidate is not guaranteed", () => {
    const repo = root();
    mkdirSync(join(repo, ".github/workflows"), { recursive: true });
    writeFileSync(
      join(repo, ".github/workflows/ci.yml"),
      "name: ci\njobs:\n  gate:\n    steps:\n      - run: mjolnir .\n  optional:\n    if: false\n    steps:\n      - run: mjolnir .\n",
    );
    const report = computeVerificationIntelligence(repo);
    expect(report.overallStatus).toBe("broken");
    expect(report.failed).toBeGreaterThan(0);
  });

  it("fails closed for disabled or dynamic job and step conditions", () => {
    const cases = [
      "name: ci\njobs:\n  test:\n    if: 0\n    steps:\n      - run: mjolnir .\n",
      "name: ci\njobs:\n  test:\n    if: false\n    steps:\n      - run: mjolnir .\n",
      "name: ci\njobs:\n  test:\n    if: ${{ github.event_name == 'push' }}\n    steps:\n      - run: mjolnir .\n",
      "name: ci\njobs:\n  test:\n    if: ${{ true }}\n    steps:\n      - run: mjolnir .\n",
      "name: ci\njobs:\n  test:\n    steps:\n      - if: false\n        run: mjolnir .\n",
      "name: ci\njobs:\n  test:\n    steps:\n      - if: ${{ github.event_name == 'push' }}\n        run: mjolnir .\n",
      "name: ci\njobs:\n  test:\n    continue-on-error: true\n    steps:\n      - run: mjolnir .\n",
      "name: ci\njobs:\n  test:\n    continue-on-error: 1\n    steps:\n      - run: mjolnir .\n",
      "name: ci\njobs:\n  test:\n    continue-on-error: ${{ true }}\n    steps:\n      - run: mjolnir .\n",
      "name: ci\njobs:\n  test:\n    continue-on-error: ${{ false }}\n    steps:\n      - run: mjolnir .\n",
      "name: ci\njobs:\n  test:\n    steps:\n      - continue-on-error: ${{ true }}\n        run: mjolnir .\n",
    ];
    for (const content of cases) {
      expect(checkWorkflowContainsScan(content, "ci.yml"), content).toBe(false);
    }
  });

  it("rejects disabled, informational, and non-scan invocations", () => {
    for (const run of [
      "set +e; mjolnir .",
      "set pipefail; mjolnir . | tee mjolnir.log",
      "mjolnir . &",
      "mjolnir --version",
      "mjolnir --help",
      "mjolnir rules",
      "echo mjolnir .",
      "1INVALID=value mjolnir .",
      "=value mjolnir .",
      "FLAG=mjolnir",
      "INVALID-NAME=value mjolnir .",
      "X{=value mjolnir .",
      'BROKEN="unterminated mjolnir .',
      "npx not-mjolnir .",
      "npm exec -- not-mjolnir .",
    ]) {
      expect(checkWorkflowContainsScan(workflow(run), "ci.yml"), run).toBe(
        false,
      );
    }
    expect(
      checkWorkflowContainsScan(
        workflow("mjolnir . | tee mjolnir.log"),
        "ci.yml",
      ),
    ).toBe(false);
  });

  it("returns false for invalid workflow YAML", () => {
    expect(checkWorkflowContainsScan("name: [", "ci.yml")).toBe(false);
    expect(checkWorkflowContainsScan("- not-a-mapping", "ci.yml")).toBe(false);
    expect(checkWorkflowContainsScan("jobs: []", "ci.yml")).toBe(false);
  });

  it("honors literal continue-on-error values", () => {
    expect(
      checkWorkflowContainsScan(
        "name: ci\njobs:\n  test:\n    continue-on-error: 'false'\n    steps:\n      - run: mjolnir .\n",
        "ci.yml",
      ),
    ).toBe(true);
    expect(
      checkWorkflowContainsScan(
        "name: ci\njobs:\n  test:\n    continue-on-error: 'true'\n    steps:\n      - run: mjolnir .\n",
        "ci.yml",
      ),
    ).toBe(false);
  });

  it("reports a missing CI workflow as broken", () => {
    const report = computeVerificationIntelligence(root());
    expect(report.overallStatus).toBe("broken");
    expect(report.checks).toEqual([
      expect.objectContaining({ status: "fail", name: "ci-workflow" }),
    ]);
    expect(renderCIIntegrityReport(report)).toContain(
      "CI Workflow Integrity Report",
    );
  });

  it("reports invalid and unreadable workflow files as failures", () => {
    const invalidRoot = root();
    mkdirSync(join(invalidRoot, ".github", "workflows"), { recursive: true });
    writeFileSync(
      join(invalidRoot, ".github", "workflows", "ci.yml"),
      "name: [",
    );
    const invalid = computeVerificationIntelligence(invalidRoot);
    expect(invalid.overallStatus).toBe("broken");
    expect(invalid.checks[0]?.detail).toContain("Invalid CI workflow YAML");

    const unreadableRoot = root();
    mkdirSync(join(unreadableRoot, ".github", "workflows", "ci.yml"), {
      recursive: true,
    });
    const unreadable = computeVerificationIntelligence(unreadableRoot);
    expect(unreadable.overallStatus).toBe("broken");
    expect(unreadable.checks[0]?.detail).toContain(
      "Unable to read CI workflow",
    );
  });

  it("handles empty job lists and public default arguments", () => {
    for (const content of [
      "name: ci\njobs:\n",
      "name: ci\njobs: {}\n",
      "name: ci\njobs: []\n",
      "name: ci\njobs: scalar\n",
      "name: ci\njobs:\n  test: []\n",
    ]) {
      expect(checkWorkflowContainsScan(content, "ci.yml"), content).toBe(false);
    }
    expect(Array.isArray(detectCIWorkflows())).toBe(true);
    expect(Array.isArray(computeVerificationIntelligence().checks)).toBe(true);
    expect(checkSuppressionIntegrity([], []).status).toBe("pass");
  });

  it("reads GitHub and GitLab workflow paths and reports suppression failures", () => {
    const repo = root();
    const github = join(repo, ".github", "workflows", "ci.yml");
    mkdirSync(join(repo, ".github", "workflows"), { recursive: true });
    writeFileSync(github, workflow("mjolnir . --blocking error"));
    expect(checkWorkflowContainsScan(github, "ci.yml")).toBe(true);
    expect(checkWorkflowContainsScan(workflow("mjolnir ."))).toBe(true);
    expect(checkWorkflowContainsScan("null", "ci.yml")).toBe(false);
    const gitlab = join(repo, ".gitlab-ci.yml");
    writeFileSync(
      gitlab,
      "qa:\n  rules:\n    - if: '$CI_COMMIT_BRANCH == \"main\"'\n  script: mjolnir .\n",
    );
    expect(checkWorkflowContainsScan(gitlab, ".gitlab-ci.yml")).toBe(false);
    const report = computeVerificationIntelligence(
      repo,
      [{ ruleId: "QA-PW-101", reason: "expired", expires: "2000-01-01" }],
      [],
      {
        ...DEFAULT_SUPPRESSION_POLICY,
        requireExpiration: true,
        maxExpiredSuppressions: 0,
      },
    );
    expect(report.overallStatus).toBe("broken");
    expect(
      report.checks.some((check) => check.name === "suppression-integrity"),
    ).toBe(true);
  });

  it("recognizes provider-specific CI files without parsing Jenkins as YAML", () => {
    const providerRoot = root();
    mkdirSync(join(providerRoot, ".github", "workflows"), { recursive: true });
    writeFileSync(
      join(providerRoot, ".github", "workflows", "ci.yml"),
      workflow("mjolnir . --blocking error"),
    );
    writeFileSync(
      join(providerRoot, ".gitlab-ci.yml"),
      "qa:\n  script:\n    - npm test\n",
    );
    writeFileSync(join(providerRoot, "Jenkinsfile"), "pipeline { agent any }");

    const report = computeVerificationIntelligence(providerRoot);
    expect(report.overallStatus).toBe("degraded");
    expect(report.failed).toBe(0);
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: ".github/workflows/ci.yml",
          status: "pass",
        }),
        expect.objectContaining({ name: ".gitlab-ci.yml", status: "warn" }),
        expect.objectContaining({ name: "Jenkinsfile", status: "warn" }),
      ]),
    );
  });

  it("recognizes a blocking scan in GitLab CI", () => {
    const gitlabRoot = root();
    writeFileSync(
      join(gitlabRoot, ".gitlab-ci.yml"),
      "qa:\n  script:\n    - npx mjolnir-qa . --blocking error\n",
    );
    const report = computeVerificationIntelligence(gitlabRoot);
    expect(report.overallStatus).toBe("healthy");
    expect(report.checks[0]?.status).toBe("pass");
  });

  it("reports invalid GitLab CI as a provider-specific failure", () => {
    const gitlabRoot = root();
    writeFileSync(join(gitlabRoot, ".gitlab-ci.yml"), "qa: [\n");
    const report = computeVerificationIntelligence(gitlabRoot);
    expect(report.overallStatus).toBe("broken");
    expect(report.checks[0]?.detail).toContain("Invalid CI workflow");
  });

  it("covers GitLab global scripts, reserved keys, and rule state", () => {
    const cases = [
      "default:\n  before_script: [mjolnir .]\nqa:\n  script: [echo ok]\n",
      "qa:\n  script: [echo ok]\n  after_script: mjolnir .\n",
      "workflow:\n  rules:\n    - when: always\nqa:\n  script: mjolnir .\n",
      "qa:\n  rules:\n    - when: never\n    - when: always\n  script: mjolnir .\n",
      "qa:\n  rules: []\n  script: mjolnir .\n",
      "qa:\n  except: [push]\n  script: mjolnir .\n",
    ];
    for (const content of cases) {
      const repo = root();
      writeFileSync(join(repo, ".gitlab-ci.yml"), content);
      const check = computeVerificationIntelligence(repo).checks[0];
      expect(check?.status, content).toBe(
        content.startsWith("default:")
          ? "warn"
          : content.includes("except") ||
              content.includes("rules: []") ||
              content.includes("after_script")
            ? "fail"
            : "pass",
      );
    }
  });

  it("handles command wrappers, pipefail, and literal conditions", () => {
    for (const run of [
      "npx -- -- mjolnir .",
      "npm exec --package pinned mjolnir .",
      "npm exec -- mjolnir .",
      "npm run self-scan",
      "mjolnir.cmd .",
      "https://example.test/mjolnir-qa/cli.sh .",
      "set -e -o pipefail; mjolnir . | tee mjolnir.log",
      "if success(); then mjolnir .; fi",
      "mjolnir .; echo complete",
    ]) {
      expect(checkWorkflowContainsScan(workflow(run), "ci.yml"), run).toBe(
        true,
      );
    }
    for (const run of [
      "npx -- other-package .",
      "npm exec -- other-package .",
      "npm run other",
      "mjolnir . --blocking none",
      "mjolnir . --blocking=none",
      "if github.ref == 'refs/heads/main'; then mjolnir .; fi",
    ]) {
      expect(checkWorkflowContainsScan(workflow(run), "ci.yml"), run).toBe(
        false,
      );
    }
    expect(
      checkWorkflowContainsScan(
        "name: ci\njobs:\n  test:\n    if: null\n    continue-on-error: null\n    steps:\n      - run: mjolnir .\n",
        "ci.yml",
      ),
    ).toBe(true);
    expect(
      checkWorkflowContainsScan(
        "name: ci\njobs:\n  test:\n    if: true\n    steps:\n      - if: true\n        continue-on-error: false\n        run: mjolnir .\n",
        "ci.yml",
      ),
    ).toBe(true);
    expect(
      checkWorkflowContainsScan(
        "name: ci\njobs:\n  test:\n    if: 'false'\n    steps:\n      - run: mjolnir .\n",
        "ci.yml",
      ),
    ).toBe(false);
  });

  it("covers remaining shell, YAML, and GitLab branch states", () => {
    for (const run of [
      "# comment\nmjolnir .",
      "echo before; mjolnir .",
      "set -o pipefail; mjolnir . | tee mjolnir.log",
      "set -euo pipefail; mjolnir . | tee mjolnir.log",
      "; mjolnir .",
      "if always(); then mjolnir .; fi",
    ]) {
      expect(checkWorkflowContainsScan(workflow(run), "ci.yml"), run).toBe(
        true,
      );
    }
    expect(
      checkWorkflowContainsScan(
        "name: ci\njobs:\n  test:\n    continue-on-error: null\n    steps:\n      - run: mjolnir .\n",
        "ci.yml",
      ),
    ).toBe(true);
    for (const run of [
      "! mjolnir .",
      "if false; then mjolnir .; fi",
      "mjolnir . &",
      "mjolnir . --blocking=none",
    ]) {
      expect(checkWorkflowContainsScan(workflow(run), "ci.yml"), run).toBe(
        false,
      );
    }
    for (const content of [
      "name: ci\njobs: []\n",
      "name: ci\njobs: scalar\n",
      "name: ci\njobs:\n  test: []\n",
      "name: ci\njobs:\n  test:\n    steps: null\n",
    ]) {
      expect(checkWorkflowContainsScan(content, "ci.yml"), content).toBe(false);
    }

    const gitlabCases = [
      "qa:\n  rules:\n    - if: 'true'\n  script: mjolnir .\n",
      "qa:\n  rules:\n    - when: on_success\n  script: mjolnir .\n",
      "qa:\n  script: [mjolnir .]\n",
      "qa:\n  script: []\n",
    ];
    for (const content of gitlabCases) {
      const repo = root();
      writeFileSync(join(repo, ".gitlab-ci.yml"), content);
      const status = computeVerificationIntelligence(repo).checks[0]?.status;
      expect(status, content).toBe(
        content.includes("script: []")
          ? "warn"
          : content.includes("if:")
            ? "fail"
            : "pass",
      );
    }
  });

  it("evaluates GitLab job controls before accepting a scan gate", () => {
    const cases = [
      "qa:\n  script: mjolnir .\n",
      "qa:\n  before_script: [mjolnir .]\n  script: [echo ok]\n",
      "qa:\n  allow_failure: false\n  when: on_success\n  script: mjolnir .\n",
    ];
    for (const content of cases) {
      const repo = root();
      writeFileSync(join(repo, ".gitlab-ci.yml"), content);
      expect(
        computeVerificationIntelligence(repo).checks[0]?.status,
        content,
      ).toBe("pass");
    }

    for (const content of [
      "workflow:\n  rules:\n    - if: '$CI_PIPELINE_SOURCE == \"push\"'\nqa:\n  script: mjolnir .\n",
      "qa:\n  allow_failure: true\n  script: mjolnir .\n",
      "qa:\n  when: manual\n  script: mjolnir .\n",
      "qa:\n  when: never\n  script: mjolnir .\n",
      "qa:\n  only: [push]\n  script: mjolnir .\n",
      "qa:\n  rules:\n    - when: manual\n  script: mjolnir .\n",
      "qa:\n  rules:\n    - when: on_failure\n  script: mjolnir .\n",
      "qa:\n  rules: {}\n  script: mjolnir .\n",
      "qa:\n  rules:\n    - 1\n  script: mjolnir .\n",
      "qa:\n  rules:\n    - when: never\n  script: mjolnir .\n",
    ]) {
      const repo = root();
      writeFileSync(join(repo, ".gitlab-ci.yml"), content);
      expect(
        computeVerificationIntelligence(repo).checks[0]?.status,
        content,
      ).toBe("fail");
    }
  });

  it("checks real suppression policy against actual findings", () => {
    const pass = checkSuppressionIntegrity([], [], DEFAULT_SUPPRESSION_POLICY);
    expect(pass.status).toBe("pass");

    const fail = checkSuppressionIntegrity(
      [{ ruleId: "QA-TEST-001", reason: "unexpiring" }],
      [],
      { ...DEFAULT_SUPPRESSION_POLICY, requireExpiration: true },
      new Set(["QA-TEST-001"]),
      new Date("2026-09-23T00:00:00.000Z"),
    );
    expect(fail.status).toBe("fail");
    expect(fail.detail).toContain("without an expiration");

    const report = computeVerificationIntelligence(
      root(),
      [{ ruleId: "QA-TEST-001", reason: "unexpiring" }],
      [],
      { ...DEFAULT_SUPPRESSION_POLICY, requireExpiration: true },
      new Set(["QA-TEST-001"]),
      new Date("2026-09-23T00:00:00.000Z"),
    );
    expect(
      report.checks.some((check) => check.name === "suppression-integrity"),
    ).toBe(true);
  });
});
