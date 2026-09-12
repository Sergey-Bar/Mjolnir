/**
 * Azure DevOps pipeline adapter (product-gap master plan P3b).
 * Owns `azure-pipelines.yml` discovery (repo root, the platform's
 * default location) and safe-YAML parsing; CI rules consume the parsed
 * doc via the ast slot. Detection rides the same hostile-YAML
 * machinery as the GitHub Actions adapter (yaml-guards.ts).
 */

import { existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import type { LanguageAdapter, ScanContext } from "../engine/adapter.js";
import { isLintFixtureDir } from "../discovery/ignores.js";
import {
  AZURE_PIPELINE_FILENAMES,
  parseAzurePipeline,
} from "../discovery/azure-pipeline-parser.js";

export const AZURE_PIPELINE_NAMES = AZURE_PIPELINE_FILENAMES;

export const azurePipelinesAdapter: LanguageAdapter = {
  id: "azure-pipelines",
  extensions: [".yml", ".yaml"],
  testFileGlobs: AZURE_PIPELINE_NAMES.map((n) => n),
  dirSkips: [],

  isTestFile(path: string): boolean {
    const normalized = path.replaceAll("\\", "/");
    return (AZURE_PIPELINE_NAMES as readonly string[]).includes(normalized);
  },

  detectFrameworks(): { frameworks: string[]; unknown: boolean } {
    // CI is not a "framework" — nothing to detect here.
    return { frameworks: [], unknown: false };
  },

  discoverTestFiles(ctx: ScanContext): void {
    // Same honest-accounting contract as the GitHub Actions adapter
    // (bug-audit L5): the IgnoreMatcher, the fixture-dir skip, the
    // deadline, and skip accounting are all honored.
    if (Date.now() > ctx.deadline) {
      ctx.onDiscoveryTruncated("deadline");
      return;
    }
    const hit = AZURE_PIPELINE_NAMES.map((n) =>
      join(ctx.workspace.root, n),
    ).find((p) => existsSync(p));
    if (!hit) return;
    if (isLintFixtureDir(hit)) return;
    const rel = relative(ctx.workspace.root, hit).replaceAll("\\", "/");
    if (ctx.ignoreMatcher.isIgnored(rel)) return;
    if (ctx.testFiles.length >= ctx.maxFiles) {
      ctx.onDiscoveryTruncated("file-cap:azure-pipelines");
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
    // Parse once per pipeline, share across all CI rules.
    let doc: unknown;
    try {
      doc = parseAzurePipeline(file.text);
    } catch {
      // Malformed/hostile YAML — skipped, never fatal (caller counts it).
      throw new AzureParseSkipped();
    }
    for (const rule of applicable) {
      // Audit P-1 parity: a single oversized pipeline must not own the budget.
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

export class AzureParseSkipped extends Error {}

const LIMITS_MAX_BYTES = 1 * 1024 * 1024;
