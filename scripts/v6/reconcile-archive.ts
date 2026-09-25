#!/usr/bin/env tsx
/**
 * `npm run v6:archive:check` — the `archive` block of
 * `docs/ROADMAP.yaml` reconciled against real data.
 *
 * The block declares `status: UNRECONCILED` for the 108 historical
 * design-record issues (M18–M25, GitHub #539–#646). The honest question
 * is not "can this flag be flipped" but "do those 108 issues actually
 * have a recorded outcome".
 *
 * The answer is currently **no**: 18 of them are still open. So the
 * gate reports the specific issues and stays red. Flipping the flag
 * while they are open would be a false proof produced by the very act
 * meant to establish the truth, and it is exactly the failure this wave
 * exists to prevent.
 *
 * Exit codes: `0` reconciled · `1` unreconciled · `2` malformed input.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { prettify } from "../lib/prettify.js";
import { isMainModule } from "../lib/is-main-module.js";
import {
  ROOT,
  reconcileArchive,
  type ArchiveReconciliation,
} from "./inventory.js";

const ARCHIVE_JSON = join(ROOT, "docs", "V6-ARCHIVE-RECONCILIATION.json");

export interface ArchiveCheck {
  status: "RECONCILED" | "UNRECONCILED";
  errors: string[];
  facts: {
    expectedDesignRecordCount: number;
    observedDesignRecordCount: number;
    recordsReconciled: number;
    recordsPartiallyReconciled: number;
    recordsUnreconciled: number;
    openIssuesInArchive: number;
    openIssueNumbers: number[];
  };
}

export function checkArchive(root = ROOT): ArchiveCheck {
  const archive: ArchiveReconciliation = reconcileArchive(root);
  const errors: string[] = [];

  if (archive.observedDesignRecordCount !== archive.expectedDesignRecordCount) {
    errors.push(
      `archive declares ${archive.expectedDesignRecordCount} design records but the ranges sum to ${archive.observedDesignRecordCount}`,
    );
  }
  if (archive.records.length === 0) {
    errors.push("no archive records were parsed from docs/ROADMAP.yaml");
  }
  for (const record of archive.records) {
    const [from, to] = record.githubRange;
    if (to - from + 1 !== record.designRecords) {
      errors.push(
        `${record.logicalMilestone}: githubRange [${from}, ${to}] does not match designRecords ${record.designRecords}`,
      );
    }
  }
  if (archive.openIssuesInArchive.length > 0) {
    errors.push(
      `${archive.openIssuesInArchive.length} issue(s) inside the historical archive ranges are still open: ${archive.openIssuesInArchive.join(", ")}. ` +
        `The archive block cannot honestly be marked RECONCILED until they are closed (run \`${archive.closureCommand}\` after closing them).`,
    );
  }

  return {
    status: errors.length === 0 ? "RECONCILED" : "UNRECONCILED",
    errors,
    facts: {
      expectedDesignRecordCount: archive.expectedDesignRecordCount,
      observedDesignRecordCount: archive.observedDesignRecordCount,
      recordsReconciled: archive.records.filter((r) => r.state === "RECONCILED")
        .length,
      recordsPartiallyReconciled: archive.records.filter(
        (r) => r.state === "PARTIALLY_RECONCILED",
      ).length,
      recordsUnreconciled: archive.records.filter(
        (r) => r.state === "UNRECONCILED",
      ).length,
      openIssuesInArchive: archive.openIssuesInArchive.length,
      openIssueNumbers: archive.openIssuesInArchive,
    },
  };
}

async function main(): Promise<void> {
  const check = checkArchive(ROOT);
  // The artifact is written on every run so the reconciliation is
  // reviewable, not just asserted at CI time.
  writeFileSync(
    ARCHIVE_JSON,
    JSON.stringify(reconcileArchive(ROOT), null, 2) + "\n",
  );
  await prettify(ARCHIVE_JSON);
  console.log(
    JSON.stringify(
      {
        status: check.status,
        gate: "v6:archive:check",
        facts: check.facts,
        errors: check.errors,
      },
      null,
      2,
    ),
  );
  process.exit(check.status === "RECONCILED" ? 0 : 1);
}

if (isMainModule(import.meta.url)) {
  await main();
}
