/**
 * `mjolnir doctor` — self-audit of Mjolnir's own rule base.
 *
 * The product must be able to fail because of a bug in the product.
 * This command checks, against the repo it runs in (the Mjolnir source
 * tree when dogfooding):
 *   1. Fixture firewall — every registered rule has must-fire AND
 *      must-not-fire fixtures (the project's own law).
 *   2. Registry sanity — unique IDs, valid ID format, no duplicate titles.
 *   3. Trust Metadata ratchet — reports rules missing Trust Metadata
 *      (languages/frameworks/falsePositiveRisk). Informational today;
 *      becomes blocking once coverage reaches 100%.
 *
 * Exit codes reuse the frozen set: 0 healthy · 1 violations · 20 crash.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type {
  CorePromotion,
  QADoctorRule,
  StrategyReasonCode,
} from "../rules/rule.js";
import { RETIRED_RULE_IDS, RULES } from "../rules/index.js";
import { RULE_CATEGORIES } from "../types.js";
import { MEASURED_FP } from "../rules/measured-fp.generated.js";
import { isRecord } from "../lib/safe-json.js";
import { validateAllRulesMetadata } from "../rules/rule-metadata-schema.js";

/** The closed reason-code set (master plan P8) — mirrored from
 * src/rules/rule.ts's StrategyReasonCode union via a runtime set so the
 * doctor check validates membership without an extra export cycle. */
const VALID_REASON_CODES: ReadonlySet<string> = new Set<StrategyReasonCode>([
  "shell-string-in-config",
  "exact-key-match",
  "lexical-artifact",
  "runner-semantic",
  "string-content-defect",
  "absence-aggregate",
  "family-fallback-lockstep",
  "migration-deferred-next-measurement",
]);

/** The shipped measurement map's entry shape (re-exported for the G6 seam). */
export type { MeasuredFp } from "../rules/measured-fp.generated.js";
import type { MeasuredFp as MeasuredFpEntry } from "../rules/measured-fp.generated.js";

import {
  declaredDetectorRevision,
  effectiveTier,
  hasValidMeasurement,
} from "../rules/measurement.js";
// The one error-to-message derivation. This file used to declare its own
// `errorText`, byte-identical to two others; a doctor's entire value is that
// its detail strings say what actually happened, so the helper that builds
// them is the last place to have four copies.
import { errorMessage } from "../cli-io.js";
import { deriveEvidenceLevel } from "../types.js";
import { capForTier } from "../engine/tier-policy.js";
import { sectionHeader, plainContext } from "../reporter/ui.js";
import {
  computeDetectorHashes,
  loadManifest,
  type DetectorHashManifest,
} from "../engine/detector-hash.js";

const ui = plainContext();

/**
 * Check outcome status (certification-audit Phase 5, G2):
 *   - "pass"         — evaluated, no violations;
 *   - "fail"         — evaluated, violations found (blocking);
 *   - "inconclusive" — could NOT be evaluated (missing inputs, installed
 *     package, malformed manifest). Blocking, and rendered distinctly:
 *     an INCONCLUSIVE check never renders as PASS, in text or JSON.
 */
export type CheckStatus = "pass" | "fail" | "inconclusive";

export interface DoctorCheck {
  name: string;
  status: CheckStatus;
  /** Convenience mirror of `status === "pass"` (existing consumers). */
  ok: boolean;
  details: string[];
}

/** Builds the check record: `ok` is always the pass-mirror of `status`. */
function check(
  name: string,
  status: CheckStatus,
  details: string[],
): DoctorCheck {
  return { name, status, ok: status === "pass", details };
}

// Audit M3: the ID validator derives from the shared RULE_FAMILIES
// table (src/commands/rule-families.ts) — doctor and create-rule can
// never disagree about which families exist again.
import { RULE_ID_RE } from "./rule-families.js";

const VALID_ID = RULE_ID_RE;

function nonHiddenFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => !f.startsWith("."));
}

/** Check 1: fixture firewall completeness for test-file rules. */
export function checkFixtureFirewall(fixturesRoot: string): DoctorCheck {
  const details: string[] = [];
  let ok = true;
  const scoped = RULES.filter(
    (r) => r.appliesTo === "test-files" || r.appliesTo === ("python" as never),
  );
  for (const rule of scoped) {
    const fire = join(fixturesRoot, rule.id, "must-fire");
    const noFire = join(fixturesRoot, rule.id, "must-not-fire");
    if (nonHiddenFiles(fire).length === 0) {
      ok = false;
      details.push(`${rule.id}: missing must-fire fixture`);
    }
    if (nonHiddenFiles(noFire).length === 0) {
      ok = false;
      details.push(`${rule.id}: missing must-not-fire fixture`);
    }
  }
  return check("fixture-firewall", ok ? "pass" : "fail", details);
}

/** Check 2: registry sanity — IDs unique, well-formed, titles distinct,
 * and (P8) every LEXICAL rule carries a valid depth-adjudication record. */
export function checkRegistry(
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];
  const ids = new Set<string>();
  let ok = true;
  for (const r of rules) {
    if (!VALID_ID.test(r.id)) {
      ok = false;
      details.push(`${r.id}: malformed rule ID`);
    }
    if (ids.has(r.id)) {
      ok = false;
      details.push(`${r.id}: duplicate registration`);
    }
    ids.add(r.id);
    // Master plan P8 (plan 1788853205786, decision 9 — "no unexplained
    // depth"): a LEXICAL rule without a depth-adjudication record is a
    // registry violation. The reason code must be a member of the closed
    // set and the detail must carry a real derivation.
    if (r.detectionStrategy === "LEXICAL") {
      const j = r.strategyJustification;
      if (!j) {
        ok = false;
        details.push(
          `${r.id}: LEXICAL strategy without strategyJustification — ` +
            `declare the reason the lexical form ships (docs/DEPTH-ADJUDICATION.md)`,
        );
      } else if (!VALID_REASON_CODES.has(j.reasonCode)) {
        ok = false;
        details.push(
          `${r.id}: strategyJustification.reasonCode "${String(
            (j as { reasonCode: unknown }).reasonCode,
          )}" is outside the closed set (${[...VALID_REASON_CODES].join(", ")})`,
        );
      } else if (j.detail.trim().length < 20) {
        ok = false;
        details.push(
          `${r.id}: strategyJustification.detail is boilerplate — cite the ` +
            `detector's actual shape`,
        );
      }
    }
    // A LEXICAL rule that DECLARES `core` on a measurement which does not
    // clear the ceiling must carry a `corePromotion` (src/rules/rule.ts):
    // a named owner, an expiry, and a rationale. This is the check that
    // makes a declared core claim a RECORD rather than a comment — and it is
    // the live half of the north-star law, which says a rule without a
    // measured FP rate cannot ship in core. Nineteen rules broke that law
    // silently before 6.0; they were demoted rather than annotated, and this
    // is what keeps the next one from arriving unannounced.
    //
    // `effectiveTier`, not `r.tier`. A rule that declares NO tier resolves
    // through the same function every other surface uses — so a rule could
    // satisfy `checkTierEnforcement`'s core rules by omitting `tier` while
    // dodging this obligation entirely. The governance record must not be
    // bypassable by deleting a line. Latent while the tier is empty, and
    // cheap to close now rather than after the first promotion.
    if (effectiveTier(r) === "core" && !hasValidMeasurement(r)) {
      const promotion = r.corePromotion;
      if (!promotion) {
        ok = false;
        details.push(
          `${r.id}: declares tier "core" without a valid measurement and ` +
            `without a corePromotion record — add one with a named owner and an ` +
            `expiry date, or demote to "extended" (docs/ANTI-CREEP.md)`,
        );
      } else {
        const promotionProblems = checkCorePromotion(promotion);
        for (const problem of promotionProblems) {
          ok = false;
          details.push(`${r.id}: corePromotion ${problem}`);
        }
      }
    }
    // Duplicate titles are allowed across languages (TS and Python rules
    // legitimately share a title, e.g. "Skipped test") — only flag exact
    // duplicates within the same category family.
    const family = r.id.split("-")[1];
    for (const other of rules) {
      if (
        other.id !== r.id &&
        other.title === r.title &&
        other.id.split("-")[1] === family
      ) {
        ok = false;
        details.push(`"${r.title}": duplicate title in family (${r.id})`);
      }
    }
  }
  return check("registry-sanity", ok ? "pass" : "fail", details);
}

