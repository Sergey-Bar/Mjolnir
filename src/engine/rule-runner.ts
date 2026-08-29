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

/**
 * Legacy appliesTo → adapter id mapping.
 *
 * `"test-files"` maps to the TypeScript adapter only. Every rule that
 * declares `appliesTo: "test-files"` also declares
 * `languages: ["typescript", "javascript"]` and its detection is JS/TS
 * syntax (`it.only`, `page.locator`, `expect(...).toHaveText`, …). The
 * previous mapping also included python/java/csharp, which made a handful
 * of these rules fire on `.py`/`.java`/`.cs` files — e.g. QA-TEST-004
 * matching `asyncio.sleep(0)` and `page.waitForTimeout()` in
 * playwright-java, both of which have dedicated per-language rules
 * (QA-PY-005, QA-JV-105). Cross-language coverage lives in the QA-PY /
 * QA-JV / QA-CS families, not here.
 */
export function legacyAppliesTo(value: string): string[] {
  if (value === "test-files") return ["typescript"];
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
