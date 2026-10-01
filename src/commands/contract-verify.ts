/**
 * `contract-verify` — the machine-contract and exit-code validators, and the
 * command that runs them.
 *
 * The validators are ~280 lines of nested type guards whose whole job is to
 * decide whether a file on disk is the document the tool claims it wrote. They
 * were private inside `commands/milestone.ts`, which is how a 1,049-line file
 * ended up holding two unrelated commands' worth of validation.
 *
 * The verb is NOT folded into `ci verify`, and `docs/cli-contract.json`
 * records why: `ci verify` is the blocking check and does not run these. The
 * merge the plan describes is a behaviour change to a live command, not a
 * rename, and recording it as done while `ci verify` does not do the merging
 * is the same defect as claiming a command exists when it does not.
 *
 * Carve 1.6.1.
 */

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import {
  EXIT_CLEAN,
  EXIT_FINDINGS,
  EXIT_PARTIAL,
  EXIT_USAGE,
} from "../exit-codes.js";
import type { Output } from "../cli-io.js";
import { ConfigValidationError } from "../config/config.js";
import { parseJsonFile, isRecord } from "../lib/safe-json.js";
import { TRUST_ORDER, type ScanResult } from "../types.js";
import {
  ANNOTATIONS_LIMIT,
  buildMachineContract,
  type MachineAnnotation,
  type MachineCompleteness,
  type MachineSummary,
} from "../engine/machine-contract.js";
import {
  renderContractVerification,
  verifyMachineContract,
  type ContractIntegrityCheck,
  type VerifiableMachineContract,
} from "../engine/machine-contract-verification.js";
import {
  milestoneError,
  parseMilestoneArgs,
  rejectUnexpectedOptions,
  runMilestoneScan,
  validateTarget,
} from "./milestone.js";
import { out, err } from "../cli-io.js";
/**
 * A persisted scan result that ALSO carries the contract derived from it.
 *
 * `ScanResult & { contract }`, not a wrapper with a `scan` field: a
 * persisted contract artifact is the scan with its own machine-readable
 * verdict attached, and a reader that has to know which of the two shapes it
 * holds is a reader that will hold it wrong.
 */
export type ContractDocument = ScanResult & {
  contract: VerifiableMachineContract;
};

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

export function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

export function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

export function isValidAnalysisStatus(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    (value.discovery === "complete" || value.discovery === "partial") &&
    (value.rules === "complete" || value.rules === "partial") &&
    isNonNegativeInteger(value.skippedFiles) &&
    isFiniteNumber(value.durationMs) &&
    value.durationMs >= 0 &&
    (value.truncationReasons === undefined ||
      isStringArray(value.truncationReasons)) &&
    (value.rulesCrashed === undefined ||
      isNonNegativeInteger(value.rulesCrashed))
  );
}

export function isValidDimension(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.category === "string" &&
    isFiniteNumber(value.score) &&
    value.score >= 0 &&
    value.score <= 100 &&
    isNonNegativeInteger(value.errors) &&
    isNonNegativeInteger(value.warnings) &&
    isNonNegativeInteger(value.infos)
  );
}

export function isValidFinding(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.ruleId === "string" &&
    value.ruleId.length > 0 &&
    typeof value.category === "string" &&
    typeof value.file === "string" &&
    value.file.length > 0 &&
    isPositiveInteger(value.line) &&
    isPositiveInteger(value.column) &&
    typeof value.message === "string" &&
    value.message.length > 0 &&
    typeof value.severity === "string" &&
    typeof value.confidence === "string" &&
    typeof value.findingType === "string" &&
    typeof value.qaImpact === "string" &&
    typeof value.why === "string" &&
    typeof value.fix === "string"
  );
}

export function isValidTrustSummary(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    // Derived from the ladder: a validator that hard-codes the levels starts
    // rejecting history the moment a rung is added.
    (TRUST_ORDER as readonly string[]).includes(String(value.level)) &&
    isFiniteNumber(value.confidence) &&
    value.confidence >= 0 &&
    value.confidence <= 1 &&
    isFiniteNumber(value.evidenceCoverage) &&
    value.evidenceCoverage >= 0 &&
    value.evidenceCoverage <= 1 &&
    isFiniteNumber(value.inconclusiveRate) &&
    value.inconclusiveRate >= 0 &&
    value.inconclusiveRate <= 1 &&
    (value.measuredFpOfFiredRules === undefined ||
      (isFiniteNumber(value.measuredFpOfFiredRules) &&
        value.measuredFpOfFiredRules >= 0 &&
        value.measuredFpOfFiredRules <= 1)) &&
    isStringArray(value.provisionalRuleIds) &&
    (value.confidenceCeiling === undefined ||
      (isFiniteNumber(value.confidenceCeiling) &&
        value.confidenceCeiling >= 0 &&
        value.confidenceCeiling <= 1)) &&
    isStringArray(value.ceilingReasons)
  );
}

