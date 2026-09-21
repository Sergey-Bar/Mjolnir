/**
 * Azure DevOps CI rule arms (product-gap master plan P3b) — the fixture
 * firewall in BOTH directions, per platform:
 *   1. every new Azure arm fires on its hostile azure-pipelines.yml shape;
 *   2. it stays silent on the legitimate Azure shapes;
 *   3. it stays silent on GitHub Actions YAML (the platform docs must not
 *      cross-fire), and the GitHub arms stay silent on Azure YAML.
 */

import { describe, expect, it } from "vitest";

import { continueOnError } from "../../../src/rules/ci/qa-ci-001-continue-on-error.js";
import { swallowedExitCode } from "../../../src/rules/ci/qa-ci-002-swallowed-exit.js";
import { retryMasking } from "../../../src/rules/ci/qa-ci-007-retry-masking.js";
import { alwaysSuccessStep } from "../../../src/rules/ci/qa-ci-008-always-success.js";
import { canNeverFailGate } from "../../../src/rules/ci/qa-ci-013-can-never-fail.js";
import { parseWorkflow } from "../../../src/discovery/workflow-parser.js";
import { parseAzurePipeline } from "../../../src/discovery/azure-pipeline-parser.js";

function azureCtx(text: string) {
  return {
    path: "azure-pipelines.yml",
    text,
    ast: parseAzurePipeline(text),
  };
}

function githubCtx(text: string) {
  return {
    path: ".github/workflows/ci.yml",
    text,
    ast: parseWorkflow(text),
  };
}

