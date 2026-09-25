/**
 * Roadmap gate.
 *
 * The validator is structural; this entry point is what makes it honest. It
 * reads every ledger the roadmap claims to track and hands the validator the
 * facts, so "reconciled" means the referenced ledger says so — not that a path
 * string is present. A roadmap that names a blocked matrix and reports zero
 * blockers is a rubber stamp, and this is the file that removes it.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { validateRoadmap, type RoadmapLedgerFacts } from "./validate.js";

const root = process.argv[2] ?? process.cwd();

/**
 * Files git actually tracks. A reference that resolves only on the machine
 * that wrote it is not an authority: a plan under an ignored directory cannot
 * be the source of truth for a program other people run.
 */
function trackedFiles(): Set<string> {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) return new Set();
  return new Set(
    (result.stdout ?? "")
      .split("\0")
      .filter(Boolean)
      .map((path) => path.replace(/\\/g, "/")),
  );
}

const tracked = trackedFiles();
const readText = (path: string): string | null => {
  try {
    return readFileSync(join(root, path), "utf8");
  } catch {
    return null;
  }
};
const readJson = <T>(path: string): T | null => {
  const text = readText(path);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const roadmapText = readText("docs/ROADMAP.yaml") ?? "";
const roadmap = roadmapText === "" ? null : (parse(roadmapText) as unknown);

// Authority: what a consumer must be able to read to trust the program.
const authority = [
  isRecord(roadmap) ? roadmap.source : undefined,
  isRecord(roadmap) ? roadmap.issueLedger : undefined,
  isRecord(roadmap) ? roadmap.gapLedger : undefined,
  isRecord(roadmap) ? roadmap.supportMatrix : undefined,
  isRecord(roadmap) ? roadmap.externalValidation : undefined,
].filter(
  (value): value is string => typeof value === "string" && value.length > 0,
);

// Provenance: where a past decision came from. Recorded and reported, but a
// design note that lived on one machine is history, not an authority.
const provenance = [
  isRecord(roadmap) && isRecord(roadmap.dependencyResolution)
    ? roadmap.dependencyResolution.source
    : undefined,
].filter(
  (value): value is string => typeof value === "string" && value.length > 0,
);

const missingSources = authority.filter(
  (path) => !existsSync(join(root, path)),
);
// Present on this machine, absent from the repository: resolvable here, not
// resolvable for anyone who clones it.
const untrackedSources = authority.filter(
  (path) => existsSync(join(root, path)) && !tracked.has(path),
);
const untrackedProvenance = provenance.filter((path) => !tracked.has(path));

const gapText = readText("docs/M26-GAP-LEDGER.jsonl") ?? "";
const openReleaseBlockers = gapText
  .split(/\r?\n/)
  .filter(Boolean)
  .flatMap((line) => {
    try {
      return [JSON.parse(line) as unknown];
    } catch {
      return [];
    }
  })
  .filter(
    (record) =>
      isRecord(record) &&
      record.status === "open" &&
      record.severity === "release-blocker",
  )
  .map((record) => String((record as { gap_id: unknown }).gap_id))
  .sort();

const support = readJson<{ cells?: unknown }>("docs/M26-SUPPORT-MATRIX.json");
const cells = Array.isArray(support?.cells) ? support.cells : [];
const blockedCells = cells
  .filter((cell) => isRecord(cell) && cell.disposition === "BLOCKED")
  .map((cell) => String((cell as { cell_id: unknown }).cell_id))
  .sort();
const unboundCells = cells
  .filter(
    (cell) =>
      isRecord(cell) &&
      cell.disposition !== "NOT_APPLICABLE" &&
      (cell.last_candidate === null ||
        cell.last_candidate === undefined ||
        cell.last_candidate === "NONE"),
  )
  .map((cell) => String((cell as { cell_id: unknown }).cell_id))
  .sort();

const external = readJson<{ status?: unknown }>(
  "docs/M26-EXTERNAL-VALIDATION.json",
);
const snapshot = readJson<{ items?: unknown }>("docs/M26-GITHUB-SNAPSHOT.json");
const snapshotItems = Array.isArray(snapshot?.items) ? snapshot.items : [];
const githubSnapshotUnreconciled = snapshotItems.filter(
  (item) =>
    isRecord(item) &&
    (item.state === "UNRECONCILED" || item.reconciled === false),
).length;

const facts: RoadmapLedgerFacts = {
  missingSources,
  untrackedSources,
  untrackedProvenance,
  openReleaseBlockers,
  blockedCells,
  unboundCells,
  externalValidationStatus: isRecord(external)
    ? String(external.status)
    : undefined,
  githubSnapshotUnreconciled,
};

const result = validateRoadmap(roadmap, facts);
console.log(
  JSON.stringify(
    {
      status:
        result.errors.length > 0
          ? "FAIL"
          : result.blockers.length > 0
            ? "BLOCKED"
            : "PASS",
      ledgerFacts: {
        missingSources,
        untrackedSources,
        untrackedProvenance,
        openReleaseBlockers: openReleaseBlockers.length,
        blockedCells: blockedCells.length,
        unboundCells: unboundCells.length,
        externalValidationStatus: facts.externalValidationStatus,
        githubSnapshotUnreconciled,
      },
      ...result,
    },
    null,
    2,
  ),
);
if (result.errors.length > 0 || result.blockers.length > 0) process.exit(1);
