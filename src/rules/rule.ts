/**
 * Rule contract (Sprint-Plan W2-01, Product-MVP §64 heritage).
 * Rules are PURE functions: input context → findings. No I/O, no globals.
 * Every rule ships with must-fire AND must-not-fire fixtures (§18.1).
 */

import type { Confidence, Finding, FindingType, QaImpact, RuleCategory, Severity } from '../types.js';

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
  /** Rule IDs that can fire on the same root cause (dedup pass, R6). */
  overlapWith?: string[];
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
}

export type RuleFn = (ctx: SourceFileContext) => Omit<Finding, 'ruleId' | 'category'>[];

export interface QADoctorRule extends RuleMeta {
  /** Which file kinds this rule applies to. */
  appliesTo: 'test-files' | 'ci-workflows' | 'all';
  run: RuleFn;
}

export function defineRule(rule: QADoctorRule): QADoctorRule {
  return rule;
}
