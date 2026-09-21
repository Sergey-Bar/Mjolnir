/**
 * QA-CI rule arms coverage — the Azure/Jenkins rule arms driven with
 * hand-built pipeline ASTs and Jenkinsfile texts, pinning every skip
 * arm (disabled gates, reporting-task exclusions, advisory filtering,
 * retry-parse fallbacks, name-less jobs) that the shipped fixture
 * suites cannot reach.
 */

import { describe, expect, it } from "vitest";

import type { AzurePipelineDoc } from "../../../src/discovery/azure-pipeline-parser.js";
import { continueOnError } from "../../../src/rules/ci/qa-ci-001-continue-on-error.js";
import { retryMasking } from "../../../src/rules/ci/qa-ci-007-retry-masking.js";
import { alwaysSuccessStep } from "../../../src/rules/ci/qa-ci-008-always-success.js";
import { exitCodeNotPropagated } from "../../../src/rules/ci/qa-ci-009-exit-code.js";
import { canNeverFailGate } from "../../../src/rules/ci/qa-ci-013-can-never-fail.js";

const AZ = "azure-pipelines";

function doc(partial: Record<string, unknown>): AzurePipelineDoc {
  return { platform: AZ, ...partial } as unknown as AzurePipelineDoc;
}

function run(
  rule: {
    run: (ctx: {
      path: string;
      text: string;
      ast?: unknown;
    }) => Array<{ message: string }>;
  },
  text: string,
  ast?: unknown,
  path = "pipeline.yml",
): Array<{ message: string }> {
  return rule.run({ path, text, ast });
}

