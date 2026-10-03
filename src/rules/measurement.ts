/**
 * Measurement-aware tier resolution (Verification Trust Evolution Plan
 * §07/§11.2 Step 2/§20.3) — the code-side closure of defect D3.
 *
 * The omitted-tier default is no longer unconditionally "core". A rule
 * that does not declare a tier resolves by its measurement's CONFIDENCE
 * INTERVAL, not its point estimate:
 *   - "core"      when the 95% Wilson upper bound is at or below
 *                  CORE_FP_CEILING (confidently good);
 *   - "quarantine" when the lower bound is at or above
 *                  QUARANTINE_FP_FLOOR (confidently bad);
 *   - "extended"  otherwise, with the display status TIER-STRADDLE.
 *
 * 6.0 changed that criterion from a point estimate to the interval, and the
 * change is not cosmetic. Under the old rule a rule needed `fpRate <= 0.1`
 * AND `n >= 10`. Under the new rule it needs `ciHigh <= 0.1`, which for a
 * rule observing ZERO false positives needs n >= 35: the Wilson upper bound
 * for 0/n is about 3.84/(n+3.84), which only drops under 10% at n ≈ 35.
 * Every undeclared-tier rule in the registry fails that today — the best of
 * them is n=14 at 0% observed, ciHigh 21.5%. So all five move to TIER-STRADDLE.
 *
 * That is the honest answer rather than a regression: the point estimate said
 * "0% false positives" and the data said "we have seen fourteen findings and
 * none of them was wrong", which is not the same claim. A rule promoted to
 * core on n=10 is a rule whose ceiling was never established, and a ceiling
 * nobody established is not a ceiling.
 *
 * "PROVISIONAL" and "TIER-STRADDLE" are DISPLAY statuses, not tier values,
 * exactly as "PROVISIONAL" already was: the `Tier` union stays three wide.
 * Adding a fourth member would ripple through `tier-policy.ts`, every
 * `switch` on `Tier`, the matrix schema and the emitted JSON, and it would
 * buy nothing a status string cannot carry — the distinction is for the
 * reader, and the reader reads `ruleStatus`.
 *
 * A measurement is VALID only when its `detectorRevision` matches the
 * rule's declared implementation revision (default 1): a mismatch means
 * the measurement was taken against an older detector (stale) and the
 * rule is treated as unmeasured → provisional → re-measure (§07). This
 * blocks the path Regex → AST → "old measurement says Core" → Core.
 *
 * Consumers: `mjolnir explain`, the rules catalog, the generated rule
 * docs, `mjolnir doctor`'s tier ratchets, the capability matrix, and
 * `src/engine/scan-pipeline.ts`.
 *
 * The pipeline use is the one that matters for findings: it resolves the tier
 * through `effectiveTier` for the quarantine filter and for the `tier` field
 * on every emitted finding. The "every quarantine rule declares its tier
 * explicitly, so this cannot change findings" claim was TRUE when written and
 * is true only because a TEST says so —
 * `tests/rules/registry-ratchet.spec.ts` asserts that every quarantined rule
 * declares the tier. That is a narrower guarantee than "by design", and the
 * distinction is the difference between an invariant and a coincidence.
 */

import type { QADoctorRule } from "./rule.js";
import { MEASURED_FP, MEASURED_FP_RAW } from "./measured-fp.generated.js";
import { RETIRED_RULE_IDS } from "./index.js";
import { wilsonInterval, type WilsonInterval } from "../lib/wilson.js";
import { compareCodePoints } from "../lib/compare.js";

export type Tier = "core" | "extended" | "quarantine";

export type RuleStatus =
  | "MEASURED-CORE"
  | "MEASURED-EXTENDED"
  | "MEASURED-QUARANTINE"
  | "PROVISIONAL"
  | "TIER-STRADDLE"
  | "UNMEASURED";

