/**
 * M11 — Machine Contract Verification.
 *
 * Verifies that the machine contract output is consistent with
 * the scan results. Ensures the contract is a faithful
 * projection of the canonical scan result — no fabricated fields,
 * no missing evidence, no drift between the contract and the
 * source data.
 *
 * The contract is the machine-readable truth: every field must
 * be derivable from the scan result, and every derivation must
 * be deterministic.
 */

import { isDeepStrictEqual } from "node:util";

import type { ScanResult } from "../types.js";
import {
  buildMachineContract,
  CONTRACT_VERSION,
  type MachineCompleteness,
  type MachineContract,
} from "./machine-contract.js";

export type VerifiableMachineContract = Omit<
  MachineContract,
  "contractVersion"
> & {
  contractVersion: number;
};

export interface ContractVerificationResult {
  passed: boolean;
  contractVersion: number;
  violations: string[];
  digestMatch: boolean;
  summaryMatch: boolean;
  completenessCheck: string[];
  trustSummaryMatch: boolean;
  provenanceMatch: boolean;
  forensicVerdictsMatch: boolean;
  annotationsMatch: boolean;
  evidenceIntegrity: boolean;
  checks: ContractIntegrityCheck[];
  summary: { findings: number; score: number | null };
  freshScanMatch?: boolean;
  artifactResultMatch?: boolean;
}

