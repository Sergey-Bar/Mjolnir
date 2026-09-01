/**
 * 95% Wilson score interval on a proportion (plan §20.2).
 *
 * Regression governance contract: precision/FP per rule must not regress
 * beyond a configured statistical tolerance, not against raw point
 * estimates. Store `ciLow`/`ciHigh` per measurement in the generated
 * artifact; flag a regression only when the intervals are disjoint in
 * the bad direction (new `ciLow` > old `ciHigh`) with a worse point
 * estimate. Comparisons require n ≥ 10 on both sides — below that,
 * informational only. Noise within tolerance must not fail CI.
 *
 * The 4-dp rounding keeps the artifact byte-stable (see the capability
 * matrix generator's note on deterministic output).
 */

const Z95 = 1.959963984540054;

export interface WilsonInterval {
  ciLow: number;
  ciHigh: number;
}

/** 95% Wilson score interval on fp/n (fp successes of n trials), 4 dp. */
export function wilsonInterval(fp: number, n: number): WilsonInterval {
  if (n <= 0) return { ciLow: 0, ciHigh: 1 };
  const p = fp / n;
  const z2 = Z95 * Z95;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (Z95 / denom) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  const round4 = (x: number): number => Math.round(x * 10000) / 10000;
  return {
    ciLow: round4(Math.max(0, center - half)),
    ciHigh: round4(Math.min(1, center + half)),
  };
}

/** Minimum classified verdicts on BOTH sides for a regression to be actionable (§20.2). */
export const COMPARISON_MIN_N = 10;

export interface MeasurementSnapshot {
  fpRate: number;
  n: number;
}

export interface RegressionCheck {
  comparable: boolean;
  /** true only when intervals are disjoint in the bad direction AND the point estimate worsened. */
  regressed: boolean;
  detail: string;
}

/**
 * §20.2 comparison: a regression exists only when both sides have
 * n ≥ 10, the intervals are disjoint in the bad direction
 * (new.ciLow > old.ciHigh), and the point estimate is worse. Anything
 * else is informational — noise within tolerance must not fail CI.
 */
export function compareFpMeasurements(
  oldM: MeasurementSnapshot | undefined,
  newM: MeasurementSnapshot | undefined,
): RegressionCheck {
  if (!oldM || !newM) {
    return {
      comparable: false,
      regressed: false,
      detail: "no prior measurement to compare against (informational)",
    };
  }
  if (oldM.n < COMPARISON_MIN_N || newM.n < COMPARISON_MIN_N) {
    return {
      comparable: false,
      regressed: false,
      detail: `n below ${COMPARISON_MIN_N} on at least one side (old n=${oldM.n}, new n=${newM.n}) — informational only (§20.2)`,
    };
  }
  const oldCi = wilsonInterval(oldM.fpRate * oldM.n, oldM.n);
  const newCi = wilsonInterval(newM.fpRate * newM.n, newM.n);
  const disjointBad = newCi.ciLow > oldCi.ciHigh;
  const worsePoint = newM.fpRate > oldM.fpRate;
  if (disjointBad && worsePoint) {
    return {
      comparable: true,
      regressed: true,
      detail:
        `FP ${fmt(oldM.fpRate)}→${fmt(newM.fpRate)}; 95% Wilson intervals disjoint ` +
        `in the bad direction (new [${newCi.ciLow}, ${newCi.ciHigh}] vs old [${oldCi.ciLow}, ${oldCi.ciHigh}])`,
    };
  }
  return {
    comparable: true,
    regressed: false,
    detail: `FP ${fmt(oldM.fpRate)}→${fmt(newM.fpRate)}; intervals overlap or point estimate improved — within tolerance`,
  };
}

function fmt(x: number): string {
  return `${(x * 100).toFixed(0)}%`;
}
