/**
 * Trust Report — the hero product surface (Mega MVP Master Plan v3.1
 * §26 WI-5, §7).
 *
 * Default `mjolnir` output. Answers the five questions in order, from
 * the canonical result + machine contract ONLY (presentation-only
 * surface — one semantic truth, plan §18; every number rendered here
 * exists in --json):
 *
 *   1. What happened?            — TRUST VERDICT block (level, confidence)
 *   2. Can I trust the result?   — confidence + evidence coverage + ceiling
 *   3. Why?                      — WHY THIS VERDICT (evidence-backed reasons)
 *   4. What supports it?         — TOP TRUST RISKS with evidence tags
 *   5. What should I do next?    — NEXT ACTION (concrete command)
 *
 * `--classic` escapes to the pre-Trust-Report terminal render
 * (renderTerminal) — the escape hatch is a rendering flag only; scan
 * semantics, exit codes and JSON are identical under both.
 */

import type { Finding, ScanResult, TrustSummary } from "../types.js";
import { isAdvisoryFinding } from "../types.js";
import { palette, shouldColorize, shouldUseAscii } from "./theme.js";
import { sectionHeader, type UiContext } from "./ui.js";
import { renderTerminal } from "./terminal.js";

export interface RenderTrustReportOpts {
  isTTY: boolean;
  verbose?: boolean;
  width?: number;
  ascii?: boolean;
  tone?: "blunt";
  visibleFindings?: ScanResult["findings"];
  /**
   * --classic: escape hatch back to the pre-Trust-Report terminal
   * render. Rendering flag only — scan semantics, exit codes and JSON
   * are identical under both surfaces.
   */
  classic?: boolean;
}

const TRUST_LABELS: Record<string, string> = {
  L0: "L0 · observation only",
  L1: "L1 · heuristic static",
  L2: "L2 · deterministic static",
  L3: "L3 · file executed",
  L4: "L4 · test executed",
  L5: "L5 · run corroborates defect",
};

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

/**
 * The human verdict line derived from the measurement. Deterministic
 * mapping from (level, confidence) bands — a measurement-derived label,
 * never a new verdict enum (plan §3/§36: no new global enums).
 */
export function trustHeadline(s: TrustSummary): string {
  if (s.level === "L5" || s.level === "L4") {
    return s.confidence >= 0.75
      ? "Run evidence backs these findings — trust them."
      : "Run evidence exists, but the scan was incomplete — verify the gaps.";
  }
  if (s.level === "L3") {
    return s.confidence >= 0.75
      ? "The relevant files executed — solid static + runtime signal."
      : "Files executed, evidence is thin — treat findings as leads.";
  }
  if (s.confidence >= 0.75) {
    return "Deterministic static analysis — trustworthy, uncorroborated by a run.";
  }
  return "Static signal only, incomplete analysis — treat as leads, not verdicts.";
}

/** WHY THIS VERDICT — evidence-backed reasons, each from a real field. */
export function trustReasons(result: ScanResult, s: TrustSummary): string[] {
  const reasons: string[] = [];
  const corroborated = result.findings.filter(
    (f) => f.runtimeCorroboration !== undefined,
  ).length;
  if (result.findings.length === 0) {
    reasons.push(
      result.partial
        ? "No findings so far, but the scan did not finish — the gaps are not proof of cleanliness."
        : "No findings fired on the analyzed surface — the scan found nothing to report.",
    );
  } else {
    reasons.push(
      `${result.findings.length} finding(s) fired; ${corroborated} corroborated by a real run report.`,
    );
  }
  if (s.confidenceCeiling !== undefined) {
    reasons.push(
      `confidence capped at ${pct(s.confidenceCeiling)} by: ${s.ceilingReasons.join(", ")}.`,
    );
  }
  if (s.provisionalRuleIds.length > 0) {
    reasons.push(
      `${s.provisionalRuleIds.length} fired rule(s) unmeasured (author-estimated FP) — disclosed, not counted.`,
    );
  } else if (s.measuredFpOfFiredRules !== undefined) {
    reasons.push(
      `every fired rule carries a measured false-positive rate (evidence-weighted ${pct(s.measuredFpOfFiredRules)}).`,
    );
  }
  if (result.frameworkDetectionUnknown) {
    reasons.push(
      "framework detection could not decide — rule applicability is unsure.",
    );
  }
  return reasons;
}

/**
 * TOP TRUST RISKS — findings ranked by trust evidence (runtime-
 * corroborated and E2 first). Presentation-only ordering over the
 * canonical compareFindings list.
 */
export function topTrustRisks(findings: readonly Finding[], n = 3): Finding[] {
  const rank = (f: Finding): number => {
    const c = f.runtimeCorroboration;
    const corroboration = c === undefined ? 0 : c.level === "file" ? 1 : 2;
    const evidence =
      f.evidenceLevel === "E2" ? 2 : f.evidenceLevel === "E1" ? 1 : 0;
    const severity =
      f.severity === "error" ? 2 : f.severity === "warning" ? 1 : 0;
    return corroboration * 100 + evidence * 10 + severity;
  };
  const advisory = (f: Finding): boolean => isAdvisoryFinding(f);
  return [...findings]
    .filter((f) => !advisory(f))
    .sort((a, b) => rank(b) - rank(a))
    .slice(0, n);
}

