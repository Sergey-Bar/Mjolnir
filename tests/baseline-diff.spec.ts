/**
 * `mjolnir baseline` / `mjolnir diff` (Master-Stabilization-Plan
 * Sprint 6, Task 24) — Plan.md Phase 10 / §24: existing debt should not
 * block every PR, only NEW or WORSENED debt should.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildBaseline,
  diffAgainstBaseline,
  loadBaseline,
  renderBaselineDiff,
  saveBaseline,
} from "../src/commands/baseline.js";
import type { Finding, ScanResult } from "../src/types.js";

let dirs: string[] = [];
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

function tmpDir(): string {
  const d = mkdtempSync(join(tmpdir(), "mjolnir-baseline-"));
  dirs.push(d);
  return d;
}

function finding(overrides: Partial<Finding>): Finding {
  return {
    ruleId: "QA-PW-101",
    category: "QA-PW",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FLAKY-RISK",
    evidenceLevel: "E2",
    file: "e2e/a.spec.ts",
    line: 4,
    column: 3,
    message: "Hard sleep detected",
    why: "Hard sleeps mask real timing issues.",
    fix: "Use a locator-based wait instead.",
    ...overrides,
  };
}

function scanResult(findings: Finding[]): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 90,
    frameworks: ["playwright"],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 10,
    },
  };
}

describe("baseline round-trip", () => {
  it("saves and reloads the exact same finding set", () => {
    const dir = tmpDir();
    const result = scanResult([
      finding({}),
      finding({ ruleId: "QA-TEST-001", file: "e2e/b.spec.ts" }),
    ]);
    const saved = saveBaseline(result, "abc1234", join(dir, "baseline.json"));
    const loaded = loadBaseline(saved.path);

    expect(loaded).not.toBeNull();
    expect(loaded?.commit).toBe("abc1234");
    expect(loaded?.findings).toHaveLength(2);
    expect(loaded?.findings.map((f) => f.ruleId).sort()).toEqual([
      "QA-PW-101",
      "QA-TEST-001",
    ]);
  });

  it("replacing an existing baseline backs it up and says so (bug-audit L7, decision D3)", () => {
    const dir = tmpDir();
    const outPath = join(dir, "baseline.json");
    saveBaseline(scanResult([finding({})]), "abc1234", outPath);

    const second = saveBaseline(
      scanResult([finding({ ruleId: "QA-TEST-003", file: "b.ts" })]),
      "def5678",
      outPath,
    );
    expect(second.replaced).toBe(true);
    expect(second.backupPath).toBe(`${outPath}.bak`);
    const backup = loadBaseline(second.backupPath ?? "");
    expect(backup?.commit).toBe("abc1234");
    // The new baseline is live at the original path.
    expect(loadBaseline(outPath)?.commit).toBe("def5678");

    // A first save (no existing file) is not a replacement.
    const freshDir = tmpDir();
    const first = saveBaseline(
      scanResult([]),
      "aaa0000",
      join(freshDir, "baseline.json"),
    );
    expect(first.replaced).toBe(false);
    expect(first.backupPath).toBeUndefined();
  });

  it("loadBaseline returns null for a missing file, honestly, not a crash", () => {
    const loaded = loadBaseline(join(tmpDir(), "does-not-exist.json"));
    expect(loaded).toBeNull();
  });

  it("loadBaseline returns null for a malformed file rather than throwing", () => {
    const dir = tmpDir();
    const path = join(dir, "bad.json");
    writeFileSync(path, "{ not json");
    expect(loadBaseline(path)).toBeNull();
  });

  it("loadBaseline returns null for valid JSON that isn't a baseline shape (e.g. a bare array)", () => {
    const dir = tmpDir();
    const path = join(dir, "wrong-shape.json");
    writeFileSync(path, JSON.stringify([1, 2, 3]));
    expect(loadBaseline(path)).toBeNull();
  });
});

describe("diffAgainstBaseline — regression detection", () => {
  it("reports hasBaseline:false when there is nothing to compare against", () => {
    const diff = diffAgainstBaseline(scanResult([finding({})]), null);
    expect(diff.hasBaseline).toBe(false);
    expect(diff.newFindings).toEqual([]);
    expect(diff.resolvedFindings).toEqual([]);
  });

  it("reports zero new findings when nothing changed", () => {
    const result = scanResult([finding({})]);
    const baseline = buildBaseline(result, "abc123");
    const diff = diffAgainstBaseline(result, baseline);

    expect(diff.hasBaseline).toBe(true);
    expect(diff.newFindings).toEqual([]);
    expect(diff.resolvedFindings).toEqual([]);
    expect(diff.unchangedCount).toBe(1);
  });

  it("flags a genuinely new finding while treating the pre-existing one as carried-over debt", () => {
    const before = scanResult([finding({})]);
    const baseline = buildBaseline(before, "abc123");
    const after = scanResult([
      finding({}), // unchanged pre-existing debt
      finding({
        ruleId: "QA-TEST-001",
        file: "e2e/new.spec.ts",
        message: "Focused test",
      }),
    ]);

    const diff = diffAgainstBaseline(after, baseline);
    expect(diff.newFindings).toHaveLength(1);
    expect(diff.newFindings[0]?.ruleId).toBe("QA-TEST-001");
    expect(diff.unchangedCount).toBe(1);
    expect(diff.resolvedFindings).toEqual([]);
  });

  it("recognizes a real fix as resolved, matched by rule+file+message rather than line number", () => {
    const before = scanResult([finding({ line: 4 })]);
    const baseline = buildBaseline(before, "abc123");
    const after = scanResult([]); // the hard sleep is gone

    const diff = diffAgainstBaseline(after, baseline);
    expect(diff.resolvedFindings).toHaveLength(1);
    expect(diff.resolvedFindings[0]?.ruleId).toBe("QA-PW-101");
    expect(diff.newFindings).toEqual([]);
  });

  it("does not treat a finding that merely moved to a different line as new or resolved", () => {
    const before = scanResult([finding({ line: 4 })]);
    const baseline = buildBaseline(before, "abc123");
    const after = scanResult([finding({ line: 9 })]); // same rule/file/message, shifted by edits above it

    const diff = diffAgainstBaseline(after, baseline);
    expect(diff.newFindings).toEqual([]);
    expect(diff.resolvedFindings).toEqual([]);
    expect(diff.unchangedCount).toBe(1);
  });

  it("produces deterministic, byte-identical rendered output for the same diff", () => {
    const before = scanResult([finding({})]);
    const baseline = buildBaseline(before, "abc123");
    const after = scanResult([
      finding({}),
      finding({
        ruleId: "QA-TEST-001",
        file: "e2e/new.spec.ts",
        message: "Focused test",
      }),
    ]);
    const diff = diffAgainstBaseline(after, baseline);
    expect(renderBaselineDiff(diff)).toBe(renderBaselineDiff(diff));
  });

  it("renderBaselineDiff reports UNKNOWN, not a fabricated zero, when there is no baseline", () => {
    const diff = diffAgainstBaseline(scanResult([finding({})]), null);
    const rendered = renderBaselineDiff(diff);
    expect(rendered).toContain("UNKNOWN");
    expect(rendered).not.toMatch(/\b0 new/i);
  });

  it("renderBaselineDiff lists FIXED SINCE BASELINE entries when the diff has resolved findings", () => {
    const before = scanResult([finding({})]);
    const baseline = buildBaseline(before, "abc123");
    const after = scanResult([]); // fixed
    const diff = diffAgainstBaseline(after, baseline);

    const rendered = renderBaselineDiff(diff);
    expect(rendered).toContain("FIXED SINCE BASELINE (1)");
    expect(rendered).toContain("QA-PW-101");
  });
});
