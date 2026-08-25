/**
 * CI-integrity rule branch coverage (Test Hardening Plan — coverage-gap
 * closure, negative/edge tests).
 *
 * Each of these rules has multiple independent detection branches
 * (job-level vs step-level continue-on-error; retry-action wrapper vs
 * inline shell retry loop; several "suspicious final step" shapes) —
 * the fixture pairs only ever exercised one branch per rule.
 */

import { describe, expect, it } from "vitest";
import { continueOnError } from "../src/rules/ci/qa-ci-001-continue-on-error.js";
import { retryMasking } from "../src/rules/ci/qa-ci-007-retry-masking.js";
import { alwaysSuccessStep } from "../src/rules/ci/qa-ci-008-always-success.js";
import { reportNeverGenerated } from "../src/rules/ci/qa-ci-005-report-never-generated.js";
import { parseWorkflow } from "../src/discovery/workflow-parser.js";

function ctxFor(yaml: string) {
  return {
    path: ".github/workflows/ci.yml",
    text: yaml,
    ast: parseWorkflow(yaml),
  };
}

describe("QA-CI-001: continue-on-error at both job and step level", () => {
  it("fires for a STEP-level continue-on-error (job-level fixture already covers the job case)", () => {
    const yaml = `
on: push
jobs:
  build:
    steps:
      - run: npm test
        continue-on-error: true
`;
    const findings = continueOnError.run(ctxFor(yaml));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.severity).toBe("warning");
  });
});

describe("QA-CI-007: both retry-masking detection branches", () => {
  it("fires for an inline shell retry loop around tests (the non-action-wrapper branch)", () => {
    const yaml = `
on: push
jobs:
  build:
    steps:
      - run: |
          for i in 1 2 3; do
            npm test && break
            echo retry attempt $i
          done
`;
    const findings = retryMasking.run(ctxFor(yaml));
    expect(
      findings.some((f) => f.confidence === "medium"),
      "expected the shell-retry-loop branch (medium confidence, heuristic-risk) to fire",
    ).toBe(true);
  });

  it("does not fire for a retry action wrapping a non-test command (legitimate use)", () => {
    const yaml = `
on: push
jobs:
  deploy:
    steps:
      - uses: nick-fields/retry@v2
        with:
          command: curl https://example.com/deploy
`;
    const findings = retryMasking.run(ctxFor(yaml));
    expect(findings).toHaveLength(0);
  });
});

describe("QA-CI-008: always-success final step, multiple suspicious shapes", () => {
  it("fires for a bare `true` final step after a tolerant earlier step", () => {
    // "true" (unquoted) is a YAML boolean, not the shell command string —
    // quote it so the workflow parser keeps `run` as a string, same as a
    // real workflow author would need to for this to mean anything.
    const yaml = `
on: push
jobs:
  build:
    steps:
      - run: npm test || true
      - run: "true"
`;
    const findings = alwaysSuccessStep.run(ctxFor(yaml));
    expect(findings.length).toBeGreaterThan(0);
  });

  it("fires for a bare echo final step after a continue-on-error earlier step", () => {
    const yaml = `
on: push
jobs:
  build:
    steps:
      - run: npm test
        continue-on-error: true
      - run: echo "done"
`;
    const findings = alwaysSuccessStep.run(ctxFor(yaml));
    expect(findings.length).toBeGreaterThan(0);
  });

  it("does not fire when there is no earlier failure-tolerant step", () => {
    const yaml = `
on: push
jobs:
  build:
    steps:
      - run: npm test
      - run: echo "done"
`;
    expect(alwaysSuccessStep.run(ctxFor(yaml))).toHaveLength(0);
  });

  it("still reports a finding when the step's name doesn't literally appear in the source text (escaped YAML string)", () => {
    // The step's `name` is used to locate its line via a plain
    // text search; a YAML-escaped string decodes to a value that
    // isn't a literal substring of the source, exercising the
    // "not found" line-fallback path.
    const yaml = `
on: push
jobs:
  build:
    steps:
      - run: npm test || true
      - name: "final \\"step\\""
        run: "true"
`;
    const findings = alwaysSuccessStep.run(ctxFor(yaml));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.line).toBeGreaterThanOrEqual(1);
  });

  it("does not fire on a single-step job (nothing earlier to be tolerant)", () => {
    const yaml = `
on: push
jobs:
  build:
    steps:
      - run: true
`;
    expect(alwaysSuccessStep.run(ctxFor(yaml))).toHaveLength(0);
  });
});

describe("QA-CI-005: report-consumed-but-never-generated", () => {
  it("fires when a step directly `uses: codecov/codecov-action` with no coverage command anywhere", () => {
    const yaml = `
on: push
jobs:
  build:
    steps:
      - run: npm ci
      - uses: codecov/codecov-action@v4
`;
    const findings = reportNeverGenerated.run(ctxFor(yaml));
    expect(findings.length).toBeGreaterThan(0);
    // The finding's line must point at the real "codecov" occurrence in
    // the source text, not the findLine fallback of line 1.
    expect(findings[0]?.line).toBeGreaterThan(1);
  });

  it("fires when a coverage path is consumed via upload-artifact `with.path`, not via `codecov`/`coveralls` text anywhere in the file", () => {
    // No literal "codecov"/"coveralls" string appears in run text at all —
    // consumption is only detectable via the upload-artifact step's
    // `with.path`, which routes through a different code path than the
    // direct-text-match branch, and whose line can't be found by
    // searching for the consumer's own regex (findLine's fallback).
    const yaml = `
on: push
jobs:
  build:
    steps:
      - run: npm test
      - uses: actions/upload-artifact@v4
        with:
          path: coverage/lcov.info
`;
    const findings = reportNeverGenerated.run(ctxFor(yaml));
    expect(
      findings.length,
      "expected a finding: coverage is consumed (uploaded) but nothing " +
        "in this workflow runs tests with --coverage to produce it",
    ).toBeGreaterThan(0);
  });

  it("does not fire when the coverage command that produces the artifact IS present", () => {
    const yaml = `
on: push
jobs:
  build:
    steps:
      - run: npx vitest run --coverage
      - uses: actions/upload-artifact@v4
        with:
          path: coverage/lcov.info
`;
    expect(reportNeverGenerated.run(ctxFor(yaml))).toHaveLength(0);
  });
});
