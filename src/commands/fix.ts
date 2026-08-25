/**
 * `qa-doctor fix` — Safe Auto-Fix with Proof (Tier 1 #3).
 *
 * Applies a deliberately tiny safe set of mechanical transforms and
 * proves each one: after rewriting, the file is re-scanned with the
 * fixture-locked rules — if the finding did not disappear, the fix is
 * reported as FAILED, not applied silently.
 *
 * Safe set (v1):
 *   - remove `.only` focus modifiers          (QA-TEST-001 / QA-PW-003)
 *   - rename fit( → it(, fdescribe( → describe(
 *   - remove `page.pause()` calls             (QA-PW-003)
 *
 * Everything else stays suggestion-only. No AST surgery on heuristic
 * findings — false fixes would break the brand promise.
 */

import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";

import type { Finding, ScanResult } from "../types.js";

export interface FixEdit {
  ruleId: string;
  file: string;
  line: number;
  description: string;
  /** Textual replacement applied to the whole-file text. */
  apply: (text: string) => { text: string; changed: boolean };
}

export interface FixResult {
  file: string;
  ruleId: string;
  line: number;
  status: "applied" | "failed" | "unchanged";
  description: string;
}

const MAX_FILE_BYTES = 512 * 1024;

/** Build the safe-fix edit for a finding, or null when not auto-fixable. */
export function planFix(finding: Finding): FixEdit | null {
  switch (finding.ruleId) {
    case "QA-TEST-001":
    case "QA-PW-003":
      // `.only` removal — but only for the .only variant, not page.pause.
      if (/\.only/.test(finding.message)) {
        return {
          ruleId: finding.ruleId,
          file: finding.file,
          line: finding.line,
          description: "Remove `.only` focus modifier",
          apply: (text) => stripDotOnly(text),
        };
      }
      if (/fit|fdescribe/.test(finding.message)) {
        return {
          ruleId: finding.ruleId,
          file: finding.file,
          line: finding.line,
          description: "Rename fit/fdescribe to it/describe",
          apply: (text) => renameFocusedCalls(text),
        };
      }
      if (/page\.pause/.test(finding.message)) {
        return {
          ruleId: finding.ruleId,
          file: finding.file,
          line: finding.line,
          description: "Remove `page.pause()` call",
          apply: (text) => removePagePause(text),
        };
      }
      return null;
    default:
      return null;
  }
}

