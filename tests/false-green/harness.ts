/**
 * False-Green Attack Corpus — harness (product-gap master plan §6, plan
 * 1789009691197 R4b). Every case DECLARES seven fields before it runs:
 * INPUT / EXPECTED EXECUTION STATE / EXPECTED EVIDENCE STATE / EXPECTED
 * VERDICT / EXPECTED EXIT CODE / EXPECTED REPORT FIELDS / EXPECTED
 * RELEASE IMPACT. The invariant under attack: for every hostile input
 * the scan/verdict must be honestly degraded — a false green must be
 * impossible or explicitly surfaced.
 *
 * Assertion law (§6): an assertion weak enough to pass on a false green
 * is itself a defect — assertions bind to SPECIFIC fields and exit
 * codes, never to "it didn't throw". The mutation protocol
 * (mutation-protocol.spec.ts) enforces this by mutating every case's
 * input toward its false-green twin and requiring the case's assertions
 * to FAIL.
 */

import {
  existsSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runScan } from "../../src/engine/scan-pipeline.js";
import type { ScanResult } from "../../src/types.js";

export type FalseGreenClass =
  | "execution-failures"
  | "parser-failures"
  | "adapter-failures"
  | "evidence-failures"
  | "rule-failures"
  | "mcp-failures"
  | "agent-failures";

export interface MutationFixture {
  id: string;
  /**
   * What the mutation does to the case input (the false-green twin):
   * failure→success · partial→complete · unknown→clean ·
   * exception→empty-result · missing-evidence→PASS ·
   * wrong-execution-ID→accepted · unsupported→PASS · crashed-rule→clean ·
   * parser-failure→clean.
   */
  transform: string;
  build: (input: string) => string;
}

export interface FalseGreenCase {
  id: string;
  className: FalseGreenClass;
  /** The Mjölnir surface under attack (e.g. "forensics/parse-jest-json"). */
  surface: string;
  /** INPUT — the hostile input, concretely. */
  input: string;
  /** EXPECTED EXECUTION STATE. */
  expectedExecution: string;
  /** EXPECTED EVIDENCE STATE. */
  expectedEvidence: string;
  /** EXPECTED VERDICT. */
  expectedVerdict: string;
  /** EXPECTED EXIT CODE (the frozen set; the documented CLI mapping). */
  expectedExitCode: number;
  /** EXPECTED REPORT FIELDS — `field: assertion` bindings (specific). */
  expectedReportFields: string[];
  /** EXPECTED RELEASE IMPACT. */
  releaseImpact: string;
  /**
   * Wired = the surface exists and this case executes against it.
   * Unwired cases (surface ships later) stay in the registry as
   * UNSURFACED rows — recorded, never silently dropped (§6 + §5).
   */
  wired: boolean;
  /** The increment wiring an unwired case's surface. */
  shippedIn?: string;
  /** Mutation fixtures: false-green twins the assertions must catch. */
  mutations: MutationFixture[];
}

/** Builds a hostile (or mutated-benign) input dir and runs a scan on it. */
export async function runScanOnInput(
  files: Record<string, string>,
  opts: { maxFiles?: number; maxDurationMs?: number } = {},
): Promise<{ result: ScanResult; dir: string }> {
  const dir = mkdtempSync(join(tmpdir(), "fg-case-"));
  for (const [name, body] of Object.entries(files)) {
    const p = join(dir, name);
    mkdirSync(join(p, ".."), { recursive: true });
    writeFileSync(p, body);
  }
  try {
    const result = await runScan({
      target: dir,
      json: true,
      verbose: true,
      maxFiles: opts.maxFiles ?? 200,
      maxDurationMs: opts.maxDurationMs ?? 60_000,
      scopeChanged: false,
      format: "json",
      strict: false,
    } as never);
    return { result, dir };
  } catch (err) {
    rmSync(dir, { recursive: true, force: true });
    throw err;
  }
}

