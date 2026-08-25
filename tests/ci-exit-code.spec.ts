/**
 * QA-CI-009 — exit-code propagation unit tests (CI rules run via the
 * parsed-AST path, not the fixture harness).
 */

import { describe, expect, it } from "vitest";

import { exitCodeNotPropagated } from "../src/rules/ci/qa-ci-009-exit-code.js";
import { parseWorkflow } from "../src/discovery/workflow-parser.js";

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
});