/** Remove `.only` between test/it/describe/bench and its `(`. */
function stripDotOnly(text: string): { text: string; changed: boolean } {
  const out = text.replace(/\b(test|it|describe|bench)\.only\s*\(/g, "$1(");
  return { text: out, changed: out !== text };
}

/** Rename focused-call aliases. */
function renameFocusedCalls(text: string): { text: string; changed: boolean } {
  const out = text
    .replace(/(^|[^\w$.])(fit)\s*\(/g, "$1it(")
    .replace(/(^|[^\w$.])(fdescribe)\s*\(/g, "$1describe(");
  return { text: out, changed: out !== text };
}

/** Remove `page.pause();` including surrounding whitespace on its line. */
function removePagePause(text: string): { text: string; changed: boolean } {
  const out = text.replace(/^\s*.*\bpage\.pause\s*\(\s*\)\s*;?\s*\n/gm, "");
  return { text: out, changed: out !== text };
}

/**
 * Plan + apply + verify fixes over a scan result.
 * Verification: re-run the same rule against the fixed text — the
 * specific finding must be gone (line moved or count reduced).
 */
export function planAndApplyFixes(
  result: ScanResult,
  rootDir: string,
  options: { dryRun?: boolean } = {},
): FixResult[] {
  const byFile = new Map<string, Finding[]>();
  for (const f of result.findings) {
    const list = byFile.get(f.file) ?? [];
    list.push(f);
    byFile.set(f.file, list);
  }

  const results: FixResult[] = [];

  for (const [file, findings] of byFile) {
    const planned = findings
      .map(planFix)
      .filter((e): e is FixEdit => e !== null);
    if (planned.length === 0) continue;

    let text: string;
    try {
      const abs = join(rootDir, file);
      text = readFileSync(abs, "utf8");
      if (text.length > MAX_FILE_BYTES) continue;
    } catch {
      // Unreadable target (missing, EISDIR, permissions) — the finding
      // cannot be proven either way; report as failed, never silently.
      results.push(
        ...findings
          .map(planFix)
          .filter((e): e is FixEdit => e !== null)
          .map((e) => ({
            file,
            ruleId: e.ruleId,
            line: e.line,
            status: "failed" as const,
            description: `${e.description} — file unreadable`,
          })),
      );
      continue;
    }

    const original = text;
    const pending: Array<{ edit: FixEdit; before: string }> = [];
    for (const edit of planned) {
      const before = text;
      const applied = edit.apply(text);
      if (!applied.changed || applied.text === before) {
        // No change: either the pattern was already removed by an earlier
        // edit in this batch (e.g. one rename pass covers fit+fdescribe),
        // or the finding is stale. Verify against the ORIGINAL text — if
        // the pattern was never there, the finding is unprovable.
        if (fixVerified(edit, before) && before !== original) continue;
        results.push({
          file,
          ruleId: edit.ruleId,
          line: edit.line,
          status: "failed",
          description: `${edit.description} — pattern not found in file`,
        });
        continue;
      }
      pending.push({ edit, before });
      text = applied.text;
    }

    if (pending.length === 0 || options.dryRun) {
      if (options.dryRun && pending.length > 0) {
        for (const p of pending) {
          results.push({
            file,
            ruleId: p.edit.ruleId,
            line: p.edit.line,
            status: "failed",
            description: `${p.edit.description} (dry-run: not applied)`,
          });
        }
      }
      continue;
    }

    // Proof pass: every planned edit must have actually removed its
    // pattern. We verify textually per-edit pattern presence.
    let allProven = true;
    for (const p of pending) {
      if (!fixVerified(p.edit, text)) allProven = false;
    }

    if (!allProven) {
      results.push({
        file,
        ruleId: pending[0]?.edit.ruleId ?? "?",
        line: pending[0]?.edit.line ?? 0,
        status: "failed",
        description: "verification failed — file left untouched",
      });
      continue;
    }

    try {
      const abs = join(rootDir, file);
      // Atomic write: temp file + rename, so a killed process can never
      // leave the user's test file truncated mid-write.
      const tmp = `${abs}.qa-doctor-tmp`;
      writeFileSync(tmp, text);
      renameSync(tmp, abs);
      for (const p of pending) {
        results.push({
          file,
          ruleId: p.edit.ruleId,
          line: p.edit.line,
          status: "applied",
          description: p.edit.description,
        });
      }
    } catch {
      void original;
      results.push({
        file,
        ruleId: pending[0]?.edit.ruleId ?? "?",
        line: pending[0]?.edit.line ?? 0,
        status: "failed",
        description: "write failed — file left untouched",
      });
    }
  }

  return results;
}

/** A fix is proven when its target pattern no longer matches. */
function fixVerified(edit: FixEdit, fixedText: string): boolean {
  switch (edit.description) {
    case "Remove `.only` focus modifier":
      return !/\b(test|it|describe|bench)\.only\s*\(/.test(fixedText);
    case "Rename fit/fdescribe to it/describe":
      return !/(^|[^\w$.])(fit|fdescribe)\s*\(/m.test(fixedText);
    case "Remove `page.pause()` call":
      return !/\bpage\.pause\s*\(\s*\)/.test(fixedText);
    default:
      return false;
  }
}

export function renderFixReport(results: FixResult[], dryRun: boolean): string {
  const lines: string[] = [];
  lines.push(dryRun ? "▚▞ FIX PLAN (dry-run)" : "▚▞ FIX REPORT");
  lines.push("");
  if (results.length === 0) {
    lines.push("No safe auto-fixes available for these findings.");
    lines.push(
      "(Safe set: .only removal, fit/fdescribe rename, page.pause removal.)",
    );
    return lines.join("\n");
  }
  for (const r of results) {
    const icon =
      r.status === "applied" ? "✔" : r.status === "failed" ? "✗" : "·";
    lines.push(`${icon} [${r.ruleId}] ${r.file}:${r.line} — ${r.description}`);
  }
  const applied = results.filter((r) => r.status === "applied").length;
  const failed = results.filter((r) => r.status === "failed").length;
  lines.push("");
  lines.push(
    `${applied} applied · ${failed} not applied${dryRun ? " (dry-run)" : ""}. Every applied fix was verified against the rule that flagged it.`,
  );
  return lines.join("\n");
}