/**
 * The false-positive rate a rule must be able to defend at 95% confidence to
 * count as core. Applied to the Wilson UPPER bound, so a rule earns core by
 * proving its ceiling, not by reporting a point estimate under it.
 *
 * !! NEEDS n >= 35, AND THE SAMPLER NOW HAS A MODE THAT FUNDS IT — read this
 * before trying to earn it.
 *
 * 10% on the upper bound needs **n >= 35 with ZERO false positives**, using
 * this file's own `wilsonInterval`: 0/20 reads 16.1%, 0/30 reads 11.3%, 0/35
 * reads 9.9%. `samplesForZeroFp` derives the threshold from the ceiling rather
 * than hard-coding 35, and `docs/CORE-READINESS.md` names the work list.
 *
 * The DEFAULT corpus cap is still 20 (`MAX_SAMPLES_PER_RULE`,
 * scripts/corpus-sample.ts), so a plain `npm run corpus:sample` cannot reach
 * this ceiling for any rule — 0/20 is 16.1%, and no amount of re-running that
 * command changes it. What changed is the ALLOCATION, not the arithmetic:
 * `--core-candidates` spends the sample cap only on rules that can actually
 * earn a tier by sampling more, and `--core-target` decides which of those a
 * given pass funds. The predicate and the budget split are in
 * `scripts/lib/core-candidates.ts`.
 *
 * The adjudication budget is what bounds this, and it always did. A global
 * raise to 40 previously produced 1,121 unadjudicated rows across 42 rules,
 * which the committed ceiling refused outright — correctly, because blank
 * verdict rows are dropped rather than counted, so a mostly-blank corpus
 * reports a rate measured on whatever subset happened to be adjudicated.
 * Sampling without the adjudication budget to fill it makes the gate stop
 * complaining without adding evidence. So earning core is still a person's
 * work, one classification at a time
 * (`tests/corpus/verdicts/README.md`), and the sampled rows are only an ask.
 *
 * `tests/rules/core-tier-reachability.spec.ts` pins both halves of that
 * sentence and fails LOUDLY in either direction, so opening the core tier
 * becomes a deliberate event with a diff rather than something a future reader
 * infers from a tier nobody holds.
 *
 * The two constants here were chosen independently, and whether their product is
 * reachable is a product call rather than an oversight to tidy away. The 10%
 * ceiling is now decided on the record: `docs/adr/0013-the-core-ceiling-is-decided.md`.
 */
export const CORE_FP_CEILING = 0.1;

/**
 * The rate a rule must be able to defend at 95% confidence to be quarantined
 * on measurement alone. Applied to the Wilson LOWER bound: a rule is not
 * quarantined for looking bad on four samples.
 *
 * Also nearly inert at the corpus cap, in the other direction. At n=20 a rule
 * needs **15 of 20 false positives (75% observed)** before the lower bound
 * clears 50%: 14/20 reads 48.1%, 16/20 reads 58.4%. Exactly one rule in the
 * registry clears it — `QA-ENV-001`, which was wrong 20 times out of 20. The
 * worst of the rest is `QA-TEST-002` at 62%, which clears neither bound.
 *
 * Consequence, measured across all 79 live rules: `measurementTier` returns
 * `core` for none of them, and `quarantine` for exactly one. The interval rule
 * is not inert — it is all but unreachable, and the one rule it reaches is the
 * one that was wrong every single time. That is why `rule.tier` is a THIRD
 * floor rather than a duplicate of this: 33 of the 34 declared quarantines are
 * held down by the declaration alone. See the `tier` doc in src/rules/rule.ts,
 * `defensibleTier` below, and the arithmetic in
 * `tests/rules/core-tier-reachability.spec.ts`.
 */
export const QUARANTINE_FP_FLOOR = 0.5;

/** The rule's declared detector implementation revision (§07). */
export function declaredDetectorRevision(rule: QADoctorRule): number {
  return rule.detectorRevision ?? 1;
}

