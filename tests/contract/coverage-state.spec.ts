/**
 * Contract v2: the withheld-rule set is in the contract, the digest, and the
 * exit path.
 *
 * Three claims, and each one was false before this release:
 *
 *  1. A machine reading `completeness.rules === "complete"` from a scan that
 *     ran 45 of 79 detectors. The rules were removed before the walk started,
 *     so nothing "failed" — the field had nothing to report.
 *  2. Two scans differing only in which rules could run hashed identically.
 *     `canonicalScanJson` carried no coverage input at all, so the digest
 *     could not distinguish them. That is the same class of defect as
 *     omitting a value from a checksum, and it is why this is a VERSION
 *     bump rather than an additive field.
 *  3. `--require-full-coverage` did not exist, so a project that wanted
 *     quarantine-tier rules live had no way to say so.
 *
 * The governing constraint is asserted as directly as it can be: `partial`
 * gains NO input from all of this. `partial` drives `scanExitCode`, SARIF
 * `executionSuccessful` and whether generated CI blocks; adding a
 * withheld-rule input to it would make every ordinary non-`--strict` scan
 * exit 2, and a gate that cannot pass is a gate people stop reading.
 */

import { describe, expect, it } from "vitest";

import {
  buildMachineContract,
  CONTRACT_VERSION,
} from "../../src/engine/machine-contract.js";
import { deriveCompletion } from "../../src/engine/completion.js";
import { scanExitCode } from "../../src/claim-evidence.js";
import { getQuarantinedRules } from "../../src/rules/measurement-status.js";
import { RULES } from "../../src/rules/index.js";
import type { ScanResult } from "../../src/types.js";

function makeResult(
  overrides: Partial<ScanResult["analysisStatus"]> = {},
): ScanResult {
  return {
    score: 90,
    partial: false,
    findings: [],
    frameworkDetectionUnknown: false,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      rulesCrashed: 0,
      parseFallbacks: 0,
      durationMs: 1,
      coverageState: "COMPLETE",
      rulesApplied: RULES.length,
      rulesWithheld: 0,
      ...overrides,
    },
  } as unknown as ScanResult;
}

describe("the version bump is deliberate, not incidental", () => {
  it("the contract is at version 2", () => {
    // Written as a literal on purpose. Every other place reads
    // CONTRACT_VERSION, which is right — a test that fails on every bump
    // teaches people to bump the test and move on. This one asks the
    // question a bump is supposed to answer: which version is this.
    expect(CONTRACT_VERSION).toBe(2);
  });
});

describe("coverageState is orthogonal to partial", () => {
  const base = {
    discoveryTruncated: false,
    rulesPartial: false,
    skippedFiles: 0,
    rulesCrashed: 0,
    truncationReasons: [],
    scopeIgnored: 0,
    scopeUnrecognized: 0,
    parseFailed: 0,
  };

  it("a withheld rule produces PARTIAL coverage and a clean partial:false", () => {
    const state = deriveCompletion({
      ...base,
      rulesWithheld: 34,
      rulesApplied: 45,
    });
    expect(state.coverageState).toBe("PARTIAL");
    // The load-bearing assertion. A scan that read every file it was given
    // and crashed no rule IS complete in the `partial` sense.
    expect(state.partial).toBe(false);
    expect(state.analysisStatus.rules).toBe("complete");
  });

  it("a scan that withheld nothing is COMPLETE", () => {
    const state = deriveCompletion({
      ...base,
      rulesWithheld: 0,
      rulesApplied: 79,
    });
    expect(state.coverageState).toBe("COMPLETE");
    expect(state.partial).toBe(false);
  });

  it("a genuinely partial scan is still partial, whatever the coverage says", () => {
    const state = deriveCompletion({
      ...base,
      discoveryTruncated: true,
      rulesWithheld: 0,
    });
    expect(state.partial).toBe(true);
    expect(state.coverageState).toBe("COMPLETE");
  });

  it("never puts a withheld-rule string into reasons", () => {
    // `reasons` is folded into report loadability (report-io.partialMarkers)
    // and is a closed-ish consumer surface. A withheld rule is not an
    // in-flight degradation, so it must not appear there.
    const state = deriveCompletion({
      ...base,
      rulesWithheld: 34,
      rulesApplied: 45,
    });
    expect(state.analysisStatus.reasons).toEqual([]);
    expect(state.analysisStatus.rulesWithheld).toBe(34);
    expect(state.analysisStatus.rulesApplied).toBe(45);
  });

  it("the repository really does withhold rules without --strict", () => {
    // The field is not a theory: the quarantine tier is non-empty today, so
    // every ordinary scan is coverage-PARTIAL. If this ever goes to zero the
    // release acceptance test needs re-deriving, and this says so.
    expect(getQuarantinedRules(RULES).length).toBeGreaterThan(0);
  });
});

