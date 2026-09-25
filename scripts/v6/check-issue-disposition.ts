#!/usr/bin/env tsx
/**
 * `npm run issue-disposition:check` — the issue-disposition drift-lock
 * (Wave 0 DoD).
 *
 * The v6 definition of done says: *all previously open issues carry a
 * written disposition, and the set cannot silently regrow*. That is two
 * different guarantees, and this gate implements both:
 *
 *  1. **Completeness** — the disposition ledger and the GitHub snapshot
 *     describe the same set of issues. A disposition for an issue nobody
 *     can see is fiction; a snapshot issue with no disposition is a gap
 *     nobody is tracking.
 *  2. **No silent regrowth** — the open-issue count may not exceed the
 *     baseline recorded in `docs/v6-inventory.json`. If it does, either a
 *     new issue appeared or a closure was reversed, and both need a
 *     human. This is the drift-lock proper: the honest failure mode of an
 *     issue ledger is not a missing row, it is a *growing* backlog that
 *     nobody notices because the file keeps being regenerated.
 *
 * What this gate deliberately does **not** do: judge whether a
 * disposition is *correct*. Dispositions are bookkeeping — they prove
 * nothing about capability, and treating them as proof is the mistake
 * Wave 0 exists to correct.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ROOT } from "./inventory.js";

const DISPOSITIONS = join("docs", "M26-ISSUE-DISPOSITIONS.jsonl");
const SNAPSHOT = join("docs", "M26-GITHUB-SNAPSHOT.json");
const INVENTORY = join("docs", "v6-inventory.json");

export const CANONICAL_DISPOSITIONS = [
  "CARRY_FORWARD",
  "CLOSED_NOT_PLANNED",
  "CLOSED_UNVERIFIED",
  "UNRECONCILED",
] as const;

export type CanonicalDisposition = (typeof CANONICAL_DISPOSITIONS)[number];

export interface IssueDispositionCheck {
  status: "PASS" | "FAIL";
  errors: string[];
  facts: {
    snapshotIssues: number;
    dispositionRecords: number;
    openIssues: number;
    baselineOpenIssues: number;
    byDisposition: Record<string, number>;
  };
}

export function checkIssueDispositions(root = ROOT): IssueDispositionCheck {
  const errors: string[] = [];

  const snapshotPath = join(root, SNAPSHOT);
  const dispositionsPath = join(root, DISPOSITIONS);
  if (!existsSync(snapshotPath) || !existsSync(dispositionsPath)) {
    return {
      status: "FAIL",
      errors: [
        `missing ${!existsSync(snapshotPath) ? SNAPSHOT : DISPOSITIONS}`,
      ],
      facts: {
        snapshotIssues: 0,
        dispositionRecords: 0,
        openIssues: 0,
        baselineOpenIssues: 0,
        byDisposition: {},
      },
    };
  }

  const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as {
    issues: Array<{ number: number; state: string }>;
  };
  const rows = readFileSync(dispositionsPath, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map(
      (line) =>
        JSON.parse(line) as {
          issue_number: number;
          state: string;
          canonical_disposition: string;
          owner?: string;
        },
    );

  const snapshotNumbers = new Set(snapshot.issues.map((i) => i.number));
  const rowNumbers = new Set<number>();
  const byDisposition: Record<string, number> = {};

  for (const row of rows) {
    if (rowNumbers.has(row.issue_number)) {
      errors.push(`duplicate disposition for issue #${row.issue_number}`);
    }
    rowNumbers.add(row.issue_number);
    if (!snapshotNumbers.has(row.issue_number)) {
      errors.push(
        `disposition exists for issue #${row.issue_number}, which is absent from the GitHub snapshot`,
      );
    }
    if (
      !CANONICAL_DISPOSITIONS.includes(
        row.canonical_disposition as CanonicalDisposition,
      )
    ) {
      errors.push(
        `#${row.issue_number}: unknown canonical_disposition "${row.canonical_disposition}"`,
      );
    }
    if (row.canonical_disposition === "UNRECONCILED") {
      errors.push(
        `#${row.issue_number}: disposition is UNRECONCILED; every open issue needs a decision, not a placeholder`,
      );
    }
    byDisposition[row.canonical_disposition] =
      (byDisposition[row.canonical_disposition] ?? 0) + 1;
  }

  const missing = [...snapshotNumbers].filter(
    (number) => !rowNumbers.has(number),
  );
  if (missing.length > 0) {
    errors.push(
      `${missing.length} issue(s) in the snapshot have no disposition: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? ", …" : ""}`,
    );
  }

  // State agreement: a disposition's `state` must match the snapshot's.
  const snapshotByNumber = new Map(
    snapshot.issues.map((i) => [i.number, i.state]),
  );
  for (const row of rows) {
    const state = snapshotByNumber.get(row.issue_number);
    if (state !== undefined && state !== row.state) {
      errors.push(
        `#${row.issue_number}: disposition says "${row.state}" but the snapshot says "${state}"`,
      );
    }
  }

  const openIssues = rows.filter((row) => row.state === "open").length;

  // Drift-lock: the open set may shrink, never grow, without a human.
  let baselineOpenIssues = openIssues;
  const inventoryPath = join(root, INVENTORY);
  if (existsSync(inventoryPath)) {
    try {
      const inventory = JSON.parse(readFileSync(inventoryPath, "utf8")) as {
        counts?: { openIssues?: number };
      };
      if (typeof inventory.counts?.openIssues === "number") {
        baselineOpenIssues = inventory.counts.openIssues;
      }
    } catch {
      // An unreadable inventory is not a baseline; fall back to the
      // measured count and say so via the facts block.
      baselineOpenIssues = openIssues;
    }
  }
  if (openIssues > baselineOpenIssues) {
    errors.push(
      `the open-issue set grew from ${baselineOpenIssues} to ${openIssues} since docs/v6-inventory.json was generated; ` +
        `the set must not regrow silently — disposition the new issues or re-baseline deliberately`,
    );
  }

  return {
    status: errors.length === 0 ? "PASS" : "FAIL",
    errors,
    facts: {
      snapshotIssues: snapshot.issues.length,
      dispositionRecords: rows.length,
      openIssues,
      baselineOpenIssues,
      byDisposition,
    },
  };
}

function main(): void {
  const check = checkIssueDispositions(ROOT);
  console.log(
    JSON.stringify(
      {
        status: check.status,
        gate: "issue-disposition:check",
        facts: check.facts,
        errors: check.errors,
      },
      null,
      2,
    ),
  );
  process.exit(check.status === "PASS" ? 0 : 1);
}

if (process.argv[1] && process.argv[1].endsWith("check-issue-disposition.ts")) {
  main();
}
