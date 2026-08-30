/**
 * GitHub Actions adapter (R1).
 * Owns workflow discovery and safe-YAML parsing; CI rules consume the
 * parsed doc via the ast slot.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import type { LanguageAdapter, ScanContext } from "../engine/adapter.js";
import { parseWorkflow } from "../discovery/workflow-parser.js";

export const githubActionsAdapter: LanguageAdapter = {
  id: "github-actions",
  extensions: [".yml", ".yaml"],
  testFileGlobs: [".github/workflows/*.yml", ".github/workflows/*.yaml"],
  dirSkips: [],

  isTestFile(path: string): boolean {
    return /(?:^|[\\/])\.github[\\/]workflows[\\/].+\.ya?ml$/.test(path);
  },

  detectFrameworks(): { frameworks: string[]; unknown: boolean } {
    // CI is not a "framework" — nothing to detect here.
    return { frameworks: [], unknown: false };
  },

  discoverTestFiles(ctx: ScanContext): void {
    const wfDir = join(ctx.workspace.root, ".github", "workflows");
    if (!existsSync(wfDir)) return;
    let entries;
    try {
      entries = readdirSync(wfDir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (!name.endsWith(".yml") && !name.endsWith(".yaml")) continue;
      const full = join(wfDir, name);
      try {
        if (statSync(full).size <= LIMITS_MAX_BYTES) ctx.testFiles.push(full);
      } catch {
        ctx.onSkippedFile();
      }
    }
  },

  runRules(rules, file, emit, onCrash, budget) {
    // Parse once per workflow, share across all CI rules.
    let doc: unknown;
    try {
      doc = parseWorkflow(file.text);
    } catch {
      // Malformed/hostile YAML — skipped, never fatal (caller counts it).
      throw new WorkflowParseSkipped();
    }
    for (const rule of rules) {
      if (!rule.appliesTo.includes(this.id)) continue;
      // Audit P-1: a single oversized workflow must not own the budget.
      if (budget && Date.now() > budget.deadline) {
        budget.onExceeded();
        return;
      }
      try {
        for (const f of rule.run({
          path: file.path,
          text: file.text,
          ast: doc,
        })) {
          emit(f, rule.id, rule.category);
        }
      } catch (error) {
        // Crash isolation (§25) — counted and debuggable (R-9).
        onCrash?.(rule.id, error);
      }
    }
  },
};

export class WorkflowParseSkipped extends Error {}

const LIMITS_MAX_BYTES = 1 * 1024 * 1024;

// Re-exported for cli.ts convenience until full migration.
export function readWorkflowSafe(fullPath: string): string | null {
  try {
    return readFileSync(fullPath, "utf8");
  } catch {
    return null;
  }
}
