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
import { okIcon, sectionHeader, plainContext } from "../reporter/ui.js";

const ui = plainContext();

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
  // eslint-disable-next-line security/detect-non-literal-regexp -- clone of a compile-time literal's .source for flag control — not scan input
  const global = new RegExp(re.source, re.flags);
  let out = "";
  let last = 0;
  let changed = false;
  let m: RegExpExecArray | null;
  while ((m = global.exec(text)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    let inCode = true;
    for (let i = start; i < end; i++) {
      if (text[i] !== masked[i]) {
        inCode = false;
        break;
      }
    }
    if (!inCode) continue;
    out += text.slice(last, start) + buildReplacement(m);
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
          apply: (text) => removePagePause(text, lang, finding.line),
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
 * Remove the FINDING's own `page.pause()` line — and only it (bug-audit
 * H1). The old implementation matched `/^\s*.*\bpage\.pause…/` (the
 * leading `.*` let the "pause line" start mid-statement, so
 * `init(); page.pause();` was deleted whole) and looped over every pause
 * line in the file, not just the finding's. Both are data loss.
 *
 * Rules now:
 *  - a line is removable only when the pause call is the ENTIRE
 *    statement (optionally awaited);
 *  - if the finding's own line merely CONTAINS the call beside other
 *    statements, the edit is refused with a manual-fix hint instead;
 *  - at most one line is removed per finding, and never a line whose
 *    pause call sits inside a string or comment (masking check).
 */
function removePagePause(
  text: string,
  lang: MaskLang | null,
  targetLine: number,
): { text: string; changed: boolean; refused?: string } {
  const masked = maskFor(text, lang);
  if (maskingDegraded(text, masked)) {
    return {
      text,
      changed: false,
      refused: "code masking unavailable for this file — edit refused",
    };
  }
  // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
  const PAUSE_ONLY = /^\s*(?:await\s+)?page\.pause\s*\(\s*\)\s*(?:;\s*)?$/;
  const PAUSE_CALL = /\bpage\.pause\s*\(\s*\)/;
  const lines = text.split("\n");
  const maskedLines = masked.split("\n");
  const isPauseOnly = (i: number): boolean => {
    const line = lines[i];
    const maskedLine = maskedLines[i];
    return (
      line !== undefined &&
      maskedLine !== undefined &&
      PAUSE_ONLY.test(line) &&
      PAUSE_CALL.test(maskedLine)
    );
  };
  const want = targetLine - 1;
  if (want >= 0 && want < lines.length) {
    if (isPauseOnly(want)) {
      lines.splice(want, 1);
      return { text: lines.join("\n"), changed: true };
    }
    const wantMasked = maskedLines[want];
    if (wantMasked !== undefined && PAUSE_CALL.test(wantMasked)) {
      // The finding's line holds other statements beside the pause —
      // deleting the line would destroy them. Never auto-fix; report.
      return {
        text,
        changed: false,
        refused:
          "page.pause() shares its line with other statements — remove it manually",
      };
    }
  }
  // The exact line is gone (an earlier edit in this batch removed a line
  // above it, or the finding is stale): remove the NEAREST pause-only
  // line — after the target first, then before it. A line that merely
  // contains the call beside other code is never a candidate.
  for (let i = want + 1; i < lines.length; i++) {
    if (isPauseOnly(i)) {
      lines.splice(i, 1);
      return { text: lines.join("\n"), changed: true };
    }
  }
  for (let i = Math.min(want, lines.length - 1); i >= 0; i--) {
    if (isPauseOnly(i)) {
      lines.splice(i, 1);
      return { text: lines.join("\n"), changed: true };
    }
  }
  return { text, changed: false };
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

    // Path containment resolved ONCE: the read and the later atomic
    // write operate on the same resolved path, so a second containment
    // check at write time would be dead code.
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

    let text: string;
    try {
      text = readFileSync(abs, "utf8");
      // Bug-audit L6: the size guard used `text.length` (UTF-16 units,
      // not bytes — a BMP-only file is fine but astral chars skew it) and
      // skipped the file with NO FixResult, so `mjolnir fix` exited 0
      // while silently doing nothing. Emit an honest result instead.
      const sizeBytes = Buffer.byteLength(text, "utf8");
      if (sizeBytes > MAX_FILE_BYTES) {
        results.push(
          ...planned.map((e) => ({
            file,
            ruleId: e.ruleId,
            line: e.line,
            status: "failed" as const,
            description:
              `${e.description} — file is ${sizeBytes} bytes, over the ` +
              `${MAX_FILE_BYTES}-byte fix limit; skipped (fix manually)`,
          })),
        );
        continue;
      }
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
        if (fixVerified(edit, before, original) && before !== original)
          continue;
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

    // Proof invariant (audit R-4): every pending edit's apply() replaced
    // in-code matches under the SAME masking view that fixVerified uses,
    // so a pending edit is proven by construction — apply changed text
    // only where the code view contained the pattern, and the pattern's
    // removal is therefore observable in the fixed text's code view.
    // There is deliberately no post-hoc "unproven batch" abort here: it
    // was unreachable, and dead safety nets hide live bugs.

    try {
      // Writability pre-check: on POSIX, a read-only FILE is still
      // replaceable via rename (dir permissions govern), so the atomic
      // write below would silently succeed where the user cannot edit.
      // Refuse up-front so behavior is identical cross-platform.
      accessSync(abs, constants.W_OK);
      // Atomic write: temp file + rename, so a killed process can never
      // leave the user's test file truncated mid-write. Bug-audit L6:
      // the temp name was the predictable `${abs}.mjolnir-tmp` written
      // with plain writeFileSync — it would overwrite a pre-existing
      // user file of that exact name, and two concurrent fixes raced on
      // the same path. Random suffix + O_EXCL (`wx`) makes both
      // impossible.
      const tmp = `${abs}.mjolnir-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.tmp`;
      try {
        writeFileSync(tmp, text, { flag: "wx" });
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
      // Symmetric with the unreadable-file path above: every planned fix
      // in this batch failed to land, so each is reported honestly.
      results.push(
        ...pending.map((p) => ({
          file,
          ruleId: p.edit.ruleId,
          line: p.edit.line,
          status: "failed" as const,
          description: "write failed — file left untouched",
        })),
      );
    }
  }

  return results;
}

/**
 * A fix is proven when its target pattern no longer matches the CODE
 * view of the fixed text (audit R-4): leftover occurrences inside
 * strings or comments neither block verification nor count as success.
 * For page.pause (H1) the proof is count-reduction against the original
 * text: the fix is surgical now, so another, untouched pause call
 * elsewhere in the file must not un-prove this finding's fix.
 */
function fixVerified(
  edit: FixEdit,
  fixedText: string,
  originalText: string,
): boolean {
  const masked = maskFor(fixedText, langForFile(edit.file));
  switch (edit.description) {
    case "Remove `.only` focus modifier":
      return !/\b(?:test|it|describe|bench)\.only\s*\(/.test(masked);
    case "Rename fit/fdescribe to it/describe":
      return !/(?:^|[^\w$.])(?:fit|fdescribe)\s*\(/m.test(masked);
    default:
      break;
  }
  // page.pause proof is count-reduction against the original text (H1):
  // another, untouched pause call in a string must not un-prove this
  // finding's fix, and a spliced pause-only line always reduces the code
  // view's count.
  const before = maskFor(originalText, langForFile(edit.file));
  const count = (t: string): number =>
    (t.match(/\bpage\.pause\s*\(\s*\)/g) ?? []).length;
  return count(masked) < count(before);
}

export function renderFixReport(results: FixResult[], dryRun: boolean): string {
  const lines: string[] = [];
  lines.push(sectionHeader(dryRun ? "FIX PLAN (dry-run)" : "FIX REPORT", ui));
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
        ? okIcon(ui)
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
