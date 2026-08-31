/**
 * `mjolnir baseline` / `mjolnir diff` — Sprint 6 Task 24
 * (Master-Stabilization-Plan.md).
 *
 * Implements Plan.md Phase 10 / §24's key insight: existing debt should
 * not block every PR — only NEW or WORSENED debt should. `baseline`
 * snapshots the current finding set to disk; `diff` compares the current
 * scan against that snapshot and reports only what changed.
 *
 * Findings are matched across scans by a stable fingerprint (ruleId +
 * file + message), not by line number — line numbers shift constantly as
 * a file is edited, so matching on them would report unrelated churn as
 * "new" debt and miss genuinely new findings that happen to land on a
 * previously-flagged line.
 *
 * Storage: .mjolnir/baseline.json (local; not gitignored — only
 * .mjolnir/logs/ is, see .gitignore). A team CAN commit this
 * file if they want a shared baseline; that's a deliberate choice this
 * command does not make for them.
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

import type { Finding, ScanResult } from "../types.js";

export const DEFAULT_BASELINE_PATH = join(".mjolnir", "baseline.json");

export interface BaselineFile {
  schemaVersion: 1;
  /** ISO-8601 timestamp of when the baseline was captured. */
  capturedAt: string;
  /** Best-effort — "unknown" when not a git repo or git is unavailable. */
  commit: string;
  findings: Array<Pick<Finding, "ruleId" | "file" | "message" | "severity">>;
}

function fingerprint(f: Pick<Finding, "ruleId" | "file" | "message">): string {
  return `${f.ruleId}\u0000${f.file}\u0000${f.message}`;
}

export function buildBaseline(
  result: ScanResult,
  commit: string,
): BaselineFile {
  return {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    commit,
    findings: result.findings.map((f) => ({
      ruleId: f.ruleId,
      file: f.file,
      message: f.message,
      severity: f.severity,
    })),
  };
}

export interface SaveBaselineResult {
  path: string;
  /** True when an existing baseline was replaced (D3: notice + backup). */
  replaced: boolean;
  /** Path of the previous baseline's backup, when it was replaced. */
  backupPath?: string;
}

/**
 * Bug-audit L7 / decision D3: overwriting an existing baseline used to
 * happen silently — a stale re-capture on a dirty tree made `diff`
 * report all old debt as new with no way to see what was lost. The
 * previous baseline is now backed up to `<path>.bak` and the caller
 * prints the notice.
 */
export function saveBaseline(
  result: ScanResult,
  commit: string,
  outPath: string,
): SaveBaselineResult {
  mkdirSync(dirname(outPath), { recursive: true });
  const existed = existsSync(outPath);
  let backupPath: string | undefined;
  if (existed) {
    backupPath = `${outPath}.bak`;
    copyFileSync(outPath, backupPath);
  }
  writeFileSync(
    outPath,
    JSON.stringify(buildBaseline(result, commit), null, 2) + "\n",
  );
  return {
    path: outPath,
    replaced: existed,
    ...(backupPath !== undefined ? { backupPath } : {}),
  };
}

export function loadBaseline(path: string): BaselineFile | null {
  if (!existsSync(path)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "findings" in parsed &&
      Array.isArray(parsed.findings)
    ) {
      const file = parsed as BaselineFile;
      // Bug-audit QA-2026-08-30 QA-12 (totality, M3-style): the file is
      // arbitrary local JSON — a hostile or hand-edited baseline must not
      // be able to crash `diff` (a `null` element used to explode in
      // fingerprint()) or leak junk into the report. Invalid entries are
      // dropped; the file loads with whatever is usable.
      file.findings = file.findings.filter(
        (f): f is BaselineFile["findings"][number] =>
          typeof f === "object" &&
          f !== null &&
          typeof f.ruleId === "string" &&
          typeof f.file === "string" &&
          typeof f.message === "string",
      );
      return file;
    }
    return null;
  } catch {
    return null;
  }
}

