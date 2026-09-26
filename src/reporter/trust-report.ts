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
import type { TrustClassification } from "../engine/trust-classification.js";
import { classifyTrust } from "../engine/trust-classification.js";
import { TRUST_RUNGS } from "../brand/symbols.js";
import { palette, shouldColorize, shouldUseAscii } from "./theme.js";
import { sectionHeader, type UiContext } from "./ui.js";
import { renderTerminal } from "./terminal.js";
import { pct } from "../lib/format.js";
import { evidenceTag, testsAnalyzedCell } from "./presentation.js";

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

/**
 * The rung labels, built from `src/brand/symbols.ts` rather than typed
 * again here.
 *
 * They had drifted the moment there were two copies: this file said
 * "file executed" and "run corroborates defect" where the symbol module,
 * the architecture diagram and the website's ladder all said "the
 * finding's file executed" and "the run verdict corroborates". Small
 * enough that nobody would notice, and exactly the kind of divergence
 * that makes a reader wonder whether two surfaces mean the same thing.
 *
 * The runtime marker is not decoration either: L3 and above cannot be
 * reached without a real run report, and the label says so wherever the
 * ladder is not drawn to show it.
 */
const TRUST_LABELS: Record<string, string> = Object.fromEntries(
  TRUST_RUNGS.map((r) => [
    r.level,
    `${r.level} · ${r.meaning}${r.runtime ? " · runtime" : ""}`,
  ]),
);

/**
 * The human verdict line, rendered from the ONE determination.
 *
 * This used to be a band mapping over (level, confidence) living here, in the
 * reporter — engine knowledge in a presentation layer, which is how a second
 * surface ends up disagreeing with the first. The decision now lives in
 * `src/engine/trust-classification.ts` and every surface renders the same
 * answer; this function only chooses words.
 */
export function trustHeadline(
  s: TrustSummary,
  classification?: TrustClassification,
): string {
  const claim = classification?.claim;
  if (claim !== undefined) {
    switch (claim) {
      case "RUN_EVIDENCE_BACKS_FINDINGS":
        return s.confidence >= 0.75
          ? "Run evidence backs these findings — trust them."
          : "Run evidence exists, but the scan was incomplete — verify the gaps.";
      case "RUNTIME_CORROBORATED":
        return s.confidence >= 0.75
          ? "The relevant files executed — solid static + runtime signal."
          : "Files executed, evidence is thin — treat findings as leads.";
      case "DETERMINISTIC_STATIC":
        return "Deterministic static analysis — trustworthy, uncorroborated by a run.";
      case "THIN_STATIC_SIGNAL":
        return "Static signal only, incomplete analysis — treat as leads, not verdicts.";
      case "NO_EVIDENCE":
        return "Static signal only, with no runtime evidence — treat as an observation, not a verdict.";
      case "INCOMPLETE":
        return "The analysis did not finish — it proves nothing about the surface it did not reach.";
      default:
        break;
    }
  }
  // No classification supplied: fall back to the conservative reading rather
  // than to an optimistic one.
  return "Trust could not be established for this run.";
}

/** WHY THIS VERDICT — evidence-backed reasons, each from a real field. */
export function trustReasons(result: ScanResult, s: TrustSummary): string[] {
  const reasons: string[] = [];
  const corroborated = result.findings.filter(
    (f) => f.runtimeCorroboration !== undefined,
  ).length;
  if (result.findings.length === 0) {
    const incomplete =
      result.partial ||
      result.analysisStatus.discovery !== "complete" ||
      result.analysisStatus.rules !== "complete" ||
      (s.level === "L0" && s.evidenceCoverage === 0);
    reasons.push(
      incomplete
        ? "No findings so far, but the scan or evidence is incomplete — the gaps are not proof of cleanliness."
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
  if (
    result.partial ||
    result.analysisStatus.discovery !== "complete" ||
    result.analysisStatus.rules !== "complete" ||
    (result.analysisStatus.rulesCrashed ?? 0) > 0
  ) {
    return "re-run with a higher --max-duration to close the truncated surface";
  }
  const risks = topTrustRisks(result.findings, 1);
  if (risks.length === 0) {
    return result.testDeclarationCount === 0
      ? "add tests — a repo without test declarations has nothing to verify"
      : "no findings on the analyzed surface — install advisory CI (`mjolnir ci install`) and re-scan the changed scope";
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
  // The classification is computed HERE, once, and the headline renders it.
  // Every other surface calls the same function; none of them re-derives it.
  const classification = classifyTrust(result, s);
  lines.push(sectionHeader("TRUST VERDICT", ui));
  lines.push(`  ${p.accent(TRUST_LABELS[s.level] ?? s.level)}`);
  lines.push(`  ${trustHeadline(s, classification)}`);
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
    `  tests analyzed      ${testsAnalyzedCell(result.testDeclarationCount, result.testFileCount)}`,
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
      const ev = evidenceTag(f);
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
