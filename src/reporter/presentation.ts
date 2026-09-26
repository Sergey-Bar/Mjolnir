/**
 * presentation.ts — the one place a presentation DECISION is made.
 *
 * BITTERSWEET `BW-030a`. Before this module the same decision was written
 * down four different times and every surface drifted:
 *
 *   - score bands: `score-state.ts` (50/80), `dashboard.ts` (50/60),
 *     `handover.ts` (50/90), `mermaid.ts` (50/80), `monorepo-analysis.ts`
 *     (50/80);
 *   - the evidence descriptor: `terminal.ts` returned the full
 *     `[E2 · deterministic · measured FP 8% · n=14 · trust L3]` while
 *     `evidence-tag.ts` — which called itself the "single definition
 *     site" — returned four bare words and defaulted a missing level to
 *     `E2`, the STRONGEST one;
 *   - the score bar: `theme.ts:scoreGauge` plus four private reimplementations.
 *
 * THE ONE RULE OF THIS MODULE: it owns decisions, never data and never
 * I/O. It reads a `Finding` / a score number / a `Palette` and returns
 * the word, band, threshold or descriptor to print. It opens no file,
 * touches no clock, spawns no process and formats no HTML document. If a
 * second responsibility appears here, split it in the same change.
 *
 * Pure: the same input always yields the same output, so every decision
 * is golden-testable and two runs of the same scan cannot disagree.
 *
 * Layout note — the threshold LITERALS stay physically here rather than in
 * a registry object so that `site/scripts/gen-report.mjs`, which parses
 * `score >= N` branches out of this file to build the site's band ruler,
 * keeps parsing one canonical file. `SCORE_THRESHOLDS` is derived from
 * those literals; it is the nameable form, not a second copy of them.
 */

import {
  deriveEvidenceLevel,
  type EvidenceLevel,
  type Finding,
} from "../types.js";
import { EVIDENCE_MARKS, TRUST_RUNGS } from "../brand/symbols.js";

/* ── Absent measurements (BW-103) ────────────────────────────── */

/**
 * What a surface prints when a number was never measured.
 *
 * The bug this replaces: `testDeclarationCount ?? 0` rendered
 * "0 tests analyzed in 0 files" for a producer that simply did not
 * measure. A zero is a CLAIM — it says the count was taken and found
 * nothing. Absent means nobody looked. `dashboard.ts` already modelled
 * this correctly for frameworks (`frameworkCount: null` → "unknown");
 * its sibling `trust-report.ts` did not, so the same repo produced two
 * artifacts that disagreed about whether a measurement existed.
 */
export const UNMEASURED = "unknown — not measured";

/**
 * Render a count for a human surface: the number when it was measured,
 * `unknown — not measured` when it was not. Never `0` for an absent
 * measurement.
 */
export function countOrUnknown(
  value: number | undefined,
  unit?: string,
): string {
  if (value === undefined) return UNMEASURED;
  return unit === undefined ? String(value) : `${value} ${unit}`;
}

/**
 * The machine-surface counterpart: an unmeasured count is `null`, which
 * JSON has a word for, rather than `0`, which does not. Used by the
 * trust-report JSON artifact; the scan machine contract
 * (`engine/machine-contract.ts`) is drift-locked and untouched.
 */
export function countOrNull(value: number | undefined): number | null {
  return value ?? null;
}

/**
 * The "Tests analyzed" cell, shared by every human surface that shows it.
 *
 * Three renderers had this line written out separately, identically, and
 * all three rendered `testDeclarationCount ?? 0` — "0 tests analyzed in 0
 * files" — for a producer that never measured a declaration at all. Two
 * of them are the *sibling* artifacts for the same scan (the PR comment
 * and the trust report), so the same run told a reviewer both "0 tests
 * analyzed" and "no tests found".
 *
 * Declared-but-file-count-absent (and the reverse) are reported honestly
 * rather than filled in from each other.
 */
export function testsAnalyzedCell(
  declarations: number | undefined,
  files: number | undefined,
): string {
  if (declarations === undefined && files === undefined) return UNMEASURED;
  const declText = countOrUnknown(declarations);
  if (files === undefined) return `${declText} in unknown files`;
  return `${declText} in ${files} ${files === 1 ? "file" : "files"}`;
}

