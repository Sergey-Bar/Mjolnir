/**
 * Rule contract (Sprint-Plan W2-01, Product-MVP §64 heritage).
 * Rules are PURE functions: input context → findings. No I/O, no globals.
 * Every rule ships with must-fire AND must-not-fire fixtures (§18.1).
 */

import type {
  Confidence,
  EvidenceLevel,
  Finding,
  FindingType,
  QaImpact,
  RuleCategory,
  Severity,
} from "../types.js";

/**
 * How the rule's primary detection decision is made (Verification Trust
 * Evolution Plan §09.6/§12.1 — the enforced D6 enum, replacing free text):
 * - "LEXICAL": pattern matching over source text (regex over `codeText`,
 *   masked text, YAML/manifest text, suite-wide absence sweeps).
 * - "AST": structural analysis of a parsed syntax tree (ts-morph node
 *   walks, tree-sitter queries) is the core decision.
 * - "SEMANTIC": name/type/symbol or call-graph reasoning beyond
 *   single-file syntax (reserved — no rule ships this yet).
 * - "FRAMEWORK": framework configuration/manifest semantics drive the
 *   decision (CI workflow job/step structure, test-command gating).
 * - "RUNTIME": execution evidence drives the decision (reserved —
 *   Phase 6).
 */
export type DetectionStrategy =
  "LEXICAL" | "AST" | "SEMANTIC" | "QA_MODEL" | "FRAMEWORK" | "RUNTIME";

/**
 * Closed reason-code set for `strategyJustification` (master plan P8,
 * plan 1788853205786 — flag 6, decision 9: "no unexplained depth").
 * A LEXICAL rule ships only when its lexical form is JUSTIFIED by one
 * of these codes; the depth-adjudication doc renders them.
 */
export type StrategyReasonCode =
  /** The detection target is a config/workflow surface whose statements
   * ARE string literals (shell in YAML, key=value) — a syntax tree adds
   * nothing the text does not already carry. */
  | "shell-string-in-config"
  /** The detection is an exact, unambiguous runner-API token (`.only`,
   * `test.skip`, `fit`) — lexical precision equals structural precision. */
  | "exact-key-match"
  /** The defect IS the lexical artifact (commented-out test code, a
   * recorder's default title left committed) — the text is the finding. */
  | "lexical-artifact"
  /** The semantics live in runner behavior (retries, report generation,
   * fixture lifecycle) that no language syntax tree represents. */
  | "runner-semantic"
  /** The defect lives in string content (selector, URL) that the
   * code-text masking deliberately excludes from structural analysis. */
  | "string-content-defect"
  /** Absence detection over a suite/directory — there is no single
   * syntax node; the evidence is the aggregate shape of the tree. */
  | "absence-aggregate"
  /** The variant must stay in lockstep with its family's §13.2 mandatory
   * regex fallback — the family's structural path already carries the
   * depth, and the lexical path is the deterministic degraded mode. */
  | "family-fallback-lockstep"
  /** Migration to AST/QA_MODEL is plausible but UNPROVEN: no measurement
   * yet demonstrates an FP reduction. Deferred to the next measurement
   * round by owner directive (2026-09-09); the lexical detector ships
   * with its measured tier in the meantime. */
  | "migration-deferred-next-measurement";

export interface StrategyJustification {
  /** One of the closed codes above — the machine-readable verdict. */
  reasonCode: StrategyReasonCode;
  /**
   * The human-readable derivation: WHY this code applies to THIS rule,
   * citing the detector's actual shape. Rendered by the rule docs and
   * the depth-adjudication doc; vague boilerplate is a review rejection.
   */
  detail: string;
}

/**
 * A declared, owned, expiring grant of core status.
 *
 * The 6.0 demotion emptied the core tier: no rule's 95% Wilson interval
 * clears the 10% ceiling, the smallest observed `ciHigh` across 73 measured
 * rules being 0.138. That is the corpus being too small, not the ceiling being
 * wrong — moving 0.1 to 0.15 would admit a rule on 24 samples, which is tuning
 * a threshold to fit data.
 *
 * So core is, for now, reachable only by a maintainer saying so in the open.
 * This is that record. It is deliberately not a boolean: `corePromotion: true`
 * would be indistinguishable from the silent override it replaces, and would
 * carry no date on which the claim lapses.
 */