export interface ContractIntegrityCheck {
  name: string;
  status: "pass" | "fail" | "warn";
  detail: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalDeepEqual(actual: unknown, expected: unknown): boolean {
  return actual === undefined && expected === undefined
    ? true
    : isDeepStrictEqual(actual, expected);
}

/**
 * Verify that a machine contract is consistent with the scan
 * result it claims to represent. Returns a detailed verification
 * report with any violations found.
 */
export function verifyMachineContract(
  result: ScanResult,
  contract: VerifiableMachineContract = buildMachineContract(result),
): ContractVerificationResult {
  const violations: string[] = [];
  const checks: ContractIntegrityCheck[] = [];
  const expected = buildMachineContract(result);
  const contractRecord: Record<string, unknown> = isRecord(contract)
    ? contract
    : (Object.create(null) as Record<string, unknown>);
  const contractVersion =
    typeof contractRecord.contractVersion === "number"
      ? contractRecord.contractVersion
      : 0;

  // 1. Verify contract version
  const versionMatches = contractVersion === CONTRACT_VERSION;
  if (!versionMatches) {
    violations.push(`Unsupported contract version ${contractVersion}`);
  }
  checks.push({
    name: "contract-version",
    status: versionMatches ? "pass" : "fail",
    detail: versionMatches
      ? `Contract version ${contractVersion} confirmed`
      : `Unsupported contract version ${contractVersion}`,
  });

  // 2. Verify digest integrity
  const suppliedSummary = contractRecord.summary;
  const digestMatch =
    isRecord(suppliedSummary) &&
    suppliedSummary.digest === expected.summary.digest;
  if (!digestMatch) {
    violations.push("Machine contract digest mismatch");
  }
  checks.push({
    name: "digest-integrity",
    status: digestMatch ? "pass" : "fail",
    detail: digestMatch
      ? "Digest matches scan result"
      : "Digest does not match scan result",
  });
  const summaryMatch = isDeepStrictEqual(suppliedSummary, expected.summary);
  if (!summaryMatch) {
    violations.push("Machine contract summary mismatch");
  }
  checks.push({
    name: "summary",
    status: summaryMatch ? "pass" : "fail",
    detail: summaryMatch
      ? "Summary matches scan result"
      : "Summary does not match scan result",
  });

  // 3. Verify trust summary consistency
  const trustSummaryMatch = optionalDeepEqual(
    contractRecord.trustSummary,
    expected.trustSummary,
  );
  if (!trustSummaryMatch) {
    violations.push("Trust summary mismatch");
  }
  checks.push({
    name: "trust-summary",
    status: trustSummaryMatch ? "pass" : "fail",
    detail: trustSummaryMatch
      ? "Trust summary consistent with contract"
      : "Trust summary does not match scan result",
  });

  const provenanceMatch = optionalDeepEqual(
    contractRecord.provenance,
    expected.provenance,
  );
  if (!provenanceMatch) {
    violations.push("Provenance mismatch");
  }
  checks.push({
    name: "provenance",
    status: provenanceMatch ? "pass" : "fail",
    detail: provenanceMatch
      ? "Provenance matches scan result"
      : "Provenance does not match scan result",
  });

  const forensicVerdictsMatch = optionalDeepEqual(
    contractRecord.forensicVerdicts,
    expected.forensicVerdicts,
  );
  if (!forensicVerdictsMatch) {
    violations.push("Forensic verdicts mismatch");
  }
  checks.push({
    name: "forensic-verdicts",
    status: forensicVerdictsMatch ? "pass" : "fail",
    detail: forensicVerdictsMatch
      ? "Forensic verdicts match scan result"
      : "Forensic verdicts do not match scan result",
  });

  // 4. Verify evidence integrity
  const evidenceIntegrity = verifyEvidenceIntegrity(result);
  if (!evidenceIntegrity) {
    violations.push("Evidence integrity check failed");
    checks.push({
      name: "evidence-integrity",
      status: "fail",
      detail: "Evidence in contract does not match scan result",
    });
  } else {
    checks.push({
      name: "evidence-integrity",
      status: "pass",
      detail: "All evidence in contract matches scan result",
    });
  }

  // 5. Verify completeness fields
  const completenessCheck = verifyCompleteness(
    result,
    contractRecord.completeness,
    expected.completeness,
  );
  if (completenessCheck.length > 0) {
    violations.push(...completenessCheck);
    checks.push({
      name: "completeness",
      status: "fail",
      detail: `${completenessCheck.length} completeness violation(s) found`,
    });
  } else {
    checks.push({
      name: "completeness",
      status: "pass",
      detail: "All completeness fields verified",
    });
  }

  // 6. Verify annotations match findings
  const findingCount = Array.isArray(result.findings)
    ? result.findings.length
    : 0;
  const annotationsMatch =
    isDeepStrictEqual(contractRecord.annotations, expected.annotations) &&
    contractRecord.annotationsTruncated === expected.annotationsTruncated;
  if (!annotationsMatch) {
    violations.push("Annotation projection mismatch");
  }
  checks.push({
    name: "annotations",
    status: annotationsMatch ? "pass" : "fail",
    detail: annotationsMatch
      ? `Expected ${findingCount} annotation(s)`
      : `Expected ${expected.annotations.length} annotation(s)`,
  });

  return {
    passed: violations.length === 0,
    contractVersion,
    violations,
    digestMatch,
    summaryMatch,
    completenessCheck,
    trustSummaryMatch,
    provenanceMatch,
    forensicVerdictsMatch,
    annotationsMatch,
    evidenceIntegrity,
    checks,
    summary: {
      findings: findingCount,
      score: result.score,
    },
  };
}

function verifyEvidenceIntegrity(result: ScanResult): boolean {
  if (!Array.isArray(result.findings)) return false;
  for (const finding of result.findings) {
    if (
      !finding.ruleId ||
      !finding.file ||
      !finding.message ||
      !Number.isInteger(finding.line) ||
      finding.line < 1 ||
      !Number.isInteger(finding.column) ||
      finding.column < 1
    ) {
      return false;
    }
  }
  return true;
}

function verifyCompleteness(
  result: ScanResult,
  completeness: unknown,
  expected: MachineCompleteness,
): string[] {
  const violations: string[] = [];

  if (!isRecord(completeness)) {
    return ["Missing completeness"];
  }
  const supplied = completeness as unknown as MachineCompleteness;
  if (supplied.partial !== result.partial) {
    violations.push("Partial flag mismatch");
  }
  if (!isDeepStrictEqual(supplied, expected)) {
    violations.push("Completeness projection mismatch");
  }
  if (!result.analysisStatus) {
    violations.push("Missing analysisStatus");
  }

  return violations;
}

export function renderContractVerification(
  result: ContractVerificationResult,
): string {
  const lines: string[] = [];
  lines.push("Machine Contract Verification");
  lines.push(`Result: ${result.passed ? "PASSED" : "FAILED"}`);
  lines.push(`Contract Version: ${result.contractVersion}`);
  lines.push(`Digest Match: ${result.digestMatch}`);
  lines.push(`Summary Match: ${result.summaryMatch}`);
  lines.push(`Trust Summary Match: ${result.trustSummaryMatch}`);
  lines.push(`Provenance Match: ${result.provenanceMatch}`);
  lines.push(`Forensic Verdicts Match: ${result.forensicVerdictsMatch}`);
  lines.push(`Annotations Match: ${result.annotationsMatch}`);
  lines.push(`Evidence Integrity: ${result.evidenceIntegrity}`);
  if (result.freshScanMatch !== undefined) {
    lines.push(`Fresh Scan Match: ${result.freshScanMatch}`);
  }
  if (result.artifactResultMatch !== undefined) {
    lines.push(`Artifact Result Match: ${result.artifactResultMatch}`);
  }
  lines.push(`Findings: ${result.summary.findings}`);
  lines.push(`Score: ${result.summary.score}`);
  lines.push("");

  if (result.violations.length > 0) {
    lines.push("Violations:");
    for (const v of result.violations) {
      lines.push(`  ✗ ${v}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