describe("qa-ci-001 continueOnError — skip arms", () => {
  const text = [
    "jobs:",
    "  - job: J",
    "    steps:",
    "      - script: npm test",
    "        continueOnError: true",
  ].join("\n");

  it("a disabled gate cannot be masked by continueOnError (never-runs belongs to QA-CI-013)", () => {
    const findings = run(
      continueOnError,
      text,
      doc({
        jobs: [
          {
            name: "J",
            kind: "job",
            steps: [
              { script: "npm test", continueOnError: true, enabled: false },
            ],
          },
        ],
      }),
    );
    expect(findings).toEqual([]);
  });

  it("reporting/publishing tasks under continueOnError are ordinary best-effort", () => {
    const findings = run(
      continueOnError,
      text,
      doc({
        jobs: [
          {
            name: "J",
            kind: "job",
            steps: [
              {
                task: "PublishTestResults@2",
                continueOnError: true,
                name: "publish",
              },
            ],
          },
        ],
      }),
    );
    expect(findings).toEqual([]);
  });

  it("a non-gate step with continueOnError never fires", () => {
    const findings = run(
      continueOnError,
      text,
      doc({
        jobs: [
          {
            name: "J",
            kind: "job",
            steps: [{ script: "echo hi", continueOnError: true }],
          },
        ],
      }),
    );
    expect(findings).toEqual([]);
  });

  it("null step entries are skipped; name-less steps fall back to their script line", () => {
    const findings = run(
      continueOnError,
      text,
      doc({
        jobs: [
          {
            kind: "job",
            steps: [null, { script: "npm test\nmore", continueOnError: true }],
          },
        ],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("npm test");
  });

  it("a name-less task gate describes itself by its task id", () => {
    const findings = run(
      continueOnError,
      text,
      doc({
        jobs: [
          {
            kind: "job",
            steps: [
              {
                task: "Npm@1",
                inputs: { command: "test" },
                continueOnError: true,
              },
            ],
          },
        ],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("`Npm@1`");
  });

  it("root-level steps form their own implicit job", () => {
    const findings = run(
      continueOnError,
      text,
      doc({ steps: [{ script: "npm test", continueOnError: true }] }),
    );
    expect(findings).toHaveLength(1);
  });
});

describe("qa-ci-007 retryCountOnTaskFailure — parse and skip arms", () => {
  const ast = (steps: unknown[]): AzurePipelineDoc => doc({ steps });
  const gate = { script: "npm test", retryCountOnTaskFailure: 2 };

  it("retry 0 and missing keys are the honest default (never fire)", () => {
    expect(
      run(
        retryMasking,
        "steps:",
        ast([{ script: "npm test", retryCountOnTaskFailure: 0 }]),
      ),
    ).toEqual([]);
    expect(run(retryMasking, "steps:", ast([{ script: "npm test" }]))).toEqual(
      [],
    );
  });

  it("a non-numeric retry string parses to NaN and never fires", () => {
    expect(
      run(
        retryMasking,
        "steps:",
        ast([{ script: "npm test", retryCountOnTaskFailure: "abc" }]),
      ),
    ).toEqual([]);
  });

  it("a numeric STRING retry fires like a numeric one", () => {
    const findings = run(
      retryMasking,
      "steps:",
      ast([{ script: "npm test", retryCountOnTaskFailure: "2" }]),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("retryCountOnTaskFailure: 2");
  });

  it("null steps and name-less jobs fall back honestly", () => {
    const findings = run(
      retryMasking,
      "steps:",
      doc({
        jobs: [{ kind: "job", steps: [null, gate] }],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Job `?`");
  });

  it("root-level steps form the implicit job (the push arm)", () => {
    const findings = run(retryMasking, "steps:", ast([gate]));
    expect(findings).toHaveLength(1);
  });

  it("non-gate steps with retries never fire", () => {
    expect(
      run(
        retryMasking,
        "steps:",
        ast([{ script: "echo hi", retryCountOnTaskFailure: 3 }]),
      ),
    ).toEqual([]);
  });
});

describe("qa-ci-013 can-never-fail — condition/enabled arms", () => {
  const gate = { task: "Npm@1", inputs: { command: "test" } };

  it("enabled:false on a gate step is the never-runs finding", () => {
    const findings = run(
      canNeverFailGate,
      "steps:",
      doc({ steps: [{ ...gate, enabled: false }] }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("enabled: false");
  });

  it("condition: failed() and condition: false are both never-run shapes", () => {
    for (const condition of ["failed()", "false", "'false'"]) {
      const findings = run(
        canNeverFailGate,
        "steps:",
        doc({ steps: [{ ...gate, condition }] }),
      );
      expect(findings, condition).toHaveLength(1);
      expect(findings[0]?.message, condition).toContain(condition);
    }
  });

  it("a job-level never-runs condition with a gate inside fires once at job level", () => {
    const findings = run(
      canNeverFailGate,
      "jobs:",
      doc({
        jobs: [
          { name: "Gates", kind: "job", condition: "failed()", steps: [gate] },
        ],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Verification job `Gates`");
  });

  it("a never-runs job WITHOUT a gate is not a false-green (nothing was promised)", () => {
    const findings = run(
      canNeverFailGate,
      "jobs:",
      doc({
        jobs: [
          {
            name: "Deploy",
            kind: "job",
            condition: "failed()",
            steps: [{ script: "rollback" }],
          },
        ],
      }),
    );
    expect(findings).toEqual([]);
  });

  it("null step entries and name-less jobs fall back honestly", () => {
    const findings = run(
      canNeverFailGate,
      "jobs:",
      doc({
        jobs: [{ kind: "job", steps: [null, { ...gate, condition: "false" }] }],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("in `?`");
  });

  it("root-level steps and a condition-less gate never fire", () => {
    expect(run(canNeverFailGate, "steps:", doc({ steps: [gate] }))).toEqual([]);
  });
});

describe("qa-ci-008 always()-conditioned gates", () => {
  it("an always()-conditioned gate job fires; a non-matching condition never does", () => {
    const gate = { task: "Npm@1", inputs: { command: "test" } };
    const firing = run(
      alwaysSuccessStep,
      "jobs:",
      doc({
        jobs: [
          {
            name: "Always",
            kind: "job",
            condition: "always()",
            steps: [gate],
          },
        ],
      }),
    );
    expect(firing).toHaveLength(1);
    expect(firing[0]?.message).toContain("always()");

    const quiet = run(
      alwaysSuccessStep,
      "jobs:",
      doc({
        jobs: [
          {
            name: "Normal",
            kind: "job",
            condition: "succeeded()",
            steps: [gate],
          },
        ],
      }),
    );
    expect(quiet).toEqual([]);
  });

  it("always() without a gate inside is not a false green", () => {
    const findings = run(
      alwaysSuccessStep,
      "jobs:",
      doc({
        jobs: [
          {
            name: "Cleanup",
            kind: "job",
            condition: "always()",
            steps: [{ script: "cleanup" }],
          },
        ],
      }),
    );
    expect(findings).toEqual([]);
  });

  it("root-level steps ride the implicit job (the push arm)", () => {
    const findings = run(
      alwaysSuccessStep,
      "steps:",
      doc({
        steps: [{ task: "Npm@1", inputs: { command: "test" } }],
        // A condition cannot exist on root steps — the push arm still runs.
      }),
    );
    expect(findings).toEqual([]);
  });

  it("the Jenkins arms: catchError(SUCCESS) and unstable() rescue shapes", () => {
    const catchErrorGate =
      "catchError(buildResult: 'SUCCESS') {\n  sh 'npx playwright test'\n}";
    expect(
      run(alwaysSuccessStep, catchErrorGate, undefined, "Jenkinsfile"),
    ).toHaveLength(1);

    // buildResult: 'UNSTABLE' is a visible downgrade — not a false green.
    const unstable =
      "catchError(buildResult: 'UNSTABLE') {\n  sh 'npx playwright test'\n}";
    expect(run(alwaysSuccessStep, unstable, undefined, "Jenkinsfile")).toEqual(
      [],
    );

    // try/catch + unstable() rescue:
    const rescue =
      "try {\n  sh 'npx playwright test'\n} catch (e) {\n  unstable('downgraded')\n}";
    expect(
      run(alwaysSuccessStep, rescue, undefined, "Jenkinsfile"),
    ).toHaveLength(1);

    // try/catch WITHOUT unstable (the silent swallow) is QA-CI-014's shape:
    const swallow =
      "try {\n  sh 'npx playwright test'\n} catch (e) {\n  echo 'ignored'\n}";
    expect(run(alwaysSuccessStep, swallow, undefined, "Jenkinsfile")).toEqual(
      [],
    );
  });
});

describe("qa-ci-009 returnStatus swallowing (Jenkins)", () => {
  it("a gate sh with returnStatus:true fires; a non-gate one never does", () => {
    const firing = run(
      exitCodeNotPropagated,
      "sh(script: 'npx playwright test', returnStatus: true)",
      undefined,
      "Jenkinsfile",
    );
    expect(firing).toHaveLength(1);

    const quiet = run(
      exitCodeNotPropagated,
      "sh(script: 'echo hello', returnStatus: true)",
      undefined,
      "Jenkinsfile",
    );
    expect(quiet).toEqual([]);
  });
});
