import {
  existsSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, relative, resolve } from "node:path";

import {
  EXIT_CLEAN,
  EXIT_FINDINGS,
  EXIT_INTERNAL,
  EXIT_PARTIAL,
  EXIT_USAGE,
} from "../exit-codes.js";
import type { Output } from "../cli-io.js";
import { err, internalErrorMessage, out } from "../cli-io.js";
import { ConfigValidationError } from "../config/config.js";
import { loadSuppressions } from "../config/suppressions.js";
import { parseJsonFile, isRecord } from "../lib/safe-json.js";
import { writeFileAtomic } from "../lib/fs-atomic.js";
import { TRUST_ORDER, type Finding, type ScanResult } from "../types.js";
import {
  renderCrossFileAnalysis,
  analyzeCrossFileSignals,
} from "../engine/cross-file-analysis.js";
import {
  buildEvidenceGraphFromScan,
  queryFindingsByFile,
  queryFindingsByRule,
  renderEvidenceGraphResult,
} from "../engine/evidence-graph.js";
import {
  getAllFrameworkMaturity,
  getFrameworkMaturity,
  getPlaywrightMaturityReport,
  renderPlaywrightMaturityReport,
} from "../engine/framework-maturity.js";
import {
  analyzeTrustTrends,
  computeTrustSnapshot,
  renderTrustTrend,
  type TrustSnapshot,
} from "../engine/historical-trust.js";
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
  KNOWN_RULE_IDS,
  runScan,
  type CliArgs,
} from "../engine/scan-pipeline.js";
import {
  computeSuppressionGovernanceGate,
  DEFAULT_SUPPRESSION_POLICY,
  renderSuppressionGovernanceResult,
  type SuppressionPolicyConfig,
} from "../engine/suppression-governance.js";
import type { SuppressionEntry } from "../engine/suppression-integrity.js";
import {
  computeVerificationIntelligence,
  renderCIIntegrityReport,
} from "../engine/verification-intelligence.js";

interface MilestoneArgs {
  target: string;
  json: boolean;
  maxDurationMs: number;
  framework?: string;
  policy?: string;
  history?: string;
  recordedAt?: string;
  contract?: string;
  file?: string;
  rule?: string;
}

interface MilestoneScan {
  result: ScanResult;
  preSuppressionFindings: Finding[];
  files: Array<{ path: string; text: string }>;
  readSkipped: number;
}

const STRICT_SUPPRESSION_POLICY: SuppressionPolicyConfig = {
  ...DEFAULT_SUPPRESSION_POLICY,
  requireExpiration: true,
  maxExpiredSuppressions: 0,
};

function startsWithFlag(value: string): boolean {
  return value.charCodeAt(0) === 45;
}

function parseMilestoneArgs(
  argv: string[],
  io: { err: Output },
): MilestoneArgs | null {
  const args: MilestoneArgs = {
    target: ".",
    json: false,
    maxDurationMs: Number.POSITIVE_INFINITY,
  };
  let targetSeen = false;

  const value = (index: number, flag: string): string | null => {
    const candidate = argv[index];
    if (candidate === undefined || startsWithFlag(candidate)) {
      io.err(`mjolnir: ${flag} requires a value`);
      return null;
    }
    return candidate;
  };

  for (let index = 0; index < argv.length; index++) {
    const token = argv[index] ?? "";
    switch (token) {
      case "--json":
        args.json = true;
        break;
      case "--format": {
        const format = value(++index, "--format");
        if (format === null) return null;
        if (format === "json") args.json = true;
        else if (format !== "terminal") {
          io.err("mjolnir: milestone commands support --format terminal|json");
          return null;
        }
        break;
      }
      case "--no-progress":
        break;
      case "--max-duration": {
        const raw = value(++index, "--max-duration");
        if (raw === null) return null;
        const seconds = Number(raw);
        if (!Number.isFinite(seconds) || seconds <= 0) {
          io.err("mjolnir: --max-duration requires positive seconds");
          return null;
        }
        args.maxDurationMs = seconds * 1000;
        break;
      }
      case "--framework": {
        const framework = value(++index, "--framework");
        if (framework === null) return null;
        args.framework = framework;
        break;
      }
      case "--policy": {
        const policy = value(++index, "--policy");
        if (policy === null) return null;
        args.policy = policy;
        break;
      }
      case "--history": {
        const history = value(++index, "--history");
        if (history === null) return null;
        args.history = history;
        break;
      }
      case "--recorded-at": {
        const recordedAt = value(++index, "--recorded-at");
        if (recordedAt === null || Number.isNaN(Date.parse(recordedAt))) {
          io.err("mjolnir: --recorded-at requires an ISO-8601 timestamp");
          return null;
        }
        args.recordedAt = recordedAt;
        break;
      }
      case "--contract": {
        const contract = value(++index, "--contract");
        if (contract === null) return null;
        args.contract = contract;
        break;
      }
      case "--file": {
        const file = value(++index, "--file");
        if (file === null) return null;
        args.file = file;
        break;
      }
      case "--rule": {
        const rule = value(++index, "--rule");
        if (rule === null) return null;
        args.rule = rule;
        break;
      }
      default: {
        if (startsWithFlag(token)) {
          io.err(`mjolnir: unknown milestone command flag "${token}"`);
          return null;
        }
        if (targetSeen) {
          io.err("mjolnir: milestone commands accept one target path");
          return null;
        }
        args.target = token;
        targetSeen = true;
      }
    }
  }

  return args;
}

