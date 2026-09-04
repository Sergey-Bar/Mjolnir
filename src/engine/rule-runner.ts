/**
 * Rule-runner plumbing: the legacy appliesTo → adapter mapping and the
 * QADoctorRule → UniversalRule adapter used by the registry. (The
 * per-file dispatch loop itself lives in each adapter's runRules — the
 * unused parallel copy, runRulesForFile, was deleted per audit M-7.)
 */

import type { Finding } from "../types.js";
import type { UniversalRule } from "./adapter.js";

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
  configRule?: boolean;
  configFiles?: string[];
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
    configOnly: rule.configRule === true,
    ...(rule.configFiles !== undefined
      ? { configFiles: [...rule.configFiles] }
      : {}),
    legacy: true,
    run(file) {
      return rule.run(file) as Array<Omit<Finding, "ruleId" | "category">>;
    },
  };
}
