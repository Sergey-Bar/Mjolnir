/**
 * `qa-doctor stats` — Sprint 6 Task 26 (Master-Stabilization-Plan.md).
 *
 * Local-only cumulative counters ("47 hard sleeps removed all-time"). No
 * telemetry, no network (verified by
 * tests/privacy-network-isolation.spec.ts, which scans this file too).
 *
 * HONESTY CONSTRAINT: this command can only count what it has personally
 * witnessed. It accumulates from this repo's own "qa-doctor diff" runs —
 * every time `diff` finds a finding that existed in the baseline and no
 * longer exists, that is real, evidenced proof of a fix, and this file's
 * per-rule counters increment by exactly that amount. It does NOT try to
 * reconstruct history retroactively from commits that happened before
 * counting started — there's no way to do that without either guessing
 * or re-scanning the entire git history (expensive, and still wouldn't
 * know intent: a finding disappearing could mean "fixed" or "the file
 * was deleted", and conflating those would be exactly the kind of
 * invented-precision this product refuses to do elsewhere). A repo with
 * no recorded history yet reports honest zeros, not fabricated totals.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { BaselineDiff } from "./baseline.js";

export const DEFAULT_STATS_PATH = join(".qa-doctor", "stats.json");

export interface StatsFile {
  schemaVersion: 1;
  /** ISO-8601 timestamp of the first time stats were ever recorded. */
  trackingSince: string;
  /** ISO-8601 timestamp of the most recent update. */
  lastUpdatedAt: string;
  /** Cumulative count of resolved findings per rule, all-time. */
  resolvedByRule: Record<string, number>;
  /** Number of times `qa-doctor diff` has recorded a fix. */
  recordedFixEvents: number;
}

export function loadStats(path: string): StatsFile | null {
  if (!existsSync(path)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "resolvedByRule" in parsed
    ) {
      return parsed as StatsFile;
    }
    return null;
  } catch {
    return null;
  }
}

function emptyStats(now: string): StatsFile {
  return {
    schemaVersion: 1,
    trackingSince: now,
    lastUpdatedAt: now,
    resolvedByRule: {},
    recordedFixEvents: 0,
  };
}

/**
 * Fold a baseline diff's resolved findings into the stats file. Called
 * automatically by `qa-doctor diff` (never by `baseline`, which only
 * establishes a comparison point and has nothing to record yet).
 */
export function recordResolved(
  existing: StatsFile | null,
  diff: BaselineDiff,
  now: string = new Date().toISOString(),
): StatsFile {
  const stats = existing ?? emptyStats(now);
  if (diff.resolvedFindings.length === 0) {
    return stats; // nothing witnessed — do not bump lastUpdatedAt for no-ops
  }
  const resolvedByRule = { ...stats.resolvedByRule };
  for (const f of diff.resolvedFindings) {
    resolvedByRule[f.ruleId] = (resolvedByRule[f.ruleId] ?? 0) + 1;
  }
  return {
    ...stats,
    lastUpdatedAt: now,
    resolvedByRule,
    recordedFixEvents: stats.recordedFixEvents + 1,
  };
}

export function saveStats(stats: StatsFile, outPath: string): string {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(stats, null, 2) + "\n");
  return outPath;
}

export function renderStats(stats: StatsFile | null): string {
  const lines: string[] = [];
  lines.push("▚▞ ALL-TIME STATS (this machine, this repo)");
  lines.push("");

  if (!stats || stats.recordedFixEvents === 0) {
    lines.push("No fixes recorded yet.");
    lines.push(
      'Run "qa-doctor baseline" then "qa-doctor diff" after making fixes —',
    );
    lines.push("every real fix diff observes gets counted here, honestly.");
    lines.push("");
    lines.push(
      "UNKNOWN: totals before tracking started. This command only counts",
    );
    lines.push("what it has personally witnessed via qa-doctor diff.");
    return lines.join("\n");
  }

  const entries = Object.entries(stats.resolvedByRule).sort(
    (a, b) => b[1] - a[1],
  );
  const total = entries.reduce((s, [, n]) => s + n, 0);

  lines.push(`Tracking since ${stats.trackingSince}.`);
  lines.push(`${total} finding${total === 1 ? "" : "s"} resolved all-time:`);
  lines.push("");
  for (const [ruleId, count] of entries) {
    lines.push(`  ${String(count).padStart(4)}  ${ruleId}`);
  }
  lines.push("");
  lines.push(
    "UNKNOWN: any fixes that happened before tracking started, or on a",
  );
  lines.push("different machine — this file is local-only, by design.");
  return lines.join("\n");
}
