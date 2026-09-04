/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Runtime Evidence specs (Verification Trust Evolution Plan §16).
 *
 * Exit gate under test:
 *  - Playwright-suite scans show runtime-corroboration status
 *    (trustLevel + runtimeCorroboration stamped when a report sits next
 *    to the scan target);
 *  - NO static-only finding claims L4/L5 (structural invariant of the
 *    ladder: deriveTrustLevel without a corroboration value caps at L2);
 *  - reporters split verified vs assumed honestly (including the
 *    "not available" honesty line when no report exists).
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  deriveTrustLevel,
  stampRuntimeCorroboration,
  splitByRuntimeEvidence,
} from "../../src/engine/runtime-corroboration.js";
import type {
  ForensicsReport,
  TestVerdict,
} from "../../src/forensics/types.js";
import { parsePlaywrightJson } from "../../src/forensics/parse-playwright-json.js";
import { runScan } from "../../src/cli.js";
import type { Finding, TrustLevel } from "../../src/types.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs.length = 0;
});

function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), "mjolnir-rt-"));
  dirs.push(d);
  return d;
}

function finding(overrides: Partial<Finding>): Finding {
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
    message: "Wait is not terminal",
    why: "why",
    fix: "fix",
    ...overrides,
  };
}

function verdict(overrides: Partial<TestVerdict>): TestVerdict {
  return {
    file: "e2e/shop.spec.ts",
    title: "checkout works",
    attempts: 1,
    finalStatus: "passed",
    totalDurationMs: 100,
    passedOnRetry: false,
    everFailed: false,
    skipped: false,
    ...overrides,
  };
}

describe("deriveTrustLevel — the L0–L5 ladder", () => {
  it("static-only findings cap at L2 (E0→L0, E1→L1, E2→L2)", () => {
    expect(
      deriveTrustLevel({
        evidenceLevel: "E0",
        findingType: "observation",
        confidence: "high",
      }),
    ).toBe<TrustLevel>("L0");
    expect(
      deriveTrustLevel({
        evidenceLevel: "E1",
        findingType: "heuristic-risk",
        confidence: "high",
      }),
    ).toBe<TrustLevel>("L1");
    expect(
      deriveTrustLevel({
        evidenceLevel: "E2",
        findingType: "deterministic-defect",
        confidence: "high",
      }),
    ).toBe<TrustLevel>("L2");
  });

  it("runtime evidence upgrades: file → L3, test → L4, defect → L5", () => {
    const f = {
      evidenceLevel: "E2" as const,
      findingType: "deterministic-defect" as const,
      confidence: "high" as const,
    };
    expect(
      deriveTrustLevel(f, {
        level: "file",
        source: "playwright-json",
        testsExecuted: 3,
      }),
    ).toBe<TrustLevel>("L3");
    expect(
      deriveTrustLevel(f, {
        level: "test",
        source: "playwright-json",
        testsExecuted: 3,
      }),
    ).toBe<TrustLevel>("L4");
    expect(
      deriveTrustLevel(f, {
        level: "defect",
        source: "playwright-json",
        testsExecuted: 3,
      }),
    ).toBe<TrustLevel>("L5");
  });

  it("INVARIANT: no static-only input can ever yield L3/L4/L5 (no overclaim)", () => {
    for (const findingType of [
      "observation",
      "heuristic-risk",
      "deterministic-defect",
    ] as const) {
      for (const confidence of ["low", "medium", "high"] as const) {
        // exactOptionalPropertyTypes: the "no override" case is spelled
        // as an omitted property, never an explicit undefined.
        for (const evidenceLevel of ["E0", "E1", "E2"] as const) {
          const level = deriveTrustLevel(
            evidenceLevel
              ? { evidenceLevel, findingType, confidence }
              : { findingType, confidence },
            undefined,
          );
          expect(["L0", "L1", "L2"]).toContain(level);
        }
      }
    }
  });
});

