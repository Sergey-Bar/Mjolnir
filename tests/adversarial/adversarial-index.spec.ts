/**
 * Adversarial evidence suite — index (Mega MVP Master Plan v3.1 §26
 * WI-15, §21).
 *
 * The law: hostile, malformed, partial and contradictory evidence must
 * fail SAFELY — never crash the scan, never invent evidence, never
 * upgrade trust. This suite drives every ingestion surface with
 * adversarial inputs and asserts the honest outcomes. The individual
 * hostile cases live next to their parsers (forensics, evidence-core,
 * trust-summary); this index guarantees the law holds across the whole
 * evidence path in one place.
 */

import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runForensics } from "../../src/forensics/run.js";
import {
  buildEvidenceRecords,
  findTestAt,
  countEvidence,
} from "../../src/engine/evidence-core.js";
import { buildTrustSummary } from "../../src/engine/trust-summary.js";
import { workflowRows } from "../../src/forensics/triage.js";
import type {
  ForensicsReport,
  TestVerdict,
} from "../../src/forensics/types.js";
import type { ScanResult } from "../../src/types.js";

const HOSTILE_JSON_BODIES = [
  "null",
  "42",
  '"a string"',
  "[]",
  "{}",
  '{"suites": null}',
  '{"suites": {"not": "an array"}}',
  '{"suites": [{"specs": [{"title": 42, "file": null, "tests": "nope"}]}]}',
  '{"suites": [{"specs": [{"tests": [{"results": [{"status": 999, "duration": -1}]}]}]}]}',
  '{"suites": [{"suites": [{"suites": [{"suites": [{"suites": [{"suites": [{"suites": [{"specs": []}]}]}]}]}]}]}]}', // beyond MAX_DEPTH
];

const HOSTILE_JUNIT_BODIES = [
  "",
  "not xml at all",
  '<?xml version="1.0"?><testsuite name="x" tests="1">',
  '<testsuites><testsuite><testcase name="t"><failure></failure></testcase></testsuite></testsuites>',
];

describe("adversarial: run-report ingestion never crashes and never invents", () => {
  for (const body of HOSTILE_JSON_BODIES) {
    it(`hostile PW JSON: ${body.slice(0, 60)}`, () => {
      const dir = mkdtempSync(join(tmpdir(), "mjolnir-adv-"));
      try {
        writeFileSync(join(dir, "report.json"), body);
        const fr = runForensics(dir, { writeFlakyMd: false });
        // Honest outcome: whatever parses (possibly nothing), the verdicts
        // are well-formed and empty-shaped inputs produce empty evidence.
        expect(Array.isArray(fr.report.verdicts)).toBe(true);
        expect(
          buildEvidenceRecords(fr.report, "x.json").every((r) =>
            Number.isFinite(r.attempts),
          ),
        ).toBe(true);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }

  for (const body of HOSTILE_JUNIT_BODIES) {
    it(`hostile JUnit XML: ${body.slice(0, 40)}`, () => {
      const dir = mkdtempSync(join(tmpdir(), "mjolnir-adv-"));
      try {
        writeFileSync(join(dir, "junit-report.xml"), body);
        const fr = runForensics(dir, { writeFlakyMd: false });
        expect(Array.isArray(fr.report.verdicts)).toBe(true);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }

  it("a hostile report never fails the SCAN (partial honesty, not a crash)", () => {
    // The pipeline degrades to "no runtime evidence" on ingestion
    // errors — locked at the discovery boundary in scan-pipeline
    // (try/catch around runForensics). Here: the ingestion itself must
    // not throw for any of the hostile bodies.
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-adv-"));
    try {
      writeFileSync(join(dir, "report.json"), '{"suites": 7}');
      expect(() => runForensics(dir, { writeFlakyMd: false })).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("adversarial: matching and triage stay deterministic under malformed verdicts", () => {
  const malformed: TestVerdict = {
    file: "e2e/a.spec.ts",
    title: "",
    attempts: -1,
    finalStatus: "interrupted",
    totalDurationMs: -500,
    passedOnRetry: true,
    everFailed: true,
    skipped: true,
    line: -3,
  };
  const rep: ForensicsReport = {
    source: "playwright-json",
    totalTests: -5,
    failed: -1,
    skipped: -1,
    retriedTests: -1,
    flakyTests: -1,
    totalDurationMs: -1,
    verdicts: [
      malformed,
      // exactOptionalPropertyTypes: omit `line` entirely for the
      // line-absent shape rather than assigning undefined.
      Object.fromEntries(
        Object.entries({ ...malformed, title: "b" }).filter(
          ([k]) => k !== "line",
        ),
      ) as unknown as TestVerdict,
    ],
  };

  it("evidence records normalize without NaN/Infinity leaking into decisions", () => {
    const recs = buildEvidenceRecords(rep, "x");
    expect(recs).toHaveLength(2);
    for (const r of recs) {
      expect(Number.isFinite(r.attempts)).toBe(true);
    }
    // Matching still answers deterministically (may be undefined — honest).
    expect(() => findTestAt(recs, "e2e/a.spec.ts", 10)).not.toThrow();
    expect(() => countEvidence(recs)).not.toThrow();
  });

  it("trust summary over a hostile scan is finite and ceiling-bounded", () => {
    const scan = {
      schemaVersion: 1,
      partial: true,
      score: null,
      frameworks: [],
      frameworkDetectionUnknown: true,
      dimensions: [],
      findings: [],
      testDeclarationCount: 0,
      reason: "no-tests-found",
      analysisStatus: {
        discovery: "partial",
        rules: "partial",
        skippedFiles: -7,
        durationMs: -1,
        rulesCrashed: -2,
      },
    } as unknown as ScanResult;
    const s = buildTrustSummary(scan, new Map());
    for (const v of [s.confidence, s.evidenceCoverage, s.inconclusiveRate]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("triage rows over malformed verdicts never throw and always carry a next action", () => {
    const rows = workflowRows(rep);
    for (const r of rows) {
      expect(r.nextAction.length).toBeGreaterThan(10);
    }
  });
});
