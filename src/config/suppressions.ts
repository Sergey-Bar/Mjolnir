/**
 * Suppression governance (Sprint-Plan W7, Product-MVP §12).
 * `qa-doctor suppressions` — every suppression stays visible.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isSuppressionActive, type IgnoreEntry } from "../config/config.js";

export interface SuppressionReport {
  total: number;
  active: number;
  expired: number;
  entries: Array<IgnoreEntry & { status: "active" | "expired" }>;
}

export function loadSuppressions(root: string): SuppressionReport {
  const configPath = join(root, "qa-doctor.config.json");
  if (!existsSync(configPath)) {
    return { total: 0, active: 0, expired: 0, entries: [] };
  }
  try {
    const cfg = JSON.parse(readFileSync(configPath, "utf8")) as {
      ignore?: IgnoreEntry[];
    };
    const entries = (cfg.ignore ?? []).map((ign) => ({
      ...ign,
      status: isSuppressionActive(ign)
        ? ("active" as const)
        : ("expired" as const),
    }));
    return {
      total: entries.length,
      active: entries.filter((e) => e.status === "active").length,
      expired: entries.filter((e) => e.status === "expired").length,
      entries,
    };
  } catch {
    return { total: 0, active: 0, expired: 0, entries: [] };
  }
}

export function renderSuppressions(report: SuppressionReport): string {
  if (report.total === 0) {
    return "\nNo suppressed findings. Full transparency maintained.\n";
  }
  const lines = [
    "",
    "QUALITY GOVERNANCE",
    "",
    `Suppressed findings: ${report.total}`,
    `Active:              ${report.active}`,
    `Expired:             ${report.expired}`,
    "",
  ];
  for (const e of report.entries) {
    lines.push(
      `${e.status === "active" ? "●" : "○"} ${e.ruleId} — ${e.reason}${e.expires ? ` (expires ${e.expires})` : ""}`,
    );
  }
  lines.push("");
  return lines.join("\n");
}
