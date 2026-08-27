/**
 * @sergey-bar/qa-doctor-playwright-reporter
 *
 * Thin wrapper around Playwright's built-in JSON reporter that documents
 * and pins the exact output contract QA Doctor's forensics pipeline
 * ingests (`qa-doctor forensics`, `triage`, `pw-report`).
 *
 * Usage in playwright.config.ts:
 *
 *   import { qaDoctorReporter } from "@sergey-bar/qa-doctor-playwright-reporter";
 *
 *   export default defineConfig({
 *     reporter: [qaDoctorReporter({ outputFile: "report.json" })],
 *   });
 *
 * Why a wrapper instead of raw [['json', ...]]?
 * - One stable place documenting the contract (suites/specs/tests/results).
 * - A named output file convention (`qa-doctor.report.json`) so the CLI's
 *   auto-discovery finds it without extra flags.
 * - Future-proofing: if Playwright changes its JSON shape, this package
 *   can adapt/transpile without every user config changing.
 */

import type { ReporterDescription } from "@playwright/test";

export interface QaDoctorReporterOptions {
  /** Where to write the JSON report. Default: "qa-doctor.report.json". */
  outputFile?: string;
}

/** The output file name QA Doctor's CLI auto-discovers by default. */
export const QA_DOCTOR_REPORT_FILE = "qa-doctor.report.json";

export function qaDoctorReporter(
  options: QaDoctorReporterOptions = {},
): ReporterDescription {
  return ["json", { outputFile: options.outputFile ?? QA_DOCTOR_REPORT_FILE }];
}

export default qaDoctorReporter;