/** The measurement recorded for the rule, if it has one. */
export function measurementFor(
  ruleId: string,
): (typeof MEASURED_FP)[string] | undefined {
  return MEASURED_FP[ruleId];
}

/**
 * A measurement exists AND was taken against the detector revision the
 * rule declares now. A revision mismatch (stale) does NOT count — §07:
 * stale → provisional → re-measure.
 */
export function hasValidMeasurement(rule: QADoctorRule): boolean {
  const m = MEASURED_FP[rule.id];
  return (
    m !== undefined && m.detectorRevision === declaredDetectorRevision(rule)
  );
}

/**
 * A measurement exists but was taken against an older detector.
 *
 * Read from `MEASURED_FP_RAW`, not from `MEASURED_FP`.
 *
 * The generator filters `MEASURED_FP` to measurements whose revision still
 * matches the rule's, so a stale row is not IN it — and reading `MEASURED_FP`
 * made this function structurally always `false` for every real rule. It was
 * the one predicate in this file that could not return `true`, and its one
 * live consumer (`scripts/core-readiness.ts`) emitted a dead branch that
 * rendered as "no measurement at the current detector revision" for a rule
 * with 42 hand-classified verdicts behind it. That sentence is the defect, not
 * the report.
 *
 * The RAW map holds the same rows unfiltered, so this is now a question with
 * an answer, and the answer is the one a maintainer needs: there IS a
 * measurement, and it has to be redone.
 */
export function hasStaleMeasurement(rule: QADoctorRule): boolean {
  const raw = MEASURED_FP_RAW[rule.id];
  return (
    raw !== undefined && raw.detectorRevision !== declaredDetectorRevision(rule)
  );
}

/**
 * The confidence interval of a rule's VALID measurement, or undefined when
 * it has none. A stale measurement returns undefined rather than its stale
 * interval: a number derived from an older detector is not evidence about
 * this one, and returning it would let the straddle test pass on stale data.
 *
 * The FP count is ROUNDED, and it is not an optimization. The shipped
 * measurement records a rate and a sample count, not an integer count of false
 * positives, so `fpRate * n` is generally fractional — 10.5% of 19 is 1.995.
 * `wilsonInterval` rounds internally, so passing the raw product gave this
 * function and `scripts/core-readiness.ts` two different `ciHigh` values for
 * the same rule at the same n: the ratchet decided one tier and the
 * readiness table printed another, both derived, neither reconciled. Every
 * caller now reconstructs the count the same way.
 */
export function measurementInterval(
  rule: QADoctorRule,
): WilsonInterval | undefined {
  if (!hasValidMeasurement(rule)) return undefined;
  const m = MEASURED_FP[rule.id];
  if (m === undefined) return undefined;
  return wilsonInterval(Math.round(m.fpRate * m.n), m.n);
}

/**
 * Why a rule's interval does not resolve to a tier, in one sentence.
 *
 * Returned rather than merely implied so the capability matrix, `explain` and
 * the ratchet can all say the SAME reason. "TIER-STRADDLE" on its own tells a
 * reader a decision was declined; it does not tell them how many findings to
 * collect, which is the only actionable part.
 */
export function straddleDetail(rule: QADoctorRule): string | undefined {
  const interval = measurementInterval(rule);
  if (interval === undefined) return undefined;
  if (interval.ciHigh <= CORE_FP_CEILING) return undefined;
  if (interval.ciLow >= QUARANTINE_FP_FLOOR) return undefined;
  const m = MEASURED_FP[rule.id];
  const n = m?.n ?? 0;
  // The n that would settle it, for a rule currently observing zero false
  // positives. Derived rather than quoted so the number stays correct if the
  // ceiling moves: wilson(0, n).ciHigh <= CEILING.
  const nForZeroFp = samplesForZeroFp(CORE_FP_CEILING);
  return (
    `measured FP ${(interval.ciLow * 100).toFixed(1)}–${(interval.ciHigh * 100).toFixed(1)}% ` +
    `(95% Wilson, n=${n}); the interval crosses the ${(CORE_FP_CEILING * 100).toFixed(0)}% core ceiling. ` +
    (nForZeroFp > n
      ? `About ${nForZeroFp} clean samples would settle it.`
      : `Its point estimate is high enough that more samples will not help; it needs a detector change, not a re-measure.`)
  );
}