export function isValidProvenance(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isNonNegativeInteger(value.testFiles) &&
    isNonNegativeInteger(value.generatedMarkedFiles) &&
    isNonNegativeInteger(value.codegenLikeFiles) &&
    isFiniteNumber(value.shareMarkedGenerated) &&
    value.shareMarkedGenerated >= 0 &&
    value.shareMarkedGenerated <= 1 &&
    isNonNegativeInteger(value.findingsInGeneratedFiles) &&
    isNonNegativeInteger(value.findingsInUnmarkedFiles) &&
    typeof value.note === "string"
  );
}

export function isValidForensicVerdicts(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.byVerdict)) return false;
  return (
    isNonNegativeInteger(value.classifications) &&
    isNonNegativeInteger(value.inconclusive) &&
    Object.values(value.byVerdict).every((count) => isNonNegativeInteger(count))
  );
}

export function isValidSummary(value: unknown): value is MachineSummary {
  if (!isRecord(value)) return false;
  return (
    typeof value.digest === "string" &&
    value.digest.length > 0 &&
    isNonNegativeInteger(value.findings) &&
    (value.score === null ||
      (isFiniteNumber(value.score) &&
        value.score >= 0 &&
        value.score <= 100)) &&
    isNonNegativeInteger(value.errors) &&
    isNonNegativeInteger(value.warnings) &&
    isNonNegativeInteger(value.infos) &&
    isNonNegativeInteger(value.advisory)
  );
}

export function isValidAnnotation(value: unknown): value is MachineAnnotation {
  if (!isRecord(value)) return false;
  return (
    typeof value.path === "string" &&
    value.path.length > 0 &&
    isPositiveInteger(value.start_line) &&
    (value.annotation_level === "failure" ||
      value.annotation_level === "warning" ||
      value.annotation_level === "notice") &&
    typeof value.message === "string" &&
    typeof value.ruleId === "string" &&
    value.ruleId.length > 0 &&
    (value.detectorRevision === undefined ||
      isPositiveInteger(value.detectorRevision)) &&
    typeof value.advisory === "boolean"
  );
}

export function isValidCompleteness(
  value: unknown,
): value is MachineCompleteness {
  if (!isRecord(value)) return false;
  return (
    typeof value.partial === "boolean" &&
    (value.discovery === "complete" || value.discovery === "partial") &&
    (value.rules === "complete" || value.rules === "partial") &&
    isNonNegativeInteger(value.skippedFiles) &&
    isNonNegativeInteger(value.rulesCrashed) &&
    isStringArray(value.truncationReasons) &&
    typeof value.frameworkDetectionUnknown === "boolean" &&
    isFiniteNumber(value.durationMs) &&
    value.durationMs >= 0
  );
}

export function isValidContract(
  value: unknown,
): value is VerifiableMachineContract {
  if (!isRecord(value)) return false;
  return (
    Number.isSafeInteger(value.contractVersion) &&
    isValidSummary(value.summary) &&
    Array.isArray(value.annotations) &&
    value.annotations.length <= ANNOTATIONS_LIMIT &&
    value.annotations.every((annotation) => isValidAnnotation(annotation)) &&
    typeof value.annotationsTruncated === "boolean" &&
    isValidCompleteness(value.completeness) &&
    (value.trustSummary === undefined ||
      isValidTrustSummary(value.trustSummary)) &&
    (value.provenance === undefined || isValidProvenance(value.provenance)) &&
    (value.forensicVerdicts === undefined ||
      isValidForensicVerdicts(value.forensicVerdicts))
  );
}

export function isScanResultDocument(
  value: unknown,
): value is ContractDocument {
  if (!isRecord(value) || value.schemaVersion !== 1) return false;
  return (
    (value.score === null ||
      (isFiniteNumber(value.score) &&
        value.score >= 0 &&
        value.score <= 100)) &&
    typeof value.partial === "boolean" &&
    isStringArray(value.frameworks) &&
    Array.isArray(value.dimensions) &&
    value.dimensions.every((dimension) => isValidDimension(dimension)) &&
    Array.isArray(value.findings) &&
    value.findings.every((finding) => isValidFinding(finding)) &&
    isValidAnalysisStatus(value.analysisStatus) &&
    (value.agenticProfile === undefined ||
      isValidProvenance(value.agenticProfile)) &&
    (value.trustSummary === undefined ||
      isValidTrustSummary(value.trustSummary)) &&
    (value.forensicVerdicts === undefined ||
      isValidForensicVerdicts(value.forensicVerdicts)) &&
    isValidContract(value.contract)
  );
}