/* ── Score bands ─────────────────────────────────────────────── */

/** <50 critical · 50–79 warning · 80–99 trusted · 100 forged ·
 *  null unmeasured. These four literals are the ONLY place a score band
 *  boundary is written down; every surface reads the band through
 *  `deriveScoreState` or names the threshold through
 *  `SCORE_THRESHOLDS`. */
export const TRUSTED_THRESHOLD = 80;
export const WARNING_THRESHOLD = 50;

export type ScoreBand = "critical" | "warning" | "trusted" | "forged";

export interface ScoreState {
  /** null → "no tests" state (R2: never fake 100). */
  score: number | null;
  band: ScoreBand | "unmeasured";
  verdict: "UNWORTHY" | "NEEDS WORK" | "WORTHY" | "FORGED";
  /** Palette key — resolved by each surface to its own colour system. */
  color: "error" | "warning" | "trusted" | "forged" | "dim";
  /** 0–100, mechanical: the score itself; null → 0. */
  powerLevel: number;
  /**
   * One-line trust statement template, deterministic per band.
   * `{n}` is the findings count, substituted by the renderer — the
   * model itself stays a pure function of score alone.
   */
  headline: string;
  /** State rune glyph — the symbol that accompanies the colour (R11). */
  rune: string;
}

const HEADLINES: Record<ScoreBand | "unmeasured", string> = {
  critical: "The hammer is cracked — {n} findings break its edge.",
  warning: "The hammer holds — but {n} findings weigh it down.",
  trusted: "Held in worthy hands — {n} findings remain.",
  forged: "Static score 100 — no findings on the analyzed surface.",
  unmeasured: "No tests found — the hammer cannot be weighed.",
};

const RUNES: Record<ScoreBand | "unmeasured", string> = {
  critical: "ᚲ", // Kaunan — the torch that burns
  warning: "ᚦ", // Thurisaz — the giant at the gate
  trusted: "ᛏ", // Tiwaz — victory in worthy hands
  forged: "ᛟ", // Othala — the completed, inherited work
  unmeasured: "ᛁ", // Isa — stillness; nothing was measured
};

/**
 * The named form of the band boundaries. `report:honesty` /
 * `thresholds:parity` assert that no surface outside this module
 * re-invents a boundary; a consumer that genuinely needs one names it
 * here rather than typing the number.
 */
export const SCORE_THRESHOLDS = {
  /** Below this is `critical`. */
  criticalBelow: WARNING_THRESHOLD,
  /** At or above this is `trusted`. */
  trustedAtOrAbove: TRUSTED_THRESHOLD,
  /** The one score that is `forged`. */
  forgedAt: 100,
} as const;

/**
 * Band mapping — the one mapping, every consumer: <50 critical,
 * 50–79 warning, 80–99 trusted, 100 forged, null unmeasured.
 */
export function deriveScoreState(score: number | null): ScoreState {
  if (score === null) {
    return {
      score: null,
      band: "unmeasured",
      verdict: "UNWORTHY",
      color: "dim",
      powerLevel: 0,
      headline: HEADLINES.unmeasured,
      rune: RUNES.unmeasured,
    };
  }
  if (score >= SCORE_THRESHOLDS.forgedAt) {
    return {
      score,
      band: "forged",
      verdict: "FORGED",
      color: "forged",
      powerLevel: score,
      headline: HEADLINES.forged,
      rune: RUNES.forged,
    };
  }
  if (score >= TRUSTED_THRESHOLD) {
    return {
      score,
      band: "trusted",
      verdict: "WORTHY",
      color: "trusted",
      powerLevel: score,
      headline: HEADLINES.trusted,
      rune: RUNES.trusted,
    };
  }
  if (score >= WARNING_THRESHOLD) {
    return {
      score,
      band: "warning",
      verdict: "NEEDS WORK",
      color: "warning",
      powerLevel: score,
      headline: HEADLINES.warning,
      rune: RUNES.warning,
    };
  }
  return {
    score,
    band: "critical",
    verdict: "UNWORTHY",
    color: "error",
    powerLevel: score,
    headline: HEADLINES.critical,
    rune: RUNES.critical,
  };
}

