/**
 * Runtime corroboration is all-or-nothing (review #732, P1 11).
 *
 * `stampRuntimeCorroboration` mutates findings IN PLACE. It ran inside a
 * `catch` that only reset `evidenceRecords`, so a throw part-way through left
 * the findings it had already reached stamped with a runtime trust level,
 * while the rest stayed static and nothing recorded that the step failed.
 * The result read as a complete, partly corroborated scan. That is a false
 * proof: an L3+ trust level that no completed corroboration produced.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/engine/runtime-corroboration.js", async (importOriginal) => {
  const real =
    await importOriginal<
      typeof import("../../src/engine/runtime-corroboration.js")
    >();
  return {
    ...real,
    // Reach the first finding, stamp it, then fail: the half-applied state.
    stampRuntimeCorroboration: (findings: Array<Record<string, unknown>>) => {
      const first = findings[0];
      if (first) {
        first["trustLevel"] = "L5";
        first["runtimeCorroboration"] = { level: "defect" };
      }
      throw new Error("corroboration failed part-way");
    },
  };
});

const { runScan } = await import("../../src/engine/scan-pipeline.js");

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-corroboration-atomic-"));
  mkdirSync(join(dir, "e2e"), { recursive: true });
  writeFileSync(
    join(dir, "e2e", "a.spec.ts"),
    [
      "import { test } from '@playwright/test';",
      "test('waits', async ({ page }) => {",
      "  await page.waitForTimeout(1000);",
      "});",
      "",
    ].join("\n"),
  );
  mkdirSync(join(dir, "test-results"), { recursive: true });
  writeFileSync(
    join(dir, "test-results", "report.json"),
    JSON.stringify({
      suites: [
        {
          suites: [],
          specs: [
            {
              title: "waits",
              file: "e2e/a.spec.ts",
              line: 2,
              tests: [
                {
                  projectName: "chromium",
                  results: [{ status: "passed", duration: 5 }],
                },
              ],
            },
          ],
        },
      ],
    }),
  );
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("a failed corroboration leaves no half-stamped findings", () => {
  it("restores every finding and records the loss", async () => {
    const result = await runScan({
      target: dir,
      json: true,
      verbose: false,
      maxDurationMs: 60_000,
      scopeChanged: false,
      format: "json",
    });
    expect(result.findings.length).toBeGreaterThan(0);
    for (const f of result.findings) {
      expect(f.trustLevel, `${f.ruleId} kept a runtime trust level`).not.toBe(
        "L5",
      );
      expect(f.runtimeCorroboration?.level).not.toBe("defect");
    }
    expect(
      result.analysisStatus.reasons.some((r) =>
        r.includes("runtime-corroboration-failed"),
      ),
      `reasons: ${result.analysisStatus.reasons.join(", ")}`,
    ).toBe(true);
  });
});