const Z_SQUARED = 1.959963984540054 ** 2;

/**
 * The sample count a rule observing ZERO false positives needs before its
 * Wilson upper bound falls to `ceiling`.
 *
 * This is the number a maintainer reads to decide what to do about a
 * straddling rule, so it has to be right. It was wrong by a transposition:
 * `z²·p / (p·(1−p)) − z²` simplifies to `z²·p/(1−p)` ≈ 0.43 at the 10%
 * ceiling, and `Math.ceil` turned that into **"about 1 clean sample would
 * settle it"** for every straddling rule.
 *
 * For zero successes the Wilson upper bound collapses to
 * `ciHigh(0, n) = z² / (n + z²)` — the `p̂ = 0` term vanishes from `center`
 * and from the radicand, leaving the two halves of `center ± half` equal.
 * Solving `z²/(n + z²) ≤ c` for `n` gives `n ≥ z²(1 − c) / c`:
 *
 *     c = 0.1 → n ≥ 34.57 → 35
 *
 * Cross-checked against the interval function itself: `wilsonInterval(0, 34)`
 * gives ciHigh 0.1015 — above the ceiling — and `wilsonInterval(0, 35)` gives
 * 0.0989, which clears it. This function returns 35.
 *
 * The n=34 figure was quoted here as 0.1012, which is not what the function
 * returns. A cross-check exists to be run; one carrying a number that fails
 * when you run it is worse than no cross-check, because it reads as evidence
 * and is not.
 */
export function samplesForZeroFp(ceiling: number): number {
  if (!(ceiling > 0) || ceiling >= 1) return 1;
  return Math.ceil((Z_SQUARED * (1 - ceiling)) / ceiling);
}

/**
 * A rule whose measurement exists, is current, and does not confidently
 * resolve to either tier.
 *
 * The predicate is on the INTERVAL, which is what makes it useful: it names
 * exactly the rules whose evidence is too thin to place, and a re-run of the
 * corpus at a larger sample size can move it. The old point-estimate rule
 * could not straddle, because `fpRate <= 0.1 && n >= 10` was a gate a rule
 * either passed or failed — so a rule at n=10 with 0% observed FP was
 * indistinguishable from one at n=400.
 *
 * The `rule.tier` short-circuit is now deliberate rather than incidental. A
 * straddle says "the evidence cannot place this rule", which is a statement
 * about a rule with NO declared tier: a declared tier IS the placement, and a
 * rule the corpus cannot place can still be deliberately held in quarantine —
 * that is what the 33 declared quarantines are. Removing the guard would make
 * all 33 display `TIER-STRADDLE` in `ruleStatus`, which is true of their
 * evidence and would misrepresent their DECISION. The maintainer-facing
 * version of this question ("is this rule's evidence thin?") is
 * `straddleDetail`, which has no such guard.
 */
export function isTierStraddling(rule: QADoctorRule): boolean {
  if (rule.tier !== undefined) return false;
  return straddleDetail(rule) !== undefined;
}

/**
 * The tier the MEASUREMENT alone supports, ignoring any declared tier.
 *
 * This is the interval floor that `effectiveTier` falls back to, extracted so
 * the tightening law can ask the question `effectiveTier` structurally cannot:
 * a declared tier may only ever hold a rule DOWN, never release it.
 *
 * `effectiveTier` cannot answer that, because it short-circuits on
 * `rule.tier` — asking it what a rule's tier "would" be returns the declared
 * value, and a comparison built on it compares the declaration with itself.
 * The first B0 dry-run made exactly that mistake and reported zero
 * mismatches for a comparison that had never run.
 *
 * READ THIS BEFORE USING IT AS A FLOOR. Measured over all 79 live rules, this
 * function returns `extended` for 78 of them and `quarantine` for none: on
 * this corpus the interval rule is very nearly an empty rule, because
 * `ciLow >= 50%` is not reached at n = 10..80. A "declared tier may only
 * tighten" law written against THIS function is decorative — it can only ever
 * catch a rule declaring `core`, which no rule declares. It was written that
 * way first and measured at zero teeth.
 *
 * The floor with teeth is `defensibleTier`, below.
 */
