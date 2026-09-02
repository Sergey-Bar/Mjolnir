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
  "LEXICAL" | "AST" | "SEMANTIC" | "FRAMEWORK" | "RUNTIME";

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
   * Phase 2; the registry ratchet (tests/rules.registry.spec.ts) makes
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
   * Tier assignment (Phase 4 — Tempering Plan; measurement-dependent
   * default per Verification Trust Evolution Plan §11.2 Step 2).
   * - "core": ships in the default report (≤10% measured FP rate)
   * - "extended": included by default, lower confidence (≤30% FP)
   * - "quarantine": opt-in only via --strict (>30% FP or unmeasured)
   * When omitted, the tier resolves measurement-dependently via
   * `effectiveTier` (src/rules/measurement.ts): core for rules with a
   * valid corpus measurement, extended (displayed PROVISIONAL)
   * otherwise — an unmeasured rule can never default into core.
   */
  tier?: "core" | "extended" | "quarantine";
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
   * Config-hygiene rules: the engine only feeds these rules
   * playwright.config.* files (and never feeds them test files), and
   * never feeds test-file rules a config. Set on rules whose detection
   * gates on a config filename (QA-PW-121/122/141/143/144). Without
   * this flag the generic test rules would fire nonsense on configs
   * (e.g. QA-TEST-003 "no assertions" on every playwright.config.ts).
   */
  configRule?: boolean;
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
