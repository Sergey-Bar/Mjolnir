/**
 * ScoreState — the single source of truth for score semantics.
 *
 * One pure model derives every score-derived presentation decision:
 * band, verdict label, palette key, power level, headline template and
 * state rune. Terminal, badge and (P2) web all consume this mapping so
 * the ≥80/≥50 thresholds can never drift between surfaces again
 * (they previously disagreed 3×: terminal ≥80/≥50, badge ≥90/≥75/≥50).
 *
 * Pure module: zero I/O, zero imports. Same input → same output,
 * golden-testable.
 *
 * Verdict vocabulary is contract-stable output (property-locked in
 * tests/scoring-precision.spec.ts): UNWORTHY / NEEDS WORK / WORTHY.
 * FORGED is added as the 100-state with premium treatment; verdictFor()
 * in the terminal keeps returning WORTHY for 100 to preserve the
 * three-band public contract.
 */

export type ScoreBand = "critical" | "warning" | "trusted" | "forged";

export interface ScoreState {
  /** null → "no tests" state (R2: never fake 100). */
  score: number | null;
  band: ScoreBand | "unmeasured";
  verdict: "UNWORTHY" | "NEEDS WORK" | "WORTHY" | "FORGED";
  /** Palette key — resolved by each surface to its own color system. */
  color: "error" | "warning" | "trusted" | "forged" | "dim";
  /** 0–100, mechanical: the score itself; null → 0. */
  powerLevel: number;
  /**
   * One-line trust statement template, deterministic per band.
   * `{n}` is the findings count, substituted by the renderer — the
   * model itself stays a pure function of score alone.
   */
  headline: string;
  /** State rune glyph — the symbol that accompanies the color (R11). */
  rune: string;
}

const HEADLINES: Record<ScoreBand | "unmeasured", string> = {
  critical: "The hammer is cracked — {n} findings break its edge.",
  warning: "The hammer holds — but {n} findings weigh it down.",
  trusted: "Held in worthy hands — {n} findings remain.",
  forged: "Forged complete. Zero findings. The suite is clean.",
  unmeasured: "No tests found — the hammer cannot be weighed.",
};

const RUNES: Record<ScoreBand | "unmeasured", string> = {
  critical: "ᚲ", // Kaunan — the torch that burns
  warning: "ᚦ", // Thurisaz — the giant at the gate
  trusted: "ᛏ", // Tiwaz — victory in worthy hands
  forged: "ᛟ", // Othala — the completed, inherited work
  unmeasured: "ᛁ", // Isa — stillness; nothing was measured
};

/** Band mapping (the one mapping, three consumers): <50 critical, 50–79
 * warning, 80–99 trusted, 100 forged, null unmeasured. */
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
  if (score >= 100) {
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
  if (score >= 80) {
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
  if (score >= 50) {
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
