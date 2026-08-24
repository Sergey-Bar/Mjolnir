/**
 * Golden expectations generator — run: npm run golden:update
 * Writes tests/golden/golden-expected.json (per-rule-ID counts, S4).
 */

import { writeFileSync } from "node:fs";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { RULES } from "../../src/rules/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN_ROOT = join(HERE, "repo");
const EXPECTED_PATH = join(HERE, "golden-expected.json");

interface ExpectedEntry {
  [file: string]: Record<string, number>;
}

function scanGolden(): ExpectedEntry {
  const result: ExpectedEntry = {};
  for (const rel of listTestFiles(GOLDEN_ROOT)) {
    const text = readFileSync(join(GOLDEN_ROOT, rel), "utf8");
    const counts: Record<string, number> = {};
    for (const rule of RULES) {
      if (rule.appliesTo !== "test-files") continue;
      try {
        const found = rule.run({ path: rel, text });
        if (found.length > 0) counts[rule.id] = found.length;
      } catch {
        /* crash isolation */
      }
    }
    if (Object.keys(counts).length > 0) result[rel] = counts;
  }
  return result;
}

function listTestFiles(dir: string, prefix = ""): string[] {
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

writeFileSync(EXPECTED_PATH, JSON.stringify(scanGolden(), null, 2) + "\n");
console.log("Golden expectations written:", EXPECTED_PATH);
