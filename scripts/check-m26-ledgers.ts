import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  validateExternalValidationRecord,
  validateGapLedgerJsonl,
  validateGitHubSnapshot,
  validateSupportMatrix,
} from "../src/ledger/m26-validators.js";

const root = process.argv[2] ?? process.cwd();
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
const status = Object.values(results).some((result) => result.status === "FAIL")
  ? "FAIL"
  : Object.values(results).some((result) => result.status === "BLOCKED")
    ? "BLOCKED"
    : "PASS";
console.log(JSON.stringify({ status, results }, null, 2));
if (status !== "PASS") process.exit(1);
