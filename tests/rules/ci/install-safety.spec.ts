/**
 * QA-CI-015 — CI install steps lack safety flags (unit tests via
 * the parsed-AST path).
 */

import { describe, expect, it } from "vitest";

import { installSafety } from "../../../src/rules/ci/qa-ci-015-install-safety.js";
import { parseWorkflow } from "../../../src/discovery/workflow-parser.js";

function ctx(text: string) {
  return { path: ".github/workflows/ci.yml", text, ast: parseWorkflow(text) };
}

describe("QA-CI-015 install safety", () => {
  it("flags npm install without safety flags", () => {
    const findings = installSafety.run(
      ctx(`jobs:
  install:
    steps:
      - run: npm install
`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[0]?.message).toContain("npm install");
  });

  it("flags yarn install without safety flags", () => {
    const findings = installSafety.run(
      ctx(`jobs:
  install:
    steps:
      - run: yarn install
`),
    );
    expect(findings).toHaveLength(1);
  });

  it("flags pnpm install without safety flags", () => {
    const findings = installSafety.run(
      ctx(`jobs:
  install:
    steps:
      - run: pnpm install
`),
    );
    expect(findings).toHaveLength(1);
  });

  it("stays silent when npm install has --prefer-offline", () => {
    const findings = installSafety.run(
      ctx(`jobs:
  install:
    steps:
      - run: npm install --prefer-offline
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("stays silent when npm install has --frozen-lockfile", () => {
    const findings = installSafety.run(
      ctx(`jobs:
  install:
    steps:
      - run: npm install --frozen-lockfile
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("stays silent when npm install has --ci", () => {
    const findings = installSafety.run(
      ctx(`jobs:
  install:
    steps:
      - run: npm install --ci
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("stays silent when npm install has --audit=false", () => {
    const findings = installSafety.run(
      ctx(`jobs:
  install:
    steps:
      - run: npm install --audit=false
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("stays silent when the job has no install step", () => {
    const findings = installSafety.run(
      ctx(`jobs:
  test:
    steps:
      - run: npm test
`),
    );
    expect(findings).toHaveLength(0);
  });

  it("stays silent without an ast doc", () => {
    expect(installSafety.run({ path: "c.yml", text: "jobs: {}" })).toEqual([]);
  });

  it("flags multiple install steps across jobs", () => {
    const findings = installSafety.run(
      ctx(`jobs:
  install:
    steps:
      - run: npm install
  test:
    steps:
      - run: yarn install
`),
    );
    expect(findings).toHaveLength(2);
  });
});
