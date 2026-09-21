/**
 * GitLab Code Quality reporter contract (product-gap-remediation master
 * plan P3a, plan 1788853205786 — flag 2, decision 2).
 *
 * The report is a projection of the SAME ScanResult the JSON contract
 * carries — never a second truth. These locks pin the parts GitLab's
 * machinery actually depends on:
 *
 *  - the exact schema shape GitLab's codequality artifact type parses
 *    (description / check_name / fingerprint / severity / location);
 *  - the severity map (error→major, warning→minor, info→info) — the MR
 *    widget's badge weights ride on it;
 *  - fingerprint STABILITY: GitLab deduplicates MR findings across runs
 *    by fingerprint; an unstable fingerprint resurrects closed findings
 *    on every push. Same finding → same fingerprint, byte-for-byte,
 *    across separately-instantiated results;
 *  - fingerprint SENSITIVITY: a changed line or message changes the
 *    fingerprint (an MR must not hide a moved-and-still-broken line);
 *  - the projection is lossless w.r.t. identity: every finding appears
 *    exactly once, paths are slash-normalized (GitLab MR diffs are
 *    POSIX-shaped), and `begin` is a positive integer.
 */

import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  codeQualityFingerprint,
  renderCodeQuality,
} from "../../src/reporter/codequality.js";
import type { Finding, ScanResult } from "../../src/types.js";

function finding(over: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-PW-004",
    category: "QA-PW",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    file: "e2e/checkout.spec.ts",
    line: 12,
    column: 3,
    message: "`waitForTimeout()` hard sleep.",
    why: "w",
    fix: "f",
    evidenceLevel: "E2",
    ...over,
  };
}

function result(findings: Finding[]): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 75,
    frameworks: ["playwright"],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings,
    testFileCount: 3,
    testDeclarationCount: 7,
    rawDeductions: 3,
    effectiveDeductions: 3,
    suppressionCount: 0,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 0,
    },
  };
}

interface CQIssue {
  description: string;
  check_name: string;
  fingerprint: string;
  severity: string;
  location: { path: string; lines: { begin: number; end?: number } };
}

function issuesOf(findings: Finding[]): CQIssue[] {
  return JSON.parse(renderCodeQuality(result(findings))) as CQIssue[];
}

describe("GitLab Code Quality reporter (P3a)", () => {
  it("emits the exact codequality schema GitLab parses", () => {
    const [issue] = issuesOf([finding()]);
    expect(issue?.description).toBe("`waitForTimeout()` hard sleep.");
    expect(issue?.check_name).toBe("QA-PW-004");
    expect(typeof issue?.fingerprint).toBe("string");
    expect(issue?.severity).toBe("minor");
    expect(issue?.location).toEqual({
      path: "e2e/checkout.spec.ts",
      lines: { begin: 12 },
    });
  });

  it("maps severities: error→major, warning→minor, info→info", () => {
    const issues = issuesOf([
      finding({ severity: "error", line: 1 }),
      finding({ severity: "warning", line: 2 }),
      finding({ severity: "info", line: 3 }),
    ]);
    expect(issues.map((i) => i.severity)).toEqual(["major", "minor", "info"]);
  });

  it("the fingerprint is STABLE for an unchanged finding across runs", () => {
    const a = codeQualityFingerprint(finding());
    // A separately-built identical finding (as a fresh scan produces)
    // must yield the identical fingerprint — GitLab dedups on it.
    const b = codeQualityFingerprint(finding());
    expect(b).toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/); // sha256 hex — GitLab's canonical shape
  });

  it("the fingerprint is SENSITIVE to identity: line or message change ⇒ new fingerprint", () => {
    const base = codeQualityFingerprint(finding());
    expect(codeQualityFingerprint(finding({ line: 13 }))).not.toBe(base);
    expect(codeQualityFingerprint(finding({ column: 9 }))).not.toBe(base);
    expect(codeQualityFingerprint(finding({ message: "changed" }))).not.toBe(
      base,
    );
    expect(codeQualityFingerprint(finding({ ruleId: "QA-PW-005" }))).not.toBe(
      base,
    );
  });

  it("the projection is lossless: every finding appears exactly once, paths slash-normalized", () => {
    const findings = [
      finding({ file: "e2e\\windows\\path.spec.ts", line: 1 }),
      finding({ file: "tests/auth.spec.ts", line: 2 }),
      finding({ file: "tests/auth.spec.ts", line: 3 }),
    ];
    const issues = issuesOf(findings);
    expect(issues).toHaveLength(3);
    expect(issues.every((i) => !i.location.path.includes("\\"))).toBe(true);
    expect(
      issues.every(
        (i) =>
          Number.isInteger(i.location.lines.begin) &&
          i.location.lines.begin > 0,
      ),
    ).toBe(true);
  });

  it("an empty scan emits an empty report — valid codequality JSON, never an error", () => {
    expect(renderCodeQuality(result([]))).toBe("[]\n");
  });

  it(
    "CLI end-to-end: --format codequality emits the report; the file GitLab expects",
    { timeout: 60_000 },
    () => {
      const dir = mkdtempSync(join(tmpdir(), "mjolnir-cq-"));
      try {
        writeFileSync(
          join(dir, "a.spec.ts"),
          "test('x', async () => { await page.waitForTimeout(500); });\n",
        );
        const out = execFileSync(
          process.execPath,
          [
            join(import.meta.dirname, "..", "..", "dist", "cli.mjs"),
            ".",
            "--format",
            "codequality",
            // Advisory gate: the report itself is the artifact under test;
            // findings in the fixture must not fail the invocation.
            "--blocking",
            "none",
          ],
          { cwd: dir, encoding: "utf8" },
        );
        const issues = JSON.parse(out) as CQIssue[];
        expect(Array.isArray(issues)).toBe(true);
        for (const i of issues) {
          expect(i.fingerprint).toMatch(/^[0-9a-f]{64}$/);
          expect(["major", "minor", "info"]).toContain(i.severity);
          expect(i.check_name).toMatch(/^QA-/);
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );

  it("the shipped .gitlab-ci recipe's report filename matches the documented artifact path", () => {
    const doc = readFileSync(
      join(import.meta.dirname, "..", "..", "docs", "GITLAB-CI.md"),
      "utf8",
    );
    expect(doc).toContain("gl-code-quality-report.json");
    expect(doc).toContain("--format codequality");
    // The frozen discipline: a partial scan never blocks.
    expect(doc).toMatch(/partial/i);
  });
});
