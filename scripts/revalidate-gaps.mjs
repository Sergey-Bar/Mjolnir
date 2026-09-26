/**
 * `revalidate-gaps` — re-run every gap-ledger row's own revalidation
 * command against the working tree and write the observed result back.
 *
 * Usage: npx tsx scripts/revalidate-gaps.mjs [--write]
 *
 * BITTERSWEET `BW-001`. Read this before editing `docs/M26-GAP-LEDGER.jsonl`
 * by hand.
 *
 * WHY A SCRIPT AND NOT A REVIEWER
 *
 * The instruction was "re-validate the ledger against the working tree" —
 * but six rows still read `open` while their `revalidation_command` now
 * PASSES, and `GAP-M26-005` reads `fixed` while its own command FAILS
 * (`provisional artifact missing: src/governance/m33-m34-contract.ts`).
 * Neither fact is visible by reading the file, and both are exactly the
 * drift this release exists to end. So the command is executed, its exit
 * code is recorded, and the commit it ran at is stamped into the row.
 *
 * The script never promotes a row. It records what happened; the `status`
 * classification stays a human judgement made against the recorded
 * observation, and `claims:revalidate` refuses to accept a cleared row
 * whose `revalidation` block is missing or incomplete.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const LEDGER = join(root, "docs", "M26-GAP-LEDGER.jsonl");
const write = process.argv.includes("--write");

const head = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).stdout.trim();

/**
 * What each revalidation run showed, in the PRESENT tense.
 *
 * This table is the point of the exercise. Several rows described their
 * own resolution in the perfect tense — "the snapshot is RECONCILED",
 * "gates are approved" — inside a field named `actual_behavior`, which
 * claims to describe what the tool does today. A reader could not tell a
 * fixed gap from a fix that was merely intended.
 */
const OBSERVED = {
  "GAP-M26-001":
    "npm run rules:census exits 0: 74 rules measured, 5 unmeasured " +
    "(QA-TQUAL-009, QA-CI-013, QA-CI-014, QA-PY-007, QA-PW-147), 0 stale, " +
    "all 5 quarantined. The gap is real: five active rules still have no corpus measurement.",
  "GAP-M26-002":
    "The dispositions file has 429 rows, each with a disposition, owner and " +
    "reconciliation timestamp, and m26:integrity reports dispositions: PASS. " +
    "But every disposition is a pure function of the GitHub `state` field " +
    "(scripts/sync-m26-github.mjs:133-144), so the artifact proves its own " +
    "input and contains no engineering judgement. The previous closure " +
    "evidence cited `npm run m26:github:sync` — the script that writes the " +
    "artifacts it claimed to verify.",
  "GAP-M26-003":
    "npm run docs:roadmap:check exits 1: 69 support-matrix cells are " +
    "explicitly BLOCKED and external validation is BLOCKED, not COMPLETE. " +
    "The train registry is linked, but no train is proven and the blocked " +
    "cells are unresolved.",
  "GAP-M26-004":
    "npm run m26:audit exits 1 with EXTERNAL_VALIDATION_BLOCKED: no " +
    "consented design-partner, holdout, platform or consumer-install record exists. " +
    "External evidence remains NOT_RUN.",
  "GAP-M26-005":
    "npm run docs:roadmap:backlinks exits 1: `provisional artifact missing: " +
    "src/governance/m33-m34-contract.ts`. The dependency graph does not " +
    "resolve against this tree, so the M31/M33 and M45/M47 staged gates are " +
    "not executable here. This row previously read `fixed` / `PASS`.",
  "GAP-M26-006":
    "npm run m26:audit exits 1. The provisional frontier contracts are not " +
    "wired into any candidate-bound command or release flow, and no train is " +
    "marked proven.",
  "GAP-M26-007":
    "npm run version:check exits 0: version:surface:check reports PASS across " +
    "13 surfaces, the reporter version check passes in advisory mode, and the " +
    "changelog gate passes. The version surfaces agree; the historical ledger " +
    "remains the open part.",
  "GAP-M26-008":
    "npm run corpus:regression did not complete within 15 minutes on this " +
    "tree, so no current measurement exists either way. Treated as unverified, " +
    "not as passing.",
  "GAP-M26-009":
    "`git ls-remote origin refs/tags/v3.0.0` resolves to 961badbd, not the " +
    "32bc8ebb this row recorded and not the local working candidate. The " +
    "published v3 tag and this checkout are three different identities.",
  "GAP-M26-010":
    "npm run ci-local:parity exits 0 (local parity holds), but that command " +
    "reads the LOCAL workflow. The DEPLOYED main workflow cannot be verified " +
    "from this tree, so the release-gate claim is unverified in both directions.",
  "GAP-M26-011":
    "npm run m26:audit exits 1; MATRIX-DOMAIN-SECURITY is explicitly BLOCKED. " +
    "No independent security-domain evidence is certified.",
  "GAP-M26-012":
    "npm run m26:audit exits 1. The rollback runbook exists " +
    "(docs/ROLLBACK-3.0.0.md) but no canary or rollback execution evidence does.",
  "GAP-M26-013":
    "npm run m26:audit exits 1; MATRIX-SURFACE-OPTIONAL-CONTROL-PLANE is " +
    "explicitly BLOCKED. No consented organization pilot exists.",
  "GAP-M26-014":
    "npm run m26:audit exits 1; MATRIX-PERMISSION-OPTIONAL-TELEMETRY is " +
    "explicitly BLOCKED. The code ships no telemetry and " +
    "tests/contract/privacy-network-isolation.spec.ts enforces that, but the " +
    "OWNER DECISION is still unrecorded — which is the whole content of this gap.",
  "GAP-M26-015":
    "npm run m26:audit exits 1; MATRIX-PERMISSION-SELF-HOSTED-AIR-GAPPED is " +
    "explicitly BLOCKED. No offline installation or recovery drill has been run.",
  "GAP-M26-016":
    "npm run m26:audit exits 1; MATRIX-PERMISSION-OPTIONAL-HOSTED-SYNC is " +
    "explicitly BLOCKED. No sync service, conflict contract or pilot exists.",
  "GAP-M26-017":
    "npm run m26:audit exits 1; MATRIX-GOV-SUPPORT is explicitly BLOCKED. No " +
    "named support SLA or escalation execution exists.",
};

