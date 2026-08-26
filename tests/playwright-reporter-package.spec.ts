/**
 * @qa-doctor/playwright-reporter package contract tests (Phase 0.2).
 * The package source is imported directly (workspace-relative) so the
 * main vitest config's tests/** include applies.
 */

import { describe, expect, it } from "vitest";

import {
  qaDoctorReporter,
  QA_DOCTOR_REPORT_FILE,
} from "../packages/playwright-reporter/src/index.js";

describe("qaDoctorReporter", () => {
  it("returns the Playwright json reporter descriptor", () => {
    expect(qaDoctorReporter()).toEqual([
      "json",
      { outputFile: QA_DOCTOR_REPORT_FILE },
    ]);
  });

  it("honors a custom output file", () => {
    expect(qaDoctorReporter({ outputFile: "custom.json" })).toEqual([
      "json",
      { outputFile: "custom.json" },
    ]);
  });

  it("uses the auto-discovered default filename", () => {
    expect(QA_DOCTOR_REPORT_FILE).toBe("qa-doctor.report.json");
  });
});
