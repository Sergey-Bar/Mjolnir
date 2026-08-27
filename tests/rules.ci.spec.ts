/**
 * CI rule unit tests — the fixture harness only covers `test-files` rules,
 * so CI workflow rules get direct corpus tests here, including the parsed
 * AST (`ast` slot) path that the GitHub Actions adapter provides.
 */

import { describe, expect, it } from "vitest";
import { continueOnError } from "../src/rules/ci/qa-ci-001-continue-on-error.js";
import { swallowedExitCode } from "../src/rules/ci/qa-ci-002-swallowed-exit.js";
import { reportNeverGenerated } from "../src/rules/ci/qa-ci-005-report-never-generated.js";
import { retryMasking } from "../src/rules/ci/qa-ci-007-retry-masking.js";
import { alwaysSuccessStep } from "../src/rules/ci/qa-ci-008-always-success.js";
import { parseWorkflow } from "../src/discovery/workflow-parser.js";

function ctx(text: string) {
  return { path: ".github/workflows/ci.yml", text, ast: parseWorkflow(text) };
}

describe("QA-CI-001 continue-on-error", () => {
  it("flags job-level continue-on-error: true", () => {
    const findings = continueOnError.run(
      ctx(`jobs:
  tests:
    continue-on-error: true
    steps:
      - run: npm test
`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.message).toContain("`tests`");
  });

  it("flags step-level continue-on-error on a verification gate as error", () => {
    const findings = continueOnError.run(
      ctx(`jobs:
  tests:
    steps:
      - run: npm test
        continue-on-error: true
`),
    );
    expect(findings).toHaveLength(1);
    // Severity is error, not warning: the self-scan gate filters on
    // severity === "error", so a warning here could never fail CI — which
    // is how continue-on-error stayed live in this repo's own workflows
    // while the tool reported zero errors.
    expect(findings[0]?.severity).toBe("error");
  });

  it("stays silent for continue-on-error on a reporting step", () => {
    const findings = continueOnError.run(
      ctx(`jobs:
  tests:
    steps:
      - run: npm test
      - name: Upload artifact
        continue-on-error: true
        uses: actions/upload-artifact@v4
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("stays silent without continue-on-error", () => {
    const findings = continueOnError.run(
      ctx(`jobs:
  tests:
    steps:
      - run: npm test
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("returns empty when no ast doc is present", () => {
    expect(continueOnError.run({ path: "c.yml", text: "jobs: {}" })).toEqual(
      [],
    );
  });
});

describe("QA-CI-002 swallowed exit code", () => {
  it("flags || true in run blocks", () => {
    const findings = swallowedExitCode.run({
      path: "ci.yml",
      text: "      - run: npm test || true\n",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.line).toBe(1);
  });

  it("reports correct line for later matches", () => {
    const text = [
      "jobs:",
      "  a:",
      "    steps:",
      "      - run: make build || true",
    ].join("\n");
    const findings = swallowedExitCode.run({ path: "ci.yml", text });
    expect(findings[0]?.line).toBe(4);
    expect(findings[0]?.column).toBeGreaterThan(1);
  });

  it("stays silent on clean scripts", () => {
    expect(
      swallowedExitCode.run({ path: "ci.yml", text: "- run: npm test\n" }),
    ).toHaveLength(0);
  });
});

describe("QA-CI-005 report never generated", () => {
  it("flags coverage upload with no coverage producer", () => {
    const findings = reportNeverGenerated.run(
      ctx(`jobs:
  report:
    steps:
      - uses: actions/upload-artifact@v4
        with:
          path: coverage/
`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("coverage artifact");
  });

  it("stays silent when a step produces coverage", () => {
    const findings = reportNeverGenerated.run(
      ctx(`jobs:
  report:
    steps:
      - run: npx vitest run --coverage
      - uses: actions/upload-artifact@v4
        with:
          path: coverage/
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("stays silent when no consumer exists", () => {
    expect(
      reportNeverGenerated.run(
        ctx("jobs:\n  a:\n    steps:\n      - run: ls\n"),
      ),
    ).toHaveLength(0);
  });

  it("returns empty without jobs in doc", () => {
    expect(reportNeverGenerated.run({ path: "c.yml", text: "" })).toEqual([]);
  });
});

describe("QA-CI-007 retry masking", () => {
  it("flags retry actions wrapping test commands", () => {
    const findings = retryMasking.run(
      ctx(`jobs:
  e2e:
    steps:
      - uses: nick-fields/retry@v3
        with:
          command: npx playwright test
`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[0]?.message).toContain("e2e");
  });

  it("ignores retry actions not running tests", () => {
    const findings = retryMasking.run(
      ctx(`jobs:
  net:
    steps:
      - uses: nick-fields/retry@v3
        with:
          command: curl -f http://example.com
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("flags inline shell retry loops around tests", () => {
    const findings = retryMasking.run(
      ctx(`jobs:
  t:
    steps:
      - run: |
          max_attempts=3
          for i in $(seq $max_attempts); do npm test && break; done
`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.confidence).toBe("medium");
  });

  it("returns empty without jobs", () => {
    expect(retryMasking.run({ path: "c.yml", text: "" })).toEqual([]);
  });
});

describe("QA-CI-008 always-success step", () => {
  it("flags exit-0 final step after tolerant earlier step", () => {
    const findings = alwaysSuccessStep.run(
      ctx(`jobs:
  j:
    steps:
      - run: npm test || true
      - name: done
        run: exit 0
`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
  });

  it("flags bare echo final step after tolerant earlier step", () => {
    const findings = alwaysSuccessStep.run(
      ctx(`jobs:
  j:
    steps:
      - run: npm test || true
      - run: echo all good
`),
    );
    expect(findings).toHaveLength(1);
  });

  it("stays silent when no earlier step tolerates failure", () => {
    const findings = alwaysSuccessStep.run(
      ctx(`jobs:
  j:
    steps:
      - run: npm test
      - run: echo decoration
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("skips single-step jobs and non-run finals", () => {
    const findings = alwaysSuccessStep.run(
      ctx(`jobs:
  one:
    steps:
      - run: exit 0
  two:
    steps:
      - run: npm test || true
      - uses: actions/checkout@v4
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("returns empty without jobs", () => {
    expect(alwaysSuccessStep.run({ path: "c.yml", text: "" })).toEqual([]);
  });
});
