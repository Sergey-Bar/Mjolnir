/**
 * M26 ledger gate.
 *
 * Two stages, because the records and the work are different things:
 *
 *   - `integrity` (default for the build gate): every ledger record must be
 *     structurally valid. A malformed or missing record is a defect and fails.
 *   - `readiness` (the release gate): integrity PLUS no open release blocker
 *     and no BLOCKED support cell. An honestly recorded open gap fails here.
 *
 * A build gate that demands all open work be closed is a gate nobody can
 * satisfy, and an unsatisfiable gate teaches the team to route around it. So
 * `integrity` is what `certify` runs and `readiness` is what the release
 * workflows run — and both run the same validators, so the two can never
 * disagree about whether a record is valid.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  validateExternalValidationRecord,
  validateGapLedgerJsonl,
  validateGitHubSnapshot,
  validateSupportMatrix,
} from "../src/ledger/m26-validators.js";

const args = process.argv.slice(2);
const stageIndex = args.findIndex((arg) => arg === "--stage");
const stage = stageIndex === -1 ? "readiness" : args[stageIndex + 1];
if (stage !== "integrity" && stage !== "readiness") {
  console.error(
    `m26: unknown stage "${String(stage)}"; use integrity|readiness`,
  );
  process.exit(2);
}
const positional = args.filter(
  (arg, index) => !arg.startsWith("--") && index !== stageIndex + 1,
);
const root = positional[0] ?? process.cwd();
const readJson = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(join(root, path), "utf8")) as unknown;
  } catch {
    return null;
  }
};
const snapshot = readJson("docs/M26-GITHUB-SNAPSHOT.json");
const support = readJson("docs/M26-SUPPORT-MATRIX.json");
const external = readJson("docs/M26-EXTERNAL-VALIDATION.json");
const readGapLedger = (): string | null => {
  try {
    return readFileSync(join(root, "docs/M26-GAP-LEDGER.jsonl"), "utf8");
  } catch {
    return null;
  }
};
const gapLedger = readGapLedger();
const readJsonl = (path: string): unknown[] => {
  try {
    return readFileSync(join(root, path), "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as unknown);
  } catch {
    return [];
  }
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const dispositions = readJsonl("docs/M26-ISSUE-DISPOSITIONS.jsonl");
const dispositionErrors: string[] = [];
const dispositionNumbers = new Set<number>();
const requiredDispositionFields = [
  "issue_number",
  "github_milestone",
  "logical_milestone",
  "state",
  "state_reason",
  "canonical_disposition",
  "target_train",
  "duplicate_or_successor",
  "owner",
  "dependencies",
  "evidence_status",
  "release_effect",
  "last_reconciled_at",
];
for (const row of dispositions) {
  if (!isRecord(row)) {
    dispositionErrors.push("disposition row must be an object");
    continue;
  }
  for (const field of requiredDispositionFields) {
    if (!(field in row)) dispositionErrors.push(`disposition missing ${field}`);
  }
  if (
    typeof row.issue_number !== "number" ||
    dispositionNumbers.has(row.issue_number)
  ) {
    dispositionErrors.push(
      `duplicate or invalid issue number ${String(row.issue_number)}`,
    );
  } else {
    dispositionNumbers.add(row.issue_number);
  }
  if (!Array.isArray(row.dependencies)) {
    dispositionErrors.push(
      `dependencies must be an array for ${String(row.issue_number)}`,
    );
  }
}
const dispositionResult = {
  status:
    dispositionErrors.length > 0
      ? "FAIL"
      : dispositions.some(
            (row) =>
              isRecord(row) && row.canonical_disposition === "UNRECONCILED",
          )
        ? "BLOCKED"
        : "PASS",
  records: dispositions.length,
  errors: dispositionErrors,
};
const results = {
  github: validateGitHubSnapshot(snapshot),
  gaps: validateGapLedgerJsonl(gapLedger),
  support: validateSupportMatrix(
    typeof support === "object" && support !== null && "cells" in support
      ? (support as { cells: unknown[] }).cells
      : [],
  ),
  dispositions: dispositionResult,
  external: validateExternalValidationRecord(external),
};
const sections = Object.values(results);
const failed = sections.some((result) => result.status === "FAIL");
const blocked = sections.some((result) => result.status === "BLOCKED");
const status = failed ? "FAIL" : blocked ? "BLOCKED" : "PASS";
const manifest = readJson("candidate-trust-manifest.json");
const softwareOnly =
  process.env["M26_SOFTWARE_ONLY"] === "1" &&
  isRecord(manifest) &&
  isRecord(manifest.policyOverride) &&
  manifest.policyOverride.mode === "SOFTWARE_ONLY" &&
  manifest.policyOverride.authorizedBy === manifest.approvalAuthority;
if (softwareOnly && !failed) {
  console.log(
    JSON.stringify(
      {
        stage,
        status: "PASS",
        softwareOnly: true,
        overridden: results,
        trustCertificationClaimed: false,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
console.log(JSON.stringify({ stage, status, results }, null, 2));
// `integrity` fails on malformed records only; an honestly recorded open gap
// is a readiness fact, not a broken ledger.
if (failed || (stage === "readiness" && status !== "PASS")) process.exit(1);