/**
 * Check 12: quarantine ownership.
 *
 * The mirror of the `corePromotion` obligation. A rule in quarantine asserts
 * that it is NOT trusted, and an assertion nobody owns and nobody re-examines
 * is permanent by default — which is the outcome the tier exists to avoid.
 *
 * Kept OUT of `checkRegistry` on purpose. That function answers "is the
 * registry valid", and its own test asserts zero findings on the real
 * registry; folding a policy backlog into it would mean either a red build on
 * the day the check landed or a test that had to be relaxed to permit
 * failures. A separate check is a separate name in the report, and the
 * per-rule detail is `docs/QUARANTINE-REMEDIATION.md`, generated from the same
 * registry.
 *
 * Permissive about ABSENCE and strict about PRESENCE until the field is
 * populated: a rule with no record is a backlog item, and a rule with a
 * MALFORMED record is a claim somebody made badly. That asymmetry is the same
 * one the 6.0 demotion ratchet shipped with, and it is why the first run is a
 * number rather than a red build.
 */
export function checkQuarantineOwnership(
  rules: readonly QADoctorRule[] = RULES,
  /** The checkout root — see `runDoctorSelfAudit` for why this is not CWD. */
  repoRoot: string = process.cwd(),
): DoctorCheck {
  const quarantined = rules.filter((r) => effectiveTier(r) === "quarantine");
  const details: string[] = [];
  let ok = true;

  /**
   * The disposition registry — `docs/QUARANTINE-OWNERSHIP.json`, generated by
   * `scripts/generate-quarantine-ledger.ts`.
   *
   * THIS ARM IS WHAT MAKES THE RAMP A RAMP. The check used to REPORT that N of
   * 34 quarantined rules carry no `quarantinePromotion` and explain that a cap
   * "would have to start at 34 and be lowered as the field is filled" — which is
   * correct about a count and leaves the actual defect untouched. The defect is
   * not that the number is 34; it is that a quarantined rule is SILENT. Nobody
   * decided anything about it, and silence is what a cap cannot distinguish
   * from a decision.
   *
   * So silence is now a failure. A quarantined rule must appear in one of two
   * places: carry a `quarantinePromotion` on itself (someone granted trust
   * before the corpus could support it), or carry a typed disposition in the
   * registry with an owner, a rationale and a review date (someone recorded what
   * they decided instead). There is no third option that passes, and that is the
   * property — a quarantine is now a recorded decision rather than a default.
   */
  const ownershipPath = join(repoRoot, "docs", "QUARANTINE-OWNERSHIP.json");
  const dispositions = new Map<string, { kind: string; expiresOn?: string }>();
  let ownershipReadable = existsSync(ownershipPath);
  if (ownershipReadable) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(ownershipPath, "utf8"));
      const entries = (parsed as { entries?: unknown }).entries;
      if (!Array.isArray(entries)) {
        ownershipReadable = false;
      } else {
        for (const entry of entries) {
          if (!isRecord(entry)) continue;
          const ruleId = entry.ruleId;
          if (typeof ruleId !== "string") continue;
          dispositions.set(ruleId, {
            kind:
              typeof entry.disposition === "string" ? entry.disposition : "",
            ...(typeof entry.expiresOn === "string"
              ? { expiresOn: entry.expiresOn }
              : {}),
          });
        }
      }
    } catch {
      ownershipReadable = false;
    }
  }
  if (!ownershipReadable) {
    ok = false;
    details.push(
      "docs/QUARANTINE-OWNERSHIP.json is missing or unreadable — without it every " +
        "quarantined rule is silent. Regenerate with `npm run docs:quarantine-ledger`",
    );
  } else {
    const TODAY = new Date().toISOString().slice(0, 10);
    for (const rule of quarantined) {
      if (rule.quarantinePromotion !== undefined) continue;
      const disposition = dispositions.get(rule.id);
      if (disposition === undefined) {
        ok = false;
        details.push(
          `${rule.id}: quarantined with NO disposition — it carries neither a ` +
            "`quarantinePromotion` nor an entry in docs/QUARANTINE-OWNERSHIP.json. " +
            "Record the decision: either a `quarantinePromotion` or a disposition, " +
            "carrying `owner`, `rationale` and `expiresOn` in both cases. " +
            "docs/QUARANTINE-REMEDIATION.md has the evidence for either",
        );
        continue;
      }
      if (disposition.kind === "") {
        ok = false;
        details.push(`${rule.id}: disposition entry has no typed disposition`);
        continue;
      }
      if (
        disposition.expiresOn !== undefined &&
        disposition.expiresOn < TODAY
      ) {
        ok = false;
        details.push(
          `${rule.id}: disposition '${disposition.kind}' lapsed on ` +
            `${disposition.expiresOn} — renew it, or change the rule's state`,
        );
      }
    }
    // An entry for a rule that has left quarantine is a record describing a
    // state its rule is no longer in — the same "stranded" shape the promotion
    // arm below already catches, caught here too so the registry cannot quietly
    // accumulate claims about rules that moved on.
    for (const [ruleId] of dispositions) {
      const rule = rules.find((r) => r.id === ruleId);
      if (rule === undefined || effectiveTier(rule) === "quarantine") continue;
      ok = false;
      details.push(
        `${ruleId}: has a disposition in docs/QUARANTINE-OWNERSHIP.json but resolves ` +
          `to ${effectiveTier(rule)} — remove the entry`,
      );
    }
  }

  // A rule carrying a `quarantinePromotion` while NOT in quarantine is
  // unaccounted-for in the other direction: the record says "this rule is not
  // trusted yet, re-measure it by DATE" and the rule has since been promoted
  // without the record being removed or re-dated. Without this arm the check
  // would pass a rule whose only ownership record describes a state it has
  // left — and a stale record is a claim nobody is maintaining.
  const stranded = rules.filter(
    (r) =>
      r.quarantinePromotion !== undefined && effectiveTier(r) !== "quarantine",
  );

  for (const rule of quarantined) {
    const promotion = rule.quarantinePromotion;
    if (promotion === undefined) continue;
    for (const problem of checkCorePromotion(promotion)) {
      ok = false;
      details.push(`${rule.id}: quarantinePromotion ${problem}`);
    }
  }

  for (const rule of stranded) {
    ok = false;
    details.push(
      `${rule.id}: carries a quarantinePromotion but resolves to ` +
        `${effectiveTier(rule)} — remove the record, or re-date it against the ` +
        "state the rule is actually in",
    );
  }

  if (quarantined.length === 0 && stranded.length === 0) {
    return check("quarantine-ownership", "pass", [
      "No rules in quarantine, so no quarantine is unowned",
    ]);
  }
  details.unshift(
    quarantined.length === 0
      ? `No rules are quarantined, but ${stranded.length} carry a quarantinePromotion record`
      : `${quarantined.length} rule(s) in quarantine, each with either a ` +
          "quarantinePromotion or a recorded disposition — silence is the failure " +
          (stranded.length > 0
            ? `. ${stranded.length} rule(s) carry a record but are no longer quarantined`
            : ""),
  );
  return check("quarantine-ownership", ok ? "pass" : "fail", details);
}

/**
 * How long a `corePromotion` may run, in days.
 *
 * A grant is a bridge from "the corpus cannot support this" to "a human says
 * so". A bridge that never ends is a tier, which is what this exists to avoid,
 * so the default is 90 and the ceiling is 180.
 *
 * Named constants because the first version inlined both numbers in the
 * condition and then wrote a THIRD number in the message — "the default is
 * 90" against a `days > 180` test, with nothing named anywhere. A reader
 * comparing the code to the message had to count.
 */
const DEFAULT_CORE_PROMOTION_DAYS = 90;
const MAX_CORE_PROMOTION_DAYS = 180;

/** A rationale has to be an argument, not a verdict. */
const MIN_RATIONALE_CHARS = 40;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * What is wrong with a `corePromotion` record, or `[]` when it is sound.
 *
 * Returns sentences rather than booleans because every one of these has to
 * name the field and say what to put there. A registry check that reports
 * "invalid corePromotion" sends the reader to the source anyway; a check that
 * reports "corePromotion.owner is empty — a core claim with nobody's name on
 * it is a default" is answerable where it is printed.
 *
 * Exported because `npm run docs:core-readiness` reports the same verdicts, and
 * a second implementation of "is this grant sound" would drift from this one —
 * which is the defect the `declaredCoreWithoutEvidence` ratchet already records
 * once in this file's history.
 */