function rejectUnexpectedOptions(
  args: MilestoneArgs,
  allowed: ReadonlySet<keyof MilestoneArgs>,
  io: { err: Output },
): boolean {
  const unexpected = (
    [
      "framework",
      "policy",
      "history",
      "recordedAt",
      "contract",
      "file",
      "rule",
    ] as const
  ).find((key) => args[key] !== undefined && !allowed.has(key));
  if (!unexpected) return false;
  io.err(`mjolnir: option --${unexpected} is not valid for this command`);
  return true;
}

function validateTarget(
  target: string,
  io: { err: Output },
): { target: string } | { code: number } {
  if (!existsSync(target)) {
    io.err(`mjolnir: scan target does not exist: ${target}`);
    return { code: EXIT_USAGE };
  }
  if (!statSync(target).isDirectory()) {
    io.err(`mjolnir: scan target is not a directory: ${target}`);
    return { code: EXIT_USAGE };
  }
  return { target };
}

function isWorkflowFile(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  return (
    normalized.startsWith(".github/workflows/") ||
    normalized === ".gitlab-ci.yml" ||
    normalized === ".gitlab-ci.yaml" ||
    basename(normalized) === "Jenkinsfile"
  );
}

async function runMilestoneScan(
  args: MilestoneArgs,
  io: { err: Output },
  readSources: boolean,
  strict = false,
): Promise<MilestoneScan | { code: number }> {
  const target = resolve(args.target);
  const valid = validateTarget(target, io);
  if ("code" in valid) return valid;
  let discovered: string[] = [];
  let preSuppressionFindings: Finding[] = [];
  const scanArgs: CliArgs = {
    target,
    json: false,
    verbose: false,
    maxDurationMs: args.maxDurationMs,
    scopeChanged: false,
    format: "terminal",
    strict,
  };
  const result = await runScan(scanArgs, {
    onConfigWarning: (message) => io.err(message),
    onGateNotice: (notice) => io.err(notice),
    onTestFilesDiscovered: (files) => {
      const contractPath = args.contract
        ? resolve(args.target, args.contract)
        : undefined;
      if (contractPath) {
        const mutable = files as string[];
        for (let index = mutable.length - 1; index >= 0; index--) {
          const file = mutable[index];
          if (
            file &&
            (isAbsolute(file) ? resolve(file) : resolve(target, file)) ===
              contractPath
          ) {
            mutable.splice(index, 1);
          }
        }
      }
      discovered = [...files];
    },
    onPreSuppressionFindings: (findings) => {
      preSuppressionFindings = [...findings];
    },
  });
  const files: Array<{ path: string; text: string }> = [];
  let readSkipped = 0;
  if (readSources) {
    const contractPath = args.contract
      ? resolve(args.target, args.contract)
      : undefined;
    for (const file of discovered) {
      const absoluteFile = isAbsolute(file)
        ? resolve(file)
        : resolve(target, file);
      if (contractPath && absoluteFile === contractPath) continue;
      const relativePath = relative(target, absoluteFile).replaceAll("\\", "/");
      if (isWorkflowFile(relativePath)) continue;
      try {
        files.push({
          path: relativePath,
          text: readFileSync(absoluteFile, "utf8").replace(/^\uFEFF/, ""),
        });
      } catch {
        readSkipped++;
      }
    }
    files.sort((left, right) => left.path.localeCompare(right.path));
  }
  return { result, preSuppressionFindings, files, readSkipped };
}

function milestoneError(
  error: unknown,
  io: { err: Output },
  debug: boolean,
): number {
  if (error instanceof ConfigValidationError) {
    io.err(error.message);
    return EXIT_USAGE;
  }
  internalErrorMessage(error, io.err, debug);
  return EXIT_INTERNAL;
}

