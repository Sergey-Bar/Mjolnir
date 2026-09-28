/**
 * 95% Wilson score interval on a proportion (plan §20.2).
 *
 * Re-exported from `src/lib/wilson.ts`. The implementation MOVED there in
 * 6.0 because a measurement's interval stopped being only a reporting nicety:
 * `src/rules/measurement.ts` derives a rule's TIER from the interval, so the
 * number the engine tiers on and the number this gate prints have to be the
 * same number. Keeping a copy here would be two sources of truth for one
 * figure.
 */

export {
  wilsonInterval,
  compareFpMeasurements,
  COMPARISON_MIN_N,
  type WilsonInterval,
  type MeasurementSnapshot,
  type RegressionCheck,
} from "../../src/lib/wilson.js";
