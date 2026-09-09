/**
 * Runtime corroboration (Verification Trust Evolution Plan §16).
 *
 * Fuses a static scan's findings with a real run report
 * (`ForensicsReport`, ingested by src/forensics/ from Playwright JSON /
 * JUnit XML) and stamps each finding with:
 *   - `runtimeCorroboration` — what the run could vouch for
 *     (file / test / defect granularity), absent when nothing matched;
 *   - `trustLevel` — the overall L0–L5 ladder (see TRUST_ORDER in
 *     types.ts). The INVARIANT is structural: L3–L5 are only ever
 *     produced WITH a runtimeCorroboration value — a static-only
 *     finding can never claim L4/L5 (No False Proof).
 *
 * Matching is by FILE + LINE containment against the report's verdicts
 * (the report knows each executed test's file, title, and attempt
 * outcomes — it does not know line ranges, so "test" granularity means
 * the finding's line falls between two matched tests' first lines of
 * the same file; a conservative approximation that prefers claiming
 * LESS: when the report cannot place the line inside a specific test,
 * corroboration stays at file level).
 *
 * Pure functions only — the CLI decides WHEN to call this (a report
 * next to the scan target, the same auto-discovery convention as
 * `mjolnir forensics`: `mjolnir.report.json` / `test-results/`).
 */

import type { Finding, RuntimeCorroboration, TrustLevel } from "../types.js";
import type { ForensicsReport } from "../forensics/types.js";
import {
  buildEvidenceRecords,
  countTestsIn,
  findTestAt,
  type EvidenceRecord,
} from "./evidence-core.js";

/**
 * Stamp runtime corroboration + trust levels onto findings (mutates in
 * place, the same contract as stampEvidenceLevels). Returns the number
 * of findings that gained runtime corroboration.
 *
 * WI-2 (Canonical Evidence Core): matching is delegated to the core —
 * `evidence` is the pipeline's normalized record set; when omitted, the
 * records are built from the report internally. Either way the stamped
 * output is identical (preservation suite pins this).
 */
export function stampRuntimeCorroboration(
  findings: Finding[],
  report: ForensicsReport,
  evidence?: EvidenceRecord[],
): number {
  const records = evidence ?? buildEvidenceRecords(report, "runtime-report");

  let corroborated = 0;
  for (const f of findings) {
    const testsExecuted = countTestsIn(records, f.file);
    if (testsExecuted === 0) continue;

    const matched = findTestAt(records, f.file, f.line);
    let corroboration: RuntimeCorroboration;
    if (matched) {
      corroboration = {
        level: "test",
        source: report.source,
        testsExecuted,
        matchedTest: {
          title: matched.title,
          finalStatus: matched.status.final,
          attempts: matched.attempts,
          passedOnRetry: matched.status.passedOnRetry,
          everFailed: matched.status.failed,
          skipped: matched.status.skipped,
        },
      };
    } else {
      corroboration = {
        level: "file",
        source: report.source,
        testsExecuted,
      };
    }
    // L5 — the run verdict directly corroborates the DEFECT class:
    // flake-risk findings whose test actually flaked/retried/timed out.
    const flakeCorroborated =
      f.qaImpact === "FLAKY-RISK" &&
      matched !== undefined &&
      (matched.status.passedOnRetry ||
        matched.status.failed ||
        matched.status.final === "timedOut");
    if (flakeCorroborated) corroboration.level = "defect";
    f.runtimeCorroboration = corroboration;
    f.trustLevel = deriveTrustLevel(f, corroboration);
    corroborated++;
  }
  return corroborated;
}

/**
 * (Matching semantics live in the evidence core — `findTestAt`. The
 * doc comments below were the pre-core contract and are preserved
 * there; Audit W8's honesty rule is enforced by `findTestAt` verbatim:
 * a record without a declaration line can never produce a test-level
 * match.)
 */

/**
 * The deterministic L0–L5 derivation (see TRUST_ORDER). Static base
 * from the E-ladder; runtime evidence upgrades, never downgrades.
 * L3/L4/L5 REQUIRE a corroboration value — structurally impossible to
 * produce L4/L5 for a static-only finding.
 */
export function deriveTrustLevel(
  finding: Pick<Finding, "evidenceLevel" | "findingType" | "confidence">,
  corroboration?: RuntimeCorroboration,
): TrustLevel {
  let level: "E0" | "E1" | "E2";
  if (finding.evidenceLevel !== undefined) {
    level = finding.evidenceLevel;
  } else if (finding.findingType === "observation") {
    level = "E0";
  } else if (finding.findingType === "heuristic-risk") {
    level = "E1";
  } else if (finding.confidence === "low") {
    level = "E1";
  } else {
    level = "E2";
  }
  if (!corroboration) {
    if (level === "E0") return "L0";
    if (level === "E1") return "L1";
    return "L2";
  }
  if (corroboration.level === "defect") return "L5";
  if (corroboration.level === "test") return "L4";
  return "L3";
}

/** Findings split for reporters (plan §16: "verified vs assumed"). */
export interface VerifiedSplit {
  /** L3–L5: the run report speaks about this finding's code. */
  runtimeVerified: Finding[];
  /** L0–L2: static evidence only — the run report said nothing. */
  assumed: Finding[];
}

export function splitByRuntimeEvidence(
  findings: readonly Finding[],
): VerifiedSplit {
  const runtimeVerified: Finding[] = [];
  const assumed: Finding[] = [];
  for (const f of findings) {
    if (f.runtimeCorroboration !== undefined) runtimeVerified.push(f);
    else assumed.push(f);
  }
  return { runtimeVerified, assumed };
}
