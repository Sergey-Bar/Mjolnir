/**
 * Jenkins adapter (product-gap master plan P3c).
 * The root `Jenkinsfile` is a TEXT-target file kind: declarative and
 * scripted pipelines are Groovy text, no language grammar is required
 * (master plan wording). Discovery mirrors the workflow adapters'
 * honest-accounting contract; `runRules` hands rules the raw text with
 * no `ast` — every Jenkins arm is lexical over the file text and every
 * GitHub/Azure-shaped rule no-ops on the missing doc.
 */

import { existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import type { LanguageAdapter, ScanContext } from "../engine/adapter.js";
import { isLintFixtureDir } from "../discovery/ignores.js";

export const JENKINS_FILENAMES = ["Jenkinsfile"] as const;

export const jenkinsAdapter: LanguageAdapter = {
  id: "jenkins",
  extensions: [],
  testFileGlobs: ["Jenkinsfile"],
  dirSkips: [],

  isTestFile(path: string): boolean {
    const normalized = path.replaceAll("\\", "/");
    const basename = normalized.split("/").pop() ?? normalized;
    if (!(JENKINS_FILENAMES as readonly string[]).includes(basename))
      return false;
    return (
      normalized === basename ||
      normalized.startsWith("/") ||
      /^[A-Z]:/i.test(normalized)
    );
  },

  detectFrameworks(): { frameworks: string[]; unknown: boolean } {
    // CI is not a "framework" — nothing to detect here.
    return { frameworks: [], unknown: false };
  },

  discoverTestFiles(ctx: ScanContext): void {
    // Same honest-accounting contract as the other workflow adapters:
    // IgnoreMatcher, fixture-dir skip, deadline, and skip accounting
    // are all honored (bug-audit L5 pattern).
    if (Date.now() > ctx.deadline) {
      ctx.onDiscoveryTruncated("deadline");
      return;
    }
    const hit = JENKINS_FILENAMES.map((n) => join(ctx.workspace.root, n)).find(
      (p) => existsSync(p),
    );
    if (!hit) return;
    if (isLintFixtureDir(hit)) return;
    const rel = relative(ctx.workspace.root, hit).replaceAll("\\", "/");
    if (ctx.ignoreMatcher.isIgnored(rel)) return;
    if (ctx.testFiles.length >= ctx.maxFiles) {
      ctx.onDiscoveryTruncated("file-cap:jenkins");
      return;
    }
    try {
      const size = statSync(hit).size;
      if (size > LIMITS_MAX_BYTES) {
        // Oversized pipelines vanish with accounting, never silently.
        ctx.onSkippedFile("file-too-large");
        return;
      }
      ctx.testFiles.push(hit);
    } catch {
      ctx.onSkippedFile("unreadable-entry");
    }
  },

  runRules(rules, file, emit, onCrash, budget) {
    const applicable = rules.filter((rule) => rule.appliesTo.includes(this.id));
    if (applicable.length === 0) return;
    if (budget && Date.now() > budget.deadline) {
      budget.onExceeded();
      return;
    }
    // No parse stage: the Jenkinsfile is consumed as text. Rules that
    // key on a parsed doc (GitHub/Azure shapes) no-op on the absent ast.
    for (const rule of applicable) {
      if (budget && Date.now() > budget.deadline) {
        budget.onExceeded();
        return;
      }
      try {
        for (const f of rule.run({
          path: file.path,
          text: file.text,
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

const LIMITS_MAX_BYTES = 1 * 1024 * 1024;
