import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

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

// The scan and the error shape are shared with the commands that moved out in
// carve 1.6.1, and `milestone-args` owns the argument layer. Both are exported
// rather than copied: a governance rule that exists twice can disagree with
// itself, and the copy a pipeline runs is the one that has to be right.
export { milestoneError, runMilestoneScan };
export {
  isWorkflowFile,
  parseMilestoneArgs,
  rejectUnexpectedOptions,
  validateTarget,
  type MilestoneArgs,
} from "./milestone-args.js";
import {
  isWorkflowFile,
  parseMilestoneArgs,
  rejectUnexpectedOptions,
  validateTarget,
  type MilestoneArgs,
} from "./milestone-args.js";
import { loadSuppressions } from "../config/suppressions.js";
import { parseJsonFile, isRecord } from "../lib/safe-json.js";
import { compareCodePoints } from "../lib/compare.js";
import { type Finding, type ScanResult } from "../types.js";
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
import {} from "../engine/historical-trust.js";
import {} from "../engine/machine-contract.js";
import {} from "../engine/machine-contract-verification.js";
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

interface MilestoneScan {
  result: ScanResult;
  preSuppressionFindings: Finding[];
  files: Array<{ path: string; text: string }>;
  readSkipped: number;
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
    files.sort((left, right) => compareCodePoints(left.path, right.path));
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

const STRICT_SUPPRESSION_POLICY: SuppressionPolicyConfig = {
  ...DEFAULT_SUPPRESSION_POLICY,
  requireExpiration: true,
  maxExpiredSuppressions: 0,
};

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