export interface CorePromotion {
  /**
   * Why this rule is trusted before the corpus can support it. A structural
   * argument ("a shared mutable across tests is a defect regardless of
   * frequency") is legitimate; "seemed fine" is not, and the registry
   * check rejects a rationale shorter than a sentence.
   */
  rationale: string;
  /**
   * A named human who owns this claim. Per P9: an unowned claim is not a
   * claim, it is a default nobody chose.
   */
  owner: string;
  /** ISO-8601 date the grant was made. */
  grantedAt: string;
  /**
   * ISO-8601 date the grant lapses. On this date the rule resolves to
   * `extended` unless the grant is re-justified — the record has to be
   * renewed by a person, not held in place by not being looked at.
   */
  expiresOn: string;
  /**
   * What backs the rationale, beyond the rationale: corpus verdict ids, a
   * contract path, an ADR.
   *
   * An empty list is ALLOWED, and the registry check does not demand one —
   * because a genuine structural premise ("a mutable shared across tests is a
   * defect regardless of frequency") has no corpus verdict behind it, and
   * inventing a citation for one would make the field decorative.
   *
   * What an empty list is NOT is invisible: `docs/CORE-READINESS.md` reports a
   * promotion with no evidence reference as `NEEDS-SAMPLES` in its note, so a
   * human sees an uncited grant next to a rule that still owes the corpus
   * samples. That is the honest handling — a judgement the tree cannot verify
   * is labelled as one — rather than a field the check pretends to verify.
   */
  evidenceRefs: string[];
}

export interface RuleMeta {
  /** Frozen public API — never reused (§18.4). */
  id: string;
  category: RuleCategory;
  title: string;
  severity: Severity;
  confidence: Confidence;
  findingType: FindingType;
  /** QA-native impact framing (#21): what this means for the QA engineer. */
  qaImpact: QaImpact;
  /**
   * Honesty Core: explicit evidence level. When omitted, findings derive
   * it from findingType+confidence (deriveEvidenceLevel). Only set this
   * when the rule's evidence is genuinely stronger/weaker than the
   * default derivation implies.
   */
  evidenceLevel?: EvidenceLevel;
  /** Rule IDs that can fire on the same root cause (dedup pass, R6). */
  overlapWith?: string[];