export interface BaselineDiff {
  hasBaseline: boolean;
  baselineCapturedAt?: string;
  baselineCommit?: string;
  /** Findings in the current scan not present in the baseline. */
  newFindings: Finding[];
  /** Findings in the baseline no longer present — real, evidenced fixes. */
  resolvedFindings: Array<
    Pick<Finding, "ruleId" | "file" | "message" | "severity">
  >;
  /** Findings present in both — pre-existing debt, deliberately not reported as new. */
  unchangedCount: number;
}

export function diffAgainstBaseline(
  result: ScanResult,
  baseline: BaselineFile | null,
): BaselineDiff {
  if (!baseline) {
    return {
      hasBaseline: false,
      newFindings: [],
      resolvedFindings: [],
      unchangedCount: 0,
    };
  }

  const baseSet = new Map<
    string,
    Pick<Finding, "ruleId" | "file" | "message" | "severity">
  >();
  for (const f of baseline.findings) baseSet.set(fingerprint(f), f);

  const headKeys = new Set<string>();
  const newFindings: Finding[] = [];
  let unchangedCount = 0;
  for (const f of result.findings) {
    const key = fingerprint(f);
    headKeys.add(key);
    if (baseSet.has(key)) {
      unchangedCount++;
    } else {
      newFindings.push(f);
    }
  }

  const resolvedFindings: Array<
    Pick<Finding, "ruleId" | "file" | "message" | "severity">
  > = [];
  for (const [key, f] of baseSet) {
    if (!headKeys.has(key)) resolvedFindings.push(f);
  }

  return {
    hasBaseline: true,
    baselineCapturedAt: baseline.capturedAt,
    baselineCommit: baseline.commit,
    newFindings,
    resolvedFindings,
    unchangedCount,
  };
}

export function renderBaselineSaved(
  path: string,
  count: number,
  replaced?: { backupPath?: string },
): string {
  const lines = [
    "▚▞ BASELINE SAVED",
    "",
    `Captured ${count} finding${count === 1 ? "" : "s"} to ${path}.`,
  ];
  // Bug-audit L7: replacing a baseline is a consequential event — say so,
  // and point at the backup of the previous one.
  if (replaced?.backupPath !== undefined) {
    lines.push(
      `Replaced an existing baseline — the previous one was saved to ${replaced.backupPath}.`,
    );
  }
  lines.push(
    'Run "mjolnir diff" after future changes to see only what\'s new.',
  );
  return lines.join("\n");
}

export function renderBaselineDiff(diff: BaselineDiff): string {
  const lines: string[] = [];
  lines.push("▚▞ DIFF AGAINST BASELINE");
  lines.push("");

  if (!diff.hasBaseline) {
    lines.push("UNKNOWN — no baseline found.");
    lines.push('Run "mjolnir baseline" first to capture a comparison point.');
    return lines.join("\n");
  }

  lines.push(
    `Baseline captured ${diff.baselineCapturedAt ?? "unknown time"} at commit ${diff.baselineCommit ?? "unknown"}.`,
  );
  lines.push(
    `${diff.unchangedCount} pre-existing finding${diff.unchangedCount === 1 ? "" : "s"} carried over — not reported as new.`,
  );
  lines.push("");

  if (diff.newFindings.length === 0) {
    lines.push(
      "NEW OR WORSENED DEBT: none. This change introduced nothing new.",
    );
  } else {
    lines.push(
      `NEW OR WORSENED DEBT (${diff.newFindings.length}) — this is what should block this PR:`,
    );
    for (const f of diff.newFindings) {
      lines.push(
        `  + ${f.ruleId} (${f.severity}) · ${f.file}:${f.line} — ${f.message}`,
      );
    }
  }
  lines.push("");

  if (diff.resolvedFindings.length > 0) {
    lines.push(`FIXED SINCE BASELINE (${diff.resolvedFindings.length}):`);
    for (const f of diff.resolvedFindings) {
      lines.push(`  ✓ ${f.ruleId} (${f.severity}) · ${f.file} — ${f.message}`);
    }
  }

  return lines.join("\n");
}