/** NEXT ACTION — one concrete command, deterministic. */
export function nextAction(result: ScanResult): string {
  if (result.partial) {
    return "re-run with a higher --max-duration to close the truncated surface";
  }
  const risks = topTrustRisks(result.findings, 1);
  if (risks.length === 0) {
    return result.testDeclarationCount === 0
      ? "add tests — a repo without test declarations has nothing to verify"
      : "nothing to triage — keep the gate green with `mjolnir ci install`";
  }
  return `mjolnir explain ${risks[0]?.ruleId ?? ""} — then fix the top risk first`;
}

/**
 * The Trust Report render. Derives EVERYTHING from the canonical
 * ScanResult (+ its trustSummary); no new semantics.
 */
export function renderTrustReport(
  result: ScanResult,
  opts: RenderTrustReportOpts,
): string {
  // --classic escape hatch: the pre-Trust-Report hero surface.
  if (opts.classic) {
    return renderTerminal(result, opts);
  }
  const ui: UiContext = {
    p: palette(shouldColorize(opts.isTTY)),
    ascii: opts.ascii ?? shouldUseAscii(),
    width: Math.max(40, opts.width ?? process.stdout.columns ?? 80),
  };
  const { p } = ui;
  const lines: string[] = [];

  const s: TrustSummary = result.trustSummary ?? {
    level: "L2",
    confidence: 0,
    evidenceCoverage: 0,
    inconclusiveRate: 0,
    provisionalRuleIds: [],
    ceilingReasons: [],
  };

  // ── 1. TRUST VERDICT ────────────────────────────────────────────────
  lines.push(sectionHeader("TRUST VERDICT", ui));
  lines.push(`  ${p.accent(TRUST_LABELS[s.level] ?? s.level)}`);
  lines.push(`  ${trustHeadline(s)}`);
  lines.push("");

  // ── 2. Can I trust the result? ─────────────────────────────────────
  lines.push(sectionHeader("CONFIDENCE", ui));
  lines.push(
    `  confidence          ${pct(s.confidence)}${s.confidenceCeiling !== undefined ? `  (ceiling ${pct(s.confidenceCeiling)})` : ""}`,
  );
  lines.push(
    `  evidence coverage   ${pct(s.evidenceCoverage)} of analyzed declarations`,
  );
  lines.push(`  inconclusive        ${pct(s.inconclusiveRate)}`);
  if (s.measuredFpOfFiredRules !== undefined) {
    lines.push(
      `  measured FP (fired) ${pct(s.measuredFpOfFiredRules)} — evidence-weighted`,
    );
  } else if (s.provisionalRuleIds.length > 0) {
    lines.push(
      `  measured FP (fired) PROVISIONAL — unmeasured rules fired: ${s.provisionalRuleIds.slice(0, 3).join(", ")}${s.provisionalRuleIds.length > 3 ? `, +${s.provisionalRuleIds.length - 3} more` : ""}`,
    );
  } else {
    lines.push("  measured FP (fired) none fired — nothing to weight");
  }
  lines.push(
    `  tests analyzed      ${result.testDeclarationCount ?? 0} declaration(s) in ${result.testFileCount ?? 0} file(s)`,
  );
  lines.push("");

  // ── 3. WHY THIS VERDICT ────────────────────────────────────────────
  lines.push(sectionHeader("WHY THIS VERDICT", ui));
  for (const r of trustReasons(result, s)) {
    lines.push(`  - ${r}`);
  }
  lines.push("");

  // ── 4. TOP TRUST RISKS ─────────────────────────────────────────────
  const visible = opts.visibleFindings ?? result.findings;
  lines.push(sectionHeader("TOP TRUST RISKS", ui));
  const risks = topTrustRisks(visible, opts.verbose === true ? 10 : 3);
  if (risks.length === 0) {
    lines.push("  none — no non-advisory findings fired");
  } else {
    for (const f of risks) {
      const ev = f.runtimeCorroboration
        ? f.runtimeCorroboration.level === "defect"
          ? "run corroborated"
          : "run executed"
        : (f.evidenceLevel ?? "E2") === "E2"
          ? "deterministic"
          : "pattern";
      lines.push(
        `  ${p.warning("•")} ${f.ruleId} ${f.file}:${f.line}  [${ev}]`,
      );
      lines.push(`      ${f.message}`);
    }
    const shown = risks.length;
    const eligible = visible.filter((f) => !isAdvisoryFinding(f)).length;
    if (eligible > shown) {
      lines.push(p.dim(`  … ${eligible - shown} more in --json / --verbose`));
    }
  }
  lines.push("");

  // ── 5. NEXT ACTION ─────────────────────────────────────────────────
  lines.push(sectionHeader("NEXT ACTION", ui));
  lines.push(`  ${p.accent(nextAction(result))}`);
  lines.push("");
  return lines.join("\n");
}
