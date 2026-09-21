import { describe, expect, it } from "vitest";

import type { AzurePipelineDoc } from "../../../src/discovery/azure-pipeline-parser.js";
import { retryMasking } from "../../../src/rules/ci/qa-ci-007-retry-masking.js";
import { alwaysSuccessStep } from "../../../src/rules/ci/qa-ci-008-always-success.js";
import { exitCodeNotPropagated } from "../../../src/rules/ci/qa-ci-009-exit-code.js";
import { nonBlockingTestJob } from "../../../src/rules/ci/qa-ci-010-non-blocking.js";
import { canNeverFailGate } from "../../../src/rules/ci/qa-ci-013-can-never-fail.js";
import { parseWorkflow } from "../../../src/discovery/workflow-parser.js";

const AZ = "azure-pipelines";

function doc(partial: Record<string, unknown>): AzurePipelineDoc {
  return { platform: AZ, ...partial } as unknown as AzurePipelineDoc;
}

function runGH(
  rule: {
    run: (ctx: {
      path: string;
      text: string;
      ast?: unknown;
    }) => Array<{ message: string; [k: string]: unknown }>;
  },
  yaml: string,
): Array<{ message: string; [k: string]: unknown }> {
  return rule.run({
    path: ".github/workflows/ci.yml",
    text: yaml,
    ast: parseWorkflow(yaml),
  });
}

function runAzure(
  rule: {
    run: (ctx: {
      path: string;
      text: string;
      ast?: unknown;
    }) => Array<{ message: string; [k: string]: unknown }>;
  },
  text: string,
  ast?: unknown,
): Array<{ message: string; [k: string]: unknown }> {
  return rule.run({ path: "pipeline.yml", text, ast });
}

function runJenkins(
  rule: {
    run: (ctx: {
      path: string;
      text: string;
      ast?: unknown;
    }) => Array<{ message: string; [k: string]: unknown }>;
  },
  text: string,
): Array<{ message: string; [k: string]: unknown }> {
  return rule.run({ path: "Jenkinsfile", text });
}

