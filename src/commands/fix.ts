/**
 * `mjolnir fix` — Safe Auto-Fix with Proof (Tier 1 #3).
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

import {
  accessSync,
  chmodSync,
  constants,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { resolve as resolvePath, sep } from "node:path";

import type { Finding, ScanResult } from "../types.js";
import { computeCodeText } from "../engine/code-text.js";

export interface FixEdit {
  ruleId: string;
  file: string;
  line: number;
  description: string;
  /**
   * Textual replacement applied to the whole-file text. `refused` is set
   * when the edit cannot be located through the code-masking layer —
   * this command never rewrites what it cannot see as code.
   */
  apply: (text: string) => { text: string; changed: boolean; refused?: string };
}

export type FixStatus = "applied" | "failed" | "unchanged" | "planned";

export interface FixResult {
  file: string;
  ruleId: string;
  line: number;
  status: FixStatus;
  description: string;
}

const MAX_FILE_BYTES = 512 * 1024;

/**
 * Path-containment guard (adversarial-audit wave; hardened per audit
 * R-7): a finding's `file` may come from a plugin-supplied rule —
 * `join(rootDir, "../../etc/passwd")` must never escape the scan root,
 * and a symlink INSIDE the root must not smuggle a path outside it.
 * Both sides are resolved through realpathSync before the prefix check.
 * Returns null when the resolved path escapes rootDir; an unresolvable
 * (missing) path is returned unresolved so the caller's own read
 * reports it honestly as unreadable.
 */
function containedPath(rootDir: string, file: string): string | null {
  const abs = resolvePath(rootDir, file);
  const root = resolvePath(rootDir);
  if (abs !== root && !abs.startsWith(root + sep)) return null;
  let realRoot: string;
  try {
    realRoot = realpathSync(root);
  } catch {
    return null;
  }
  let realAbs: string;
  try {
    realAbs = realpathSync(abs);
  } catch {
    return abs;
  }
  const prefix = realRoot + sep;
  return realAbs === realRoot || realAbs.startsWith(prefix) ? realAbs : null;
}

// ─── Masking-aware editing (audit R-4) ───────────────────────────────

type MaskLang = "typescript" | "python" | "java" | "csharp";

function langForFile(file: string): MaskLang | null {
  if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/i.test(file)) return "typescript";
  if (/\.py$/i.test(file)) return "python";
  if (/\.java$/i.test(file)) return "java";
  if (/\.cs$/i.test(file)) return "csharp";
  return null;
}

/**
 * The code-only view (strings/comments blanked to spaces, newlines kept)
 * used to locate edits. Falls back to raw text when masking fails —
 * that fallback is DETECTED by maskingDegraded() and the edit is
 * refused rather than applied blind (audit R-4 hardening): a file whose
 * strings/comments cannot be masked is exactly the file where a textual
 * replace could corrupt test data.
 */
function maskFor(text: string, lang: MaskLang | null): string {
  if (!lang) return text;
  return computeCodeText({ path: "fix-target.ts", text }, lang);
}

const MASK_SENSITIVE = /["'`]|\/\/|\/\*/;

/** True when the masker returned raw text for a file that needs masking. */
function maskingDegraded(text: string, mask: string): boolean {
  return mask === text && MASK_SENSITIVE.test(text);
}

/**
 * Apply a regex replacement ONLY where the match sits in real code.
 * A match is in code when masking did not alter any of its characters —
 * every string/comment character differs from its blanked counterpart,
 * so `.only(` inside a snapshot, fixture or assertion string is never
 * rewritten. Returns the untouched text (refused) when nothing in code
 * matched or when masking degraded.
 */
function replaceInCode(
  text: string,
  lang: MaskLang | null,
  re: RegExp,
  buildReplacement: (m: RegExpExecArray) => string,
): { text: string; changed: boolean; refused?: string } {
  const masked = maskFor(text, lang);
  if (maskingDegraded(text, masked)) {
    return {
      text,
      changed: false,
      refused: "code masking unavailable for this file — edit refused",
    };
  }
  const global = new RegExp(
    re.source,
    re.flags.includes("g") ? re.flags : `${re.flags}g`,
  );
  let out = "";
  let last = 0;
  let changed = false;
  for (const m of text.matchAll(global)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    let inCode = true;
    for (let i = start; i < end; i++) {
      if (text[i] !== masked[i]) {
        inCode = false;
        break;
      }
    }
    if (!inCode) continue;
    out += text.slice(last, start) + buildReplacement(m as RegExpExecArray);
    last = end;
    changed = true;
  }
  if (!changed) return { text, changed: false };
  out += text.slice(last);
  return { text: out, changed: true };
}

/** Build the safe-fix edit for a finding, or null when not auto-fixable. */
export function planFix(finding: Finding): FixEdit | null {
  const lang = langForFile(finding.file);
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
          apply: (text) => stripDotOnly(text, lang),
        };
      }
      if (/fit|fdescribe/.test(finding.message)) {
        return {
          ruleId: finding.ruleId,
          file: finding.file,
          line: finding.line,
          description: "Rename fit/fdescribe to it/describe",
          apply: (text) => renameFocusedCalls(text, lang),
        };
      }
      if (/page\.pause/.test(finding.message)) {
        return {
          ruleId: finding.ruleId,
          file: finding.file,
          line: finding.line,
          description: "Remove `page.pause()` call",
          apply: (text) => removePagePause(text, lang),
        };
      }
      return null;
    default:
      return null;
  }
}

