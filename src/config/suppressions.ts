/**
 * Suppression governance (Sprint-Plan W7, Product-MVP §12).
 * `mjolnir scan --suppressions` — every suppression stays visible.
 */

import {
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

export function loadSuppressions(
  root: string,
  now: Date = new Date(),
): SuppressionReport {
  // Bug-audit M6: resolve the config through loadConfig — the single
  // source for BOTH config names. Suppressions written to `.mjolnir.json`
  // used to be silently unenforced here (only mjolnir.config.json was
  // read), and a corrupted config was swallowed into an empty report so
  // the ledger view printed "Full transparency maintained." while
  // the scan path failed loudly. Parse/validation errors now propagate
  // (ConfigValidationError → usage-error path in the CLI).
  const { config } = loadConfig(root);
  // Audit S4: no mtime anchor — expiry is the entry's explicit `expires`
  // date alone. A config edit no longer resets suppression windows.
  //
  // `now` is a parameter for the same reason
  // `computeSuppressionGovernanceGate` takes one: "is this suppression
  // active" is a VERDICT, and a verdict that cannot be asked "as of when"
  // is a verdict nobody can test. This call used to hard-code
  // `new Date()`, so the same repository read on two days produced two
  // different sets of live suppressions and every boundary test had to
  // wait for a real midnight. The default keeps existing callers correct;
  // `tests/contract/deterministic-clock.spec.ts` fails the build if a
  // verdict path under `src/config/**` hard-codes the clock at a call site.
  const entries = (config.ignore ?? []).map((ign) => ({
    ...ign,
    status: isSuppressionActive(ign, now)
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
    return "\nNo configured suppression entries.\n";
  }
  const lines = [
    "",
    sectionHeader("QUALITY GOVERNANCE", ui),
    "",
    `Configured entries:    ${report.total}`,
    `Active:              ${report.active}`,
    `Expired:             ${report.expired}`,
    "",
  ];
  for (const e of report.entries) {
    // Audit S4: no-expiry entries are active until they carry an
    // explicit `expires` date — say so plainly, with the mtime anchor
    // gone there is no default window to reference.
    const expiry = e.expires
      ? ` (expires ${e.expires})`
      : " (no expiry set — active until an explicit expires date is added)";
    lines.push(
      `${e.status === "active" ? "●" : "○"} ${e.ruleId} — ${e.reason}${expiry}`,
    );
  }
  lines.push("");
  return lines.join("\n");
}