export function measurementTier(rule: QADoctorRule): Tier {
  const interval = measurementInterval(rule);
  if (interval === undefined) return "extended";
  if (interval.ciHigh <= CORE_FP_CEILING) return "core";
  if (interval.ciLow >= QUARANTINE_FP_FLOOR) return "quarantine";
  return "extended";
}

/**
 * The point-estimate quarantine floor: the NOISE floor.
 *
 * `> 30% observed false positives` means the detector is wrong more often
 * than it is right about the thing it claims. That is a product decision
 * independent of how confident the statistics are, which is why it is a
 * separate constant from `QUARANTINE_FP_FLOOR` (the evidence floor) rather
 * than another use of it: the two answer different questions, and B0 measured
 * rules on which they disagree (12 of them).
 */
export const POINT_QUARANTINE_FLOOR = 0.3;

/**
 * The most defensible tier: the STRICTEST of every floor the evidence can
 * support. A declared tier may never sit above this.
 *
 * Built from three inputs because a rule can be indefensible in more than one
 * way, and a floor that only checks one of them is a floor with a hole:
 *
 *   - NO valid measurement at all -> quarantine. A rule nobody has measured
 *     has no evidence for shipping by default, which is the whole reason the
 *     quarantine tier exists. 6 rules are in this state today.
 *   - observed FP above `POINT_QUARANTINE_FLOOR` -> quarantine. The noise
 *     floor: 12 rules are above it today, including `QA-TEST-001` at 60% and
 *     `QA-TEST-002` at 62%.
 *   - otherwise the interval floor, which can still place a rule in core.
 *
 * `defensibleTier(measured well) <= measurementTier(...)` always holds; the
 * point floor and the unmeasured rule are the two ways the interval floor can
 * be too generous, and both are quieter than it is.
 */
export function defensibleTier(rule: QADoctorRule): Tier {
  const m = measurementFor(rule.id);
  if (!hasValidMeasurement(rule) || m === undefined) return "quarantine";
  if (m.fpRate > POINT_QUARANTINE_FLOOR) return "quarantine";
  return measurementTier(rule);
}

/**
 * The tier a rule effectively ships as: its declared tier, or — for the
 * omitted-tier case — what its measurement's interval supports (§11.2 Step 2).
 *
 * The declared tier is a floor that may only tighten, and the measurement is
 * what it is measured against. See `rule.ts`'s `tier` doc for the B0
 * measurement behind that, and `defensibleTier` for the floor it is measured
 * against.
 */
export function effectiveTier(rule: QADoctorRule): Tier {
  if (rule.tier !== undefined) return rule.tier;
  return measurementTier(rule);
}

/**
 * Display status (§11.2 Step 2 + §07): PROVISIONAL covers both paths to
 * "not honestly measured" — an extended rule without a valid measurement
 * (the D3 demotion display) and a core rule whose measurement went stale
 * via a detectorRevision mismatch (§07: stale → provisional →
 * re-measure; the §20.3 registry ratchet fails CI for that state, so it
 * is transient, but it must never DISPLAY as measured). UNMEASURED is
 * reserved for quarantine rules without a valid measurement (their cap
 * already makes them advisory; the matrix renders the distinction).
 */