export function checkCorePromotion(
  promotion: CorePromotion,
  today: string = new Date().toISOString().slice(0, 10),
): string[] {
  const problems: string[] = [];
  if (promotion.rationale.trim().length < MIN_RATIONALE_CHARS) {
    problems.push(
      "rationale is too short to be an argument — say why this rule is trusted " +
        "before the corpus can support it (a structural premise is legitimate; " +
        '"seemed fine" is not)',
    );
  }
  if (promotion.owner.trim().length === 0) {
    problems.push(
      "has no owner — a core claim with nobody's name on it is a default, " +
        "not a decision",
    );
  }
  if (!ISO_DATE.test(promotion.grantedAt)) {
    problems.push(
      `grantedAt "${promotion.grantedAt}" is not an ISO-8601 date (YYYY-MM-DD)`,
    );
  }
  if (!ISO_DATE.test(promotion.expiresOn)) {
    problems.push(
      `expiresOn "${promotion.expiresOn}" is not an ISO-8601 date (YYYY-MM-DD)`,
    );
  } else {
    if (ISO_DATE.test(promotion.grantedAt)) {
      if (promotion.expiresOn < promotion.grantedAt) {
        problems.push(
          `expiresOn (${promotion.expiresOn}) precedes grantedAt ` +
            `(${promotion.grantedAt})`,
        );
      } else {
        const days =
          (Date.parse(promotion.expiresOn) - Date.parse(promotion.grantedAt)) /
          86_400_000;
        if (days > MAX_CORE_PROMOTION_DAYS) {
          problems.push(
            `runs for ${days} days — the default is ${DEFAULT_CORE_PROMOTION_DAYS} ` +
              `and the ceiling is ${MAX_CORE_PROMOTION_DAYS}, and a claim that long ` +
              "is a tier rather than a grant",
          );
        }
      }
    }
    if (promotion.expiresOn < today) {
      problems.push(
        `EXPIRED on ${promotion.expiresOn} — an expired grant resolves the rule ` +
          `to "extended" (docs/CORE-READINESS.md reports it as EXPIRED); ` +
          "re-justify it or let the demotion stand",
      );
    }
  }
  return problems;
}

/** Check 3: Trust Metadata presence (informational until full coverage). */
export function checkTrustMetadata(
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const missing = rules.filter(
    (r) =>
      !r.languages?.length ||
      !r.frameworks?.length ||
      r.falsePositiveRisk === undefined,
  );
  return check(
    "trust-metadata",
    missing.length === 0 ? "pass" : "fail",
    missing.map((r) => `${r.id}: missing trust metadata`),
  );
}

/**
 * Check 4 (Honesty Core): evidence-level honesty. A rule that claims a
 * stronger evidence level than its findingType+confidence derivation
 * supports is lying — deterministic-defect/high may claim E2; everything
 * else is capped at E1, observations at E0.
 */
export function checkEvidenceHonesty(
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];
  let ok = true;
  for (const r of rules) {
    if (r.evidenceLevel === undefined) continue;
    const derived = deriveEvidenceLevel(r.findingType, r.confidence);
    if (r.evidenceLevel > derived) {
      ok = false;
      details.push(
        `${r.id}: declares ${r.evidenceLevel} but findingType=${r.findingType}/confidence=${r.confidence} supports at most ${derived}`,
      );
    }
  }
  return check("evidence-honesty", ok ? "pass" : "fail", details);
}

/**
 * Check 4b (ADR 0014): the core floor is only honest if a core rule does not
 * DECLARE the level the floor exists to override.
 *
 * `checkEvidenceHonesty` cannot catch this one, and the gap is structural
 * rather than incidental: that check fails a rule for claiming MORE than its
 * findingType supports, and `E0` is the floor of the ladder, so a core rule
 * declaring `E0` is never "too strong" by its arithmetic. A0/E0 is perfectly
 * legal for an extended rule. For a core rule it is a declaration that the
 * measurement earning the promotion is also a declaration that the detector
 * proves nothing — the two contradict each other, and the floor would resolve
 * the contradiction silently, in the finding, after the declaration was
 * already published on the rule's `explain` page.
 *
 * So the contradiction is caught at the source. This is the interlock that
 * makes the floor safe to ship: a rule that has to be overridden is a rule
 * whose metadata is wrong, and the fix is the metadata.
 */
export function checkCoreFloorDeclaration(
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];
  const offenders = rules.filter(
    (r) => r.tier === "core" && r.evidenceLevel === "E0",
  );
  for (const r of offenders) {
    details.push(
      `${r.id}: core rule declares evidenceLevel=E0 — the core floor (ADR 0014) overrides it at scan time, so the declaration is published and untrue. Declare E1 or E2, or demote the tier.`,
    );
  }
  const core = rules.filter((r) => r.tier === "core").length;
  details.unshift(
    core === 0
      ? "0 core rules — the floor (E1) is inert until the first promotion"
      : `${core} core rule(s) floored to evidence=E1 — none may declare E0`,
  );
  return check(
    "core-floor-declaration",
    offenders.length === 0 ? "pass" : "fail",
    details,
  );
}

export interface DoctorReport {
  checks: DoctorCheck[];
  healthy: boolean;
  /** The measurement census (Phase 4.3) — see measurementBlock(). */
  measurement: MeasurementBlock;
}

/**
 * Measurement census (Phase 4.3): measured = rules with a valid
 * MEASURED_FP entry; unmeasured = the rest; quarantine = measured rules
 * whose effective tier is quarantine. One function, used by the doctor
 * report AND the JSON contract — a single reproducible answer.
 */
export function measurementBlock(
  rules: readonly QADoctorRule[] = RULES,
): MeasurementBlock {
  const measured = rules.filter((r) => {
    const m = MEASURED_FP[r.id];
    return (
      m !== undefined && m.detectorRevision === declaredDetectorRevision(r)
    );
  });
  // effectiveTier (not raw tier): an omitted tier resolves
  // measurement-dependently (plan §11.2 Step 2) — the census must agree
  // with the tier-enforcement check about who counts as quarantine.
  const quarantine = measured.filter((r) => effectiveTier(r) === "quarantine");
  // Counted over ALL rules, not over `measured`: `core` is a tier, not a
  // measurement state, and a rule that cannot be measured is barred from it
  // by MAX_UNMEASURED_CORE rather than by being invisible here. Hiding an
  // unmeasured core rule from its own census count would let the one failure
  // this number exists to surface go unreported.
  const core = rules.filter((r) => effectiveTier(r) === "core").length;
  return {
    measured: measured.length,
    unmeasured: rules.length - measured.length,
    total: rules.length,
    quarantine: quarantine.length,
    core,
  };
}

export interface MeasurementBlock {
  measured: number;
  unmeasured: number;
  total: number;
  quarantine: number;
  core: number;
}

/**
 * Law #3 ratchet (audit H-2): "Rules without a measured FP rate
 * (n ≥ 10) cannot ship in the core tier" — restated as an executable
 * cap instead of a decorative sentence. Verification Trust Evolution
 * Phase 1 (§11.2 Step 2/§11 exit gate) closed the hole in code: the
 * omitted-tier default is measurement-dependent and the registry
 * ratchet (tests/rules/registry-ratchet.spec.ts) fails on ANY unmeasured
 * effective-core rule, so the only value this cap can take is 0.
 * Kept as an explicit constant so the law stays visible in the doctor
 * report rather than dissolving into a test file.
 */
export const MAX_UNMEASURED_CORE = 0;

/**
 * Check 5 (Phase 4 — Tempering Plan, ratcheted per audit H-2):
 * tier enforcement. Core-tier rules must have a measured FP rate
 * (n ≥ 10 classified verdicts in tests/corpus/verdicts/) at a matching
 * detectorRevision (plan §07 — a stale measurement counts as
 * unmeasured). The number of unmeasured effective-core rules must stay
 * at or under MAX_UNMEASURED_CORE — exceeding the ratchet is a blocking
 * failure. Effective tier resolves measurement-dependently (plan §11.2
 * Step 2): an omitted tier counts as core only with a valid measurement.
 */