describe("stampRuntimeCorroboration — matching + L5 defect corroboration", () => {
  const report: ForensicsReport = {
    source: "playwright-json",
    totalTests: 2,
    failed: 1,
    skipped: 0,
    retriedTests: 1,
    flakyTests: 1,
    totalDurationMs: 300,
    verdicts: [
      verdict({
        file: "e2e/shop.spec.ts",
        title: "checkout works",
        attempts: 3,
        finalStatus: "passed",
        passedOnRetry: true,
        everFailed: true,
        line: 10,
      }),
      verdict({ file: "e2e/other.spec.ts", title: "other", line: 1 }),
    ],
  };

  it("file-level: a finding in a file the report knows, no line placement", () => {
    const f = finding({
      file: "e2e/shop.spec.ts",
      line: 400,
      qaImpact: "HYGIENE",
    });
    stampRuntimeCorroboration([f], report);
    expect(f.runtimeCorroboration?.level).toBe("test"); // single-verdict file → unambiguous
    expect(f.trustLevel).toBe("L4");
  });

  it("defect-level (L5): FLAKY-RISK finding whose test flaked in the report", () => {
    const f = finding({
      qaImpact: "FLAKY-RISK",
      file: "e2e/shop.spec.ts",
      line: 12,
    });
    stampRuntimeCorroboration([f], report);
    expect(f.runtimeCorroboration?.level).toBe("defect");
    expect(f.runtimeCorroboration?.matchedTest?.passedOnRetry).toBe(true);
    expect(f.trustLevel).toBe("L5");
  });

  it("no upgrade: FALSE-GREEN finding in a flaky test stays at test level (defect class not corroborated)", () => {
    const f = finding({
      qaImpact: "FALSE-GREEN",
      file: "e2e/shop.spec.ts",
      line: 12,
    });
    stampRuntimeCorroboration([f], report);
    expect(f.runtimeCorroboration?.level).toBe("test");
    expect(f.trustLevel).toBe("L4");
  });

  it("multi-verdict file: line-span matching picks the containing test (no fabrication)", () => {
    const multi: ForensicsReport = {
      source: "playwright-json",
      totalTests: 2,
      failed: 0,
      skipped: 0,
      retriedTests: 0,
      flakyTests: 0,
      totalDurationMs: 0,
      verdicts: [
        verdict({ title: "first", line: 3, finalStatus: "passed" }),
        verdict({
          title: "second",
          line: 20,
          finalStatus: "failed",
          everFailed: true,
        }),
      ],
    };
    // Finding at line 12 sits between decl lines 3 and 20 → "first".
    const inFirst = finding({ qaImpact: "HYGIENE", line: 12 });
    // Finding at line 25 sits after 20 → "second".
    const inSecond = finding({ qaImpact: "HYGIENE", line: 25 });
    stampRuntimeCorroboration([inFirst, inSecond], multi);
    expect(inFirst.runtimeCorroboration?.matchedTest?.title).toBe("first");
    expect(inFirst.trustLevel).toBe("L4");
    expect(inSecond.runtimeCorroboration?.matchedTest?.title).toBe("second");
    expect(inSecond.trustLevel).toBe("L4");
  });

  it("stays silent when the finding's file never ran (no fabricated corroboration)", () => {
    const f = finding({ file: "e2e/never-ran.spec.ts" });
    stampRuntimeCorroboration([f], report);
    expect(f.runtimeCorroboration).toBeUndefined();
    expect(f.trustLevel).toBeUndefined();
  });
});

describe("parsePlaywrightJson — spec location capture (§16)", () => {
  it("records the 1-based spec declaration line", () => {
    const records = parsePlaywrightJson({
      suites: [
        {
          specs: [
            {
              title: "checkout works",
              file: "e2e/shop.spec.ts",
              location: { line: 9, column: 2 },
              tests: [{ results: [{ status: "passed", duration: 5 }] }],
            },
            {
              title: "no location",
              file: "e2e/shop.spec.ts",
              tests: [{ results: [{ status: "failed", duration: 5 }] }],
            },
          ],
        },
      ],
    });
    expect(records).toHaveLength(2);
    expect(records[0]?.line).toBe(10);
    expect(records[1]?.line).toBeUndefined();
  });
});

describe("scan integration — a report next to the target corroborates findings", () => {
  it("stamps trustLevel + runtimeCorroboration; no report → nothing stamped (honest)", async () => {
    const dir = tmp();
    mkdirSync(join(dir, "e2e"), { recursive: true });
    // A flake-risk finding source: a hard sleep in a Playwright spec.
    writeFileSync(
      join(dir, "e2e", "shop.spec.ts"),
      `import { test, expect } from "@playwright/test";\n\ntest("checkout", async ({ page }) => {\n  await page.goto("https://x.test");\n  await page.waitForTimeout(5000);\n  await expect(page.locator("#ok")).toBeVisible();\n});\n`,
    );
    // The real run report: the containing test flaked (passed on retry).
    writeFileSync(
      join(dir, "mjolnir.report.json"),
      JSON.stringify({
        suites: [
          {
            specs: [
              {
                title: "checkout",
                file: "e2e/shop.spec.ts",
                location: { line: 2, column: 0 },
                tests: [
                  {
                    results: [
                      { status: "failed", duration: 10 },
                      { status: "passed", duration: 10 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    );

    const result = await runScan({
      target: dir,
      maxDurationMs: 60_000,
      json: false,
      verbose: false,
      scopeChanged: false,
      format: "terminal",
    });
    const f = result.findings.find((x) => x.ruleId === "QA-PW-101");
    expect(f).toBeDefined();
    // The finding's line (5) falls inside the test declared at line 3,
    // which failed once then passed — TRUE-FLAKE corroboration (L5).
    expect(f!.runtimeCorroboration?.level).toBe("defect");
    expect(f!.runtimeCorroboration?.matchedTest?.passedOnRetry).toBe(true);
    expect(f!.trustLevel).toBe("L5");

    // Verified-vs-assumed split in the same ScanResult.
    const split = splitByRuntimeEvidence(result.findings);
    expect(split.runtimeVerified.length).toBeGreaterThan(0);

    // EXIT-GATE INVARIANT: no finding without runtime corroboration
    // claims L4/L5 — across the whole scan.
    for (const x of result.findings) {
      if (x.runtimeCorroboration === undefined) {
        expect(
          ["L0", "L1", "L2"],
          `${x.ruleId} ${x.file}:${x.line} claims ${x.trustLevel} without runtime evidence`,
        ).toContain(x.trustLevel);
      }
    }
  });

  it("no report next to the target → findings carry no corroboration (honest 'not available')", async () => {
    const dir = tmp();
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "shop.spec.ts"),
      `import { test } from "@playwright/test";\n\ntest("t", async ({ page }) => {\n  await page.waitForTimeout(5000);\n});\n`,
    );
    const result = await runScan({
      target: dir,
      maxDurationMs: 60_000,
      json: false,
      verbose: false,
      scopeChanged: false,
      format: "terminal",
    });
    const f = result.findings.find((x) => x.ruleId === "QA-PW-101");
    expect(f).toBeDefined();
    expect(f!.runtimeCorroboration).toBeUndefined();
    expect(f!.trustLevel).toBeUndefined();
  });
});
