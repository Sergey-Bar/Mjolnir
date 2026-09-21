/**
 * Shared Adapter RunRules (ENGINE-004).
 *
 * Formalizes the common adapter runRules execution pattern into a
 * reusable function. Every language adapter's runRules does the same
 * thing: iterate rules, apply framework/config filtering, run each
 * rule on the file, and emit findings. This module captures that
 * pattern so adapters can delegate instead of reimplementing.
 */

import type { Finding } from "../types.js";
import type { UniversalRule, ParsedFile } from "./adapter.js";
import { frameworkFilterApplies } from "./adapter.js";

export interface RunRulesConfig {
  rules: readonly UniversalRule[];
  file: ParsedFile;
  emit: (
    f: Omit<Finding, "ruleId" | "category">,
    ruleId: string,
    category: string,
  ) => void;
  onCrash?: (ruleId: string, error: unknown) => void;
  budget?: { deadline: number; onExceeded: () => void };
  /**
   * Optional predicate to decide whether a rule applies to this file.
   * Defaults to the universal framework filter. Adapters can compose
   * this with their own logic (e.g. config-file gating).
   */
  ruleFilter?: (rule: UniversalRule, file: ParsedFile) => boolean;
  /**
   * Adapter id — stamped into diagnostics. Defaults to "unknown".
   */
  adapterId?: string;
}

export interface RunRulesResult {
  /** Total rules evaluated (after filtering). */
  rulesEvaluated: number;
  /** Rules skipped by the budget. */
  rulesSkippedByBudget: number;
  /** Rules that threw. */
  rulesCrashed: string[];
  /** Total findings emitted. */
  findingsEmitted: number;
}

/**
 * The shared runRules execution pattern. Iterates rules, applies
 * filtering (framework tags + optional adapter-specific filter),
 * runs each rule, and emits findings with crash isolation.
 */
export function runRulesShared(config: RunRulesConfig): RunRulesResult {
  const { rules, file, emit, onCrash, budget, ruleFilter } = config;

  const result: RunRulesResult = {
    rulesEvaluated: 0,
    rulesSkippedByBudget: 0,
    rulesCrashed: [],
    findingsEmitted: 0,
  };

  const defaultFilter = (rule: UniversalRule, f: ParsedFile) =>
    frameworkFilterApplies(rule, f);
  const filter = ruleFilter ?? defaultFilter;

  for (const rule of rules) {
    if (budget && Date.now() > budget.deadline) {
      result.rulesSkippedByBudget++;
      budget.onExceeded();
      continue;
    }

    if (!filter(rule, file)) continue;

    result.rulesEvaluated++;

    let findings: Array<Omit<Finding, "ruleId" | "category">>;
    try {
      findings = rule.run(file);
    } catch (error) {
      result.rulesCrashed.push(rule.id);
      onCrash?.(rule.id, error);
      continue;
    }

    for (const f of findings) {
      emit(f, rule.id, rule.category);
      result.findingsEmitted++;
    }
  }

  return result;
}
