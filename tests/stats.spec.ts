/**
 * `mjolnir stats` (Master-Stabilization-Plan Sprint 6, Task 26).
 *
 * Local-only cumulative counters. Must report honest zeros for a repo
 * with no recorded history — never a fabricated all-time total.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildBaseline,
  diffAgainstBaseline,
} from "../src/commands/baseline.js";
import {
  loadStats,
  recordMilestones,
  recordResolved,
  renderStats,
  saveStats,
} from "../src/commands/stats.js";
import type { StatsFile } from "../src/commands/stats.js";
import type { Finding, ScanResult } from "../src/types.js";

let dirs: string[] = [];
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});
function tmpDir(): string {
  const d = mkdtempSync(join(tmpdir(), "mjolnir-stats-"));
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
    why: "why",
    fix: "fix",
    ...overrides,
  };
}
function scanResult(findings: Finding[]): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 90,
    frameworks: [],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1,
    },
  };
}

describe("stats — honest zero state", () => {
  it("loadStats returns null when nothing has ever been recorded", () => {
    expect(loadStats(join(tmpDir(), "stats.json"))).toBeNull();
  });

  it("loadStats returns null for valid JSON that isn't a stats shape", () => {
    const dir = tmpDir();
    const path = join(dir, "wrong-shape.json");
    writeFileSync(path, JSON.stringify({ foo: "bar" }));
    expect(loadStats(path)).toBeNull();
  });

  it("loadStats returns null for malformed JSON rather than throwing", () => {
    const dir = tmpDir();
    const path = join(dir, "bad.json");
    writeFileSync(path, "{ not json");
    expect(loadStats(path)).toBeNull();
  });

  it("renderStats reports no fixes recorded, not a fabricated total, when null", () => {
    const rendered = renderStats(null);
    expect(rendered).toContain("No fixes recorded yet");
    expect(rendered).not.toMatch(/\b\d+ finding/);
  });
});

describe("stats — recording real fixes witnessed via diff", () => {
  it("does not record anything for a diff with no resolved findings (a no-op)", () => {
    const before = scanResult([finding({})]);
    const baseline = buildBaseline(before, "abc");
    const diff = diffAgainstBaseline(before, baseline); // nothing changed
    const stats = recordResolved(null, diff);
    expect(stats.recordedFixEvents).toBe(0);
    expect(stats.resolvedByRule).toEqual({});
  });

  it("increments the per-rule counter and event count for a real witnessed fix", () => {
    const before = scanResult([finding({})]);
    const baseline = buildBaseline(before, "abc");
    const after = scanResult([]); // fixed
    const diff = diffAgainstBaseline(after, baseline);

    const stats = recordResolved(null, diff, "2026-01-01T00:00:00.000Z");
    expect(stats.recordedFixEvents).toBe(1);
    expect(stats.resolvedByRule["QA-PW-101"]).toBe(1);
    expect(stats.trackingSince).toBe("2026-01-01T00:00:00.000Z");
  });

  it("accumulates across multiple recorded events for the same rule", () => {
    const before = scanResult([finding({})]);
    const baseline = buildBaseline(before, "abc");
    const after = scanResult([]);
    const diff = diffAgainstBaseline(after, baseline);

    let stats = recordResolved(null, diff, "2026-01-01T00:00:00.000Z");
    stats = recordResolved(stats, diff, "2026-01-02T00:00:00.000Z");
    expect(stats.resolvedByRule["QA-PW-101"]).toBe(2);
    expect(stats.recordedFixEvents).toBe(2);
    expect(stats.trackingSince).toBe("2026-01-01T00:00:00.000Z"); // preserved, not reset
    expect(stats.lastUpdatedAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("round-trips through disk exactly", () => {
    const dir = tmpDir();
    const before = scanResult([finding({})]);
    const baseline = buildBaseline(before, "abc");
    const after = scanResult([]);
    const diff = diffAgainstBaseline(after, baseline);
    const stats = recordResolved(null, diff, "2026-01-01T00:00:00.000Z");

    const path = join(dir, "stats.json");
    expect(saveStats(stats, path)).toBe(true);
    const loaded = loadStats(path);
    expect(loaded).toEqual(stats);
  });

  it("saveStats degrades to false instead of throwing on an unwritable path (audit R-2)", () => {
    // A path whose "directory" component is a FILE — mkdirSync throws.
    const dir = tmpDir();
    const blocker = join(dir, "not-a-dir");
    writeFileSync(blocker, "x");
    const stats: StatsFile = {
      schemaVersion: 1,
      trackingSince: "2026-01-01T00:00:00.000Z",
      lastUpdatedAt: "2026-01-01T00:00:00.000Z",
      resolvedByRule: {},
      recordedFixEvents: 0,
    };
    expect(saveStats(stats, join(blocker, "stats.json"))).toBe(false);
  });

  it("renderStats shows the accumulated total and an explicit UNKNOWN caveat about pre-tracking history", () => {
    const before = scanResult([finding({})]);
    const baseline = buildBaseline(before, "abc");
    const after = scanResult([]);
    const diff = diffAgainstBaseline(after, baseline);
    const stats = recordResolved(null, diff);

    const rendered = renderStats(stats);
    expect(rendered).toContain("1 finding resolved all-time");
    expect(rendered).toContain("QA-PW-101");
    expect(rendered).toContain("UNKNOWN");
  });
});

describe("recordMilestones — Sprint 9 Task 39 (announced exactly once)", () => {
  it("announces a milestone the first time it is witnessed", () => {
    const { newlyAnnounced, stats } = recordMilestones(
      null,
      ["first-clean-scan"],
      "2026-01-01T00:00:00.000Z",
    );
    expect(newlyAnnounced).toEqual(["first-clean-scan"]);
    expect(stats.milestonesAnnounced).toEqual(["first-clean-scan"]);
    expect(stats.lastUpdatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("never re-announces a milestone already recorded", () => {
    const first = recordMilestones(null, ["first-clean-scan"]);
    const second = recordMilestones(first.stats, ["first-clean-scan"]);
    expect(second.newlyAnnounced).toEqual([]);
    // Stats object is returned unchanged (no spurious lastUpdatedAt bump).
    expect(second.stats).toEqual(first.stats);
  });

  it("tracks multiple distinct milestones independently", () => {
    const first = recordMilestones(null, ["first-clean-scan"]);
    const second = recordMilestones(first.stats, [
      "first-clean-scan",
      "first-debt-reduction",
    ]);
    expect(second.newlyAnnounced).toEqual(["first-debt-reduction"]);
    expect(second.stats.milestonesAnnounced).toEqual([
      "first-clean-scan",
      "first-debt-reduction",
    ]);
  });

  it("treats a stats file predating this field as having zero milestones announced", () => {
    const legacyStats = recordResolved(
      null,
      { hasBaseline: true, newFindings: [], resolvedFindings: [] } as never,
      "2026-01-01T00:00:00.000Z",
    );
    // legacyStats has no milestonesAnnounced key at all.
    expect(legacyStats.milestonesAnnounced).toBeUndefined();
    const { newlyAnnounced } = recordMilestones(legacyStats, [
      "first-clean-scan",
    ]);
    expect(newlyAnnounced).toEqual(["first-clean-scan"]);
  });

  it("round-trips milestonesAnnounced through disk exactly", () => {
    const dir = tmpDir();
    const { stats } = recordMilestones(null, ["first-clean-scan"]);
    const path = join(dir, "stats.json");
    expect(saveStats(stats, path)).toBe(true);
    const loaded = loadStats(path);
    expect(loaded?.milestonesAnnounced).toEqual(["first-clean-scan"]);
  });
});
