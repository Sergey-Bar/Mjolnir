/**
 * RuleRunner (R1): dispatches files through adapters and applicable rules.
 * Replaces the inline loops in cli.ts. Crash isolation per rule (§25).
 */

import type { Finding } from "../types.js";
import type { LanguageAdapter, UniversalRule } from "./adapter.js";

export interface RunnerResult {
  findings: Finding[];
  skippedFiles: number;
}

export function runRulesForFile(
  adapter: LanguageAdapter,
  rules: readonly UniversalRule[],
  file: { path: string; text: string },
):
  | (Array<Omit<Finding, "ruleId" | "category">> & { ruleRefs?: never })
  | Array<Omit<Finding, "ruleId" | "category">> {
  const out: Array<Omit<Finding, "ruleId" | "category">> = [];
  const parsed = { path: file.path, text: file.text };
  for (const rule of rules) {
    if (!rule.appliesTo.includes(adapter.id)) continue;
    try {
      for (const f of rule.run(parsed)) {
        out.push(f);
      }
    } catch {
      // Crash isolation (§25): one bad rule never kills the scan.
    }
  }
  return out;
}

/** Legacy appliesTo → adapter id mapping. */
export function legacyAppliesTo(value: string): string[] {
  if (value === "test-files") return ["typescript", "python", "java", "csharp"];
  if (value === "ci-workflows") return ["github-actions"];
  return [value];
}

/** Adapt a legacy QADoctorRule to the UniversalRule shape. */
export function asUniversal(rule: {
  id: string;
  category: string;
  appliesTo: string;
  run: (file: {
    path: string;
    text: string;
    ast?: unknown;
  }) => Array<Record<string, unknown>>;
}): UniversalRule & { legacy: true } {
  return {
    id: rule.id,
    category: rule.category,
    appliesTo: legacyAppliesTo(rule.appliesTo),
    legacy: true,
    run(file) {
      return rule.run(file) as Array<Omit<Finding, "ruleId" | "category">>;
    },
  };
}
