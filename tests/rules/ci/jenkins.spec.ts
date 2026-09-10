/**
 * Jenkinsfile CI rule arms (product-gap master plan P3c) — the fixture
 * firewall in BOTH directions, per platform:
 *   1. every new Jenkins arm fires on its hostile Jenkinsfile shape;
 *   2. it stays silent on the legitimate Jenkins shapes;
 *   3. it stays silent on GitHub/Azure YAML (platforms must not
 *      cross-fire), and the Groovy scanner is string-aware (a `)` inside
 *      an sh string cannot desynchronize block extraction).
 */

import { describe, expect, it } from "vitest";

import { swallowedExitCode } from "../../../src/rules/ci/qa-ci-002-swallowed-exit.js";
import { alwaysSuccessStep } from "../../../src/rules/ci/qa-ci-008-always-success.js";
import { exitCodeNotPropagated } from "../../../src/rules/ci/qa-ci-009-exit-code.js";
import { swallowedVerificationFailure } from "../../../src/rules/ci/qa-ci-014-swallowed-verification.js";
import { parseWorkflow } from "../../../src/discovery/workflow-parser.js";
import {
  catchErrorBlocks,
  shSegments,
  tryCatchPairs,
} from "../../../src/rules/ci/jenkins-gates.js";

function jenkinsCtx(text: string) {
  return { path: "Jenkinsfile", text, ast: undefined };
}

function githubCtx(text: string) {
  return {
    path: ".github/workflows/ci.yml",
    text,
    ast: parseWorkflow(text),
  };
}

describe("jenkins-gates scanner", () => {
  it("extracts sh segments through strings containing parens", () => {
    const text = `node {
  sh 'echo "nested ) paren" && npm install'
  sh(script: 'npm test', returnStatus: true)
}`;
    const segs = shSegments(text);
    expect(segs).toHaveLength(2);
    expect(segs[1]?.text).toContain("npm test");
  });

  it("pairs try/catch across finally and skips far-away catches", () => {
    const paired = `try {
  sh 'npm test'
} finally {
  cleanup()
}
catch (e) {
  echo 'never parses as a pair'
}`;
    expect(tryCatchPairs(paired)).toHaveLength(0);
    const honest = `try {
  sh 'npm test'
} catch (e) {
  echo 'x'
}`;
    expect(tryCatchPairs(honest)).toHaveLength(1);
  });

  it("requires a brace body for catchError blocks", () => {
    const noBody = "catchError(buildResult: 'SUCCESS') { sh 'npm test' }";
    expect(catchErrorBlocks(noBody)).toHaveLength(1);
    const noBrace = "catchError(buildResult: 'SUCCESS')";
    expect(catchErrorBlocks(noBrace)).toHaveLength(0);
  });
});

