/**
 * Suppression governance (Sprint-Plan W7, Product-MVP §12).
 * `mjolnir suppressions` — every suppression stays visible.
 */

import { statSync } from "node:fs";

import {
  SUPPRESSION_DEFAULT_DAYS,
  isSuppressionActive,
  loadConfig,
  type IgnoreEntry,
} from "../config/config.js";
import { sectionHeader, plainContext } from "../reporter/ui.js";

const ui = plainContext();

export interface SuppressionReport {
  total: number;
  active: number;
  expired: number;
  entries: Array<IgnoreEntry & { status: "active" | "expired" }>;
}

export function loadSuppressions(root: string): SuppressionReport {
  // Bug-audit M6: resolve the config through loadConfig — the single
  // source for BOTH config names. Suppressions written to `.mjolnir.json`
  // used to be silently unenforced here (only mjolnir.config.json was
  // read), and a corrupted config was swallowed into an empty report so
  // `mjolnir suppressions` printed "Full transparency maintained." while
  // the scan path failed loudly. Parse/validation errors now propagate
  // (ConfigValidationError → usage-error path in the CLI).
  const { config, path } = loadConfig(root);
  // Bug-audit QA-2026-08-30 QA-6: the 90-day default is anchored at the
  // config file's mtime for hand-written entries without `expires` —
  // otherwise such entries stayed active forever (README §Configuration
  // promises a 90-day window). The `ignore` command writes explicit
  // dates, so documented write-time behavior is unchanged.
  // FW-LINT-01 residual: the path is loadConfig's own resolved config
  // location (from the compile-time CONFIG_NAMES list) — not scan input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const anchor = path ? statSync(path).mtime : undefined;
  const entries = (config.ignore ?? []).map((ign) => ({
    ...ign,
    status: isSuppressionActive(ign, new Date(), anchor)
      ? ("active" as const)
      : ("expired" as const),
  }));
  return {
    total: entries.length,
    active: entries.filter((e) => e.status === "active").length,
    expired: entries.filter((e) => e.status === "expired").length,
    entries,
  };
}

export function renderSuppressions(report: SuppressionReport): string {
  if (report.total === 0) {
    return "\nNo suppressed findings. Full transparency maintained.\n";
  }
  const lines = [
    "",
    sectionHeader("QUALITY GOVERNANCE", ui),
    "",
    `Suppressed findings: ${report.total}`,
    `Active:              ${report.active}`,
    `Expired:             ${report.expired}`,
    "",
  ];
  for (const e of report.entries) {
    // QA-6: no-expiry entries are mtime-anchored at enforcement time —
    // say so, instead of implying an indefinite suppression.
    const expiry = e.expires
      ? ` (expires ${e.expires})`
      : e.status === "active"
        ? ` (no expiry set — ${SUPPRESSION_DEFAULT_DAYS}-day default from config mtime)`
        : ` (no expiry set — ${SUPPRESSION_DEFAULT_DAYS}-day default elapsed)`;
    lines.push(
      `${e.status === "active" ? "●" : "○"} ${e.ruleId} — ${e.reason}${expiry}`,
    );
  }
  lines.push("");
  return lines.join("\n");
}
