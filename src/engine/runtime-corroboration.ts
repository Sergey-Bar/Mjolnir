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
import type { ForensicsReport, TestVerdict } from "../forensics/types.js";

/**
 * Stamp runtime corroboration + trust levels onto findings (mutates in
 * place, the same contract as stampEvidenceLevels). Returns the number
 * of findings that gained runtime corroboration.
 */
export function stampRuntimeCorroboration(
  findings: Finding[],
  report: ForensicsReport,
): number {
  // Group verdicts per file once; verdicts keep report order, which for
  // Playwright JSON is suite order (ascending-ish by file section).
  const byFile = new Map<string, TestVerdict[]>();
  for (const v of report.verdicts) {
    const list = byFile.get(v.file) ?? [];
    list.push(v);
    byFile.set(v.file, list);
  }

  let corroborated = 0;
  for (const f of findings) {
    const verdicts = byFile.get(f.file);
    if (!verdicts || verdicts.length === 0) continue;

    const testsExecuted = verdicts.length;
    const matched = findContainingTest(verdicts, f.line);
    let corroboration: RuntimeCorroboration;
    if (matched) {
      corroboration = {
        level: "test",
        source: report.source,
        testsExecuted,
        matchedTest: {
          title: matched.title,
          finalStatus: matched.finalStatus,
          attempts: matched.attempts,
          passedOnRetry: matched.passedOnRetry,
          everFailed: matched.everFailed,
          skipped: matched.skipped,
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
      (matched.passedOnRetry ||
        matched.everFailed ||
        matched.finalStatus === "timedOut");
    if (flakeCorroborated) corroboration.level = "defect";
    f.runtimeCorroboration = corroboration;
    f.trustLevel = deriveTrustLevel(f, corroboration);
    corroborated++;
  }
  return corroborated;
}

/**
 * The test whose declaration span contains `line`. Playwright JSON
 * verdicts carry the spec's declaration line: the containing test is
 * the one with the greatest declaration line ≤ the finding's line in
 * the same file (specs are flat within a file). When the report cannot
 * place lines (JUnit, or some verdicts lack them) the only HONEST
 * claim is file-level corroboration — plus the unambiguous
 * single-test-file case. Claiming a specific test without range
 * knowledge would fabricate precision the report does not carry.
 */
/**
 * The test whose declaration span contains `line`. Playwright JSON
 * verdicts carry the spec's declaration line: the containing test is
 * the one with the greatest declaration line ≤ the finding's line in
 * the same file (specs are flat within a file). When the report cannot
 * place lines (JUnit, or some verdicts lack them) the only HONEST
 * claim is file-level corroboration — plus the unambiguous
 * single-test-file case. Claiming a specific test without range
 * knowledge would fabricate precision the report does not carry.
 *
 * Audit W8: "the finding line falls inside the verdict's span" is now
 * enforced literally. A verdict WITHOUT a line can never be a test-level
 * match — the old single-verdict shortcut returned `verdicts[0]`
 * unconditionally, so a one-test JUnit report claimed test-level
 * corroboration (and could upgrade to L4/L5) for a finding anywhere in
 * the file, including helpers the run never placed inside that test.
 */
function findContainingTest(
  verdicts: TestVerdict[],
  line: number,
): TestVerdict | undefined {
  if (verdicts.length === 1) {
    const only = verdicts[0] as TestVerdict;
    // The verdict's span starts at its declaration line; without a line
    // the span is unknowable — file-level is the honest ceiling.
    return only.line !== undefined && only.line <= line ? only : undefined;
  }
  for (const v of verdicts) {
    if (v.line === undefined) return undefined;
  }
  const sorted = [...verdicts].sort((a, b) => {
    const la = a.line as number;
    const lb = b.line as number;
    if (la < lb) return -1;
    if (la > lb) return 1;
    return 0;
  });
  let match: TestVerdict | undefined;
  for (const v of sorted) {
    const vl = v.line as number;
    if (vl <= line) match = v;
    else break;
  }
  return match;
}

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