/** Remove `.only` between test/it/describe/bench and its `(` — in code only. */
function stripDotOnly(
  text: string,
  lang: MaskLang | null,
): { text: string; changed: boolean } {
  return replaceInCode(
    text,
    lang,
    /\b(test|it|describe|bench)\.only\s*\(/g,
    (m) => `${m[1]}(`,
  );
}

/** Rename focused-call aliases — in code only. */
function renameFocusedCalls(
  text: string,
  lang: MaskLang | null,
): { text: string; changed: boolean } {
  const one = replaceInCode(
    text,
    lang,
    /(^|[^\w$.])fit\s*\(/g,
    (m) => `${m[1]}it(`,
  );
  const two = replaceInCode(
    one.text,
    lang,
    /(^|[^\w$.])fdescribe\s*\(/g,
    (m) => `${m[1]}describe(`,
  );
  return { text: two.text, changed: one.changed || two.changed };
}

/**
 * Remove a line whose code content is exactly a `page.pause()` call —
 * the call must survive masking (i.e. sit in code, not a string or
 * comment) and the line must contain nothing else.
 */
function removePagePause(
  text: string,
  lang: MaskLang | null,
): { text: string; changed: boolean; refused?: string } {
  const masked = maskFor(text, lang);
  if (maskingDegraded(text, masked)) {
    return {
      text,
      changed: false,
      refused: "code masking unavailable for this file — edit refused",
    };
  }
  const lines = text.split("\n");
  const maskedLines = masked.split("\n");
  const kept: string[] = [];
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const maskedLine = maskedLines[i] ?? "";
    const isPauseCall = /^\s*.*\bpage\.pause\s*\(\s*\)\s*;?\s*$/.test(line);
    if (isPauseCall && /\bpage\.pause\s*\(\s*\)/.test(maskedLine)) {
      changed = true;
      continue;
    }
    kept.push(line);
  }
  if (!changed) return { text, changed: false };
  return { text: kept.join("\n"), changed: true };
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
      const abs = containedPath(rootDir, file);
      if (abs === null) {
        // Traversal attempt (e.g. plugin-supplied path) — refuse loudly.
        results.push(
          ...findings
            .map(planFix)
            .filter((e): e is FixEdit => e !== null)
            .map((e) => ({
              file,
              ruleId: e.ruleId,
              line: e.line,
              status: "failed" as const,
              description: `${e.description} — path escapes scan root, refused`,
            })),
        );
        continue;
      }
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
      if (applied.refused) {
        results.push({
          file,
          ruleId: edit.ruleId,
          line: edit.line,
          status: "failed",
          description: `${edit.description} — ${applied.refused}`,
        });
        continue;
      }
      if (!applied.changed || applied.text === before) {
        // No change: either the pattern was already removed by an earlier
        // edit in this batch (e.g. one rename pass covers fit+fdescribe),
        // or the finding is stale — including the R-4 case where the
        // pattern exists only inside strings or comments, which this
        // command refuses to rewrite. Verify against the ORIGINAL text —
        // if the pattern was never in code, the finding is unprovable.
        if (fixVerified(edit, before) && before !== original) continue;
        results.push({
          file,
          ruleId: edit.ruleId,
          line: edit.line,
          status: "failed",
          description:
            "pattern not found in code (strings and comments are never rewritten)",
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
            status: "planned",
            description: p.edit.description,
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
      const abs = containedPath(rootDir, file);
      if (abs === null) throw new Error("path escapes scan root");
      // Writability pre-check: on POSIX, a read-only FILE is still
      // replaceable via rename (dir permissions govern), so the atomic
      // write below would silently succeed where the user cannot edit.
      // Refuse up-front so behavior is identical cross-platform.
      accessSync(abs, constants.W_OK);
      // Atomic write: temp file + rename, so a killed process can never
      // leave the user's test file truncated mid-write.
      const tmp = `${abs}.mjolnir-tmp`;
      try {
        writeFileSync(tmp, text);
        // Audit R-5: the temp file is created with default mode — restore
        // the original's (0600, executable bits) or the rename loses them.
        const st = statSync(abs);
        chmodSync(tmp, st.mode & 0o777);
        renameSync(tmp, abs);
      } catch (writeErr) {
        // Audit R-5: never leak <file>.mjolnir-tmp into the user's tree.
        try {
          unlinkSync(tmp);
        } catch {
          // temp never got created
        }
        throw writeErr;
      }
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

/**
 * A fix is proven when its target pattern no longer matches the CODE
 * view of the fixed text (audit R-4): leftover occurrences inside
 * strings or comments neither block verification nor count as success.
 */
function fixVerified(edit: FixEdit, fixedText: string): boolean {
  const masked = maskFor(fixedText, langForFile(edit.file));
  switch (edit.description) {
    case "Remove `.only` focus modifier":
      return !/\b(test|it|describe|bench)\.only\s*\(/.test(masked);
    case "Rename fit/fdescribe to it/describe":
      return !/(^|[^\w$.])(fit|fdescribe)\s*\(/m.test(masked);
    case "Remove `page.pause()` call":
      return !/\bpage\.pause\s*\(\s*\)/.test(masked);
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
      r.status === "applied"
        ? "✔"
        : r.status === "planned"
          ? "▸"
          : r.status === "failed"
            ? "✗"
            : "·";
    lines.push(`${icon} [${r.ruleId}] ${r.file}:${r.line} — ${r.description}`);
  }
  const applied = results.filter((r) => r.status === "applied").length;
  const planned = results.filter((r) => r.status === "planned").length;
  const failed = results.filter((r) => r.status === "failed").length;
  lines.push("");
  const parts = [
    `${applied} applied`,
    ...(planned > 0 ? [`${planned} planned`] : []),
    ...(failed > 0 ? [`${failed} not applied`] : []),
  ];
  lines.push(
    `${parts.join(" · ")}${dryRun ? " (dry-run)" : ""}. Every applied fix was verified against the rule that flagged it.`,
  );
  return lines.join("\n");
}