export function checkTierEnforcement(
  verdictsDir: string,
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];

  // L4 ruling (owner, 2026-09-08): without LIVE verdicts there is no live
  // evidence that any tier claim is proven — INCONCLUSIVE, blocking, and
  // never silently substituted by MEASURED_FP. The generated map remains a
  // historical artifact (see below), but it may not stand in for evidence
  // that is simply not present — same principle as revision-integrity's
  // installed-package arm: a check that cannot be evaluated never renders
  // as pass (G2/22).
  if (!existsSync(verdictsDir)) {
    return check("tier-enforcement", "inconclusive", [
      "INCONCLUSIVE: live verdicts unavailable (tests/corpus/verdicts missing — installed package) — tier claims cannot be proven without live evidence; MEASURED_FP is a historical artifact and does not substitute (owner ruling 2026-09-08, L4)",
    ]);
  }

  // Classified-verdict count per rule. The shipped src/rules/
  // measured-fp.generated.ts is the HISTORICAL ARTIFACT base (baked in
  // because tests/corpus/verdicts/ is not packed). When running from a
  // checkout whose verdicts have grown since the last `generate-fp-audit-table`,
  // the live directory is authoritative wherever it has rows.
  const classifiedPerRule = new Map<string, number>();
  const byId = new Map(rules.map((r) => [r.id, r] as const));
  for (const [id, m] of Object.entries(MEASURED_FP)) {
    const rule = byId.get(id);
    // A stale measurement (revision mismatch, plan §07) does not count:
    // stale → provisional → re-measure.
    if (rule && m.detectorRevision === declaredDetectorRevision(rule)) {
      classifiedPerRule.set(id, m.n);
    }
  }
  let live: Map<string, number>;
  try {
    live = new Map<string, number>();
    const files = readdirSync(verdictsDir).filter((f) => f.endsWith(".jsonl"));
    for (const f of files) {
      const lines = readFileSync(join(verdictsDir, f), "utf8")
        .split("\n")
        .filter((l) => l.trim().length > 0);
      for (const line of lines) {
        try {
          const parsed: unknown = JSON.parse(line);
          if (!isRecord(parsed)) continue;
          const entry = parsed as { verdict?: unknown; ruleId?: unknown };
          if (entry.verdict === "TP" || entry.verdict === "FP") {
            if (typeof entry.ruleId === "string") {
              live.set(entry.ruleId, (live.get(entry.ruleId) ?? 0) + 1);
            }
          }
        } catch {
          // Unparseable rows are FAILed by checkMeasurementConsistency,
          // which always runs alongside this check in the self-audit —
          // the owner's per-failure-type delegation (L4, 2026-09-08).
        }
      }
    }
  } catch (e) {
    // The directory exists but cannot be read — the evidence is present
    // and invalid, which is a different failure than absent: still not
    // evaluable here, and still never rendered as pass (G2/22).
    return check("tier-enforcement", "inconclusive", [
      `INCONCLUSIVE: live verdicts unreadable — ${errorMessage(e)} (owner ruling 2026-09-08, L4)`,
    ]);
  }
  if (live.size > 0) {
    for (const [id, n] of live) classifiedPerRule.set(id, n);
  }

  // DELIBERATELY still `=== "core"`, not `inLaunchSet`.
  //
  // This is law 3 (north-star) — "rules without a measured FP rate cannot ship
  // in the core tier" — and law 1 now governs the shipped set, so the two
  // check different sets on purpose. Applying `inLaunchSet` here would put all
  // 45 shipping rules through the ≥10-verdict requirement and fail the check
  // immediately; that is a policy decision about what the product may ship, not
  // a defect in the check, and it is recorded as an open question rather than
  // taken unilaterally.
  //
  // What is NOT acceptable is the state this was in silently: the check had a
  // cap of 0 and an empty set, so it passed by having nothing to say, and the
  // next promotion would have arrived with it already green.
  const coreRules = rules.filter((r) => effectiveTier(r) === "core");
  // `promotedBy` is the reason this check is not vacuous. The 6.0 demotion
  // emptied core, so "every core rule has ≥10 verdicts" had nothing to say:
  // MAX_UNMEASURED_CORE = 0 was satisfied by an empty set, and the next
  // promotion would have arrived with the check already passing.
  //
  // A declared-core rule is now ACCOUNTED FOR by either route, and only
  // unaccounted rules count against the cap:
  //
  //   MEASURED — ≥10 classified live verdicts, the law as written.
  //   PROMOTED — an unexpired `corePromotion` naming an owner, a rationale
  //              and an expiry (src/rules/rule.ts). This is the record the
  //              anti-creep law requires for a core claim the corpus cannot
  //              support, and counting it here is what makes the two agree.
  //
  // A promotion that has EXPIRED, or that fails `checkCorePromotion`, is not
  // a route to accounting — it resolves the rule to `extended` in
  // `docs/CORE-READINESS.md`, and it counts against the cap here.
  const unaccounted: string[] = [];
  for (const r of coreRules) {
    const n = classifiedPerRule.get(r.id) ?? 0;
    if (n >= 10) continue;
    const promotion = r.corePromotion;
    if (promotion !== undefined) {
      const problems = checkCorePromotion(promotion);
      if (problems.length === 0) {
        details.push(
          `${r.id}: core tier on a corePromotion (owner ${promotion.owner}, ` +
            `expires ${promotion.expiresOn}) — n=${n}, so measurement alone does not clear it`,
        );
        continue;
      }
      unaccounted.push(
        `${r.id}: core tier with a DEFECTIVE corePromotion — ${problems[0] ?? "unusable record"}`,
      );
      continue;
    }
    unaccounted.push(
      `${r.id}: core tier, measured n=${n} (needs ≥10 classified verdicts) and no corePromotion`,
    );
  }

  // Ratchet (audit H-2): the law is now an executable cap. Exceeding
  // MAX_UNMEASURED_CORE fails the audit; lowering the constant each
  // release walks the registry toward a fully measured core tier.
  const unmeasured = unaccounted.length;
  const total = coreRules.length;
  const ok = unmeasured <= MAX_UNMEASURED_CORE;

  details.push(...unaccounted);
  details.unshift(
    total === 0
      ? `Ratchet (Law #3): 0 core rules, so nothing to account for — cap is ${MAX_UNMEASURED_CORE}. Vacuous by construction: the check governs the NEXT promotion, and it does so by requiring a measurement OR an unexpired corePromotion`
      : ok
        ? `Ratchet (Law #3): ${unmeasured}/${total} core rules unaccounted — cap is ${MAX_UNMEASURED_CORE}. A rule is accounted for by ≥10 classified verdicts or by an unexpired corePromotion`
        : `BLOCKING: ${unmeasured}/${total} core rules unaccounted — exceeds the Law #3 ratchet cap of ${MAX_UNMEASURED_CORE}`,
  );

  return check("tier-enforcement", ok ? "pass" : "fail", details);
}

/**
 * The absolute cap on the launch set (Phase 7 — Tempering Plan).
 *
 * A catastrophe guard, and NOT the anti-creep law. `docs/ANTI-CREEP.md` records
 * why the distinction matters: an absolute cap alone leaves free slots and lets
 * the launch set grow without limit, which is the opposite of "every addition
 * requires an equal-size removal". The net-growth ratchet in `checkAntiCreep`
 * is the law; this is the ceiling above it, exactly as the 80% coverage floor
 * sits below the coverage high-water ratchet.
 */
export const CORE_CAP = 65;

/**
 * Is this rule in the launch set — the rules that ship in the DEFAULT report?
 *
 * NOT `effectiveTier(r) === "core"`. That predicate named a set the law's own
 * prose does not describe. The anti-creep law says the launch set is "the rules
 * that ship in the default report", and the answer to that is every rule the
 * quarantine filter does not remove: `effectiveTier !== "quarantine"`.
 *
 * Those were the same question with two different answers, and only one of them
 * described the product. The core tier has been empty since 6.0 — all 79 rules
 * resolve to 34 `quarantine` and 45 `extended` — so the law governed zero rules
 * while 45 shipped in every default report. Adding a new `extended` rule, the
 * one move that actually changes what a user sees, moved nothing the law
 * counted. A cap over a set that is not the shipped product cannot be creep.
 *
 * So the predicate is the shipped set, and the numbers move with it: 45 rules
 * are now ratcheted, against a baseline recorded in
 * `docs/ANTI-CREEP-BASELINE.json`. That is a HIGHER bar, not a lower one — the
 * thing being defended is what users get.
 *
 * A rule that declares `core` but fails `checkCorePromotion` resolves to
 * `extended` through `effectiveTier`, and is still in the launch set, which is
 * correct: it ships.
 */
function inLaunchSet(rule: QADoctorRule): boolean {
  return effectiveTier(rule) !== "quarantine";
}

/**
 * Net-growth ratchet for the anti-creep law.
 *
 * `docs/ANTI-CREEP-BASELINE.json` records the launch set at a commit; growth
 * above it is a failure unless the same change demotes a rule or records an
 * `ANTI-CREEP-EXCEPTION` line in `CHANGELOG.md`. The marker is checked BEFORE
 * the number, so lowering the baseline does not become a way to skip the
 * reason.
 *
 * The baseline lives in a data file rather than in this constant for the same
 * reason the coverage high-water marks live in `check-coverage-ratchet.mjs`:
 * a number that lives next to the check that enforces it gets adjusted to make
 * the check pass, and nothing is left to review. A number in its own file,
 * with the commit it was recorded at, is an artifact.
 *
 * `null` means no baseline is present — reported as INCONCLUSIVE and
 * blocking, because a law with no recorded state cannot be evaluated and must
 * never render as a pass (G2/22).
 */
export const ANTI_CREEP_BASELINE_PATH = "docs/ANTI-CREEP-BASELINE.json";

