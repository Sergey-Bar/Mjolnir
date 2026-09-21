/**
 * mjolnir-qa-playwright-reporter
 *
 * Thin wrapper around Playwright's built-in JSON reporter that documents
 * and pins the exact output contract Mjölnir's forensics pipeline
 * ingests (`mjolnir forensics`, `triage`, `pw-report`).
 *
 * Usage in playwright.config.ts:
 *
 *   import { mjolnirReporter } from "mjolnir-qa-playwright-reporter";
 *
 *   export default defineConfig({
 *     reporter: [mjolnirReporter({ outputFile: "report.json" })],
 *   });
 *
 * Why a wrapper instead of raw [['json', ...]]?
 * - One stable place documenting the contract (suites/specs/tests/results).
 * - A named output file convention (`mjolnir.report.json`) so the CLI's
 *   auto-discovery finds it without extra flags.
 * - Future-proofing: if Playwright changes its JSON shape, this package
 *   can adapt/transpile without every user config changing.
 */

import type { ReporterDescription } from "@playwright/test";

export interface MjolnirReporterOptions {
  /** Where to write the JSON report. Default: "mjolnir.report.json". */
  outputFile?: string;
}

/** The output file name Mjölnir's CLI auto-discovers by default. */
export const MJOLNIR_REPORT_FILE = "mjolnir.report.json";

export function mjolnirReporter(
  options: MjolnirReporterOptions = {},
): ReporterDescription {
  return ["json", { outputFile: options.outputFile ?? MJOLNIR_REPORT_FILE }];
}

export default mjolnirReporter;
