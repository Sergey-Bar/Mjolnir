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
 *
 * Also hosts Milestones (Sprint 9 Task 39, Master-Stabilization-Plan.md):
 * a modest, opt-in-by-nature extension of this same file — a milestone is
 * just a real event this command already witnesses (a flawless scan, a
 * fix recorded by `diff`), announced once and never repeated. Display-only:
 * it does not change scores, exit codes or the JSON schema.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { BaselineDiff } from "./baseline.js";

export const DEFAULT_STATS_PATH = join(".mjolnir", "stats.json");

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
  /**
   * IDs of milestones already announced (Sprint 9 Task 39). A milestone
   * fires exactly once, ever, per repo+machine — recorded here so a
   * second identical scan never re-announces "first clean scan" as if it
   * were new. Absent/undefined on stats files written before this field
   * existed; treated as an empty list, never as "not yet tracked".
   */
  milestonesAnnounced?: string[];
}

/** Milestone IDs (Sprint 9 Task 39). Extending the existing, already
 * evidence-gated `diff`/`stats` machinery rather than inventing a new
 * tracking mechanism — every milestone here corresponds to a real event
 * `runScanCommand`/`runDiffCommand` directly witnessed, never a guess. */
export type MilestoneId = "first-clean-scan" | "first-debt-reduction";

export const MILESTONE_MESSAGES: Record<MilestoneId, string> = {
  "first-clean-scan":
    "MILESTONE: first flawless scan recorded for this repo (score 100, zero findings).",
  "first-debt-reduction":
    "MILESTONE: first debt reduction recorded — mjolnir diff witnessed a real fix.",
};

/**
 * Given the current stats and a set of newly-witnessed milestone IDs,
 * return the ones that have never been announced before (empty if none
 * are new) plus the updated stats file to persist. Pure function — callers
 * decide whether/how to print the returned IDs.
 */
export function recordMilestones(
  existing: StatsFile | null,
  witnessed: readonly MilestoneId[],
  now: string = new Date().toISOString(),
): { newlyAnnounced: MilestoneId[]; stats: StatsFile } {
  const stats = existing ?? emptyStats(now);
  const already = new Set(stats.milestonesAnnounced ?? []);
  const newlyAnnounced = witnessed.filter((id) => !already.has(id));
  if (newlyAnnounced.length === 0) {
    return { newlyAnnounced, stats };
  }
  const merged = [...already, ...newlyAnnounced];
  return {
    newlyAnnounced,
    stats: { ...stats, lastUpdatedAt: now, milestonesAnnounced: merged },
  };
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