/** The `CHANGELOG.md` marker that makes growth legal, per docs/ANTI-CREEP.md. */
export const ANTI_CREEP_EXCEPTION_MARKER = "ANTI-CREEP-EXCEPTION";

export interface AntiCreepBaseline {
  baselineCore: number;
  /**
   * The value at the previous recording.
   *
   * Present so that LOWERING the baseline is visible to the check rather than
   * indistinguishable from a demotion. Absent means "treat as lowered", which
   * makes the first run after this field existed cost one changelog line and
   * closes a permanent hole thereafter.
   */
  previousBaselineCore?: number;
  recordedAt: string;
  recordedAtSha: string;
  /**
   * Why this number, in prose.
   *
   * Present in the committed file and absent from this interface, which is the
   * wrong way round: a baseline is a RECORD — a count plus the reasoning that
   * produced it — and a type that only knows the count lets a future edit
   * replace the reasoning with a bare number without the compiler objecting.
   * The number gets adjusted to make the check pass; the prose is what makes
   * that reviewable.
   */
  why?: string;
  /** How to move it without defeating the check. */
  howToMove?: string;
}

export interface AntiCreepVerdict {
  ok: boolean;
  /** The tier's current size. */
  core: number;
  /** The committed baseline, or null when it is absent or unreadable. */
  baseline: number | null;
  /** Whether THIS change records an `ANTI-CREEP-EXCEPTION`. */
  exceptionPresent: boolean;
  /** One line a reader can act on. */
  summary: string;
}

/**
 * The `ANTI-CREEP-EXCEPTION` lines in the UNRELEASED part of the changelog.
 *
 * Scoped to the top entry because the first version searched the whole
 * append-only file — so a marker written once, in any past release, disabled
 * the ratchet for every commit after it, permanently. With an empty tier and a
 * baseline of zero, that meant the FIRST core promotion switched the law off
 * for good: the very change this work makes possible would have been the one
 * that ended it.
 *
 * The top entry is the right scope: a changelog is a sequence of releases, and
 * a growth claim is made in a release. A promotion lands in one entry, is
 * justified in that entry, and is released. Nothing needs a marker to survive
 * past the release that carried it.
 *
 * "Top entry" means `[Unreleased]` when it has content, and the release heading
 * immediately below it when it does not. The empty case is what a changelog
 * looks like on the commit that CUTS a release, and the marker for that
 * release's changes lives in the release's own section — so a strict
 * "first `## ` heading" lookup stopped finding a declaration that had not
 * moved an inch, the moment a version was cut. The parser below handles both
 * and still refuses a marker from any older release.
 *
 * HOW the top section is found, and what that costs: `scripts/check-unreleased-entry.mjs`
 * finds its section BY NAME, which is more robust than anything structural.
 * The asymmetry between the two is recorded here rather than left for a reader
 * to discover: two scripts, two changelog parsers, different robustness. A
 * consolidation should give both the named lookup.
 */
export function exceptionInUnreleasedChangelog(
  changelog: string,
  marker: string = ANTI_CREEP_EXCEPTION_MARKER,
): boolean {
  // Split on the newline BEFORE each `## ` heading, so every section keeps
  // its heading line and no empty leading fragment is produced.
  const sections = changelog
    .split(/\n(?=## )/)
    .filter((s) => s.startsWith("## "));
  // A marker counts in `[Unreleased]` or, when that section is empty, in the
  // release heading immediately below it.
  //
  // The empty-`[Unreleased]` case is not a convenience — it is what a changelog
  // looks like on the commit that cuts a release. Scoping strictly to the
  // first `## ` heading meant the marker silently stopped being found the
  // moment a version was cut: the declaration was still there, one heading
  // down, and the law reported growth as unlicensed. A check that switches off
  // at release time is a check nobody turns back on.
  //
  // The escape this does NOT reopen is the one the scoping was for: a marker
  // from any PAST release. Only the first section after an empty
  // `[Unreleased]` qualifies, and that section is the release being cut — never
  // an older one, however many releases follow.
  for (const section of sections) {
    if (/^## \[Unreleased\]/.test(section)) {
      if (section.includes(marker)) return true;
      // Non-empty `[Unreleased]` means work has not been cut yet. Anything
      // below it belongs to a release, and a release's marker is history.
      const hasBody = section
        .split("\n")
        .slice(1)
        .some(
          (line) =>
            line.trim() !== "" &&
            !line.startsWith("#") &&
            !/^(?:-{3,}|\*{3,}|_{3,})$/.test(line.trim()) &&
            !/^<!--/.test(line.trim()),
        );
      if (hasBody) return false;
      continue;
    }
    // The first release section. Only this one is "the change being cut".
    return section.includes(marker);
  }
  return false;
}

/**
 * The anti-creep law, evaluated.
 *
 * Split out from `checkAntiCreep` so the arithmetic is testable without a
 * `DoctorCheck` — the shipped tree exercises the pass path and no failure path
 * at all, and a law whose failing branch has never run is not a law.
 *
 * The rule, stated exactly as the code implements it:
 *
 *     ok  ⟺  (tier ≤ previous baseline)  OR  (unreleased changelog has a marker)
 *
 * Two facts close the two escapes the earlier form had:
 *
 *   1. The comparison is against `previousBaselineCore`, not `baselineCore`.
 *      Lowering the baseline to match a grown tier makes `core − baselineCore`
 *      zero — one uncross-checked JSON edit that promotes a rule and switches
 *      the law off. Against the PREVIOUS value the growth is still visible.
 *   2. The marker is scoped to the unreleased `## ` entry, not the whole
 *      append-only file. A marker written once in any past release used to
 *      disable the ratchet for every commit after it, permanently — so the
 *      first core promotion, the one this work makes possible, would have
 *      switched the law off for good.
 *
 * It is an OR, not an AND, and deliberately: growth is legal with a marker
 * alone, because a demotion in the same change needs no marker and forcing
 * one would be a paper trail that says nothing. What the AND gets you is
 * already covered by (1).
 *
 * `changelog` is injected rather than read from disk so a caller can pass the
 * text it already has, and so a test can state a changelog without writing a
 * file next to the repository (the cross-test interference this repository has
 * already paid for: `tests/contract/gate-tiers.spec.ts` once rewrote itself).
 */
export function evaluateAntiCreep(
  rules: readonly QADoctorRule[],
  baseline: AntiCreepBaseline | null,
  changelog: string,
): AntiCreepVerdict {
  const core = rules.filter(inLaunchSet);
  const ids = core.map((r) => r.id).sort();
  const exceptionPresent = exceptionInUnreleasedChangelog(changelog);

  if (baseline === null) {
    return {
      ok: false,
      core: ids.length,
      baseline: null,
      exceptionPresent,
      summary:
        `INCONCLUSIVE: ${ANTI_CREEP_BASELINE_PATH} is missing or unreadable — the ` +
        `anti-creep law has no recorded state, and a law with no state cannot be ` +
        `evaluated. Record the launch set at a commit (see docs/ANTI-CREEP.md).`,
    };
  }

  // The law compares the tier against the PREVIOUS baseline, not the current
  // one. That single change is what closes the silent escape.
  //
  // With a tier of 1 and `baselineCore` lowered to 1, `core - baselineCore` is
  // zero and the law reads as satisfied — one uncross-checked JSON edit that
  // promotes a rule and switches the law off. Comparing against
  // `previousBaselineCore` instead makes that edit visible: the tier is 1, the
  // previous baseline was 0, so the growth is real and needs a marker, and
  // lowering the number afterwards changes nothing about whether it was legal.
  //
  // A missing `previousBaselineCore` falls back to the current value, which is
  // the permissive reading; the shipped baseline carries the field, so the
  // fallback only applies to a file written before this rule existed.
  const previous =
    typeof baseline.previousBaselineCore === "number"
      ? baseline.previousBaselineCore
      : baseline.baselineCore;
  const growth = ids.length - previous;
  const ok = growth <= 0 || exceptionPresent;

  return {
    ok,
    core: ids.length,
    baseline: baseline.baselineCore,
    exceptionPresent,
    summary: ok
      ? growth <= 0
        ? `Launch set: ${ids.length}, at or under the recorded baseline of ${previous} — net growth ${growth}, no promotion to offset`
        : `Launch set: ${ids.length} against a previous baseline of ${previous} — growth of ${growth} covered by an ${ANTI_CREEP_EXCEPTION_MARKER} in the unreleased CHANGELOG entry`
      : `Launch set: ${ids.length} against a previous baseline of ${previous} — net growth of ${growth} with no ${ANTI_CREEP_EXCEPTION_MARKER} in the unreleased CHANGELOG entry. Promote and demote in the same change, or record the exception with its reason`,
  };
}

/**
 * Check 6 (Phase 7 — Tempering Plan): anti-creep law enforcement.
 *
 * Two independent assertions, both one-directional:
 *
 *   1. the absolute cap (`CORE_CAP`) — a catastrophe guard;
 *   2. the net-growth ratchet against `docs/ANTI-CREEP-BASELINE.json` — the
 *      law itself, which `docs/ANTI-CREEP.md` records.
 *
 * Both were one before: the check counted and compared to a number chosen
 * before any rule could earn the tier, so the tier could grow from zero to
 * sixty-five without anything noticing.
 */
export function checkAntiCreep(
  rules: readonly QADoctorRule[] = RULES,
  baseline?: AntiCreepBaseline | null,
  changelog?: string,
  /**
   * The checkout root — see `runDoctorSelfAudit` for why this is not CWD.
   *
   * LAST, not second: inserting it after `rules` would silently re-type every
   * existing call that passes a baseline positionally.
   *
   * `baseline: null` and `baseline: undefined` are DIFFERENT here on purpose —
   * `null` means "there is provably no baseline" and drives INCONCLUSIVE,
   * `undefined` means "not supplied, read it". Collapsing them would make the
   * one test that asserts INCONCLUSIVE unable to say so.
   */
  repoRoot: string = process.cwd(),
): DoctorCheck {
  const effectiveBaseline =
    baseline !== undefined ? baseline : readAntiCreepBaseline(repoRoot);
  const effectiveChangelog =
    changelog !== undefined ? changelog : readChangelog(repoRoot);
  const details: string[] = [];
  let ok = true;

  const coreRules = rules.filter(inLaunchSet);
  const count = coreRules.length;

  if (count > CORE_CAP) {
    ok = false;
    details.push(
      `Launch set has ${count} rules - exceeds cap of ${CORE_CAP}. ` +
        `Adding a rule that ships by default requires quarantining one first.`,
    );
    // List the rules over the cap, so the reader can see which to demote.
    //
    // The comment here used to say "the NEWEST additions", and it was a
    // positional `slice(CORE_CAP)` over an array whose order is not
    // recency — so it named a subset of the overflow while claiming to name
    // the most recently added, which is the sort of helpful-looking detail
    // that sends a maintainer to demote the wrong rule.
    //
    // `coreRules` is now sorted by id (the same code-point order the PR
    // comment uses for its revision inventory), so "the overflow" is what is
    // printed. If recency is ever the right thing to show, the field to sort
    // on has to exist first — `rule.tier` has no date and the registry
    // carries no `addedAt`.
    const overflow = coreRules.slice(CORE_CAP);
    if (overflow.length > 0) {
      details.push(`  ${overflow.length} rule(s) over the cap, listed by id:`);
    }
    for (const r of overflow.slice(0, 5)) {
      details.push(`  overflow: ${r.id} — ${r.title}`);
    }
    if (overflow.length > 5) {
      details.push(`  … and ${overflow.length - 5} more`);
    }
  } else {
    details.push(
      `Absolute cap: launch set ${count}/${CORE_CAP} (${CORE_CAP - count} slots available) - the rules that ship by default`,
    );
  }

  const verdict = evaluateAntiCreep(
    rules,
    effectiveBaseline,
    effectiveChangelog,
  );
  details.push(verdict.summary);
  if (!verdict.ok) {
    // An unevaluable law is blocking and reported distinctly from a violation
    // (G2/22): a missing baseline is not a clean tree.
    details.push(
      ...(verdict.baseline === null
        ? [
            "This is INCONCLUSIVE, not a pass. Restore the baseline file, or " +
              "record the launch set at a commit — see docs/ANTI-CREEP.md.",
          ]
        : [
            `Rules currently in the launch set: ${
              rules
                .filter((r) => effectiveTier(r) === "core")
                .map((r) => r.id)
                .sort()
                .join(", ") || "(none)"
            }`,
          ]),
    );
  }

  return check("anti-creep", ok && verdict.ok ? "pass" : "fail", details);
}

/**
 * Read the net-growth baseline, or null when it is absent or malformed.
 *
 * Null rather than a throw: the caller renders INCONCLUSIVE, and a gate that
 * crashes tells the reader less than one that says which file is missing.
 */
function readAntiCreepBaseline(
  repoRoot: string = process.cwd(),
): AntiCreepBaseline | null {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(join(repoRoot, ANTI_CREEP_BASELINE_PATH), "utf8"),
    );
    if (!isRecord(parsed)) return null;
    const { baselineCore, recordedAt, recordedAtSha } = parsed;
    if (typeof baselineCore !== "number" || !Number.isInteger(baselineCore)) {
      return null;
    }
    if (typeof recordedAt !== "string" || typeof recordedAtSha !== "string") {
      return null;
    }
    // `previousBaselineCore` is only set when the file carries it, because
    // `exactOptionalPropertyTypes` distinguishes "absent" from "undefined" —
    // and the fallback in `evaluateAntiCreep` is different for each.
    const previous =
      typeof parsed.previousBaselineCore === "number" &&
      Number.isInteger(parsed.previousBaselineCore)
        ? { previousBaselineCore: parsed.previousBaselineCore }
        : {};
    return { baselineCore, recordedAt, recordedAtSha, ...previous };
  } catch {
    return null;
  }
}