  // ── Trust Metadata (additive, optional — rules without it stay valid;
  //    new rules are required to declare it via the registry ratchet spec).
  /** Languages this rule applies to, e.g. ["typescript", "python"]. */
  languages?: string[];
  /** Frameworks the rule is meaningful for, e.g. ["jest", "vitest", "playwright"]. */
  frameworks?: string[];
  /**
   * Declared false-positive risk of the rule as shipped. Part of the
   * north-star contract: a rule that cannot honestly classify its FP risk
   * should not be enforced.
   */
  falsePositiveRisk?: "low" | "medium" | "high";
  /** Whether `mjolnir fix` (or a future autofix) can safely repair it. */
  autofix?: boolean;
  /**
   * How detection works, as an enforced enum (plan §09.6/§12.1 — D6
   * closed). Free-text declarations were migrated to the enum in
   * Phase 2; the registry ratchet (tests/rules/registry.spec.ts) makes
   * omission or a bad value a CI failure, so new rules must declare it.
   */
  detectionStrategy?: DetectionStrategy;
  /**
   * Verbatim legacy detection-strategy description preserved from the
   * pre-enum free-text era (D6 migration). Optional; carries the nuance
   * the enum alone cannot ("regex pattern + inside-string oracle", …).
   * Rendered by the rule docs pages alongside the enum.
   */
  detectionNotes?: string;
  /** First released version (semver). Immutable once set. */
  introduced?: string;
  /**
   * Tier assignment — a declared floor that may only ever TIGHTEN.
   *
   * Three floors decide a rule's effective tier, and they are not
   * interchangeable. Measured over all 79 live rules (B0 dry-run, 2026-10-01):
   *
   *   - POINT ESTIMATE  — `fpRate <= 30%` -> extended, else quarantine.
   *     The noise floor. Answers "does this ship by default?"
   *   - INTERVAL        — `ciHigh <= 10%` -> core, `ciLow >= 50%` -> quarantine,
   *     else extended. The evidence floor. Answers "does the evidence place it?"
   *   - DECLARED (this field) — overrides both.
   *
   * B0 measured what the first two do to this registry, and the result is the
   * reason this field exists rather than being deleted:
   *
   *   - The INTERVAL floor quarantines **zero** of the 79 rules. `ciLow >= 50%`
   *     almost never holds at n = 10..80, so on this corpus it is an empty
   *     rule, not a decision.
   *   - No rule derives CORE. `ciHigh <= 10%` is not reached at these sample
   *     sizes either.
   *   - **33 rules declare `quarantine` and would be PROMOTED into the default
   *     scan if this field were deleted.** Every one of the 33 moves in the
   *     promoting direction and none moves the other way.
   *
   * So this field is a THIRD floor, stricter than both derivations, and it is
   * currently the only thing holding those 33 rules out of a default scan.
   * That is why deleting the declared tiers is not a refactor: it ships 33
   * quarantined detectors — including the six CI rules the README's
   * caught-by-default table marks advisory — as ordinary findings.
   *
   * THE INVARIANT, enforced by `checkDeclaredTierMayOnlyTighten`: a declared
   * tier may only ever hold a rule DOWN. Quarantining a well-measured rule is
   * permitted (conservative, costs a reader a `--strict` flag); shipping a
   * badly-measured rule is not (it hands a user a finding the corpus says is
   * wrong). B0 found zero rules loosening, but nothing made that structural —
   * one hand-edit could have released `QA-TEST-002` at 62% observed FP, and
   * every derived number in the tree would have agreed with it.
   *
   * When omitted, the tier resolves measurement-dependently via
   * `effectiveTier` (src/rules/measurement.ts) — extended when there is no
   * valid measurement, so an unmeasured rule can never default into core.
   */
  tier?: "core" | "extended" | "quarantine";
  /**
   * A declared, OWNED, EXPIRING grant of core status for a rule the corpus
   * cannot yet support.
   *
   * Required by `checkRegistry` for any rule declaring `tier: "core"` without
   * a valid measurement — the anti-creep law's counterpart to the measurement
   * criterion. Without it, a core claim is a human assertion rendered with a
   * measurement's appearance, which is precisely the defect the 6.0 demotion
   * removed: nineteen rules showed `tier: "core"`, `measured: true`,
   * `fpRate: 0` while their 95% Wilson upper bounds ran 13.8%–40.4%.
   *
   * The fields are load-bearing:
   *
   *   - `owner` — a named human. Per P9 an unowned claim is not a claim.
   *   - `expiresOn` — the claim decays to `extended` when it lapses. An
   *     assertion that never expires is a tier, which is what this exists to
   *     avoid.
   *   - `evidenceRefs` — corpus IDs, contract paths, or an ADR. A rationale
   *     with nothing behind it is a preference.
   *
   * A rule that HAS earned core by measurement does not need one: the
   * measurement is the record, and a hand-written rationale beside it is a
   * second source of truth for the same fact.
   */
  corePromotion?: CorePromotion;
  /**
   * A declared, OWNED, EXPIRING commitment about a QUARANTINED rule.
   *
   * Same shape as `corePromotion`, and for the same reason: 34 quarantined
   * rules carry no owner, no review date and no exit condition, so nothing in
   * the tree says who will re-measure them or when the quarantine lapses.
   * `src/rules/tier-evidence.ts` is the worked example of the pattern for the
   * nineteen rules demoted in 6.0, and `docs/QUARANTINE-REMEDIATION.md` is the
   * ledger for the rest — but a ledger nobody must update is a report.
   *
   * The difference from `corePromotion` is the direction. `corePromotion` says
   * "this rule is trusted before the corpus can show it"; this says "this rule
   * is NOT trusted yet, here is when that is re-decided". A rule in quarantine
   * WITHOUT one is a rule whose quarantine is permanent by default, which is
   * the outcome the tier exists to avoid.
   */
  quarantinePromotion?: CorePromotion;
  /**
   * Detector implementation revision (Verification Trust Evolution Plan
   * §07). Increment on ANY detection-logic change — pattern, scoping,
   * AST adoption, rung change. A `MEASURED_FP` entry recorded against a
   * different revision is stale: the measurement is invalidated,
   * displayed as PROVISIONAL, and the rule cannot sit in effective core
   * until re-measured (registry ratchet, §20.3). Default when omitted: 1
   * (the current first-generation detectors).
   */
  detectorRevision?: number;
  /**
   * This finding proves the reported pass does not cover what it claims.
   *
   * `.only` makes the runner skip every other test; a masked CI gate means a
   * failure was ignored. Either way the suite's green is not evidence, and no
   * amount of density normalization should be able to average that away — a
   * two-test repo with `.only` is as compromised as a two-thousand-test one.
   *
   * Findings marked here cap the score into the UNWORTHY band regardless of
   * exposure. Reserved for mechanisms where the bypass is unambiguous, not for
   * findings that merely weaken a single test.
   */
  suiteInvalidating?: boolean;
  /**
   * Depth-adjudication record (master plan P8, plan 1788853205786 —
   * flag 6, decision 9: "no unexplained depth"). REQUIRED for every
   * rule whose `detectionStrategy` is LEXICAL (enforced by the doctor's
   * registry-sanity check): the reason the lexical form is the honest
   * shipped detector, with a closed reason code and a derivation that
   * cites the detector's actual shape. Non-LEXICAL rules may omit it.
   */
  strategyJustification?: StrategyJustification;
}

