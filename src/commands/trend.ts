/**
 * `mjolnir trend` — Quality Trend & Benchmarking (QM-2).
 *
 * Tracks quality metrics over time from scan results. Stores historical
 * data as JSONL in `.mjolnir/trend.jsonl`. Each line is a snapshot:
 * score, finding counts, and timestamp.
 *
 * Subcommands:
 *   record  — record current scan as a snapshot
 *   show    — display trend (last N snapshots)
 *   diff    — compare last two snapshots
 */

import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

import { sectionHeader, plainContext } from "../reporter/ui.js";
import { runScan } from "../engine/scan-pipeline.js";
import { recordDegradation } from "../engine/degradation-ledger.js";
import { internalErrorMessage, type Output } from "../cli-io.js";
import {
  EXIT_CLEAN,
  EXIT_FINDINGS,
  EXIT_INTERNAL,
  EXIT_USAGE,
} from "../exit-codes.js";

const ui = plainContext();

export interface TrendSnapshot {
  timestamp: string;
  score: number | null;
  totalFindings: number;
  errorFindings: number;
  warningFindings: number;
  frameworks: string[];
  summary: string;
}

export function trendPath(root: string): string {
  return join(root, ".mjolnir", "trend.jsonl");
}

export function recordTrend(root: string, snapshot: TrendSnapshot): boolean {
  try {
    const dir = join(root, ".mjolnir");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    appendFileSync(trendPath(root), JSON.stringify(snapshot) + "\n");
    return true;
  } catch {
    return false;
  }
}

/**
 * The history, and what had to be thrown away to build it.
 *
 * `corruptLines` exists because the old shape could not say "empty": a
 * `.mjolnir/trend.jsonl` whose every line failed to parse returned `[]`, the
 * same value a repository with no history returns, and `trend show` printed
 * "No trend data yet." and exited clean. A file full of data this tool could
 * not read is not an absence of data, and the repo already counts torn lines
 * in two other readers (`src/store/evidence-store.ts`,
 * `src/store/legacy-import.ts`) — this one was the odd reader out.
 */
export interface TrendLoad {
  snapshots: TrendSnapshot[];
  /** Lines present in the file that did not parse. */
  corruptLines: number;
}

export function loadTrendDetail(root: string, limit: number = 20): TrendLoad {
  const path = trendPath(root);
  if (!existsSync(path)) return { snapshots: [], corruptLines: 0 };
  const lines = readFileSync(path, "utf8").trim().split("\n").filter(Boolean);
  let corruptLines = 0;
  const parsed: Array<TrendSnapshot | null> = lines.map((line) => {
    try {
      return JSON.parse(line) as TrendSnapshot;
    } catch {
      // Counted at the line that discarded it, not at the command that
      // reports it: the sink and the site that lost data are the same place,
      // and a reader auditing the map callback should not have to walk up to
      // the CLI to find out that something was dropped.
      recordDegradation("trend-record-unparseable");
      corruptLines++;
      return null;
    }
  });
  return {
    snapshots: parsed
      .filter((s): s is TrendSnapshot => s !== null)
      .slice(-limit),
    corruptLines,
  };
}

export function loadTrend(root: string, limit: number = 20): TrendSnapshot[] {
  return loadTrendDetail(root, limit).snapshots;
}

/**
 * Say what was discarded, on stderr, and report whether the history is
 * readable at all. Returns the snapshots so the caller does not read the
 * file twice.
 */
function readTrendOrDisclose(
  root: string,
  limit: number,
  io: { err: Output },
): { snapshots: TrendSnapshot[]; readable: boolean } {
  const { snapshots, corruptLines } = loadTrendDetail(root, limit);
  if (corruptLines > 0) {
    io.err(
      `mjolnir trend: ${corruptLines} unreadable line(s) in ${trendPath(root)} were discarded; the history below is not the whole file.`,
    );
  }
  return { snapshots, readable: corruptLines === 0 || snapshots.length > 0 };
}

