/**
 * QA-CI-009 — exit-code propagation unit tests (CI rules run via the
 * parsed-AST path, not the fixture harness).
 */

import { describe, expect, it } from "vitest";

import { exitCodeNotPropagated } from "../../../src/rules/ci/qa-ci-009-exit-code.js";
import { parseWorkflow } from "../../../src/discovery/workflow-parser.js";

function ctx(text: string) {
  return { path: ".github/workflows/ci.yml", text, ast: parseWorkflow(text) };
}

describe("QA-CI-009 exit code propagation", () => {
  it("flags test piped into tee without pipefail", () => {
    const findings = exitCodeNotPropagated.run(
      ctx(`jobs:
  test:
    steps:
      - run: npm test | tee out.log
`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.message).toContain("pipefail");
  });

  it("flags `;` sequencing after the test command", () => {
    const findings = exitCodeNotPropagated.run(
      ctx(`jobs:
  test:
    steps:
      - run: npm test; npm run lint
`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("`; `");
  });

  it("rev2: does not flag `;` separators that only appear inside quoted strings (adjudicated FP: yarn berry e2e-vitest-workflow.yml)", () => {
    const findings = exitCodeNotPropagated.run(
      ctx(`jobs:
  chore:
    steps:
      - run: |
          source scripts/e2e-setup-ci.sh
          yarn init -p
          yarn add vitest
          echo "import { it, expect } from 'vitest'; it('should pass', () => { expect(true).toBeTruthy(); });" | tee pass.test.js
          yarn vitest run pass.test.js
          echo "import { it, expect } from 'vitest'; it('should fail', () => { expect(false).toBeTruthy(); });" | tee fail.test.js
          ! yarn vitest run fail.test.js
          yarn add left-pad
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("rev2: still flags a real `;` sequence between unquoted commands", () => {
    const findings = exitCodeNotPropagated.run(
      ctx(`jobs:
  test:
    steps:
      - run: |
          echo "setup message"
          pytest; make lint
`),
    );
    expect(findings).toHaveLength(1);
  });

  it("stays silent with pipefail set", () => {
    const findings = exitCodeNotPropagated.run(
      ctx(`jobs:
  test:
    steps:
      - run: |
          set -o pipefail
          npm test | tee out.log
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("stays silent for plain && chaining", () => {
    const findings = exitCodeNotPropagated.run(
      ctx(`jobs:
  test:
    steps:
      - run: npm test && npm run lint
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("stays silent when no tests are involved", () => {
    const findings = exitCodeNotPropagated.run(
      ctx(`jobs:
  build:
    steps:
      - run: npm run build | tee build.log
      - run: echo done; cleanup.sh
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("does not throw and reports nothing when the workflow has no jobs at all", () => {
    expect(() => exitCodeNotPropagated.run(ctx("on: push\n"))).not.toThrow();
    expect(exitCodeNotPropagated.run(ctx("on: push\n"))).toEqual([]);
  });

  it("does not throw when a job has no steps field", () => {
    const findings = exitCodeNotPropagated.run(
      ctx(`jobs:
  test:
    runs-on: ubuntu-latest
`),
    );
    expect(findings).toEqual([]);
  });

  it("does not flag a `;`-sequence guarded by `||` before the semicolon", () => {
    const findings = exitCodeNotPropagated.run(
      ctx(`jobs:
  test:
    steps:
      - run: npm test || true; npm run lint
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("falls back to line 1 when the matched text can't be located verbatim in ctx.text", () => {
    // findLine's idx===-1 branch: ctx.text here deliberately does not
    // contain the exact "npm test | tee" substring the rule constructs
    // internally (workflow-parser normalizes whitespace/quoting), so the
    // needle search misses and the rule must degrade to line 1, not throw.
    const findings = exitCodeNotPropagated.run({
      path: ".github/workflows/ci.yml",
      text: "totally unrelated text with no run block",
      ast: { jobs: { test: { steps: [{ run: "npm test | tee out.log" }] } } },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(1);
  });

  it("does not flag `setup; test` where the test command runs last", () => {
    for (const run of [
      "npx playwright install --with-deps; npx playwright test",
      "npm ci; npm test",
      "pip install -e .; pytest -q",
    ]) {
      const findings = exitCodeNotPropagated.run(
        ctx(`jobs:\n  e:\n    steps:\n      - run: ${run}\n`),
      );
      expect(findings, run).toHaveLength(0);
    }
  });

  it("still flags `test; something-else` where a non-test command runs last", () => {
    const findings = exitCodeNotPropagated.run(
      ctx(
        `jobs:\n  e:\n    steps:\n      - run: npx playwright test; npm run lint\n`,
      ),
    );
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it("does not treat `playwright install` alone as a test command", () => {
    const findings = exitCodeNotPropagated.run(
      ctx(
        `jobs:\n  e:\n    steps:\n      - run: npx playwright install | tee setup.log\n`,
      ),
    );
    expect(findings).toHaveLength(0);
  });

  it("flags multiple test-piping lines inside a single multi-line run block", () => {
    const findings = exitCodeNotPropagated.run(
      ctx(`jobs:
  test:
    steps:
      - run: |
          npm test | tee out.log
          pytest | tee py.log
`),
    );
    expect(findings.length).toBeGreaterThanOrEqual(2);
  });
});
