/**
 * JSON + SARIF contract stability (Test Hardening Plan, P1).
 *
 * External tooling — CI dashboards, GitHub Code Scanning — depends on the
 * shape of `--json` and `--format sarif` output and will never forgive a
 * silent break. Nothing before this pinned that shape beyond scattered
 * field assertions inside feature tests. This file has two jobs:
 *
 *  1. Structural validation of a FRESH scan's JSON and SARIF output
 *     against the types.ts contract (catches invalid enum values slipping
 *     through at runtime — the kind of thing `tsc` would catch in the
 *     source but never runs against the actual JSON a consumer receives).
 *  2. Backward-compatibility: a hand-verified `schemaVersion: 1` snapshot
 *     (tests/contract/scan-result.v1.json) must still structurally match
 *     the current contract — per types.ts's own doc comment ("additive
 *     changes only within schemaVersion 1"), so this is the test that
 *     would fail the day someone renames or removes a field without
 *     bumping the version.
 */

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { runScan } from "../src/cli.js";
import { renderSarif } from "../src/reporter/sarif.js";
import {
  QA_IMPACT_LABELS,
  SCHEMA_VERSION,
  SEVERITY_ORDER,
  type Finding,
  type ScanResult,
} from "../src/types.js";

const CONFIDENCE_VALUES = ["high", "medium", "low"];
const FINDING_TYPE_VALUES = [
  "deterministic-defect",
  "heuristic-risk",
  "observation",
];
const QA_IMPACT_VALUES = Object.keys(QA_IMPACT_LABELS);
const ANALYSIS_STATUS_VALUES = ["complete", "partial"];

function assertFindingShape(f: Finding, where: string): void {
  expect(typeof f.ruleId, `${where}.ruleId`).toBe("string");
  expect(typeof f.category, `${where}.category`).toBe("string");
  expect(SEVERITY_ORDER as readonly string[], `${where}.severity`).toContain(
    f.severity,
  );
  expect(CONFIDENCE_VALUES, `${where}.confidence`).toContain(f.confidence);
  expect(FINDING_TYPE_VALUES, `${where}.findingType`).toContain(f.findingType);
  expect(
    QA_IMPACT_VALUES,
    `${where}.qaImpact = "${f.qaImpact}" is not one of ${QA_IMPACT_VALUES.join(", ")}`,
  ).toContain(f.qaImpact);
  expect(typeof f.file, `${where}.file`).toBe("string");
  expect(typeof f.line, `${where}.line`).toBe("number");
  expect(typeof f.column, `${where}.column`).toBe("number");
  expect(typeof f.message, `${where}.message`).toBe("string");
  expect(typeof f.why, `${where}.why`).toBe("string");
  expect(typeof f.fix, `${where}.fix`).toBe("string");
  if (f.docsUrl !== undefined) {
    expect(typeof f.docsUrl, `${where}.docsUrl`).toBe("string");
  }
}

function assertScanResultShape(r: ScanResult): void {
  expect(r.schemaVersion).toBe(1);
  expect(typeof r.partial).toBe("boolean");
  expect(r.score === null || typeof r.score === "number").toBe(true);
  expect(Array.isArray(r.frameworks)).toBe(true);
  expect(typeof r.frameworkDetectionUnknown).toBe("boolean");
  expect(Array.isArray(r.dimensions)).toBe(true);
  for (const d of r.dimensions) {
    expect(typeof d.category).toBe("string");
    expect(typeof d.score).toBe("number");
    expect(typeof d.errors).toBe("number");
    expect(typeof d.warnings).toBe("number");
    expect(typeof d.infos).toBe("number");
  }
  expect(Array.isArray(r.findings)).toBe(true);
  r.findings.forEach((f, i) => assertFindingShape(f, `findings[${i}]`));
  expect(ANALYSIS_STATUS_VALUES).toContain(r.analysisStatus.discovery);
  expect(ANALYSIS_STATUS_VALUES).toContain(r.analysisStatus.rules);
  expect(typeof r.analysisStatus.skippedFiles).toBe("number");
  expect(typeof r.analysisStatus.durationMs).toBe("number");
}

