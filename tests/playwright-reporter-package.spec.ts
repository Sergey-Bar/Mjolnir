/**
 * @qa-doctor/playwright-reporter package contract tests (Phase 0.2,
 * upgraded in Master-Stabilization-Plan Sprint 1 Task 7).
 * The package source is imported directly (workspace-relative) so the
 * main vitest config's tests/** include applies.
 *
 * The previous version of this file only asserted the tuple's runtime
 * shape (`["json", { outputFile: ... }]`) — it never proved the tuple
 * actually satisfies Playwright's real `ReporterDescription` type. Now
 * that `@playwright/test` is a real root devDependency (Task 7), this
 * file feeds `qaDoctorReporter()`'s output straight into Playwright's
 * own `defineConfig({ reporter: [...] })`, the exact call site every
 * consumer uses. If Playwright's reporter contract ever changes shape,
 * `npm run typecheck` fails here before it fails in a user's config.
 */

import { defineConfig } from "@playwright/test";
import { describe, expect, it } from "vitest";

import {
  qaDoctorReporter,
  QA_DOCTOR_REPORT_FILE,
} from "../packages/playwright-reporter/src/index.js";

describe("qaDoctorReporter satisfies Playwright's real contract", () => {
  it("is accepted by defineConfig's reporter field, not just tuple-shaped", () => {
    // This is a type-level assertion as much as a runtime one: if
    // qaDoctorReporter()'s return type ever stops satisfying Playwright's
    // ReporterDescription, this line fails to typecheck (tsconfig.test.json
    // includes packages/** and tests/**), independent of the toEqual below.
    const config = defineConfig({
      reporter: [qaDoctorReporter()],
    });
    expect(config.reporter).toEqual([
      ["json", { outputFile: QA_DOCTOR_REPORT_FILE }],
    ]);
  });

  it("a custom output file also satisfies the contract end-to-end", () => {
    const config = defineConfig({
      reporter: [qaDoctorReporter({ outputFile: "custom.json" })],
    });
    expect(config.reporter).toEqual([["json", { outputFile: "custom.json" }]]);
  });

  it("composes with other reporters in the same array, as real configs do", () => {
    const config = defineConfig({
      reporter: [["list"], qaDoctorReporter(), ["html", { open: "never" }]],
    });
    expect(config.reporter).toEqual([
      ["list"],
      ["json", { outputFile: QA_DOCTOR_REPORT_FILE }],
      ["html", { open: "never" }],
    ]);
  });

  it("uses the auto-discovered default filename", () => {
    expect(QA_DOCTOR_REPORT_FILE).toBe("qa-doctor.report.json");
  });
});