function suppressionEntries(root: string): SuppressionEntry[] {
  return loadSuppressions(root).entries.map((entry) => ({
    ruleId: entry.ruleId,
    reason: entry.reason,
    ...(entry.files ? { files: entry.files } : {}),
    ...(entry.expires ? { expires: entry.expires } : {}),
  }));
}

function numericPolicyValue(
  record: Record<string, unknown>,
  key: keyof SuppressionPolicyConfig,
  fallback: number,
  integer: boolean,
): number {
  const value = record[key];
  if (value === undefined) return fallback;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    (integer && !Number.isSafeInteger(value))
  ) {
    throw new ConfigValidationError(
      `suppression policy field ${key} must be a non-negative${integer ? " integer" : " number"}`,
    );
  }
  return value;
}

function loadPolicy(path: string | undefined): SuppressionPolicyConfig {
  if (!path) return STRICT_SUPPRESSION_POLICY;
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    throw new ConfigValidationError(
      `unable to read suppression policy: ${path}`,
      { cause: error },
    );
  }
  let record: Record<string, unknown>;
  try {
    record = parseJsonFile<Record<string, unknown>>(text, path, isRecord);
  } catch (error) {
    throw new ConfigValidationError(`invalid suppression policy: ${path}`, {
      cause: error,
    });
  }
  const requireExpiration = record.requireExpiration;
  if (
    requireExpiration !== undefined &&
    typeof requireExpiration !== "boolean"
  ) {
    throw new ConfigValidationError(
      "suppression policy field requireExpiration must be boolean",
    );
  }
  const allowedRuleIds = record.allowedRuleIds;
  if (
    allowedRuleIds !== undefined &&
    (!Array.isArray(allowedRuleIds) ||
      allowedRuleIds.some((ruleId) => typeof ruleId !== "string"))
  ) {
    throw new ConfigValidationError(
      "suppression policy field allowedRuleIds must be a string array",
    );
  }
  const maxMassSuppressionRatio = numericPolicyValue(
    record,
    "maxMassSuppressionRatio",
    DEFAULT_SUPPRESSION_POLICY.maxMassSuppressionRatio,
    false,
  );
  if (maxMassSuppressionRatio > 1) {
    throw new ConfigValidationError(
      "suppression policy field maxMassSuppressionRatio must be between 0 and 1",
    );
  }
  return {
    requireExpiration:
      requireExpiration ?? DEFAULT_SUPPRESSION_POLICY.requireExpiration,
    allowedRuleIds: (allowedRuleIds as string[] | undefined) ?? [],
    maxTotalSuppressions: numericPolicyValue(
      record,
      "maxTotalSuppressions",
      DEFAULT_SUPPRESSION_POLICY.maxTotalSuppressions,
      true,
    ),
    maxExpiredSuppressions: numericPolicyValue(
      record,
      "maxExpiredSuppressions",
      DEFAULT_SUPPRESSION_POLICY.maxExpiredSuppressions,
      true,
    ),
    maxMassSuppressionRatio,
  };
}

function isTrustSnapshot(value: unknown): value is TrustSnapshot {
  return (
    isRecord(value) &&
    typeof value.scanId === "string" &&
    typeof value.timestamp === "string" &&
    (typeof value.score === "number" || value.score === null) &&
    typeof value.findings === "number" &&
    typeof value.errors === "number" &&
    typeof value.warnings === "number" &&
    typeof value.infos === "number" &&
    typeof value.advisory === "number" &&
    typeof value.trustLevel === "string" &&
    typeof value.confidence === "number" &&
    typeof value.evidenceCoverage === "number" &&
    typeof value.inconclusiveRate === "number" &&
    typeof value.partial === "boolean" &&
    typeof value.frameworkCount === "number" &&
    typeof value.ruleCount === "number"
  );
}

function loadTrustHistory(path: string): TrustSnapshot[] {
  if (!existsSync(path)) return [];
  try {
    const text = readFileSync(path, "utf8");
    return parseJsonFile<TrustSnapshot[]>(text, path, (candidate) => {
      return (
        Array.isArray(candidate) &&
        candidate.every((entry) => isTrustSnapshot(entry))
      );
    });
  } catch (error) {
    throw new ConfigValidationError(`invalid trust history: ${path}`, {
      cause: error,
    });
  }
}