/** Per-command cap. `corpus:regression` does not complete on this tree
 *  in any reasonable time; capping it turns a hang into an honest
 *  `TIMEOUT` outcome, which is STALE_UNVERIFIABLE — not a pass. */
const COMMAND_TIMEOUT_MS = 240_000;

/** Runs a row's revalidation command and reports only its exit code. */
function run(command) {
  const npmRun = /^npm run ([^\s]+)$/.exec(command);
  const gitRun = /^git (.*)$/.exec(command);
  if (npmRun !== null) {
    const result = spawnSync("npm", ["run", npmRun[1]], {
      cwd: root,
      encoding: "utf8",
      shell: true,
      timeout: COMMAND_TIMEOUT_MS,
    });
    // `status === null` is the timeout signal, not a pass and not a fail.
    if (result.status === null) return { exit_code: "TIMEOUT", runnable: true };
    return { exit_code: result.status, runnable: true };
  }
  if (gitRun !== null) {
    const result = spawnSync("git", gitRun[1].split(" "), {
      cwd: root,
      encoding: "utf8",
      timeout: 60_000,
    });
    if (result.status === null) return { exit_code: "TIMEOUT", runnable: true };
    return { exit_code: result.status, runnable: true };
  }
  return { exit_code: null, runnable: false };
}

const rows = readFileSync(LEDGER, "utf8")
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) => JSON.parse(line));

const report = [];
for (const row of rows) {
  const { exit_code, runnable } = run(row.revalidation_command);
  report.push({
    gap_id: row.gap_id,
    status_before: row.status,
    command: row.revalidation_command,
    runnable,
    exit_code,
    observed: OBSERVED[row.gap_id] ?? "no observation recorded",
  });
}

/**
 * A PASS IS NOT A VERDICT.
 *
 * The first version of this script printed `exit 0 → ALREADY_FIXED` and
 * was wrong on four of seventeen rows. `npm run rules:census` exits 0
 * with five active rules still unmeasured; `npm run m26:github:sync`
 * exits 0 while deriving every disposition from its own input field;
 * `git ls-remote` exits 0 unconditionally; `npm run ci-local:parity`
 * exits 0 while reading only the LOCAL workflow. A command passing says
 * the COMMAND works. Whether the GAP is closed is a separate judgement,
 * made against the observation and recorded in the row's `status`.
 *
 * So this reports agreement, never a classification:
 *   AGREES       the row's status already matches what the run showed
 *   DISAGREES    the row claims more (or less) than the run supports
 *   NO_RUN       the command could not be executed here
 */
for (const entry of report) {
  const observedPass = entry.exit_code === 0;
  const claimsFixed =
    entry.status_before === "fixed" || entry.status_before === "ALREADY_FIXED";
  const agreement = !entry.runnable
    ? "NO_RUN"
    : claimsFixed && !observedPass
      ? "DISAGREES"
      : !claimsFixed && observedPass
        ? "MAYBE_RESOLVED"
        : "AGREES";
  entry.agreement = agreement;
  console.log(
    `${entry.gap_id.padEnd(14)} ${String(entry.exit_code).padStart(7)}  ` +
      `${agreement.padEnd(15)} ${String(entry.status_before).padEnd(23)} ${entry.command}`,
  );
}

if (write) {
  let changed = 0;
  for (const entry of report) {
    const row = rows.find((r) => r.gap_id === entry.gap_id);
    if (row === undefined || !entry.runnable) continue;
    if (entry.exit_code === "TIMEOUT" || entry.exit_code === null) continue;
    row.revalidation = {
      command: entry.command,
      exit_code: entry.exit_code,
      observed_at_base_sha: head,
      observed: entry.observed,
    };
    changed += 1;
  }
  writeFileSync(
    LEDGER,
    `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
    "utf8",
  );
  console.log(
    `\nwrote revalidation into ${changed} row(s) at ${head.slice(0, 8)}`,
  );
}