describe("QA-CI-001 — Azure continueOnError arms", () => {
  it("flags step-level continueOnError: true on a verification gate", () => {
    const findings = continueOnError.run(
      azureCtx(`stages:
  - stage: CI
    jobs:
      - job: Unit
        steps:
          - script: npm test
            continueOnError: true
`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.message).toContain("`Unit`");
  });

  it("flags job-level continueOnError: true when the job runs a gate", () => {
    const findings = continueOnError.run(
      azureCtx(`jobs:
  - job: E2E
    continueOnError: true
    steps:
      - script: npx playwright test
`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("`E2E`");
  });

  it("sees a gate inside task inputs (Npm@1 command: test)", () => {
    const findings = continueOnError.run(
      azureCtx(`steps:
  - task: Npm@1
    continueOnError: true
    inputs:
      command: test
`),
    );
    expect(findings).toHaveLength(1);
  });

  it("respects Azure's case-insensitive keys (ContinueOnError: true)", () => {
    const findings = continueOnError.run(
      azureCtx(`steps:
  - script: npm test
    ContinueOnError: true
`),
    );
    expect(findings).toHaveLength(1);
  });

  it("stays silent for continueOnError on reporting/artifact tasks", () => {
    const findings = continueOnError.run(
      azureCtx(`steps:
  - script: npm test
  - task: PublishTestResults@2
    condition: succeededOrFailed()
    continueOnError: true
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("stays silent on a clean Azure pipeline", () => {
    const findings = continueOnError.run(
      azureCtx(`steps:
  - script: npm test
`),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("QA-CI-002 — Azure routing (lexical)", () => {
  it("flags `npm test || true` inside a bash step", () => {
    const findings = swallowedExitCode.run(
      azureCtx(`steps:
  - bash: npm test || true
`),
    );
    expect(findings).toHaveLength(1);
  });

  it("stays silent on teardown swallows", () => {
    const findings = swallowedExitCode.run(
      azureCtx(`steps:
  - bash: docker compose down --volumes || true
`),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("QA-CI-007 — Azure retryCountOnTaskFailure arm", () => {
  it("flags retryCountOnTaskFailure on a verification step", () => {
    const findings = retryMasking.run(
      azureCtx(`steps:
  - script: npm test
    retryCountOnTaskFailure: 2
`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("retryCountOnTaskFailure");
  });

  it("stays silent for retries on non-gate steps", () => {
    const findings = retryMasking.run(
      azureCtx(`steps:
  - script: docker pull node:22
    retryCountOnTaskFailure: 3
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("stays silent when the retry count is 0", () => {
    const findings = retryMasking.run(
      azureCtx(`steps:
  - script: npm test
    retryCountOnTaskFailure: 0
`),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("QA-CI-008 — Azure run-anyway verification jobs", () => {
  it("flags a gate job conditioned succeededOrFailed()", () => {
    const findings = alwaysSuccessStep.run(
      azureCtx(`jobs:
  - job: Build
    steps:
      - script: npm run build
  - job: Tests
    condition: succeededOrFailed()
    steps:
      - script: npm test
`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("succeededOrFailed()");
  });

  it("flags a gate job conditioned always()", () => {
    const findings = alwaysSuccessStep.run(
      azureCtx(`jobs:
  - job: Tests
    condition: always()
    steps:
      - script: npm test
`),
    );
    expect(findings).toHaveLength(1);
  });

  it("stays silent for an always() REPORTING job (no gates inside)", () => {
    const findings = alwaysSuccessStep.run(
      azureCtx(`jobs:
  - job: Tests
    steps:
      - script: npm test
  - job: Reports
    condition: always()
    steps:
      - task: PublishTestResults@2
`),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("QA-CI-013 — can-never-fail gates (born quarantine)", () => {
  it("flags a gate job under condition: failed() (rescue shape)", () => {
    const findings = canNeverFailGate.run(
      azureCtx(`stages:
  - stage: Verify
    jobs:
      - job: Tests
        condition: failed()
        steps:
          - script: npm test
`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("condition: failed()");
    expect(findings[0]?.message).toContain("`Tests`");
  });

  it("flags a gate step under condition: false", () => {
    const findings = canNeverFailGate.run(
      azureCtx(`steps:
  - script: npm run lint
    condition: false
`),
    );
    expect(findings).toHaveLength(1);
  });

  it("flags a gate step with enabled: false", () => {
    const findings = canNeverFailGate.run(
      azureCtx(`steps:
  - task: Npm@1
    enabled: false
    inputs:
      command: test
`),
    );
    expect(findings).toHaveLength(1);
  });

  it("stays silent when failed() guards a non-gate cleanup step", () => {
    const findings = canNeverFailGate.run(
      azureCtx(`jobs:
  - job: Tests
    steps:
      - script: npm test
  - job: Cleanup
    condition: failed()
    steps:
      - script: docker compose down --volumes
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("stays silent on a clean pipeline", () => {
    const findings = canNeverFailGate.run(
      azureCtx(`steps:
  - script: npm test
  - script: npm run lint
`),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("fixture firewall, both directions — the platforms must not cross-fire", () => {
  it("QA-CI-013 does not fire on GitHub Actions YAML (ast-shape gate)", () => {
    // GitHub's `if: failure()` is a DIFFERENT surface, owned by GitHub-side
    // rules — out of P3b scope; the Azure arm must not see GitHub docs.
    const findings = canNeverFailGate.run(
      githubCtx(`jobs:
  test:
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - run: npm test
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("QA-CI-001 Azure arm does not fire on GitHub YAML", () => {
    const findings = continueOnError.run(
      githubCtx(`jobs:
  test:
    steps:
      - run: npm test
        continue-on-error: true
`),
    );
    // Fires via the GITHUB arm only (hyphenated key) — the Azure arm must
    // not see this doc; assert the finding text is the GitHub wording.
    const [f] = findings;
    expect(f).toBeDefined();
    expect(f?.message).toContain("continue-on-error");
  });

  it("QA-CI-001 GitHub arm does not fire on Azure YAML", () => {
    const findings = continueOnError.run(
      azureCtx(`steps:
  - script: npm test
    continueOnError: true
`),
    );
    const [f] = findings;
    expect(f).toBeDefined();
    expect(f?.message).toContain("continueOnError");
  });

  it("QA-CI-008 Azure arm does not fire on GitHub YAML", () => {
    const findings = alwaysSuccessStep.run(
      githubCtx(`jobs:
  test:
    steps:
      - run: npm test
      - run: echo done
`),
    );
    // GitHub's own 008 arm needs a tolerated earlier gate — none here.
    expect(findings).toHaveLength(0);
  });

  it("rules receive an honest empty doc for extends-pipelines (no fabrication)", () => {
    const doc = parseAzurePipeline(`extends:
  template: pipeline.yml@templates
`);
    expect(doc.platform).toBe("azure-pipelines");
    expect(doc.stages).toBeUndefined();
    expect(doc.jobs).toBeUndefined();
    expect(doc.steps).toBeUndefined();
    expect(
      canNeverFailGate.run({ path: "azure-pipelines.yml", text: "", ast: doc }),
    ).toEqual([]);
  });
});

describe("QA-CI-013 metadata — born-quarantine contract", () => {
  it("ships quarantine tier, no measurement, introduced 1.1.0", () => {
    expect(canNeverFailGate.tier).toBe("quarantine");
    expect(canNeverFailGate.detectorRevision).toBeUndefined();
    expect(canNeverFailGate.introduced).toBe("1.1.0");
  });
});