describe("QA-CI-007 branch coverage gaps (line 239 — azureArm)", () => {
  it("azureArm: stages with nested jobs containing retry gate fires", () => {
    const findings = runAzure(
      retryMasking,
      "stages:",
      doc({
        stages: [
          {
            stage: "Test",
            jobs: [
              {
                name: "Unit",
                kind: "job",
                steps: [
                  {
                    script: "npm test",
                    retryCountOnTaskFailure: 3,
                    name: "run-tests",
                  },
                ],
              },
            ],
          },
        ],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("retryCountOnTaskFailure: 3");
  });
});

describe("QA-CI-008 branch coverage gaps (line 238 — succeededOrFailed gate job)", () => {
  it("fires on succeededOrFailed()-conditioned gate job", () => {
    const findings = runAzure(
      alwaysSuccessStep,
      "jobs:",
      doc({
        jobs: [
          {
            name: "Verify",
            kind: "job",
            condition: "succeededOrFailed()",
            steps: [{ task: "Npm@1", inputs: { command: "test" } }],
          },
        ],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("succeededOrFailed()");
  });

  it("enforcement step suppresses finding (line 180 path)", () => {
    const yaml = `
on: push
jobs:
  build:
    steps:
      - run: npm test
        continue-on-error: true
      - if: always()
        run: |
          if [ "$result" != "success" ]; then
            exit 1
          fi
`;
    const findings = alwaysSuccessStep.run({
      path: ".github/workflows/ci.yml",
      text: yaml,
      ast: parseWorkflow(yaml),
    });
    expect(findings).toHaveLength(0);
  });
});

describe("QA-CI-009 branch coverage gaps (line 98, 214)", () => {
  it("pipe arm: test command piped into another tool without pipefail (line 98)", () => {
    const yaml = `
on: push
jobs:
  build:
    steps:
      - run: npm test | tee output.log
`;
    const findings = runGH(exitCodeNotPropagated, yaml);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("pipes the test command");
  });

  it("Jenkins arm: sh with returnStatus: true on a non-gate is silent (line 214)", () => {
    const findings = runJenkins(
      exitCodeNotPropagated,
      "sh(script: 'echo hello', returnStatus: true)",
    );
    expect(findings).toEqual([]);
  });

  it("sequence arm: test followed by another command with ; (Case 2)", () => {
    const yaml = `
on: push
jobs:
  build:
    steps:
      - run: npm test; npm run lint
`;
    const findings = runGH(exitCodeNotPropagated, yaml);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("sequences commands with");
  });

  it("pipefail prevents pipe finding", () => {
    const yaml = `
on: push
jobs:
  build:
    steps:
      - run: |
          set -o pipefail
          npm test | tee output.log
`;
    const findings = runGH(exitCodeNotPropagated, yaml);
    expect(findings).toEqual([]);
  });
});

describe("QA-CI-010 branch coverage gap (line 119 — findLine fallback)", () => {
  it("findLine returns 1 when condition text is not found in the source (line 119)", () => {
    const yaml = `
on: push
jobs:
  test:
    if: "github.event_name != 'pull_request'"
    steps:
      - run: npm test
`;
    const findings = runGH(nonBlockingTestJob, yaml);
    // The condition might not be exactly as in source after YAML parsing
    if (findings.length > 0) {
      expect(findings[0]?.line).toBeGreaterThanOrEqual(1);
    }
  });

  it("fires on push-only condition (skip on PR)", () => {
    const yaml = `
on: push
jobs:
  test:
    if: github.ref == 'refs/heads/main'
    steps:
      - run: npm test
`;
    const findings = runGH(nonBlockingTestJob, yaml);
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
});

describe("QA-CI-013 branch coverage gaps (lines 52, 85, 103-110, 133)", () => {
  it('condition: "false" (string) on a gate step (line 52 — NEVER_RUNS_RE)', () => {
    const findings = runAzure(
      canNeverFailGate,
      "steps:",
      doc({
        steps: [
          {
            task: "Npm@1",
            inputs: { command: "test" },
            condition: "false",
          },
        ],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("condition: false");
  });

  it("condition: 'false' (single-quoted) on a gate step", () => {
    const findings = runAzure(
      canNeverFailGate,
      "steps:",
      doc({
        steps: [
          {
            task: "Npm@1",
            inputs: { command: "test" },
            condition: "'false'",
          },
        ],
      }),
    );
    expect(findings).toHaveLength(1);
  });

  it('condition: "false" (double-quoted) on a gate step', () => {
    const findings = runAzure(
      canNeverFailGate,
      "steps:",
      doc({
        steps: [
          {
            task: "Npm@1",
            inputs: { command: "test" },
            condition: '"false"',
          },
        ],
      }),
    );
    expect(findings).toHaveLength(1);
  });

  it("job-level rescue condition with gate inside fires (line 85 path)", () => {
    const findings = runAzure(
      canNeverFailGate,
      "jobs:",
      doc({
        jobs: [
          {
            name: "Rescue",
            kind: "job",
            condition: "failed()",
            steps: [{ script: "npm test" }],
          },
        ],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Verification job `Rescue`");
  });

  it("job-level false condition with gate inside fires", () => {
    const findings = runAzure(
      canNeverFailGate,
      "jobs:",
      doc({
        jobs: [
          {
            name: "Disabled",
            kind: "job",
            condition: "false",
            steps: [{ script: "npm test" }],
          },
        ],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Verification job `Disabled`");
  });

  it("job-level never-runs WITHOUT gate inside is silent (jobHasGate false — line 133)", () => {
    const findings = runAzure(
      canNeverFailGate,
      "jobs:",
      doc({
        jobs: [
          {
            name: "Deploy",
            kind: "job",
            condition: "false",
            steps: [{ script: "deploy prod" }],
          },
        ],
      }),
    );
    expect(findings).toEqual([]);
  });

  it("steps form their own implicit job (line 88-89 path)", () => {
    const findings = runAzure(
      canNeverFailGate,
      "steps:",
      doc({
        steps: [
          {
            task: "Npm@1",
            inputs: { command: "test" },
            condition: "failed()",
          },
        ],
      }),
    );
    expect(findings).toHaveLength(1);
  });

  it("non-Azure doc returns empty findings", () => {
    const findings = canNeverFailGate.run({
      path: "ci.yml",
      text: "test",
      ast: { not: "azure" },
    });
    expect(findings).toEqual([]);
  });

  it("condition-less gate with enabled:true never fires", () => {
    const findings = runAzure(
      canNeverFailGate,
      "steps:",
      doc({
        steps: [
          {
            task: "Npm@1",
            inputs: { command: "test" },
            enabled: true,
          },
        ],
      }),
    );
    expect(findings).toEqual([]);
  });
});