export function cleanupDir(dir: string): void {
  if (/(^|[\\/])fg-(case|parser|mut|rule)-/.test(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Asserts an observed scan against a case's SPECIFIC report-field bindings. */
export function assertReportFields(
  result: ScanResult,
  bindings: string[],
): void {
  for (const binding of bindings) {
    const [field, assertion] = splitBinding(binding);
    if (field === "analysisStatus.rules") {
      expectIf(assertion, result.analysisStatus.rules, binding);
      continue;
    }
    if (field === "analysisStatus.discovery") {
      expectIf(assertion, result.analysisStatus.discovery, binding);
      continue;
    }
    if (field === "truncationReasons") {
      const reasons = result.analysisStatus.truncationReasons ?? [];
      if (assertion === "non-empty") {
        if (reasons.length === 0) {
          throw new Error(`${binding}: truncationReasons empty`);
        }
      } else if (assertion === "empty") {
        if (reasons.length !== 0) {
          throw new Error(
            `${binding}: truncationReasons non-empty: ${reasons.join(", ")}`,
          );
        }
      }
      continue;
    }
    if (field === "rulesCrashed") {
      const n = result.analysisStatus.rulesCrashed ?? 0;
      if (assertion.startsWith(">=")) {
        const want = Number(assertion.slice(2));
        if (n < want)
          throw new Error(`${binding}: rulesCrashed ${n} < ${want}`);
      } else if (assertion === "0") {
        if (n !== 0) throw new Error(`${binding}: rulesCrashed ${n} != 0`);
      }
      continue;
    }
    if (field === "findings") {
      const n = result.findings.length;
      if (assertion.startsWith("==")) {
        const want = Number(assertion.slice(2));
        if (n !== want) throw new Error(`${binding}: findings ${n} != ${want}`);
      } else if (assertion.startsWith(">=")) {
        const want = Number(assertion.slice(2));
        if (n < want) throw new Error(`${binding}: findings ${n} < ${want}`);
      } else if (assertion === "0") {
        if (n !== 0) throw new Error(`${binding}: findings ${n} != 0`);
      }
      continue;
    }
    if (field === "partial") {
      if (assertion === "true" && !result.partial) {
        throw new Error(`${binding}: partial is false`);
      }
      if (assertion === "false" && result.partial) {
        throw new Error(`${binding}: partial is true`);
      }
      continue;
    }
    if (field === "reason") {
      const reason = result.reason ?? "";
      const needle = assertion.replace(/^contains:/, "").replace(/^==/, "");
      if (assertion.startsWith("contains:")) {
        if (!reason.includes(needle)) {
          throw new Error(`${binding}: reason "${reason}" lacks "${needle}"`);
        }
      } else if (reason !== needle) {
        throw new Error(`${binding}: reason "${reason}" != "${needle}"`);
      }
      continue;
    }
    if (field === "score") {
      if (assertion === "null-marker") {
        if (result.score !== null) {
          throw new Error(`${binding}: score ${result.score} is not null`);
        }
      }
      continue;
    }
    if (field === "testFileCount") {
      const n = result.testFileCount ?? 0;
      const want = Number(assertion.replace(/^==/, ""));
      if (n !== want)
        throw new Error(`${binding}: testFileCount ${n} != ${want}`);
      continue;
    }
    if (field === "skippedFiles") {
      const n = result.analysisStatus?.skippedFiles ?? 0;
      if (assertion.startsWith(">=")) {
        const want = Number(assertion.slice(2));
        if (n < want)
          throw new Error(`${binding}: skippedFiles ${n} < ${want}`);
      }
      continue;
    }
    throw new Error(`unknown report field binding: ${binding}`);
  }
}

function splitBinding(binding: string): [string, string] {
  const at = binding.indexOf(":");
  return [binding.slice(0, at).trim(), binding.slice(at + 1).trim()];
}

/**
 * Mutation-protocol mechanics (plan §6): for a case's report-field
 * binding, produce the FALSE-GREEN TWIN of the honest report — the
 * report a masked failure would have produced — by negating exactly the
 * bound field. The protocol then requires the case's own assertion
 * (assertReportFields) to THROW on the twin; a binding that survives its
 * negation is decorative and the protocol fails CI.
 */
export function negateReportField(
  result: ScanResult,
  binding: string,
): ScanResult {
  const [field, assertion] = splitBinding(binding);
  const clone: ScanResult = structuredClone(result);
  const st = clone.analysisStatus;
  switch (field) {
    case "analysisStatus.rules":
      st.rules = assertion === "==partial" ? "complete" : "partial";
      break;
    case "analysisStatus.discovery":
      st.discovery = assertion === "==partial" ? "complete" : "partial";
      break;
    case "truncationReasons":
      st.truncationReasons = assertion === "non-empty" ? [] : ["file-budget"];
      break;
    case "rulesCrashed":
      st.rulesCrashed = 0;
      break;
    case "findings":
      // The false-green twin of ANY findings expectation is the empty
      // set — the masked failure produced no findings (>=1 → 0 is the
      // exact mask the protocol must catch).
      clone.findings = [];
      break;
    case "partial":
      clone.partial = assertion === "true" ? false : true;
      break;
    case "score":
      clone.score = 100;
      break;
    case "reason":
      delete (clone as { reason?: string }).reason;
      break;
    case "testFileCount":
      clone.testFileCount = 999;
      break;
    case "skippedFiles":
      st.skippedFiles = 0;
      break;
    default:
      throw new Error(`no negation rule for binding: ${binding}`);
  }
  return clone;
}

function expectIf(assertion: string, actual: string, binding: string): void {
  const want = assertion.replace(/^==/, "").trim();
  if (actual !== want) {
    throw new Error(`${binding}: expected "${want}", got "${actual}"`);
  }
}

/** Shared temp-dir existence guard (readability in cases). */
export function dirExists(p: string): boolean {
  return existsSync(p);
}