/** The changelog text the exception marker is searched for. */
function readChangelog(repoRoot: string = process.cwd()): string {
  try {
    return readFileSync(join(repoRoot, "CHANGELOG.md"), "utf8");
  } catch {
    return "";
  }
}

/**
 * Check 7 (audit H-1): quarantine enforcement. The tier policy must cap
 * every quarantine rule to severity=info, evidence=E0 — the only way a
 * quarantine rule could ever gate CI is a broken or bypassed policy, so
 * the audit asserts the cap per rule and fails loudly if it moved.
 */
export function checkQuarantineEnforcement(
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];
  let ok = true;
  const quarantine = rules.filter((r) => r.tier === "quarantine");
  for (const r of quarantine) {
    const cap = capForTier(r.tier);
    if (!cap || cap.severity !== "info" || cap.evidenceLevel !== "E0") {
      ok = false;
      details.push(
        `${r.id}: quarantine cap is not severity=info/evidence=E0 — an unproven rule could gate CI`,
      );
    }
  }
  details.unshift(
    `${quarantine.length} quarantine rules capped to severity=info, evidence=E0 — no quarantine rule may emit error`,
  );
  return check("quarantine-enforcement", ok ? "pass" : "fail", details);
}

/**
 * Check 8 (certification-audit Phase 2.5, plan G3 Layer A support):
 * fixture-integrity — deterministic structural census of the fixture
 * trees. Complements the fixture firewall (which proves must-fire /
 * must-not-fire PRESENCE per rule) with: orphaned fixture dirs (no
 * registered rule), empty dirs, and the Layer A typecheck allowlist
 * census. Blocking: an orphaned dir or an empty fixture dir means the
 * structural layer has silently drifted.
 */
export function checkFixtureIntegrity(
  fixturesRoot: string,
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];
  let ok = true;

  const registeredIds = new Set(rules.map((r) => r.id));

  // Census over the must-fire/must-not-fire tree.
  // Retired-rule fixture dirs (RETIRED_RULE_IDS — owner ruling 2026-09-08,
  // E-1) are historical artifacts, not drift: they are disclosed, never
  // blocking, and never counted as registered coverage.
  const retiredIds = new Set(RETIRED_RULE_IDS);
  const fixtureRoots = [
    fixturesRoot,
    join(fixturesRoot, "..", "corpus", "positive-fixtures"),
  ];
  let fixtureFiles = 0;
  let fixtureDirs = 0;
  let retiredFixtureDirs = 0;
  for (const root of fixtureRoots) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      fixtureDirs++;
      const ruleId = entry.name;
      if (retiredIds.has(ruleId)) {
        retiredFixtureDirs++;
        continue;
      }
      if (!registeredIds.has(ruleId)) {
        ok = false;
        details.push(`orphaned fixture dir (no registered rule): ${ruleId}`);
        continue;
      }
      const sub = join(root, ruleId);
      for (const child of readdirSync(sub, { withFileTypes: true })) {
        if (child.isDirectory()) {
          const files = nonHiddenFiles(join(sub, child.name));
          fixtureFiles += files.length;
          if (files.length === 0) {
            ok = false;
            details.push(`empty fixture dir: ${ruleId}/${child.name}`);
          }
        } else if (!child.name.startsWith(".")) {
          // Loose files directly inside the rule dir (outside must-fire/
          // must-not-fire subdirs) still count as fixture material.
          fixtureFiles++;
        }
      }
    }
  }

  // Layer A allowlist census (informational summary; the allowlist itself
  // is mechanically guarded by scripts/typecheck-fixtures.ts + the gate
  // spec's snapshot lock).
  const allowlistPath = join(fixturesRoot, "typecheck-allowlist.json");
  if (existsSync(allowlistPath)) {
    try {
      const raw: unknown = JSON.parse(readFileSync(allowlistPath, "utf8"));
      if (!isRecord(raw)) {
        ok = false;
        details.push("typecheck-allowlist.json is not an object");
      } else if (Array.isArray(raw.entries)) {
        details.push(
          `Layer A typecheck allowlist: ${raw.entries.length} justified entr(ies)`,
        );
      } else {
        ok = false;
        details.push("typecheck-allowlist.json entries is not an array");
      }
    } catch {
      ok = false;
      details.push("typecheck-allowlist.json is unreadable/malformed");
    }
  }

  details.unshift(
    `fixture trees: ${fixtureDirs} rule dirs (${retiredFixtureDirs} retired-rule dirs preserved as history), ${fixtureFiles} fixture files — orphaned dirs and empty dirs are blocking`,
  );
  return check("fixture-integrity", ok ? "pass" : "fail", details);
}

