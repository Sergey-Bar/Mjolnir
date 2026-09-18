/**
 * ScoreState — the single source of truth for score semantics.
 *
 * One pure model derives every score-derived presentation decision:
 * band, verdict label, palette key, power level, headline template and
 * state indicator. Terminal, badge and (P2) web all consume this mapping so
 * the ≥80/≥50 thresholds can never drift between surfaces again
 * (they previously disagreed 3×: terminal ≥80/≥50, badge ≥90/≥75/≥50).
 *
 * Pure module: zero I/O, zero imports. Same input → same output,
 * golden-testable.
 *
 * Verdict vocabulary is contract-stable output (property-locked in
 * tests/scoring-precision.spec.ts): CRITICAL / NEEDS ATTENTION / HEALTHY.
 * EXCELLENT is added as the 100-state with premium treatment; verdictFor()
 * in the terminal keeps returning HEALTHY for 100 to preserve the
 * three-band public contract.
 */

export type ScoreBand = "critical" | "warning" | "trusted" | "excellent";

export interface ScoreState {
  /** null → "no tests" state (R2: never fake 100). */
  score: number | null;
  band: ScoreBand | "unmeasured";
  verdict: "CRITICAL" | "NEEDS ATTENTION" | "HEALTHY" | "EXCELLENT";
  /** Palette key — resolved by each surface to its own color system. */
  color: "error" | "warning" | "trusted" | "excellent" | "dim";
  /** 0–100, mechanical: the score itself; null → 0. */
  powerLevel: number;
  /**
   * One-line trust statement template, deterministic per band.
   * `{n}` is the findings count, substituted by the renderer — the
   * model itself stays a pure function of score alone.
   */
  headline: string;
  /** State indicator — a text-safe cue that accompanies the color (R11). */
  indicator: string;
}

const HEADLINES: Record<ScoreBand | "unmeasured", string> = {
  critical: "Critical test health: {n} findings need attention.",
  warning: "Needs attention: {n} findings remain.",
  trusted: "Healthy test health: {n} findings remain.",
  excellent: "Excellent test health. Zero findings. The suite is clean.",
  unmeasured: "No tests found — test health is not measured.",
};

const INDICATORS: Record<ScoreBand | "unmeasured", string> = {
  critical: "[!]",
  warning: "[~]",
  trusted: "[+]",
  excellent: "[OK]",
  unmeasured: "[?]",
};

/** Band mapping (the one mapping, three consumers): <50 critical, 50–79
 * warning, 80–99 trusted, 100 excellent, null unmeasured. */
export function deriveScoreState(score: number | null): ScoreState {
  if (score === null) {
    return {
      score: null,
      band: "unmeasured",
      verdict: "CRITICAL",
      color: "dim",
      powerLevel: 0,
      headline: HEADLINES.unmeasured,
      indicator: INDICATORS.unmeasured,
    };
  }
  if (score >= 100) {
    return {
      score,
      band: "excellent",
      verdict: "EXCELLENT",
      color: "excellent",
      powerLevel: score,
      headline: HEADLINES.excellent,
      indicator: INDICATORS.excellent,
    };
  }
  if (score >= 80) {
    return {
      score,
      band: "trusted",
      verdict: "HEALTHY",
      color: "trusted",
      powerLevel: score,
      headline: HEADLINES.trusted,
      indicator: INDICATORS.trusted,
    };
  }
  if (score >= 50) {
    return {
      score,
      band: "warning",
      verdict: "NEEDS ATTENTION",
      color: "warning",
      powerLevel: score,
      headline: HEADLINES.warning,
      indicator: INDICATORS.warning,
    };
  }
  return {
    score,
    band: "critical",
    verdict: "CRITICAL",
    color: "error",
    powerLevel: score,
    headline: HEADLINES.critical,
    indicator: INDICATORS.critical,
  };
}

/** Substitute a findings count into a headline template. Pure text
 * helper so every surface formats identically. */
export function headlineFor(state: ScoreState, findings: number): string {
  return state.headline.replace("{n}", String(findings));
}