export function ruleStatus(rule: QADoctorRule): RuleStatus {
  // Checked before the tier, because the status is the more specific claim:
  // a straddling rule is `extended` and also straddling, and reporting only
  // the tier would report the half that carries no information.
  if (isTierStraddling(rule)) return "TIER-STRADDLE";
  const tier = effectiveTier(rule);
  const valid = hasValidMeasurement(rule);
  if (tier === "core") return valid ? "MEASURED-CORE" : "PROVISIONAL";
  if (tier === "extended") return valid ? "MEASURED-EXTENDED" : "PROVISIONAL";
  return valid ? "MEASURED-QUARANTINE" : "UNMEASURED";
}

/** The §11.2 Step 2 PROVISIONAL display predicate. */
export function isProvisional(rule: QADoctorRule): boolean {
  return effectiveTier(rule) === "extended" && !hasValidMeasurement(rule);
}

/**
 * Owner ruling 2026-09-08 (E-1, MVP recon audit): RETIRED_RULE_IDS is
 * the canonical source of retirement — quarantine does NOT equal
 * retirement, and a retired rule never counts toward the active census
 * or the measurement KPI.
 */
export function isRetiredRule(ruleId: string): boolean {
  return RETIRED_RULE_IDS.includes(ruleId);
}

/* ------------------------------------------------------------------ *
 * THE HELD-OUT SPLIT
 *
 * `docs/claim-registry.json` blocks the `rule-registry-census` claim with
 * one sentence: "Promoting this needs a classifier that has never seen the
 * verdicts it is scored against." This is that split.
 *
 * WHY IT IS BY REPOSITORY AND NEVER BY ROW
 *
 * Splitting by row is trivially re-drawable. Take any classifier, and a
 * per-row split can be searched until the held-out half agrees with the
 * measurement half — that is fitting the split to the answer, and it makes
 * the number worse rather than the model better. A repository is the unit a
 * verdict row actually comes from: rows in one file are findings from one
 * codebase, one team, one idiom, one set of conventions. A per-row split
 * puts the same file — often the same test — in both halves, which is
 * leakage wearing a partition's clothes. So the unit is the corpus
 * repository, whole.
 *
 * WHY THE ASSIGNMENT IS A HASH AND NOT A LIST
 *
 * A committed hand-written list can be re-drawn the moment it is
 * inconvenient, and nothing in the tree would show it. A salted hash makes
 * the split a pure function of the repository id: the same input always
 * yields the same partition, forever, and re-deriving it is a check rather
 * than an opinion. The salt is committed, which means changing it is a
 * visible one-line diff that invalidates every published number — which is
 * the correct cost for changing the split.
 *
 * WHY THERE IS ONE EXCLUSION, AND IT IS COMPUTED
 *
 * The obvious hazard: a repository can be the ONLY source of rows for the
 * rules closest to earning core, and moving it to holdout would empty the
 * measurement side of exactly the evidence 6.0 is waiting on. `keycloak`
 * holds 22 of `QA-JV-101`'s rows and 30 of `QA-PW-117`'s.
 *
 * The exclusion is not a hand-kept list of those repositories — that is the
 * failure mode above wearing a smaller hat. It is derived from
 * `isCoreCandidate` by the caller, so it moves with the candidate set and
 * cannot be edited into place. Everything the hash puts in holdout that is NOT
 * a protected source goes to holdout.
 *
 * WHAT THE HOLDOUT DOES AND DOES NOT DO
 *
 * It VALIDATES; it does not GATE. Core promotion reads the measurement
 * partition. Requiring n >= 35 clean holdout rows would consume whole
 * repositories — the Java corpora are `appsmith` and `keycloak`, and moving
 * one drops `QA-JV-101` into a partition that cannot replace them. A
 * holdout that gates is a holdout sized by the corpus rather than by the
 * question, and the honest way to say "this generalises" is to report the
 * holdout number beside the measurement number and let a reader see both.
 */

export type HoldoutPartition = "measurement" | "holdout";

/**
 * Committed salt. Changing this re-draws the entire split and therefore
 * invalidates every published rate; it is a one-line diff on purpose.
 */