/**
 * Check 9 (certification-audit Phase 3.3, G4/D8v2 — HARD-BLOCKING):
 * revision-integrity. The manifest tests/corpus/detector-hashes.json
 * attests each rule's source identity (logicHash = sha256 of the rule's
 * metadata ‖ its defining module's token stream) against the declared
 * detectorRevision:
 *   check A — current logicHash ≠ manifest logicHash → FAIL ("bump +
 *             re-measure + regen, or regen with stated behavior-neutrality");
 *   check B — declared revision ≠ manifest revision → FAIL (stale manifest);
 *   manifest missing/unreadable, or the source tree unavailable (the
 *             installed-package case) → the check CANNOT be evaluated
 *             honestly → reported as INCONCLUSIVE and ok=false — a
 *             certification-critical INCONCLUSIVE never renders as pass
 *             (G2); Phase 5's status migration carries the same rule.
 *
 * Where the check runs: the doctor self-audits THIS repo, so `repoRoot`
 * must be the Mjölnir checkout (src/ present). On an installed package
 * the src tree does not exist → honest INCONCLUSIVE, same as above.
 */
export function checkRevisionIntegrity(
  repoRoot: string,
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];
  const manifestPath = join(
    repoRoot,
    "tests",
    "corpus",
    "detector-hashes.json",
  );
  const rulesDir = join(repoRoot, "src", "rules");

  if (!existsSync(manifestPath)) {
    return check("revision-integrity", "inconclusive", [
      "INCONCLUSIVE: tests/corpus/detector-hashes.json is missing — run `npm run detector-hashes:update` (certification-critical: an unevaluable check never renders as pass)",
    ]);
  }
  if (!existsSync(rulesDir)) {
    return check("revision-integrity", "inconclusive", [
      "INCONCLUSIVE: src/rules is not present (installed package) — detector source identity cannot be verified here",
    ]);
  }

  let manifest: DetectorHashManifest;
  try {
    manifest = loadManifest(manifestPath);
  } catch {
    return check("revision-integrity", "inconclusive", [
      "INCONCLUSIVE: tests/corpus/detector-hashes.json is unreadable/malformed — regenerate with `npm run detector-hashes:update`",
    ]);
  }

  let current: DetectorHashManifest;
  try {
    current = computeDetectorHashes(rules, rulesDir);
  } catch (e) {
    return check("revision-integrity", "inconclusive", [
      `INCONCLUSIVE: detector hash computation failed — ${errorMessage(e)}`,
    ]);
  }

  const failures: string[] = [];
  for (const rule of rules) {
    const attested = manifest[rule.id];
    if (!attested) {
      failures.push(
        `${rule.id}: not attested in the manifest (stale manifest — regenerate)`,
      );
      continue;
    }
    if (attested.logicHash !== current[rule.id]?.logicHash) {
      failures.push(
        `${rule.id}: source identity changed since manifest attestation — ` +
          `bump detectorRevision + re-measure + regen, or regen with stated behavior-neutrality (G4)`,
      );
    }
    if (attested.detectorRevision !== declaredDetectorRevision(rule)) {
      failures.push(
        `${rule.id}: manifest revision ${attested.detectorRevision} ≠ declared ${declaredDetectorRevision(rule)} (stale manifest — regenerate)`,
      );
    }
  }
  for (const id of Object.keys(manifest)) {
    if (!rules.some((r) => r.id === id)) {
      failures.push(`${id}: attested in the manifest but not in the registry`);
    }
  }

  if (failures.length > 0) {
    details.push(...failures);
    return check("revision-integrity", "fail", details);
  }
  details.push(
    `${rules.length} rules attested: source identity and declared revision match the manifest (check A + check B, G4)`,
  );
  return check("revision-integrity", "pass", details);
}

/**
 * Check 8 (certification-audit Phase 1.4, D6 — HARD-BLOCKING):
 * category-integrity. Every registry rule's category must be a member of
 * the closed RULE_CATEGORIES set (compile-time exhaustive via the D6
 * derivation, so this check is the runtime backstop for values arriving
 * from external rule sources), and no two rules may collide on an id.
 * Registry ids are already unique-checked by registry-sanity; this check
 * owns the category dimension.
 */
export function checkCategoryIntegrity(
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];
  const known: readonly string[] = RULE_CATEGORIES;
  const unknown = rules.filter((r) => !known.includes(r.category));
  for (const r of unknown) {
    details.push(
      `${r.id}: category "${r.category}" is not in RULE_CATEGORIES — registries may not invent categories (D6)`,
    );
  }
  const byCategory = new Map<string, number>();
  for (const r of rules) {
    byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1);
  }
  return check("category-integrity", unknown.length === 0 ? "pass" : "fail", [
    `${byCategory.size} categories in use across ${rules.length} rules (closed set: ${RULE_CATEGORIES.length})`,
    ...details,
  ]);
}

/**
 * Check 10 (certification-audit Phase 4.1, D7 — HARD-BLOCKING):
 * measurement-consistency. Three invariants over the measurement surface:
 *   (1) every MEASURED_FP entry's `n` equals the LIVE classified verdict
 *       count (TP+FP rows in tests/corpus/verdicts/*.jsonl) — a snapshot
 *       that drifted from the corpus is a lie about evidence;
 *   (2) MEASURED_FP's detectorRevision equals the sidecar's
 *       (tests/corpus/detector-revisions.json) — a measurement taken
 *       against a different detector revision than attested is stale;
 *   (3) every sidecar entry maps to a registered rule.
 * Mismatch → FAIL (certification-critical).
 */
