/**
 * Trust tracking tests (M12 — issue #489).
 *
 * Validates the historical trust ledger, trend analysis, and
 * trust score computation.
 */

import { describe, expect, it } from "vitest";
import {
  TrustTracker,
  computeTrustScore,
} from "../../src/forensics/trust-tracking.js";

describe("TrustTracker", () => {
  it("starts with an empty ledger", () => {
    const tracker = new TrustTracker();
    expect(tracker.getEntryCount()).toBe(0);
    expect(tracker.getAverageScore()).toBe(0);
  });

  it("adds entries and tracks count", () => {
    const tracker = new TrustTracker();
    tracker.addEntry({ runId: "run-1", trustScore: 80, verdict: "pass" });
    tracker.addEntry({ runId: "run-2", trustScore: 90, verdict: "pass" });
    expect(tracker.getEntryCount()).toBe(2);
  });

  it("computes average score correctly", () => {
    const tracker = new TrustTracker();
    tracker.addEntry({ runId: "run-1", trustScore: 80, verdict: "pass" });
    tracker.addEntry({ runId: "run-2", trustScore: 100, verdict: "pass" });
    expect(tracker.getAverageScore()).toBe(90);
  });

  it("returns undefined trend for first entry", () => {
    const tracker = new TrustTracker();
    tracker.addEntry({ runId: "run-1", trustScore: 80, verdict: "pass" });
    expect(tracker.getTrend("run-1")).toBeUndefined();
  });

  it("detects improving trend", () => {
    const tracker = new TrustTracker();
    tracker.addEntry({ runId: "run-1", trustScore: 70, verdict: "fail" });
    tracker.addEntry({ runId: "run-2", trustScore: 85, verdict: "pass" });
    const trend = tracker.getTrend("run-2");
    expect(trend).toBeDefined();
    expect(trend?.trend).toBe("improving");
    expect(trend?.delta).toBe(15);
  });

  it("detects declining trend", () => {
    const tracker = new TrustTracker();
    tracker.addEntry({ runId: "run-1", trustScore: 90, verdict: "pass" });
    tracker.addEntry({ runId: "run-2", trustScore: 75, verdict: "fail" });
    const trend = tracker.getTrend("run-2");
    expect(trend?.trend).toBe("declining");
    expect(trend?.delta).toBe(-15);
  });

  it("detects stable trend", () => {
    const tracker = new TrustTracker();
    tracker.addEntry({ runId: "run-1", trustScore: 80, verdict: "pass" });
    tracker.addEntry({ runId: "run-2", trustScore: 80, verdict: "pass" });
    const trend = tracker.getTrend("run-2");
    expect(trend?.trend).toBe("stable");
    expect(trend?.delta).toBe(0);
  });

  it("returns undefined trend for unknown runId", () => {
    const tracker = new TrustTracker();
    tracker.addEntry({ runId: "run-1", trustScore: 80, verdict: "pass" });
    expect(tracker.getTrend("unknown")).toBeUndefined();
  });

  it("clears the ledger", () => {
    const tracker = new TrustTracker();
    tracker.addEntry({ runId: "run-1", trustScore: 80, verdict: "pass" });
    tracker.clear();
    expect(tracker.getEntryCount()).toBe(0);
    expect(tracker.getAverageScore()).toBe(0);
  });

  it("caps ledger at MAX_LEDGER_ENTRIES", () => {
    const tracker = new TrustTracker();
    for (let i = 0; i < 1500; i++) {
      tracker.addEntry({
        runId: `run-${i}`,
        trustScore: i % 100,
        verdict: i % 2 === 0 ? "pass" : "fail",
      });
    }
    expect(tracker.getEntryCount()).toBe(1000);
  });

  it("returns readonly entries", () => {
    const tracker = new TrustTracker();
    tracker.addEntry({ runId: "run-1", trustScore: 80, verdict: "pass" });
    const entries = tracker.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.runId).toBe("run-1");
  });
});

describe("computeTrustScore", () => {
  it("returns 100 when there are no findings", () => {
    expect(computeTrustScore(0, 10)).toBe(100);
  });

  it("returns 0 when all rules fail", () => {
    expect(computeTrustScore(10, 10)).toBe(0);
  });

  it("computes partial score correctly", () => {
    expect(computeTrustScore(2, 10)).toBe(80);
  });

  it("returns 100 when totalRules is 0", () => {
    expect(computeTrustScore(5, 0)).toBe(100);
  });

  it("clamps score to 0-100 range", () => {
    expect(computeTrustScore(-1, 10)).toBe(100);
    expect(computeTrustScore(15, 10)).toBe(0);
  });
});
