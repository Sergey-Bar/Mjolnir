/**
 * Doctor CLI entry (certification-audit Phase 5, G6): the command handler
 * lives beside the check implementations instead of in cli.ts — the CLI
 * file is a dispatch table, not a business-logic home.
 *
 * Exit-code contract (stable, e2e-locked):
 *   0  — WORTHY (every check pass)
 *   1  — VIOLATIONS FOUND (any fail OR inconclusive — G2: an
 *        INCONCLUSIVE check never renders as pass, in text or JSON, and
 *        never exits 0)
 *   2  — no fixtures directory at the target (not an mjolnir checkout)
 *   10 — usage error (unknown flag / flag-shaped positional)
 *   20 — internal error (crash; --debug prints the stack)
 *
 * `--json`: prints the versioned machine contract (doctorReportJson)
 * instead of the text render. stdout carries EXACTLY the JSON document —
 * no banners, no progress lines — so `doctor . --json > report.json` is
 * a clean file. The exit code is the gate; the JSON is the evidence.
 */

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Output } from "../cli-io.js";
import {
  internalErrorMessage,
  out as stdoutOut,
  err as stderrOut,
} from "../cli-io.js";
import {
  doctorReportJson,
  renderDoctorReport,
  runDoctorSelfAudit,
} from "./doctor.js";

export function runDoctorCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out: stdoutOut, err: stderrOut },
): number {
  // Flag-parity with every other subcommand: `doctor` accepts only the
  // documented flags and an optional repo-root positional, so a
  // flag-shaped arg is a typo — silently ignoring it used to turn
  // `doctor --bogus` into a surprise full scan of the CWD.
  const json = argv.includes("--json");
  const unknownFlags = argv.filter((a) => a.startsWith("-") && a !== "--json");
  if (unknownFlags.length > 0) {
    io.err("Usage: mjolnir doctor [--json] [repo-root]");
    return 10;
  }
  const targetArg = argv.find((a) => !a.startsWith("-")) ?? process.cwd();
  try {
    // Fixtures live under <repo>/tests/fixtures relative to the target.
    const fixturesRoot = resolve(join(targetArg, "tests", "fixtures"));
    if (!existsSync(fixturesRoot)) {
      io.err(
        `No fixtures directory at ${fixturesRoot}. Run from the mjolnir repo root.`,
      );
      return 2;
    }
    const report = runDoctorSelfAudit(fixturesRoot);
    if (json) {
      // Exactly one JSON document on stdout; no trailing chatter.
      io.out(JSON.stringify(doctorReportJson(report), null, 2));
      return report.healthy ? 0 : 1;
    }
    io.out(renderDoctorReport(report));
    return report.healthy ? 0 : 1;
  } catch (err) {
    internalErrorMessage(err, io.err, process.argv.includes("--debug"));
    return 20;
  }
}