export function emitVerification(
  verification: ReturnType<typeof verifyMachineContract>,
  json: boolean,
  io: { out: Output },
): void {
  if (json) {
    io.out(JSON.stringify(verification, null, 2));
  } else {
    io.out(renderContractVerification(verification));
  }
}

export function cloneContract(
  contract: VerifiableMachineContract,
): VerifiableMachineContract {
  return JSON.parse(JSON.stringify(contract)) as VerifiableMachineContract;
}

export function verifyPersistedContract(
  document: ContractDocument,
  freshResult: ScanResult,
): ReturnType<typeof verifyMachineContract> & {
  freshScanMatch: boolean;
  artifactResultMatch: boolean;
} {
  const artifactVerification = verifyMachineContract(
    document,
    document.contract,
  );
  const freshComparable = cloneContract(document.contract);
  const expected = buildMachineContract(freshResult);
  freshComparable.completeness.durationMs = expected.completeness.durationMs;
  const freshVerification = verifyMachineContract(freshResult, freshComparable);
  const violations = [
    ...artifactVerification.violations,
    ...freshVerification.violations,
  ].filter((value, index, all) => all.indexOf(value) === index);
  if (!freshVerification.passed) {
    violations.push("Persisted contract is not bound to a fresh scan");
  }
  if (!artifactVerification.passed) {
    violations.push(
      "Persisted scan result is not consistent with its contract",
    );
  }
  const checks: ContractIntegrityCheck[] = [
    ...artifactVerification.checks,
    ...freshVerification.checks,
    {
      name: "fresh-scan-binding",
      status:
        freshVerification.passed && artifactVerification.passed
          ? "pass"
          : "fail",
      detail:
        freshVerification.passed && artifactVerification.passed
          ? "Contract matches an independent fresh scan"
          : "Contract is not bound to the current scan",
    },
  ];
  return {
    ...freshVerification,
    passed: violations.length === 0,
    violations: violations.filter(
      (value, index, all) => all.indexOf(value) === index,
    ),
    checks,
    freshScanMatch: freshVerification.passed,
    artifactResultMatch: artifactVerification.passed,
  };
}

export async function runContractVerifyCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseMilestoneArgs(argv, io);
  if (!args) return EXIT_USAGE;
  if (rejectUnexpectedOptions(args, new Set(["contract"]), io)) {
    return EXIT_USAGE;
  }
  try {
    if (args.contract) {
      const target = resolve(args.target);
      const valid = validateTarget(target, io);
      if ("code" in valid) return valid.code;
      const path = resolve(target, args.contract);
      let document: ContractDocument;
      try {
        document = parseJsonFile<ContractDocument>(
          readFileSync(path, "utf8"),
          path,
          isScanResultDocument,
        );
      } catch (error) {
        throw new ConfigValidationError(`invalid contract document: ${path}`, {
          cause: error,
        });
      }
      const relativePath = relative(target, path).replaceAll("\\", "/");
      const canHide =
        relativePath !== "" &&
        !relativePath.startsWith("../") &&
        !isAbsolute(relativePath) &&
        existsSync(path);
      const hiddenDirectory = canHide
        ? mkdtempSync(join(tmpdir(), "mjolnir-contract-"))
        : undefined;
      const hiddenPath = hiddenDirectory
        ? join(hiddenDirectory, basename(path))
        : undefined;
      if (hiddenPath) renameSync(path, hiddenPath);
      let fresh: Awaited<ReturnType<typeof runMilestoneScan>>;
      try {
        fresh = await runMilestoneScan(args, io, false);
      } finally {
        if (hiddenPath && existsSync(hiddenPath)) {
          renameSync(hiddenPath, path);
        }
        if (hiddenDirectory)
          rmSync(hiddenDirectory, { recursive: true, force: true });
      }
      if ("code" in fresh) return fresh.code;
      const verification = verifyPersistedContract(document, fresh.result);
      emitVerification(verification, args.json, io);
      if (!verification.passed) return EXIT_FINDINGS;
      if (document.partial || fresh.result.partial) return EXIT_PARTIAL;
      return EXIT_CLEAN;
    }

    const scan = await runMilestoneScan(args, io, false);
    if ("code" in scan) return scan.code;
    const verification = verifyMachineContract(
      scan.result,
      buildMachineContract(scan.result),
    );
    emitVerification(verification, args.json, io);
    if (scan.result.partial) return EXIT_PARTIAL;
    return verification.passed ? EXIT_CLEAN : EXIT_FINDINGS;
  } catch (error) {
    return milestoneError(error, io, argv.includes("--debug"));
  }
}
