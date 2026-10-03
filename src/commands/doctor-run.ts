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
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
  const explicitTarget = argv.find((a) => !a.startsWith("-"));
  /**
   * NO target means "audit the checkout this command is part of".
   *
   * It used to mean `process.cwd()`, which was a real bug with a narrow blast
   * radius: running `mjolnir doctor` from a SUBDIRECTORY of a checkout found no
   * `tests/fixtures` there and exited 2, telling the user to "run from the
   * mjolnir repo root" — which they were already in, just one level down.
   * Resolving from `import.meta.url` fixes that case exactly.
   *
   * It deliberately does NOT make the audit work from an installed package. A
   * self-audit verifies this tool's registry against its own corpus and
   * fixtures, and neither ships: `tests/` and `docs/` are excluded from the
   * published tarball on purpose (`files` in package.json, locked by
   * `tests/integrations/package-smoke.spec.ts`) because ~2.5 MB of corpus
   * verdicts and fixture data on every install is a bad trade for every user
   * to make on behalf of a command most of them will never run. Making it work
   * anyway would have meant either overriding that policy or adding a
   * "checks that did not run" surface to a report whose contract says an
   * INCONCLUSIVE never renders as pass. Both are owner decisions, so the
   * exit-2 message below now says exactly what to do instead.
   */
  const targetArg = explicitTarget ?? installedPackageRoot();
  try {
    // Fixtures live under <repo>/tests/fixtures relative to the target.
    const fixturesRoot = resolve(join(targetArg, "tests", "fixtures"));
    if (!existsSync(fixturesRoot)) {
      io.err(
        `No fixtures directory at ${fixturesRoot}.\n` +
          "`mjolnir doctor` is a SELF-AUDIT and needs an mjolnir checkout — it verifies\n" +
          "this tool's own registry against its own corpus and fixtures, and neither\n" +
          "ships in the published package (tests/ and docs/ are excluded on purpose:\n" +
          "see the 'files' whitelist in package.json, locked by\n" +
          "tests/integrations/package-smoke.spec.ts).\n" +
          "Pass a checkout explicitly:  mjolnir doctor <path-to-mjolnir>",
      );
      return 2;
    }
    const report = runDoctorSelfAudit(fixturesRoot, resolve(targetArg));
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

/**
 * The root of the checkout (or package) this module belongs to, derived from
 * its own location rather than from `process.cwd()`.
 *
 * Falls back to `process.cwd()` only when the module path cannot be resolved at
 * all, which in practice means a bundler inlined it without preserving
 * `import.meta.url`. The fallback keeps the command running; the exit-2 message
 * then names the directory it tried, so the failure is still legible.
 */
function installedPackageRoot(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    // src/commands/doctor-run.ts -> 3 levels up; dist/commands/* -> 2. Take
    // whichever ancestor actually ships `tests/fixtures`, so the layout does not
    // have to be assumed twice.
    let dir = here;
    for (let i = 0; i < 5; i++) {
      if (existsSync(join(dir, "tests", "fixtures"))) return dir;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return resolve(here, "..", "..");
  } catch {
    return process.cwd();
  }
}
