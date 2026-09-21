/**
 * `npm run docs:counts` — rewrites the census numbers embedded in the
 * live hand-written surfaces from the single source: the measurement
 * census (`measurementBlock()` — the exact block `mjolnir doctor --json`
 * emits as `measurement`, which docs/CERTIFICATION-POLICY.md §2 names
 * "the reproducible answer to how many rules are measured").
 *
 * Product-gap-remediation master plan P0 (flag 4, truth drift): the
 * measured count shipped three ways and drifted — the site roadmap said
 * "74" while the README said "78" and the census said 78. Hand-typed
 * numbers in prose are exactly the class a reader cannot catch and CI
 * previously did not. Every count-bearing claim below is wrapped in
 * `<!-- census:<key> -->` sentinels; this script replaces the sentinel
 * content with the live census values. The drift-lock contract test
 * (tests/contract/census-drift.spec.ts) additionally fails on ANY
 * hand-typed "NN of 99"-shaped claim anywhere in the live surfaces —
 * sentinel or not — so the whole class fails CI instead of shipping.
 *
 * Historical snapshots (CHANGELOG.md, docs/archive/) deliberately carry
 * no sentinels and are excluded from the drift sweep: they record what
 * an older release actually claimed, and rewriting history to match
 * today would be falsifying the record (same ruling as the CHANGELOG
 * note in tests/contract/docs-consistency.spec.ts).
 *
 * Drift-locked two ways: the generated-docs-drift CI job runs this
 * script and fails on any git diff, and the census-drift spec asserts
 * the committed sentinels equal the live census. No timestamps: the
 * rewrite must be byte-stable on the same tree.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { isMainModule } from "./lib/is-main-module.js";
import { measurementBlock } from "../src/commands/doctor.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

export interface Census {
  measured: number;
  unmeasured: number;
  total: number;
  quarantine: number;
}

/**
 * Sentinel keys → the text each carries. Keys are matched as
 * `<!-- census:<key> -->…<!-- /census:<key> -->`; the content between
 * them is wholly generator-owned. A sentinel whose key is unknown here
 * is a defect: the script fails loudly instead of leaving it stale.
 */
export function censusValues(census: Census): Record<string, string> {
  return {
    measured: String(census.measured),
    unmeasured: String(census.unmeasured),
    total: String(census.total),
    quarantine: String(census.quarantine),
    "measured-of-total": `${census.measured} of ${census.total}`,
    "unmeasured-of-total": `${census.unmeasured} of ${census.total}`,
    "total-rules": `${census.total} rules`,
    // The CERTIFICATION-POLICY §2 compact form: measured/unmeasured/total,
    // quarantine — the census block's exact key order.
    census: `${census.measured}/${census.unmeasured}/${census.total}, ${census.quarantine}`,
  };
}

const SENTINEL_RE = (key: string) =>
  new RegExp(`<!-- census:${key} -->([\\s\\S]*?)<!-- /census:${key} -->`, "g");

/**
 * Rewrites every census sentinel in one file's text. Returns the new
 * text, whether anything changed, and per-key hit counts. Unknown or
 * unfound sentinel keys are reported as errors — a missing sentinel
 * means someone deleted the marker (or added a claim without one), and
 * the failure must be loud, never a silent no-op.
 */
export function stampCensus(
  text: string,
  census: Census,
): {
  text: string;
  changed: boolean;
  hits: Record<string, number>;
  errors: string[];
} {
  const values = censusValues(census);
  const hits: Record<string, number> = {};
  const errors: string[] = [];
  let out = text;

  // Unknown sentinels first: `<!-- census:foo -->` whose key carries no
  // value here would otherwise sit unrewritten forever.
  for (const m of text.matchAll(/<!-- census:([\w-]+) -->/g)) {
    const key = m[1];
    if (key && !(key in values)) {
      errors.push(`unknown census sentinel key "${key}"`);
    }
  }

  for (const [key, value] of Object.entries(values)) {
    const re = SENTINEL_RE(key);
    const matches = [...text.matchAll(re)];
    if (matches.length === 0) continue; // key unused in this surface
    hits[key] = matches.length;
    out = out.replace(
      re,
      `<!-- census:${key} -->${value}<!-- /census:${key} -->`,
    );
    for (const m of matches) {
      if (m[1] !== value) {
        // Not an error — drift is the input this script fixes — but
        // reported so the npm-script run says what it corrected.
        hits[`${key}:drifted`] = (hits[`${key}:drifted`] ?? 0) + 1;
      }
    }
  }

  return { text: out, changed: out !== text, hits, errors };
}

/**
 * The live surfaces that carry census claims. Hand-written prose; only
 * the sentinel contents are generator-owned. Historical surfaces
 * (CHANGELOG.md, docs/archive/) are deliberately absent — see the
 * module comment.
 */
export const CENSUS_SURFACES = [
  "README.md",
  "docs/README.md",
  "docs/CERTIFICATION-POLICY.md",
  "site/reference/roadmap.md",
];

function main(): number {
  const census = measurementBlock();
  let failed = false;
  for (const rel of CENSUS_SURFACES) {
    const path = join(ROOT, rel);
    const before = readFileSync(path, "utf8");
    const { text, changed, hits, errors } = stampCensus(before, census);
    for (const e of errors) {
      failed = true;
      console.error(`FAIL: ${rel}: ${e}`);
    }
    if (changed) {
      writeFileSync(path, text);
      const drifted = Object.entries(hits)
        .filter(([k, n]) => k.endsWith(":drifted") && n > 0)
        .map(([k]) => k.replace(":drifted", ""))
        .join(", ");
      console.log(`updated ${rel} (${drifted || "reformatted"})`);
    } else {
      console.log(`current ${rel}`);
    }
  }
  return failed ? 1 : 0;
}

if (isMainModule(import.meta.url)) {
  process.exitCode = main();
}
