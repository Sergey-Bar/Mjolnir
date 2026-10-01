/**
 * `ci release-trend` — how the signed release's trust record has moved across
 * releases.
 *
 * Split out of `commands/milestone.ts` by carve 1.6.1, with the history
 * parser it owns. The engine module behind it, `src/engine/historical-trust.ts`,
 * stays: `ci release-trend` is a live verb, and this file is its only
 * implementation. The plan's delete list was written when `trust-trend` was
 * going away as a top-level verb; the capability moved rather than vanished.
 *
 * Carve 1.6.1.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { EXIT_CLEAN, EXIT_PARTIAL, EXIT_USAGE } from "../exit-codes.js";
import type { Output } from "../cli-io.js";
import { ConfigValidationError } from "../config/config.js";
import { parseJsonFile, isRecord } from "../lib/safe-json.js";
import { writeFileAtomic } from "../lib/fs-atomic.js";
import { compareCodePoints } from "../lib/compare.js";
import { out, err } from "../cli-io.js";
import {
  analyzeTrustTrends,
  computeTrustSnapshot,
  renderTrustTrend,
  type TrustSnapshot,
} from "../engine/historical-trust.js";
import {
  milestoneError,
  parseMilestoneArgs,
  rejectUnexpectedOptions,
  runMilestoneScan,
} from "./milestone.js";
export function isTrustSnapshot(value: unknown): value is TrustSnapshot {
  return (
    isRecord(value) &&
    typeof value.scanId === "string" &&
    typeof value.timestamp === "string" &&
    (typeof value.score === "number" || value.score === null) &&
    typeof value.findings === "number" &&
    typeof value.errors === "number" &&
    typeof value.warnings === "number" &&
    typeof value.infos === "number" &&
    typeof value.advisory === "number" &&
    typeof value.trustLevel === "string" &&
    typeof value.confidence === "number" &&
    typeof value.evidenceCoverage === "number" &&
    typeof value.inconclusiveRate === "number" &&
    typeof value.partial === "boolean" &&
    typeof value.frameworkCount === "number" &&
    typeof value.ruleCount === "number"
  );
}

export function loadTrustHistory(path: string): TrustSnapshot[] {
  if (!existsSync(path)) return [];
  try {
    const text = readFileSync(path, "utf8");
    return parseJsonFile<TrustSnapshot[]>(text, path, (candidate) => {
      return (
        Array.isArray(candidate) &&
        candidate.every((entry) => isTrustSnapshot(entry))
      );
    });
  } catch (error) {
    throw new ConfigValidationError(`invalid trust history: ${path}`, {
      cause: error,
    });
  }
}

export async function runTrustTrendCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseMilestoneArgs(argv, io);
  if (!args) return EXIT_USAGE;
  if (rejectUnexpectedOptions(args, new Set(["history", "recordedAt"]), io)) {
    return EXIT_USAGE;
  }
  try {
    const scan = await runMilestoneScan(args, io, false);
    if ("code" in scan) return scan.code;
    if (!scan.result.runIdentity || !scan.result.trustSummary) {
      if (args.json) {
        io.out(JSON.stringify({ error: "trust_inputs_unavailable" }, null, 2));
      } else {
        io.err("mjolnir: scan did not produce run identity and trust summary");
      }
      return EXIT_PARTIAL;
    }
    const target = resolve(args.target);
    const historyPath = resolve(
      target,
      args.history ?? join(".mjolnir", "trust-history.json"),
    );
    const history = loadTrustHistory(historyPath);
    const snapshot = computeTrustSnapshot(
      scan.result,
      scan.result.runIdentity,
      scan.result.trustSummary,
      args.recordedAt ?? new Date().toISOString(),
    );
    const merged = new Map(
      history.map((entry) => [
        `${entry.scanId}\u0000${entry.timestamp}`,
        entry,
      ]),
    );
    merged.set(`${snapshot.scanId}\u0000${snapshot.timestamp}`, snapshot);
    const snapshots = [...merged.values()].sort(
      (left, right) =>
        compareCodePoints(left.timestamp, right.timestamp) ||
        compareCodePoints(left.scanId, right.scanId),
    );
    writeFileAtomic(historyPath, `${JSON.stringify(snapshots, null, 2)}\n`);
    const trend = analyzeTrustTrends(snapshots);
    if (args.json) io.out(JSON.stringify(trend, null, 2));
    else io.out(renderTrustTrend(trend));
    return scan.result.partial ? EXIT_PARTIAL : EXIT_CLEAN;
  } catch (error) {
    return milestoneError(error, io, argv.includes("--debug"));
  }
}