export function checkMeasurementConsistency(
  verdictsDir: string,
  sidecarPath: string,
  rules: readonly QADoctorRule[] = RULES,
  // Injectable for anti-false-green tests (G6 seam): the shipped map by
  // default; tests pass synthetic maps so every invariant arm is
  // reachable without fabricating corpus rows for real rules.
  measuredFp: Readonly<Record<string, MeasuredFpEntry>> = MEASURED_FP,
): DoctorCheck {
  const details: string[] = [];
  const failures: string[] = [];

  const registered = new Map(rules.map((r) => [r.id, r] as const));

  // Live classified verdict counts (TP + FP) per rule id.
  const liveCounts = new Map<string, number>();
  if (existsSync(verdictsDir)) {
    for (const f of readdirSync(verdictsDir)) {
      if (!f.endsWith(".jsonl")) continue;
      const lines = readFileSync(join(verdictsDir, f), "utf8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        let row: { ruleId?: string; verdict?: string };
        try {
          const parsed: unknown = JSON.parse(trimmed);
          if (!isRecord(parsed)) {
            failures.push(`${f}: unparseable verdict row (corpus integrity)`);
            continue;
          }
          row = parsed;
        } catch {
          failures.push(`${f}: unparseable verdict row (corpus integrity)`);
          continue;
        }
        if (row.ruleId === undefined) continue;
        if (row.verdict === "TP" || row.verdict === "FP") {
          liveCounts.set(row.ruleId, (liveCounts.get(row.ruleId) ?? 0) + 1);
        }
      }
    }
  } else {
    return check("measurement-consistency", "inconclusive", [
      "INCONCLUSIVE: verdicts directory missing — measurement consistency cannot be evaluated (certification-critical: never renders as pass)",
    ]);
  }

  let sidecar: Record<string, { detectorRevision?: number }> = {};
  if (existsSync(sidecarPath)) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(sidecarPath, "utf8"));
      if (!isRecord(parsed)) {
        failures.push(
          "sidecar is not a valid object — regenerate the measurement artifacts",
        );
      } else {
        sidecar = parsed as Record<string, { detectorRevision?: number }>;
      }
    } catch (e) {
      failures.push(
        `sidecar unreadable/malformed: ${errorMessage(e)} — regenerate the measurement artifacts`,
      );
    }
  } else {
    // No sidecar at all: only MEASURED_FP entries with declared revision
    // 1 can be consistent (the declared-revision default). Anything else
    // is unverifiable → inconclusive (honesty over assertion).
    const needsSidecar = Object.keys(measuredFp).filter(
      (id) => measuredFp[id]?.detectorRevision !== 1,
    );
    if (needsSidecar.length > 0) {
      return check("measurement-consistency", "inconclusive", [
        `INCONCLUSIVE: sidecar tests/corpus/detector-revisions.json missing but ${needsSidecar.length} measured rule(s) declare revisions — cannot verify measurement freshness`,
      ]);
    }
  }

  for (const [id, m] of Object.entries(measuredFp)) {
    // Invariant 2: sidecar revision agreement.
    const side = sidecar[id];
    if (side !== undefined && side.detectorRevision !== undefined) {
      if (side.detectorRevision !== m.detectorRevision) {
        failures.push(
          `${id}: MEASURED_FP revision ${m.detectorRevision} ≠ sidecar ${side.detectorRevision} — the measurement is stale (§07: re-measure or bump)`,
        );
      }
    }
    // Invariant 1: live verdict count equals the recorded n.
    const live = liveCounts.get(id);
    if (live !== undefined && live !== m.n) {
      failures.push(
        `${id}: MEASURED_FP.n=${m.n} but the live corpus has ${live} classified verdict(s) — regenerate (npm run generate-fp-audit-table)`,
      );
    }
    if (live === undefined && m.n > 0) {
      failures.push(
        `${id}: MEASURED_FP.n=${m.n} but no classified verdicts exist in the live corpus`,
      );
    }
  }

  // Invariant 3: sidecar entries map to registered rules.
  for (const id of Object.keys(sidecar)) {
    if (!registered.has(id)) {
      failures.push(
        `${id}: sidecar entry for an unregistered rule — remove it from tests/corpus/detector-revisions.json`,
      );
    }
  }

  if (failures.length > 0) {
    details.push(...failures);
    return check("measurement-consistency", "fail", details);
  }
  const block = measurementBlock(rules);
  details.push(
    `${block.measured} measured / ${block.unmeasured} unmeasured / ${block.total} total (${block.quarantine} quarantine) — MEASURED_FP, live verdicts and sidecar revisions agree`,
  );
  return check("measurement-consistency", "pass", details);
}

/**
 * Check 11 (ENGINE-008): rule metadata contract validation. Validates
 * every registered rule's metadata against the RuleMetadataContract
 * schema — well-formed IDs, valid categories, required trust fields.
 */
export function checkRuleMetadataContract(
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const violations = validateAllRulesMetadata(rules);
  if (violations.length === 0) {
    return check("rule-metadata-contract", "pass", [
      `${rules.length} rules validated against the metadata contract`,
    ]);
  }
  return check(
    "rule-metadata-contract",
    "fail",
    violations.map((v) => `${v.ruleId}: ${v.field} — ${v.message}`),
  );
}

export function runDoctorSelfAudit(
  fixturesRoot: string,
  /**
   * The checkout the fixtures belong to. Passed in rather than derived from
   * `process.cwd()` because `mjolnir doctor` is now reachable with no target,
   * in which case CWD is wherever the user happened to be — a user's project,
   * not the checkout. Two checks read files beside the fixtures, so a wrong
   * CWD read the wrong CHANGELOG and the wrong disposition register and
   * reported a healthy checkout as broken.
   */
  repoRoot: string = join(fixturesRoot, "..", ".."),
): DoctorReport {
  const verdictsDir = join(fixturesRoot, "..", "corpus", "verdicts");
  const checks = [
    checkFixtureFirewall(fixturesRoot),
    checkRegistry(),
    checkQuarantineOwnership(RULES, repoRoot),
    checkTrustMetadata(),
    checkEvidenceHonesty(),
    checkCoreFloorDeclaration(),
    checkTierEnforcement(verdictsDir),
    checkAntiCreep(RULES, undefined, undefined, repoRoot),
    checkQuarantineEnforcement(),
    checkCategoryIntegrity(),
    checkFixtureIntegrity(fixturesRoot),
    checkRevisionIntegrity(repoRoot),
    checkMeasurementConsistency(
      verdictsDir,
      join(repoRoot, "tests", "corpus", "detector-revisions.json"),
    ),
    checkRuleMetadataContract(),
  ];
  return {
    checks,
    healthy: checks.every((c) => c.status === "pass"),
    measurement: measurementBlock(),
  };
}

export function renderDoctorReport(report: DoctorReport): string {
  const lines: string[] = ["", sectionHeader("MJÖLNIR — SELF-AUDIT", ui), ""];
  for (const c of report.checks) {
    const mark =
      c.status === "pass" ? "✓" : c.status === "fail" ? "✗" : "? INCONCLUSIVE";
    lines.push(`${mark} ${c.name}`);
    for (const d of c.details.slice(0, 20)) lines.push(`    ${d}`);
    if (c.details.length > 20)
      lines.push(`    … and ${c.details.length - 20} more`);
  }
  lines.push("");
  lines.push(
    report.healthy
      ? "Mjölnir self-audit: WORTHY"
      : "Mjölnir self-audit: VIOLATIONS FOUND",
  );
  return lines.join("\n");
}

/** Versioned JSON schema name for `doctor --json` (G5). */
export const DOCTOR_REPORT_SCHEMA = "mjolnir.doctor-report@1";

/**
 * G5 determinism allowlist: names of doctor --json fields whose values
 * legitimately vary between two runs on the same tree. EMPTY by default
 * — every field the doctor emits must be deterministic (stable key
 * order, no timestamps, no absolute paths), and the structural tests
 * assert this length stays 0. A future field that cannot be
 * deterministic (e.g. a duration) must be added to this constant
 * CONSCIOUSLY, with the CI byte-equality gate's expectations updated in
 * the same commit — never by quietly weakening the byte-compare.
 */
export const NON_DETERMINISTIC_FIELDS: readonly string[] = [];

export interface DoctorReportJson {
  schema: typeof DOCTOR_REPORT_SCHEMA;
  healthy: boolean;
  /** Counts by status (pass/fail/inconclusive) — machine-summarizable. */
  summary: { pass: number; fail: number; inconclusive: number };
  checks: Array<{
    name: string;
    status: CheckStatus;
    ok: boolean;
    details: string[];
  }>;
  /**
   * THE single reproducible answer to "how many rules are measured"
   * (certification-audit Phase 4.3): derived from the live registry +
   * MEASURED_FP at report time, not from a hand-authored snapshot.
   */
  measurement: MeasurementBlock;
}

/**
 * Serializes the doctor report to the machine-readable contract (Phase 5,
 * G5): versioned `schema` field, stable key order (constructed once, here),
 * details limited exactly like the text render, paths already POSIX-relative
 * (the checks build them that way), and byte-identical across two runs on
 * the same tree — the CI certification job re-runs the command twice and
 * diffs, so any nondeterminism fails there.
 */
export function doctorReportJson(
  report: DoctorReport,
  opts: { maxDetails?: number } = {},
): DoctorReportJson {
  const maxDetails = opts.maxDetails ?? 20;
  const summary = { pass: 0, fail: 0, inconclusive: 0 };
  const checks = report.checks.map((c) => {
    summary[c.status]++;
    return {
      name: c.name,
      status: c.status,
      ok: c.ok,
      details:
        c.details.length > maxDetails
          ? [
              ...c.details.slice(0, maxDetails),
              `… and ${c.details.length - maxDetails} more`,
            ]
          : c.details,
    };
  });
  // G5: fields named in NON_DETERMINISTIC_FIELDS are stripped from the
  // artifact (the allowlist is the documented wall-clock escape hatch;
  // it is empty by default, so today this is a no-op shape guard).
  return stripNonDeterministicFields({
    schema: DOCTOR_REPORT_SCHEMA,
    healthy: report.healthy,
    summary,
    checks,
    measurement: report.measurement,
  });
}

/**
 * G5 strip step: removes every allowlisted field from the artifact.
 * `fields` is a seam (defaults to the shipped NON_DETERMINISTIC_FIELDS)
 * so the strip path is testable while the allowlist stays empty.
 */
export function stripNonDeterministicFields<T extends object>(
  json: T,
  fields: readonly string[] = NON_DETERMINISTIC_FIELDS,
): T {
  for (const field of fields) {
    delete (json as Record<string, unknown>)[field];
  }
  return json;
}