/** Substitute a findings count into a headline template. Pure text
 * helper so every surface formats identically. */
export function headlineFor(state: ScoreState, findings: number): string {
  return state.headline.replace("{n}", String(findings));
}

/**
 * Contract-stable three-band verdict (property-locked in
 * tests/scoring-precision.spec.ts). Delegates to the ScoreState model —
 * 100 keeps returning WORTHY here; the FORGED premium treatment lives
 * in the dedicated block, not in this public mapping.
 *
 * The `FORGED → WORTHY` collapse is a DOCUMENTED PROJECTION that
 * preserves the three-band public contract, not a divergence to be
 * "fixed": a consumer reading the verdict word must not be able to tell
 * a 100 from a 99, because the 100 carries no runtime evidence and the
 * score alone never earned it.
 */
export function verdictFor(
  score: number,
): "WORTHY" | "NEEDS WORK" | "UNWORTHY" {
  const verdict = deriveScoreState(score).verdict;
  return verdict === "FORGED" ? "WORTHY" : verdict;
}

/* ── Evidence descriptor (BW-101 · BW-102) ───────────────────── */

const EVIDENCE_KIND: Record<EvidenceLevel, string> = {
  E0: "observation",
  E1: "heuristic",
  E2: "deterministic",
};

/**
 * The effective evidence level of a finding.
 *
 * The `?? deriveEvidenceLevel(...)` fallback IS the fix for BW-101. The
 * deleted `evidence-tag.ts` defaulted a missing level to `E2` — the
 * strongest claim the product can make — which is the exact inverse of
 * its own principle: absent evidence is not proof, so it is derived
 * conservatively from the finding's own type and confidence.
 */
export function evidenceLevelOf(f: Finding): EvidenceLevel {
  return f.evidenceLevel ?? deriveEvidenceLevel(f.findingType, f.confidence);
}

/** What the runtime report actually vouched for, in the product's words. */
function runtimeLabel(f: Finding): string | null {
  const c = f.runtimeCorroboration;
  if (c === undefined) return null;
  if (c.level === "defect") return "defect corroborated";
  if (c.level === "test") return "test executed";
  return "file executed";
}

/**
 * The canonical evidence descriptor — `[E2 · deterministic · measured FP
 * 8% · n=14 · trust L3 · runtime: file executed]`.
 *
 * This is the version `terminal.ts` already shipped, promoted to the one
 * definition site. The HTML and markdown surfaces now gain the measured
 * false-positive rate, the sample size, the trust rung and what runtime
 * corroborated — they used to show four bare words that a reader could
 * mistake for the whole evidence story.
 *
 * Every clause is conditional on the finding actually carrying that
 * evidence. Nothing here is ever defaulted into existence.
 */
export function evidenceTag(f: Finding): string {
  const level = evidenceLevelOf(f);
  let tag = `${level} · ${EVIDENCE_KIND[level]}`;
  if (f.measuredFpRate !== undefined) {
    tag += ` · measured FP ${Math.round(f.measuredFpRate * 100)}%`;
    if (f.measuredFpN !== undefined) tag += ` · n=${f.measuredFpN}`;
  }
  if (f.trustLevel !== undefined) tag += ` · trust ${f.trustLevel}`;
  const runtime = runtimeLabel(f);
  if (runtime !== null) tag += ` · runtime: ${runtime}`;
  return `[${tag}]`;
}

/** The evidence level's product-word meaning, read from the brand marks
 *  so a surface can never spell "observation" two ways. */
export function evidenceMeaning(level: EvidenceLevel): string {
  return EVIDENCE_MARKS.find((m) => m.level === level)?.meaning ?? "unknown";
}

/** `L3 — the finding's file executed`. Null when the finding never
 *  reached the trust ladder; unknown is not the same as L0. */
export function trustRungLabel(level: string): string | null {
  const rung = TRUST_RUNGS.find((r) => r.level === level);
  return rung === undefined ? null : `${rung.level} — ${rung.meaning}`;
}
