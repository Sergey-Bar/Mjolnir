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
  /** How detection works, e.g. "regex pattern" | "AST heuristic". */
  detectionStrategy?: string;
  /** First released version (semver). Immutable once set. */
  introduced?: string;
  /**
   * Tier assignment (Phase 4 — Tempering Plan). Additive, optional.
   * - "core": ships in the default report (≤10% measured FP rate)
   * - "extended": included by default, lower confidence (≤30% FP)
   * - "quarantine": opt-in only via --strict (>30% FP or unmeasured)
   * Defaults to "core" when omitted — existing rules stay in the
   * default report unless explicitly demoted.
   */
  tier?: "core" | "extended" | "quarantine";
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
   * Parsed AST provided by the engine (ts-morph SourceFile).
   * Typed as unknown here to keep the core rule contract decoupled;
   * the TS rule runner narrows it.
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

export type AppliesTo =
  "test-files" | "ci-workflows" | "python" | "java" | "csharp" | "all";

export interface QADoctorRule extends RuleMeta {
  /** Which file kinds this rule applies to. */
  appliesTo: AppliesTo;
  run: RuleFn;
}

export function defineRule(rule: QADoctorRule): QADoctorRule {
  return rule;
}
