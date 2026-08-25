/**
 * QA-CI-010 — tests skipped where they must block (unit tests via the
 * parsed-AST path).
 */

import { describe, expect, it } from "vitest";

import { nonBlockingTestJob } from "../src/rules/ci/qa-ci-010-non-blocking.js";
import { parseWorkflow } from "../src/discovery/workflow-parser.js";

function ctx(text: string) {
  return { path: ".github/workflows/ci.yml", text, ast: parseWorkflow(text) };
}

describe("QA-CI-010 non-blocking test job", () => {
  it("flags job whose if: skips it on pull_request", () => {
    const findings = nonBlockingTestJob.run(
      ctx(`jobs:
  test:
    if: github.event_name != 'pull_request'
    steps:
      - run: npm test
`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.message).toContain("`test`");
  });

  it("flags ref==main guard on a test job", () => {
    const findings = nonBlockingTestJob.run(
      ctx(`jobs:
  e2e:
    if: github.ref == 'refs/heads/main'
    steps:
      - run: npx playwright test
`),
    );
    expect(findings).toHaveLength(1);
  });

  it("stays silent when the job runs unconditionally", () => {
    const findings = nonBlockingTestJob.run(
      ctx(`jobs:
  test:
    steps:
      - run: npm test
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("stays silent when the guarded job runs no tests", () => {
    const findings = nonBlockingTestJob.run(
      ctx(`jobs:
  deploy:
    if: github.ref == 'refs/heads/main'
    steps:
      - run: ./deploy.sh
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("stays silent without an ast doc", () => {
    expect(nonBlockingTestJob.run({ path: "c.yml", text: "jobs: {}" })).toEqual(
      [],
    );
  });
});
