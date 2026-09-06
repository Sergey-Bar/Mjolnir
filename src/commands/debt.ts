/**
 * `mjolnir debt` — Test Debt Register (Tier 5 #27).
 *
 * Aggregates scan findings into a debt table with estimated cost, so QA
 * can present testing debt to management as a line item with numbers.
 * Pure function over ScanResult — no I/O.
 */

import type { ScanResult } from "../types.js";
import { panel, sectionHeader, plainContext } from "../reporter/ui.js";

const ui = plainContext();

export interface DebtClass {
  /** Human label of the debt class. */
  label: string;
  count: number;
  /** Estimated engineer-hours per quarter this class costs. */
  estHoursPerQuarter: number;
  ruleIds: string[];
}

/** Cost model (documented, conservative): hours/quarter per occurrence. */
const COST_MODEL: Record<
  string,
  { label: string; hoursPerOccurrence: number }
> = {
  "QA-TEST-004": { label: "Hard sleeps", hoursPerOccurrence: 0.4 },
  "QA-PY-005": { label: "Hard sleeps", hoursPerOccurrence: 0.4 },
  "QA-PW-118": { label: "Network-idle waits", hoursPerOccurrence: 0.3 },
  "QA-TEST-002": { label: "Skipped tests", hoursPerOccurrence: 0.2 },
  "QA-PY-002": { label: "Skipped tests", hoursPerOccurrence: 0.2 },
  "QA-TEST-003": { label: "No-assertion tests", hoursPerOccurrence: 0.25 },
  "QA-PY-003": { label: "No-assertion tests", hoursPerOccurrence: 0.25 },
  "QA-TEST-010": { label: "Empty test bodies", hoursPerOccurrence: 0.15 },
  "QA-PY-006": { label: "Empty test bodies", hoursPerOccurrence: 0.15 },
  "QA-TQUAL-001": { label: "Mock-only verification", hoursPerOccurrence: 0.3 },
  "QA-PW-004": { label: "Brittle selectors", hoursPerOccurrence: 0.35 },
  "QA-ENV-001": { label: "Environment coupling", hoursPerOccurrence: 0.5 },
};

export function computeDebt(result: ScanResult): {
  classes: DebtClass[];
  totalHours: number;
} {
  const byLabel = new Map<
    string,
    { count: number; hours: number; ruleIds: Set<string> }
  >();

  for (const f of result.findings) {
    const entry = COST_MODEL[f.ruleId];
    if (!entry) continue;
    const cur = byLabel.get(entry.label) ?? {
      count: 0,
      hours: 0,
      ruleIds: new Set<string>(),
    };
    cur.count += 1;
    cur.hours += entry.hoursPerOccurrence;
    cur.ruleIds.add(f.ruleId);
    byLabel.set(entry.label, cur);
  }

  const classes: DebtClass[] = [...byLabel.entries()]
    .map(([label, v]) => ({
      label,
      count: v.count,
      estHoursPerQuarter: Math.round(v.hours * 10) / 10,
      ruleIds: [...v.ruleIds].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => b.estHoursPerQuarter - a.estHoursPerQuarter);

  const totalHours =
    Math.round(classes.reduce((s, c) => s + c.estHoursPerQuarter, 0) * 10) / 10;

  return { classes, totalHours };
}

export function renderDebt(result: ScanResult): string {
  const { classes, totalHours } = computeDebt(result);
  const lines: string[] = [];
  lines.push(sectionHeader("TEST DEBT REGISTER", ui));
  lines.push("");
  if (classes.length === 0) {
    lines.push("No tracked debt classes found — the suite is clean.");
    return lines.join("\n");
  }
  const rows: string[] = ["DEBT CLASS", ""];
  rows[0] = `DEBT CLASS                  COUNT   EST. HOURS/QUARTER`;
  for (const c of classes) {
    rows.push(
      `${c.label.padEnd(26)} ${String(c.count).padStart(5)}   ${c.estHoursPerQuarter.toFixed(1).padStart(8)}`,
    );
  }
  rows.push(
    `TOTAL ESTIMATED DRAG:       ~${totalHours.toFixed(1)} engineer-hours/qtr`,
  );
  for (const row of panel(rows, ui)) lines.push(row);
  lines.push("");
  lines.push(
    "Cost model is conservative and documented in src/commands/debt.ts.",
  );
  return lines.join("\n");
}
