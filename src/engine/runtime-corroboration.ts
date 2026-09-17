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
 *
 * @param scanRoot - when provided, report file paths are normalized to
 *   repo-relative forward-slash form relative to this root, so platform
 *   absolute paths from runtime reports match the pipeline's
 *   normalized relative paths (src/foo.test.ts).
 */
export function stampRuntimeCorroboration(
  findings: Finding[],
  report: ForensicsReport,
  scanRoot?: string,
): number {
  const normalize = (p: string): string => {
    let n = p.replace(/\\/g, "/");
    if (scanRoot) {
      const root = scanRoot.replace(/\\/g, "/").replace(/\/?$/, "/");
      if (n.startsWith(root)) n = n.slice(root.length);
    }
    return n.replace(/^\.\//, "").replace(/^\/+/, "");
  };

  // Group verdicts per file once; verdicts keep report order, which for
  // Playwright JSON is suite order (ascending-ish by file section).
  const byFile = new Map<string, TestVerdict[]>();
  for (const v of report.verdicts) {
    const key = normalize(v.file);
    const list = byFile.get(key) ?? [];
    list.push(v);
    byFile.set(key, list);
  }

  let corroborated = 0;
  for (const f of findings) {
    const verdicts = byFile.get(f.file);
    if (!verdicts || verdicts.length === 0) continue;

    // testsExecuted excludes skipped tests — a skipped test did not
    // exercise any code path and claiming execution would be a false proof.
    const testsExecuted = verdicts.filter((v) => !v.skipped).length;
    const matched = findContainingTest(verdicts, f.line);
    let corroboration: RuntimeCorroboration;

    // A matched test that was skipped cannot corroborate at test level.
    // Per types.ts L3: "tests in that file executed" — skipped tests did
    // not execute. When ALL tests in the file were skipped (testsExecuted
    // === 0), there is no runtime evidence at all — skip corroboration
    // entirely so the finding stays at its static trust level (L0/L1/L2).
    if (testsExecuted === 0) {
      continue;
    }

    if (matched && !matched.skipped) {
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
          skipped: false,
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
      !matched.skipped &&
      (matched.passedOnRetry || matched.finalStatus === "timedOut");
    if (
      flakeCorroborated &&
      deriveTrustLevel(f, { ...corroboration, level: "defect" }) === "L5"
    ) {
      corroboration.level = "defect";
    }

    f.runtimeCorroboration = corroboration;
    f.trustLevel = deriveTrustLevel(f, corroboration);
    corroborated++;
  }
  return corroborated;
}

function findContainingTest(
  verdicts: TestVerdict[],
  line: number,
): TestVerdict | undefined {
  if (!Number.isInteger(line) || line < 1) return undefined;
  if (verdicts.some((v) => v.line === undefined)) return undefined;
  const matches = verdicts.filter((v) => v.line === line);
  return matches.length === 1 ? matches[0] : undefined;
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
  const level =
    finding.evidenceLevel ??
    (finding.findingType === "observation"
      ? "E0"
      : finding.findingType === "heuristic-risk"
        ? "E1"
        : finding.confidence === "low"
          ? "E1"
          : "E2");
  if (!corroboration)
    return level === "E0" ? "L0" : level === "E1" ? "L1" : "L2";
  if (corroboration.level === "defect") return level === "E0" ? "L4" : "L5";
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
    (f.runtimeCorroboration !== undefined ? runtimeVerified : assumed).push(f);
  }
  return { runtimeVerified, assumed };
}
