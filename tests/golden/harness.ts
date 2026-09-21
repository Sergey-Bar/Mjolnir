/**
 * Golden-scan harness — the SINGLE code path for generating and
 * verifying the golden lock (bug-audit H4 / G3).
 *
 * Before this harness existed, the generator (gen.ts) ran rules on raw
 * `text` while the verifier (golden.spec.ts) passed `codeText` — the
 * committed expectations were measured on a different code path than
 * the one checking them, so regeneration and verification could
 * disagree and mask drift. Both now call `scanGolden()` here.
 *
 * Rule crashes are RECORDED, not swallowed: the old generate and verify
 * paths both silently skipped a crashing rule, making a crash mutually
 * consistent and invisible.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { RULES } from "../../src/rules/index.js";
import { computeCodeText } from "../../src/engine/code-text.js";

export interface ExpectedEntry {
  /** file → ruleId → count of findings. */
  [file: string]: Record<string, number>;
}

export interface GoldenScan {
  expectations: ExpectedEntry;
  /** Rules that threw during the scan — must be empty for a valid lock. */
  crashed: Array<{ ruleId: string; file: string }>;
}

export function scanGolden(rootDir: string): GoldenScan {
  const expectations: ExpectedEntry = {};
  const crashed: GoldenScan["crashed"] = [];
  const files = listTestFiles(rootDir);
  for (const rel of files) {
    const text = readFileSync(join(rootDir, rel), "utf8");
    const parsed = { path: rel, text };
    const codeText = computeCodeText(parsed, "typescript");
    const counts: Record<string, number> = {};
    for (const rule of RULES) {
      if (rule.appliesTo !== "test-files") continue;
      try {
        const found = rule.run({ ...parsed, codeText });
        if (found.length > 0) counts[rule.id] = found.length;
      } catch {
        crashed.push({ ruleId: rule.id, file: rel });
      }
    }
    if (Object.keys(counts).length > 0) expectations[rel] = counts;
  }
  return { expectations, crashed };
}

export function listTestFiles(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...listTestFiles(join(dir, e.name), rel));
    else if (/\.(spec|test)\.(ts|js)$/.test(e.name)) out.push(rel);
  }
  return out;
}