describe("the contract carries the coverage set", () => {
  it("completeness reports coverageState, rulesApplied and rulesWithheld", () => {
    const contract = buildMachineContract(
      makeResult({
        coverageState: "PARTIAL",
        rulesApplied: 45,
        rulesWithheld: 34,
      }),
    );
    expect(contract.completeness.coverageState).toBe("PARTIAL");
    expect(contract.completeness.rulesApplied).toBe(45);
    expect(contract.completeness.rulesWithheld).toBe(34);
    // Still not partial. These are different questions.
    expect(contract.completeness.partial).toBe(false);
    expect(contract.completeness.rules).toBe("complete");
  });

  it("the digest separates two scans that differ only in coverage", () => {
    const full = buildMachineContract(makeResult());
    const withheld = buildMachineContract(
      makeResult({
        coverageState: "PARTIAL",
        rulesApplied: 45,
        rulesWithheld: 34,
      }),
    );
    // Identical findings, identical score, identical partial flag — and the
    // digests must differ. If they matched, the digest would be unable to
    // answer "were these the same rules?", which is the only question a
    // consumer has with a digest.
    expect(withheld.summary.findings).toBe(full.summary.findings);
    expect(withheld.summary.score).toBe(full.summary.score);
    expect(withheld.summary.digest).not.toBe(full.summary.digest);
  });

  it("the digest separates two scans that differ only in degradations", () => {
    // The second half of the same defect: the ledger was computed and then
    // dropped from both the digest and the completeness literal.
    const clean = buildMachineContract(makeResult());
    const degraded = buildMachineContract(
      makeResult({ degradations: [{ reason: "ast-unavailable", count: 3 }] }),
    );
    expect(degraded.completeness.degradations).toEqual([
      { reason: "ast-unavailable", count: 3 },
    ]);
    expect(degraded.summary.digest).not.toBe(clean.summary.digest);
  });

  it("durationMs still does not change the digest", () => {
    // The other half of the rule: wall-clock is not semantics. The
    // coverage fields must not have been added by copying the exclusion the
    // wrong way.
    const fast = buildMachineContract(makeResult({ durationMs: 1 }));
    const slow = buildMachineContract(makeResult({ durationMs: 99_999 }));
    expect(slow.summary.digest).toBe(fast.summary.digest);
  });
});

describe("--require-full-coverage is the opt-in that lets it gate", () => {
  const noFindings: never[] = [];

  it("a withheld-rule scan exits clean without the flag", () => {
    expect(
      scanExitCode({ partial: false, findings: noFindings, gate: "error" }),
    ).toBe(0);
  });

  it("a withheld-rule scan exits 2 with the flag", () => {
    expect(
      scanExitCode({
        partial: false,
        findings: noFindings,
        gate: "error",
        rulesWithheld: 34,
        requireFullCoverage: true,
      }),
    ).toBe(2);
  });

  it("the flag with nothing withheld is a clean exit", () => {
    expect(
      scanExitCode({
        partial: false,
        findings: noFindings,
        gate: "error",
        rulesWithheld: 0,
        requireFullCoverage: true,
      }),
    ).toBe(0);
  });

  it("advisory gating does not suppress the flag", () => {
    // Same law as `partial`: no gate level turns an inconclusive result
    // into a pass. `--blocking none` suppresses findings, not coverage.
    expect(
      scanExitCode({
        partial: false,
        findings: noFindings,
        gate: "advisory",
        rulesWithheld: 34,
        requireFullCoverage: true,
      }),
    ).toBe(2);
  });

  it("an unknown withheld count is not a failure", () => {
    // A producer that predates the field has not claimed zero coverage, and
    // inventing a failure for it would make every old integration go red on
    // upgrade for a reason it cannot fix.
    expect(
      scanExitCode({
        partial: false,
        findings: noFindings,
        gate: "error",
        requireFullCoverage: true,
      }),
    ).toBe(0);
  });
});
