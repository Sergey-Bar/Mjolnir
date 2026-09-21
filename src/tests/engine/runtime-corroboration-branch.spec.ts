import { describe, expect, it } from "vitest";

import { stampRuntimeCorroboration } from "../../src/engine/runtime-corroboration.js";
import type { Finding } from "../../src/types.js";
import type {
  ForensicsReport,
  TestVerdict,
} from "../../src/forensics/types.js";

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-PW-102",
    category: "QA-PW",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FLAKY-RISK",
    evidenceLevel: "E2",
    file: "e2e/shop.spec.ts",
    line: 12,
    column: 3,
    message: "msg",
    why: "why",
    fix: "fix",
    ...overrides,
  };
}

function verdict(overrides: Partial<TestVerdict> = {}): TestVerdict {
  return {
    file: "e2e/shop.spec.ts",
    title: "checkout",
    attempts: 1,
    finalStatus: "passed",
    totalDurationMs: 100,
    passedOnRetry: false,
    everFailed: false,
    skipped: false,
    ...overrides,
  };
}

function report(overrides: Partial<ForensicsReport> = {}): ForensicsReport {
  return {
    forensicsSchemaVersion: 1,
    source: "playwright-json",
    totalTests: 1,
    failed: 0,
    skipped: 0,
    retriedTests: 0,
    flakyTests: 0,
    totalDurationMs: 100,
    verdicts: [],
    analysisComplete: true,
    skippedReports: 0,
    incompleteReasons: [],
    ...overrides,
  };
}

describe("runtime-corroboration branch coverage (line 81 — testsExecuted === 0)", () => {
  it.each([undefined, 40, 10])(
    "does not infer containment from one reported test at %s",
    (line) => {
      const f = finding({ line: 12 });
      const v = verdict();
      if (line !== undefined) v.line = line;
      stampRuntimeCorroboration([f], report({ verdicts: [v] }));
      expect(f.trustLevel).toBe("L3");
      expect(f.runtimeCorroboration?.matchedTest).toBeUndefined();
    },
  );

  it("does not promote a deterministic failure to flake evidence", () => {
    const f = finding({ line: 10 });
    stampRuntimeCorroboration(
      [f],
      report({
        verdicts: [
          verdict({ line: 10, finalStatus: "failed", everFailed: true }),
        ],
      }),
    );
    expect(f.trustLevel).toBe("L4");
    expect(f.runtimeCorroboration?.level).toBe("test");
  });

  it("does not choose between tests on the same declaration line", () => {
    const f = finding({ line: 10 });
    stampRuntimeCorroboration(
      [f],
      report({
        verdicts: [
          verdict({ line: 10 }),
          verdict({ line: 10, title: "other" }),
        ],
      }),
    );
    expect(f.trustLevel).toBe("L3");
  });
  it("skips corroboration entirely when ALL tests in the file were skipped (testsExecuted === 0)", () => {
    const findings = [finding({ file: "e2e/shop.spec.ts", line: 12 })];
    const r = report({
      verdicts: [
        verdict({ file: "e2e/shop.spec.ts", skipped: true }),
        verdict({ file: "e2e/shop.spec.ts", skipped: true, title: "other" }),
      ],
    });
    const count = stampRuntimeCorroboration(findings, r);
    expect(count).toBe(0);
    expect(findings[0]?.runtimeCorroboration).toBeUndefined();
    expect(findings[0]?.trustLevel).toBeUndefined();
  });

  it("file-level corroboration when matched test is skipped but others executed", () => {
    const findings = [finding({ file: "e2e/shop.spec.ts", line: 20 })];
    const r = report({
      verdicts: [
        verdict({ file: "e2e/shop.spec.ts", line: 10, skipped: false }),
        verdict({
          file: "e2e/shop.spec.ts",
          line: 20,
          skipped: true,
          title: "skipped",
        }),
      ],
    });
    const count = stampRuntimeCorroboration(findings, r);
    expect(count).toBe(1);
    expect(findings[0]?.runtimeCorroboration?.level).toBe("file");
  });

  it("test-level corroboration when matched test is not skipped", () => {
    const findings = [finding({ file: "e2e/shop.spec.ts", line: 10 })];
    const r = report({
      verdicts: [
        verdict({ file: "e2e/shop.spec.ts", line: 10, skipped: false }),
      ],
    });
    const count = stampRuntimeCorroboration(findings, r);
    expect(count).toBe(1);
    expect(findings[0]?.runtimeCorroboration?.level).toBe("test");
  });

  it("defect-level corroboration when FLAKY-RISK finding matches a flaky test", () => {
    const findings = [
      finding({ file: "e2e/shop.spec.ts", line: 10, qaImpact: "FLAKY-RISK" }),
    ];
    const r = report({
      verdicts: [
        verdict({
          file: "e2e/shop.spec.ts",
          line: 10,
          passedOnRetry: true,
          skipped: false,
        }),
      ],
    });
    const count = stampRuntimeCorroboration(findings, r);
    expect(count).toBe(1);
    expect(findings[0]?.runtimeCorroboration?.level).toBe("defect");
  });

  it("no corroboration when finding file doesn't match any verdict", () => {
    const findings = [finding({ file: "other.spec.ts", line: 12 })];
    const r = report({ verdicts: [verdict()] });
    const count = stampRuntimeCorroboration(findings, r);
    expect(count).toBe(0);
  });

  it("does not extend the last reported test to the end of the file", () => {
    const findings = [finding({ file: "e2e/shop.spec.ts", line: 50 })];
    const r = report({
      verdicts: [verdict({ file: "e2e/shop.spec.ts", line: 10 })],
    });
    const count = stampRuntimeCorroboration(findings, r);
    expect(count).toBe(1);
    expect(findings[0]?.runtimeCorroboration?.level).toBe("file");
  });

  it("multiple verdicts with undefined lines falls back to file-level", () => {
    const findings = [finding({ file: "e2e/shop.spec.ts", line: 12 })];
    const r = report({
      verdicts: [
        verdict({ file: "e2e/shop.spec.ts" }),
        verdict({ file: "e2e/shop.spec.ts", title: "other" }),
      ],
    });
    const count = stampRuntimeCorroboration(findings, r);
    expect(count).toBe(1);
    expect(findings[0]?.runtimeCorroboration?.level).toBe("file");
  });
});