export async function runTrendCommand(
  argv: string[],
  io: { out: Output; err: Output },
): Promise<number> {
  const subcommand = argv[0] ?? "show";
  const target = argv.slice(1).find((a) => !a.startsWith("-")) ?? ".";

  if (subcommand === "record") {
    if (!existsSync(target)) {
      io.err(`mjolnir trend record: target does not exist: ${target}`);
      return EXIT_USAGE;
    }
    try {
      const result = await runScan({
        target,
        json: true,
        verbose: false,
        maxDurationMs: Number.POSITIVE_INFINITY,
        scopeChanged: false,
        format: "json",
        strict: false,
      });

      const snapshot: TrendSnapshot = {
        timestamp: new Date().toISOString(),
        score: result.score,
        totalFindings: result.findings.length,
        errorFindings: result.findings.filter((f) => f.severity === "error")
          .length,
        warningFindings: result.findings.filter((f) => f.severity === "warning")
          .length,
        frameworks: result.frameworks,
        summary: result.findings
          .slice(0, 5)
          .map((f) => `${f.ruleId}: ${f.message}`)
          .join("; "),
      };

      if (recordTrend(target, snapshot)) {
        io.out(`Recorded snapshot at ${snapshot.timestamp}`);
        io.out(
          `Score: ${snapshot.score !== null ? snapshot.score + "/100" : "unknown"}`,
        );
        io.out(
          `Findings: ${snapshot.totalFindings} (${snapshot.errorFindings} error, ${snapshot.warningFindings} warning)`,
        );
      } else {
        io.err("Failed to record trend snapshot");
        return EXIT_INTERNAL;
      }

      return snapshot.errorFindings > 0 ? EXIT_FINDINGS : EXIT_CLEAN;
    } catch (e) {
      internalErrorMessage(e, io.err, false);
      return EXIT_INTERNAL;
    }
  }

  if (subcommand === "show") {
    const limitArg = argv.find((a) => a.startsWith("--limit="));
    const limitStr = limitArg?.split("=")[1] ?? "20";
    const limit = parseInt(limitStr, 10);
    const { snapshots, readable } = readTrendOrDisclose(target, limit, io);

    if (snapshots.length === 0) {
      // The distinction the old shape could not make: no history file at all
      // is the expected first-run state, and a history file this tool could
      // not read is a failure. Both arrived here as `[]`.
      if (!readable) {
        io.err(
          `mjolnir trend show: ${trendPath(target)} exists but no line in it could be parsed. That is unreadable history, not an empty history.`,
        );
        return EXIT_INTERNAL;
      }
      io.out("No trend data yet. Run 'mjolnir trend record' first.");
      return EXIT_CLEAN;
    }

    io.out(sectionHeader("QUALITY TREND", ui));
    io.out("");
    io.out(`Showing last ${snapshots.length} snapshot(s):`);
    io.out("");
    io.out("| Timestamp | Score | Errors | Warnings | Findings |");
    io.out("| --------- | ----- | ------ | -------- | -------- |");
    for (const s of snapshots) {
      io.out(
        `| ${s.timestamp} | ${s.score !== null ? s.score : "?"} | ${s.errorFindings} | ${s.warningFindings} | ${s.totalFindings} |`,
      );
    }

    return EXIT_CLEAN;
  }

  if (subcommand === "diff") {
    const { snapshots, readable } = readTrendOrDisclose(target, 2, io);
    if (snapshots.length < 2) {
      if (!readable) {
        io.err(
          `mjolnir trend diff: ${trendPath(target)} exists but no line in it could be parsed, so there is no history to diff.`,
        );
        return EXIT_INTERNAL;
      }
      io.out(
        "Need at least 2 snapshots for diff. Run 'mjolnir trend record' more than once.",
      );
      return EXIT_CLEAN;
    }

    const prevIndex = snapshots.length - 2;
    const currentIndex = snapshots.length - 1;
    if (prevIndex < 0 || currentIndex < 0) {
      io.out("Need at least 2 snapshots for diff.");
      return EXIT_CLEAN;
    }
    const prev = snapshots[prevIndex];
    const current = snapshots[currentIndex];
    if (!prev || !current) {
      io.out("Insufficient snapshot data.");
      return EXIT_CLEAN;
    }
    const scoreDelta = (current.score ?? 0) - (prev.score ?? 0);
    const findingDelta = current.totalFindings - prev.totalFindings;
    const errorDelta = current.errorFindings - prev.errorFindings;

    io.out(sectionHeader("QUALITY TREND DIFF", ui));
    io.out("");
    io.out(
      `Score: ${prev.score ?? "?"} → ${current.score ?? "?"} (${scoreDelta >= 0 ? "+" : ""}${scoreDelta})`,
    );
    io.out(
      `Findings: ${prev.totalFindings} → ${current.totalFindings} (${findingDelta >= 0 ? "+" : ""}${findingDelta})`,
    );
    io.out(
      `Errors: ${prev.errorFindings} → ${current.errorFindings} (${errorDelta >= 0 ? "+" : ""}${errorDelta})`,
    );

    return EXIT_CLEAN;
  }

  io.err(`Unknown trend subcommand: ${subcommand}`);
  return EXIT_USAGE;
}