type ContractDocument = ScanResult & {
  contract: VerifiableMachineContract;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function isValidAnalysisStatus(value: unknown): boolean {
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

function isValidDimension(value: unknown): boolean {
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

function isValidFinding(value: unknown): boolean {
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

function isValidTrustSummary(value: unknown): boolean {
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

function isValidProvenance(value: unknown): boolean {
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

function isValidForensicVerdicts(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.byVerdict)) return false;
  return (
    isNonNegativeInteger(value.classifications) &&
    isNonNegativeInteger(value.inconclusive) &&
    Object.values(value.byVerdict).every((count) => isNonNegativeInteger(count))
  );
}

function isValidSummary(value: unknown): value is MachineSummary {
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

function isValidAnnotation(value: unknown): value is MachineAnnotation {
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

function isValidCompleteness(value: unknown): value is MachineCompleteness {
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

function isValidContract(value: unknown): value is VerifiableMachineContract {
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

function isScanResultDocument(value: unknown): value is ContractDocument {
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

function emitVerification(
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

function cloneContract(
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

export function runFrameworkMaturityCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const args = parseMilestoneArgs(argv, io);
  if (!args) return EXIT_USAGE;
  if (rejectUnexpectedOptions(args, new Set(["framework"]), io)) {
    return EXIT_USAGE;
  }
  const selected = args.framework
    ? getFrameworkMaturity(args.framework)
    : undefined;
  if (args.framework && !selected) {
    io.err(`mjolnir: unknown framework "${args.framework}"`);
    return EXIT_USAGE;
  }
  const frameworks = selected ? [selected] : getAllFrameworkMaturity();
  if (args.json) {
    io.out(
      JSON.stringify(
        {
          calibrationAuthority: "human",
          automatedClosureAllowed: false,
          frameworks,
        },
        null,
        2,
      ),
    );
  } else if (selected?.frameworkId === "playwright") {
    io.out(
      `Calibration authority: human; automated closure is not permitted.\n${renderPlaywrightMaturityReport(getPlaywrightMaturityReport())}`,
    );
  } else {
    io.out("Calibration authority: human; automated closure is not permitted.");
    for (const framework of frameworks) {
      io.out(
        `${framework.frameworkId}: ${framework.currentMaturity} → ${framework.targetMaturity} (${framework.maturityScore}/100)`,
      );
    }
  }
  return EXIT_CLEAN;
}

export async function runSuppressionGateCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseMilestoneArgs(argv, io);
  if (!args) return EXIT_USAGE;
  if (rejectUnexpectedOptions(args, new Set(["policy"]), io)) {
    return EXIT_USAGE;
  }
  try {
    const scan = await runMilestoneScan(args, io, false, true);
    if ("code" in scan) return scan.code;
    const target = resolve(args.target);
    const gate = computeSuppressionGovernanceGate(
      suppressionEntries(target),
      scan.preSuppressionFindings,
      loadPolicy(args.policy ? resolve(target, args.policy) : undefined),
      new Set(KNOWN_RULE_IDS),
      new Date(),
    );
    if (args.json) io.out(JSON.stringify(gate, null, 2));
    else io.out(renderSuppressionGovernanceResult(gate));
    if (scan.result.partial) return EXIT_PARTIAL;
    return gate.passed ? EXIT_CLEAN : EXIT_FINDINGS;
  } catch (error) {
    return milestoneError(error, io, argv.includes("--debug"));
  }
}

export async function runCrossFileCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseMilestoneArgs(argv, io);
  if (!args) return EXIT_USAGE;
  if (rejectUnexpectedOptions(args, new Set(), io)) return EXIT_USAGE;
  try {
    const scan = await runMilestoneScan(args, io, true);
    if ("code" in scan) return scan.code;
    const analysis = analyzeCrossFileSignals(
      scan.files,
      scan.result.findings,
      resolve(args.target),
    );
    if (args.json) io.out(JSON.stringify(analysis, null, 2));
    else io.out(renderCrossFileAnalysis(analysis));
    if (
      scan.result.partial ||
      scan.readSkipped > 0 ||
      scan.files.length === 0
    ) {
      return EXIT_PARTIAL;
    }
    return analysis.signals.length > 0 ? EXIT_FINDINGS : EXIT_CLEAN;
  } catch (error) {
    return milestoneError(error, io, argv.includes("--debug"));
  }
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

export async function runTrustTrendCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseMilestoneArgs(argv, io);
  if (!args) return EXIT_USAGE;
  if (rejectUnexpectedOptions(args, new Set(["history", "recordedAt"]), io)) {
    return EXIT_USAGE;
  }
  try {
    const scan = await runMilestoneScan(args, io, false);
    if ("code" in scan) return scan.code;
    if (!scan.result.runIdentity || !scan.result.trustSummary) {
      if (args.json) {
        io.out(JSON.stringify({ error: "trust_inputs_unavailable" }, null, 2));
      } else {
        io.err("mjolnir: scan did not produce run identity and trust summary");
      }
      return EXIT_PARTIAL;
    }
    const target = resolve(args.target);
    const historyPath = resolve(
      target,
      args.history ?? join(".mjolnir", "trust-history.json"),
    );
    const history = loadTrustHistory(historyPath);
    const snapshot = computeTrustSnapshot(
      scan.result,
      scan.result.runIdentity,
      scan.result.trustSummary,
      args.recordedAt ?? new Date().toISOString(),
    );
    const merged = new Map(
      history.map((entry) => [
        `${entry.scanId}\u0000${entry.timestamp}`,
        entry,
      ]),
    );
    merged.set(`${snapshot.scanId}\u0000${snapshot.timestamp}`, snapshot);
    const snapshots = [...merged.values()].sort(
      (left, right) =>
        left.timestamp.localeCompare(right.timestamp) ||
        left.scanId.localeCompare(right.scanId),
    );
    writeFileAtomic(historyPath, `${JSON.stringify(snapshots, null, 2)}\n`);
    const trend = analyzeTrustTrends(snapshots);
    if (args.json) io.out(JSON.stringify(trend, null, 2));
    else io.out(renderTrustTrend(trend));
    return scan.result.partial ? EXIT_PARTIAL : EXIT_CLEAN;
  } catch (error) {
    return milestoneError(error, io, argv.includes("--debug"));
  }
}

export async function runEvidenceGraphCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseMilestoneArgs(argv, io);
  if (!args) return EXIT_USAGE;
  if (rejectUnexpectedOptions(args, new Set(["file", "rule"]), io)) {
    return EXIT_USAGE;
  }
  if (args.file && args.rule) {
    io.err("mjolnir: evidence-graph accepts --file or --rule, not both");
    return EXIT_USAGE;
  }
  try {
    const scan = await runMilestoneScan(args, io, true);
    if ("code" in scan) return scan.code;
    if (!scan.result.runIdentity) {
      if (args.json) {
        io.out(JSON.stringify({ error: "run_identity_unavailable" }, null, 2));
      } else {
        io.err("mjolnir: scan did not produce a run identity");
      }
      return EXIT_PARTIAL;
    }
    const graph = buildEvidenceGraphFromScan(
      scan.result,
      scan.result.runIdentity,
      scan.files,
    );
    if (args.file || args.rule) {
      const findings = args.file
        ? queryFindingsByFile(scan.result, args.file)
        : queryFindingsByRule(scan.result, args.rule ?? "");
      if (args.json) {
        io.out(JSON.stringify({ findings }, null, 2));
      } else {
        io.out(
          findings.length === 0
            ? "No matching findings."
            : findings
                .map(
                  (finding) =>
                    `${finding.ruleId} ${finding.file}:${finding.line}`,
                )
                .join("\n"),
        );
      }
      return scan.result.partial ? EXIT_PARTIAL : EXIT_CLEAN;
    }
    if (args.json) io.out(JSON.stringify(graph, null, 2));
    else io.out(renderEvidenceGraphResult(graph));
    return scan.result.partial ||
      scan.readSkipped > 0 ||
      scan.files.length === 0
      ? EXIT_PARTIAL
      : EXIT_CLEAN;
  } catch (error) {
    return milestoneError(error, io, argv.includes("--debug"));
  }
}

export async function runCIIntegrityCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseMilestoneArgs(argv, io);
  if (!args) return EXIT_USAGE;
  if (rejectUnexpectedOptions(args, new Set(["policy"]), io)) {
    return EXIT_USAGE;
  }
  try {
    const scan = await runMilestoneScan(args, io, false);
    if ("code" in scan) return scan.code;
    const target = resolve(args.target);
    const report = computeVerificationIntelligence(
      target,
      suppressionEntries(target),
      scan.preSuppressionFindings,
      loadPolicy(args.policy ? resolve(target, args.policy) : undefined),
      new Set(KNOWN_RULE_IDS),
      new Date(),
    );
    if (args.json) io.out(JSON.stringify(report, null, 2));
    else io.out(renderCIIntegrityReport(report));
    if (scan.result.partial) return EXIT_PARTIAL;
    return report.failed > 0 || report.warned > 0 ? EXIT_FINDINGS : EXIT_CLEAN;
  } catch (error) {
    return milestoneError(error, io, argv.includes("--debug"));
  }
}
