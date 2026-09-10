/**
 * `mjolnir trust-report` — the Trust Artifact foundations (Mega MVP
 * Master Plan v3.1 §26 WI-6, §18).
 *
 * Emits deterministic, self-contained `mjolnir-trust-report.{md,json}`
 * (HTML completion is WI-23, 1.3.x): no cloud/account/telemetry/server;
 * PR-attachable, Pages-publishable, README-embeddable,
 * agent-consumable.
 *
 * Reproducibility contract: the same scan result renders byte-identical
 * artifacts — no timestamps, no paths-in-headers beyond the scanned
 * surface itself, stable section order, sorted disclosures. The only
 * wall-clock-free input is the ScanResult + the target label.
 */

import { writeFileSync, statSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import type { ScanResult, TrustSummary } from "../types.js";
import { isAdvisoryFinding } from "../types.js";
import { runScan } from "../engine/scan-pipeline.js";
import {
  nextAction,
  topTrustRisks,
  trustHeadline,
} from "../reporter/trust-report.js";
import { errorMessage, type Output } from "../cli-io.js";

export const TRUST_REPORT_MD = "mjolnir-trust-report.md";
export const TRUST_REPORT_JSON = "mjolnir-trust-report.json";
/** Upsert marker line for PR-comment posting (GitHub Action, WI-9). */
export const TRUST_REPORT_MARKER = "<!-- mjolnir-trust-report:v1 -->";

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function fallbackSummary(result: ScanResult): TrustSummary {
  return (
    result.trustSummary ?? {
      level: "L0",
      confidence: 0,
      evidenceCoverage: 0,
      inconclusiveRate: 0,
      provisionalRuleIds: [],
      ceilingReasons: [],
    }
  );
}

/** Deterministic MD artifact. Same ScanResult + label → same bytes. */
export function renderTrustReportMarkdown(
  result: ScanResult,
  label: string,
): string {
  const s = fallbackSummary(result);
  const lines: string[] = [];

  // Upsert marker: the GitHub Action posts/updates the PR comment by
  // searching for this line — one comment per PR, never a flood.
  lines.push(`<!-- mjolnir-trust-report:v1 -->`);
  lines.push("");
  lines.push(`# Mjölnir Trust Report — ${label}`);
  lines.push("");
  lines.push(
    `> Tests tell you what passed. Mjölnir tells you what you can trust.`,
  );
  lines.push("");
  lines.push(`## Trust verdict`);
  lines.push("");
  lines.push(`- **Level**: ${s.level}`);
  lines.push(`- **Headline**: ${trustHeadline(s)}`);
  lines.push("");
  lines.push(`## Confidence`);
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| ------ | ----- |`);
  lines.push(
    `| Confidence | ${pct(s.confidence)}${s.confidenceCeiling !== undefined ? ` (ceiling ${pct(s.confidenceCeiling)})` : ""} |`,
  );
  lines.push(`| Evidence coverage | ${pct(s.evidenceCoverage)} |`);
  lines.push(`| Inconclusive | ${pct(s.inconclusiveRate)} |`);
  lines.push(
    `| Measured FP (fired) | ${
      s.measuredFpOfFiredRules !== undefined
        ? pct(s.measuredFpOfFiredRules)
        : s.provisionalRuleIds.length > 0
          ? `PROVISIONAL (${s.provisionalRuleIds.length} unmeasured)`
          : "n/a"
    } |`,
  );
  lines.push(`| Score | ${result.score ?? "unknown"} |`);
  lines.push(
    `| Tests analyzed | ${result.testDeclarationCount ?? 0} in ${result.testFileCount ?? 0} files |`,
  );
  lines.push("");
  if (s.ceilingReasons.length > 0) {
    lines.push(`Incompleteness factors: ${s.ceilingReasons.join(", ")}.`);
    lines.push("");
  }
  lines.push(`## Top trust risks`);
  lines.push("");
  const risks = topTrustRisks(result.findings, 10);
  if (risks.length === 0) {
    lines.push(`None — no non-advisory findings fired.`);
  } else {
    lines.push(`| Rule | Location | Evidence | Message |`);
    lines.push(`| ---- | -------- | -------- | ------- |`);
    for (const f of risks) {
      const ev = f.runtimeCorroboration
        ? f.runtimeCorroboration.level === "defect"
          ? "run corroborated"
          : "run executed"
        : (f.evidenceLevel ?? "E2") === "E2"
          ? "deterministic"
          : "pattern";
      lines.push(
        `| ${f.ruleId} | ${f.file}:${f.line} | ${ev} | ${f.message.replaceAll("|", "\\|")} |`,
      );
    }
  }
  lines.push("");
  lines.push(`## Findings summary`);
  lines.push("");
  const errors = result.findings.filter((f) => f.severity === "error").length;
  const warnings = result.findings.filter(
    (f) => f.severity === "warning",
  ).length;
  const infos = result.findings.filter((f) => f.severity === "info").length;
  const advisory = result.findings.filter((f) => isAdvisoryFinding(f)).length;
  lines.push(
    `${errors} error(s) · ${warnings} warning(s) · ${infos} info(s) · ${advisory} advisory (E0, never gate).`,
  );
  lines.push("");
  lines.push(`## Next action`);
  lines.push("");
  // NEXT ACTION — one canonical derivation (parity law): the same
  // nextAction() the Trust Report and the JSON twin use.
  lines.push(nextAction(result));
  lines.push("");
  lines.push(`---`);
  lines.push("");
  lines.push(
    `Generated locally by Mjölnir — no cloud, no telemetry. Semantics: \`mjolnir <target> --json\` (machine contract \`contractVersion: 1\`).`,
  );
  lines.push("");
  return lines.join("\n");
}

/** Deterministic JSON artifact (agent-consumable twin of the MD). */
export function renderTrustReportJson(result: ScanResult): string {
  const s = fallbackSummary(result);
  return (
    JSON.stringify(
      {
        schemaVersion: 1,
        artifact: "mjolnir-trust-report",
        label: undefined,
        trust: {
          level: s.level,
          confidence: s.confidence,
          evidenceCoverage: s.evidenceCoverage,
          inconclusiveRate: s.inconclusiveRate,
          measuredFpOfFiredRules: s.measuredFpOfFiredRules ?? null,
          provisionalRuleIds: s.provisionalRuleIds,
          confidenceCeiling: s.confidenceCeiling ?? null,
          ceilingReasons: s.ceilingReasons,
        },
        score: result.score,
        tests: {
          files: result.testFileCount ?? 0,
          declarations: result.testDeclarationCount ?? 0,
        },
        findings: {
          total: result.findings.length,
          errors: result.findings.filter((f) => f.severity === "error").length,
          warnings: result.findings.filter((f) => f.severity === "warning")
            .length,
          infos: result.findings.filter((f) => f.severity === "info").length,
          advisory: result.findings.filter((f) => isAdvisoryFinding(f)).length,
        },
        topTrustRisks: topTrustRisks(result.findings, 10).map((f) => ({
          ruleId: f.ruleId,
          file: f.file,
          line: f.line,
          severity: f.severity,
          evidence:
            f.runtimeCorroboration === undefined
              ? (f.evidenceLevel ?? "E2")
              : f.runtimeCorroboration.level,
          message: f.message,
        })),
        nextAction: nextAction(result),
      },
      null,
      2,
    ) + "\n"
  );
}

export async function runTrustReportCommand(
  argv: string[],
  io: { out: Output; err: Output },
): Promise<number> {
  // WI-9 (plan §13): `trust-report --from <mjolnir.json> [--stdout]` —
  // render the artifact from a SAVED canonical scan result instead of
  // re-scanning. The GitHub Action uses this: it already produced the
  // --json report, so the comment/annotation step must derive from that
  // exact result (one semantic truth — no second scan, no drift).
  const fromIdx = argv.indexOf("--from");
  if (fromIdx !== -1) {
    const fromPath = argv[fromIdx + 1];
    if (!fromPath || fromPath.startsWith("-")) {
      io.err(
        "error: --from requires a saved report path (mjolnir <target> --json)",
      );
      return 10;
    }
    let raw: string;
    try {
      raw = readFileSync(resolve(fromPath), "utf8");
    } catch (err) {
      io.err(`error: cannot read ${fromPath}: ${errorMessage(err)}`);
      return 10;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as {
        schemaVersion?: number;
        contract?: unknown;
      };
    } catch (err) {
      io.err(`error: cannot read ${fromPath}: ${errorMessage(err)}`);
      return 10;
    }
    // The Action saves `{...result, contract}` — the contract rides on
    // the same object. Accept either shape; require schemaVersion 1.
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as { schemaVersion?: number }).schemaVersion !== 1
    ) {
      io.err(
        `error: ${fromPath} is not a canonical mjolnir scan result (schemaVersion 1)`,
      );
      return 10;
    }
    const { contract: _contract, ...result } = parsed as Record<
      string,
      unknown
    >;
    const scan = result as unknown as ScanResult;
    const md = renderTrustReportMarkdown(scan, fromPath);
    if (argv.includes("--stdout")) {
      io.out(md);
      return 0;
    }
    try {
      const outPath = resolve(dirname(fromPath), TRUST_REPORT_MD);
      writeFileSync(outPath, md);
      io.out(`trust report written: ${outPath}`);
      return 0;
    } catch (err) {
      // Disk-full / permission on the artifact write — an honest 20, not
      // an uncaught crash (the same degrade posture as the rescan path).
      io.err(`internal error: ${errorMessage(err)}`);
      return 20;
    }
  }
  const targetArg = argv.find((a) => !a.startsWith("-")) ?? ".";
  const target = resolve(targetArg);
  // Target validation mirrors runScanCommand's gate: the artifact must
  // describe a surface the scanner can actually see.
  if (!validateTarget(target)) {
    io.err(`error: not a scannable target: ${targetArg}`);
    return 10;
  }
  try {
    const result = await runScan({
      target,
      json: true,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "json",
    });
    const md = renderTrustReportMarkdown(result, targetArg);
    const json = renderTrustReportJson(result);
    writeFileSync(join(target, TRUST_REPORT_MD), md);
    writeFileSync(join(target, TRUST_REPORT_JSON), json);
    io.out(
      `trust report written: ${TRUST_REPORT_MD}, ${TRUST_REPORT_JSON} (deterministic — same scan, same bytes)`,
    );
    return 0;
  } catch (err) {
    io.err(`internal error: ${errorMessage(err)}`);
    return 20;
  }
}

function validateTarget(target: string): boolean {
  try {
    return statSync(target).isDirectory();
  } catch {
    return false;
  }
}
