/**
 * Shared saved-report loading (agent-handoff plan §9.0).
 *
 * `summary`, `handoff` and `why` all consume a saved `--json` report.
 * One loader, one validation, one error shape — previously
 * validateReportJson was private to summary.ts; extracting it keeps
 * the three commands byte-identical in their loading behavior without
 * duplication. The exit-code mapping stays in the callers (they own
 * their io), but the error MESSAGES are identical because they come
 * from here.
 */

import { existsSync, readFileSync } from "node:fs";
import type { ScanResult } from "../types.js";

/** Human message for any thrown value — never "undefined"/"[object Object]". */
export function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) return JSON.stringify(err);
  return String(err);
}

/**
 * Parse-and-validate a saved report. Throws Error with a
 * human-explanatory message on: invalid JSON, non-object document,
 * wrong schemaVersion, missing findings array.
 */
export function validateReportJson(text: string): ScanResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`not valid JSON (${errorText(err)})`, { cause: err });
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("the file is a JSON value but not an object");
  }
  const doc = parsed as { schemaVersion?: unknown; findings?: unknown };
  if (doc.schemaVersion !== 1) {
    throw new Error(
      `unsupported schemaVersion ${JSON.stringify(doc.schemaVersion)} — expected 1`,
    );
  }
  if (!Array.isArray(doc.findings)) {
    throw new Error(
      'missing a "findings" array — is this a Mjölnir --json report?',
    );
  }
  return parsed as ScanResult;
}

/** Load + validate a saved report from disk. Throws on any problem. */
export function loadSavedReport(reportPath: string): ScanResult {
  return validateReportJson(readFileSync(reportPath, "utf8"));
}

/** True when the report file exists (callers own the not-found message). */
export function reportExists(reportPath: string): boolean {
  return existsSync(reportPath);
}