describe("JSON report contract", () => {
  it("SCHEMA_VERSION is still pinned to 1", () => {
    // A bump here is a deliberate, versioned breaking change — not
    // something that should ever happen as a side effect of an
    // unrelated refactor.
    expect(SCHEMA_VERSION).toBe(1);
  });

  it("a fresh scan's JSON output matches the types.ts contract", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-contract-"));
    try {
      mkdirSync(join(dir, "e2e"), { recursive: true });
      writeFileSync(
        join(dir, "e2e", "checkout.spec.ts"),
        `import { test, expect } from '@playwright/test';\n` +
          `test.only('checkout', async ({ page }) => {\n` +
          `  await page.waitForTimeout(3000);\n` +
          `  expect(true).toBe(true);\n` +
          `});\n`,
      );
      const result = await runScan({
        target: dir,
        json: true,
        verbose: true,
        maxDurationMs: 30_000,
        scopeChanged: false,
        format: "json",
      });
      assertScanResultShape(result);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("the v1 baseline snapshot still structurally matches the current contract", () => {
    const raw = readFileSync(
      join(import.meta.dirname, "contract", "scan-result.v1.json"),
      "utf8",
    );
    const snapshot = JSON.parse(raw) as ScanResult;
    assertScanResultShape(snapshot);
  });
});

describe("SARIF 2.1.0 report contract", () => {
  async function scanOneFinding(): Promise<ScanResult> {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-sarif-contract-"));
    try {
      mkdirSync(join(dir, "e2e"), { recursive: true });
      writeFileSync(
        join(dir, "e2e", "checkout.spec.ts"),
        `import { test, expect } from '@playwright/test';\n` +
          `test.only('checkout', async ({ page }) => {\n` +
          `  expect(true).toBe(true);\n` +
          `});\n`,
      );
      return await runScan({
        target: dir,
        json: true,
        verbose: true,
        maxDurationMs: 30_000,
        scopeChanged: false,
        format: "sarif",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("output is valid JSON with the required top-level SARIF shape", async () => {
    const result = await scanOneFinding();
    const sarif = JSON.parse(renderSarif(result));

    expect(sarif.version).toBe("2.1.0");
    expect(Array.isArray(sarif.runs)).toBe(true);
    expect(sarif.runs.length).toBeGreaterThan(0);

    const run = sarif.runs[0];
    expect(typeof run.tool.driver.name).toBe("string");
    expect(Array.isArray(run.tool.driver.rules)).toBe(true);
    for (const rule of run.tool.driver.rules) {
      expect(typeof rule.id).toBe("string");
      expect(typeof rule.shortDescription.text).toBe("string");
    }

    expect(Array.isArray(run.results)).toBe(true);
    expect(run.results.length).toBeGreaterThan(0);
    for (const res of run.results) {
      expect(typeof res.ruleId).toBe("string");
      expect(["error", "warning", "note"]).toContain(res.level);
      expect(typeof res.message.text).toBe("string");
      expect(Array.isArray(res.locations)).toBe(true);
      expect(res.locations.length).toBeGreaterThan(0);
      const loc = res.locations[0].physicalLocation;
      expect(typeof loc.artifactLocation.uri).toBe("string");
      expect(typeof loc.region.startLine).toBe("number");
      expect(loc.region.startLine).toBeGreaterThanOrEqual(1);
    }
  });

  it("every SARIF result's ruleId is declared in tool.driver.rules", async () => {
    // GitHub Code Scanning silently drops results whose ruleId has no
    // matching driver.rules entry — this would fail invisibly in CI, not
    // loudly, which is exactly the class of bug worth pinning here.
    const result = await scanOneFinding();
    const sarif = JSON.parse(renderSarif(result));
    const run = sarif.runs[0];
    const declaredIds = new Set(
      run.tool.driver.rules.map((r: { id: string }) => r.id),
    );
    for (const res of run.results) {
      expect(
        declaredIds.has(res.ruleId),
        `undeclared ruleId ${res.ruleId}`,
      ).toBe(true);
    }
  });
});