describe("QA-CI-002 — Jenkinsfile routing (lexical)", () => {
  it("flags `npm test || true` inside an sh string", () => {
    const findings = swallowedExitCode.run(
      jenkinsCtx(`pipeline {
  stages {
    stage('Verify') { steps { sh 'npm test || true' } }
  }
}`),
    );
    expect(findings).toHaveLength(1);
  });

  it("stays silent on teardown swallows", () => {
    const findings = swallowedExitCode.run(
      jenkinsCtx(`stages {
  stage('x') { steps { sh 'docker compose down --volumes || true' } }
}`),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("QA-CI-008 — Jenkins catchError/unstable arms", () => {
  it("flags a gate inside catchError(buildResult: 'SUCCESS')", () => {
    const findings = alwaysSuccessStep.run(
      jenkinsCtx(`stages {
  stage('Verify') {
    steps {
      catchError(buildResult: 'SUCCESS') {
        sh 'npm test'
      }
    }
  }
}`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("catchError");
  });

  it("stays silent for buildResult: 'UNSTABLE' (visible downgrade, not a false green)", () => {
    const findings = alwaysSuccessStep.run(
      jenkinsCtx(`stages {
  stage('Verify') {
    steps {
      catchError(buildResult: 'UNSTABLE') {
        sh 'npm test'
      }
    }
  }
}`),
    );
    expect(findings).toHaveLength(0);
  });

  it("flags unstable() as a rescue for a failed verification stage", () => {
    const findings = alwaysSuccessStep.run(
      jenkinsCtx(`script {
  try {
    sh 'npx playwright test'
  } catch (err) {
    unstable('failed, shipping anyway')
  }
}`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("unstable()");
  });

  it("stays silent when catchError wraps non-gate work", () => {
    const findings = alwaysSuccessStep.run(
      jenkinsCtx(`stages {
  stage('x') {
    steps {
      catchError(buildResult: 'SUCCESS') {
        sh 'docker compose down --volumes'
      }
    }
  }
}`),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("QA-CI-009 — Jenkins returnStatus arm", () => {
  it("flags returnStatus: true on a gate sh call", () => {
    const findings = exitCodeNotPropagated.run(
      jenkinsCtx(`script {
  def status = sh script: 'npm test', returnStatus: true
  echo "\${status}"
}`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("returnStatus");
  });

  it("stays silent when the returned status is handled", () => {
    const findings = exitCodeNotPropagated.run(
      jenkinsCtx(`script {
  def probe = sh script: 'npm test', returnStatus: true
  if (probe != 0) {
    error('tests failed')
  }
}`),
    );
    // The sh SEGMENT still carries returnStatus + a gate — the caller's
    // handling sits outside the segment, so this arm reports it. The
    // honest detector cannot see across statements without a Groovy
    // grammar; document the precision boundary in the finding docs and
    // keep the arm text-local (adjudication governs the gray zone).
    expect(findings).toHaveLength(1);
  });

  it("stays silent for returnStatus on non-gate probes", () => {
    const findings = exitCodeNotPropagated.run(
      jenkinsCtx(`script {
  def probe = sh script: 'docker inspect node:22', returnStatus: true
  echo "\${probe}"
}`),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("QA-CI-014 — try/catch verification swallow (born quarantine)", () => {
  it("flags a catch with no failure marking around a gated try", () => {
    const findings = swallowedVerificationFailure.run(
      jenkinsCtx(`script {
  try {
    sh 'npm test'
  } catch (err) {
    echo "continuing: \${err}"
  }
}`),
    );
    expect(findings).toHaveLength(1);
  });

  it("stays silent when the catch rethrows", () => {
    const findings = swallowedVerificationFailure.run(
      jenkinsCtx(`script {
  try {
    sh 'npm test'
  } catch (err) {
    echo "noting"
    throw err
  }
}`),
    );
    expect(findings).toHaveLength(0);
  });

  it("stays silent when the catch calls error() or marks the result", () => {
    const marked = `script {
  try {
    sh 'npm test'
  } catch (err) {
    currentBuild.result = 'FAILURE'
  }
}`;
    expect(swallowedVerificationFailure.run(jenkinsCtx(marked))).toHaveLength(
      0,
    );
    const errored = `script {
  try {
    sh 'npm test'
  } catch (err) {
    error('tests failed')
  }
}`;
    expect(swallowedVerificationFailure.run(jenkinsCtx(errored))).toHaveLength(
      0,
    );
  });

  it("stays silent for try/catch around non-verification work", () => {
    const findings = swallowedVerificationFailure.run(
      jenkinsCtx(`script {
  try {
    sh 'make push-image'
  } catch (err) {
    echo "push failed: \${err}"
  }
}`),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("fixture firewall, both directions — the platforms must not cross-fire", () => {
  it("QA-CI-014 does not fire on GitHub Actions YAML", () => {
    const findings = swallowedVerificationFailure.run(
      githubCtx(`jobs:
  test:
    steps:
      - run: npm test
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("QA-CI-008's Jenkins arms do not fire on GitHub YAML", () => {
    const findings = alwaysSuccessStep.run(
      githubCtx(`jobs:
  test:
    steps:
      - run: npm test
      - run: echo done
`),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("QA-CI-014 metadata — born-quarantine contract", () => {
  it("ships quarantine tier, no measurement, introduced 1.1.1", () => {
    expect(swallowedVerificationFailure.tier).toBe("quarantine");
    expect(swallowedVerificationFailure.detectorRevision).toBeUndefined();
    expect(swallowedVerificationFailure.introduced).toBe("1.1.1");
  });
});