export interface SourceFileContext {
  /** Repo-relative path, forward slashes. */
  path: string;
  text: string;
  /**
   * Parsed AST provided by the engine — ts-morph SourceFile for
   * TypeScript files, tree-sitter Tree for Java/C# (Phase 0.5 parse
   * stage), workflow DOM for GitHub Actions. Typed as unknown here to
   * keep the core rule contract decoupled; each language's helper
   * narrows it (getTsSourceFile / getTreeSitterTree).
   */
  ast?: unknown;
  /**
   * Code-only text view: string literals and comments blanked to spaces,
   * newlines preserved so line/column indices stay exact (Phase 1 FP
   * firewall). Rules that must never fire on prose inside strings or
   * comments use this instead of `text`. Falls back to `text` when
   * unavailable.
   */
  codeText?: string;
}

export type RuleFn = (
  ctx: SourceFileContext,
) => Omit<Finding, "ruleId" | "category">[];

/**
 * Optional L2 structural-analysis hook (Verification Trust Evolution
 * Plan §13.2). When the engine provides a parsed AST on the context
 * (ts-morph SourceFile for TypeScript, tree-sitter Tree for Java/C#),
 * the hook produces the findings; its regex path is the MANDATORY
 * fallback, never optional — `undefined` return (or no `ctx.ast`)
 * means "no AST — run the regex path", so fixture harnesses, grammar
 * load failures, and degraded scans all keep working (ts-ast fallback
 * discipline, QA-PW-002 pattern). This seam is what lets a rule
 * declare `detectionStrategy: "AST"` honestly: the structural path is
 * the decision when a tree exists, and the regex path is documented
 * degraded detection, not a second source of truth.
 */
export type AstQueryHook = (
  ctx: SourceFileContext,
) => Omit<Finding, "ruleId" | "category">[] | undefined;

/**
 * Invoke an `astQuery` hook with the mandatory-fallback contract: no
 * hook or no AST on the context resolves to `undefined` (→ regex
 * fallback). Centralized so every consumer obeys the same rule.
 */
export function tryAstQuery(
  hook: AstQueryHook | undefined,
  ctx: SourceFileContext,
): Omit<Finding, "ruleId" | "category">[] | undefined {
  if (hook === undefined || ctx.ast === undefined) return undefined;
  return hook(ctx);
}

export type AppliesTo =
  "test-files" | "ci-workflows" | "python" | "java" | "csharp" | "all";

export interface QADoctorRule extends RuleMeta {
  /** Which file kinds this rule applies to. */
  appliesTo: AppliesTo;
  /**
   * Config-hygiene rules: the engine only feeds these rules config
   * files (and never feeds them test files), and never feeds test-file
   * rules a config. Set on rules whose detection gates on a config
   * filename (QA-PW-121/122/141/143/144). Without this flag the
   * generic test rules would fire nonsense on configs (e.g. QA-TEST-003
   * "no assertions" on every playwright.config.ts).
   */
  configRule?: boolean;
  /**
   * Config filename patterns (regex SOURCE strings) this config rule
   * gates on (plan §15.2): the adapter matches these against the file's
   * basename, replacing the hard-coded playwright.config.* regex that
   * used to live in the adapter AND duplicated inside each config rule.
   * The internal regex gate in `run` stays as belt-and-suspenders for
   * direct harness invocation.
   */
  configFiles?: string[];
  /**
   * Framework opt-in (plan §15.1, defect D7): when declared, the rule
   * runs on a file only if the file's own framework tags (its
   * imports/usings) intersect it. Files without tags are always
   * analyzed (open-when-unknown) — the dimension narrows, it never
   * silently drops evidence. Mirror of UniversalRule.frameworks,
   * threaded through asUniversal.
   */
  frameworksOverride?: string[];
  /**
   * L2 structural-analysis path (§13.2): runs when the engine supplies
   * a parsed AST for the file. MUST be paired with a regex fallback in
   * `run` (mandatory fallback discipline) — see AstQueryHook.
   */
  astQuery?: AstQueryHook;
  run: RuleFn;
}

export function defineRule(rule: QADoctorRule): QADoctorRule {
  return rule;
}
