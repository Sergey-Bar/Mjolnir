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
 * Run ONE rule with crash isolation, and return what it produced.
 *
 * This is the block that was copy-pasted into all seven language adapters:
 *
 *   try { for (const f of rule.run(x)) emit(f, rule.id, rule.category); }
 *   catch (error) { onCrash?.(rule.id, error); }
 *
 * Extracting it is worth doing for one reason beyond line count. Crash
 * isolation is the mechanism that lets a third-party or experimental
 * detector fail without ending a scan, and it is the mechanism the whole
 * `rulesCrashed` count depends on. Seven copies means seven chances to
 * write `catch {}` and lose the count, and `tests/contract/
 * no-uncounted-degradation.spec.ts` can only audit what it can see.
 *
 * `null` means the rule CRASHED, which is not the same as an empty array:
 * an empty array is the rule abstaining, and the adapters skip emission for
 * both but the distinction is why the caller must not conflate them.
 *
 * Deliberately NOT extracted: the per-adapter filter chain and the budget
 * check. Those genuinely differ — the TypeScript adapter injects an AST,
 * framework tags, a lazy `codeText` getter, `appliesTo` scoping, config-only
 * gating and `configGateMatches`, and it ABORTS the whole file on budget
 * exhaustion where `runRulesShared` only `continue`s to the next rule.
 * Routing every adapter through `runRulesShared` as written would silently
 * change which rules run and when, which is precisely the unmeasured claim
 * this program exists to delete. This helper takes the part they share.
 */
export function runRuleIsolated(
  rule: UniversalRule,
  file: ParsedFile,
  onCrash?: (ruleId: string, error: unknown) => void,
): Array<Omit<Finding, "ruleId" | "category">> | null {
  try {
    return rule.run(file);
  } catch (error) {
    onCrash?.(rule.id, error);
    return null;
  }
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

    const ran = runRuleIsolated(rule, file, onCrash);
    if (ran === null) {
      result.rulesCrashed.push(rule.id);
      continue;
    }
    const findings = ran;

    for (const f of findings) {
      emit(f, rule.id, rule.category);
      result.findingsEmitted++;
    }
  }

  return result;
}