export const HOLDOUT_SALT = "mjolnir-holdout-v1";

/** Buckets the hash is reduced to. Holdout is the lowest `HOLDOUT_BUCKETS_PERCENT`. */
export const HOLDOUT_PERCENT = 25;

/**
 * FNV-1a, 32-bit. Not a security primitive and does not need to be: the
 * requirement is a STABLE partition, and any deterministic hash gives one.
 * Rolling crypto here would be the dependency this file is trying to avoid.
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * The raw bucket for a repository id, before any exclusion. Exposed so the
 * split can be explained: a reader who disagrees with an assignment can see
 * whether it came from the hash or from the protection rule.
 */
export function holdoutBucket(repositoryId: string): number {
  return fnv1a(`${HOLDOUT_SALT}:${repositoryId}`) % 100;
}

/**
 * Repositories that MUST stay in measurement, named by the caller.
 *
 * This function does not DERIVE the protected set, and that is a layering
 * decision rather than a gap. The predicate that decides it — `isCoreCandidate`
 * — lives in `scripts/lib/core-candidates.ts`, and `src/` importing from
 * `scripts/` would invert the dependency the whole repository is built to keep
 * (`scripts/check-unimported-modules.mjs` exists to hold that line). So the
 * caller computes the set and passes it in; everything here stays a pure
 * function of committed data.
 *
 * The point of the rule is that the set must not be HAND-MAINTAINED, because a
 * hand-kept list of "repositories we must not move" is exactly the thing a
 * re-drawn split would use to justify itself. Deriving it from
 * `isCoreCandidate` means it moves with the candidate set and cannot be edited
 * into place — see `scripts/v6/check-holdout-split.ts`, which is the caller
 * that does the deriving.
 */
export interface HoldoutProtected {
  repositoryId: string;
  /** Rule -> how many of its committed verdict rows this repository holds. */
  rowsByRule: Record<string, number>;
}

/** Which partition a repository's verdicts belong to. */
export function holdoutPartitionFor(
  repositoryId: string,
  protectedIds: ReadonlySet<string>,
): HoldoutPartition {
  if (protectedIds.has(repositoryId)) return "measurement";
  return holdoutBucket(repositoryId) < HOLDOUT_PERCENT
    ? "holdout"
    : "measurement";
}

export interface HoldoutSplit {
  holdout: string[];
  measurement: string[];
  protected: HoldoutProtected[];
  /** Bucket per repository, so an assignment can be explained or disputed. */
  buckets: Record<string, number>;
}

/**
 * The whole split, from the committed verdict files.
 *
 * `rowsByRepository` maps repository id -> (rule id -> committed row count).
 * `protectedList` is the caller's derived exclusion (above).
 *
 * Rows are counted, never moved: the partition is a LABEL on a repository, and
 * a repository in the holdout keeps its rows exactly where they are. The label
 * is what a consumer filters on, which is why splitting by repository is a
 * partition of the FILES and not of the corpus.
 */
export function computeHoldoutSplit(
  rowsByRepository: ReadonlyMap<string, ReadonlyMap<string, number>>,
  protectedList: readonly HoldoutProtected[] = [],
): HoldoutSplit {
  const protectedIds = new Set(protectedList.map((p) => p.repositoryId));
  const holdout: string[] = [];
  const measurement: string[] = [];
  const buckets: Record<string, number> = {};
  for (const repositoryId of [...rowsByRepository.keys()].sort()) {
    buckets[repositoryId] = holdoutBucket(repositoryId);
    if (holdoutPartitionFor(repositoryId, protectedIds) === "holdout") {
      holdout.push(repositoryId);
    } else {
      measurement.push(repositoryId);
    }
  }
  return {
    holdout,
    measurement,
    protected: [...protectedList].sort((a, b) =>
      compareCodePoints(a.repositoryId, b.repositoryId),
    ),
    buckets,
  };
}
