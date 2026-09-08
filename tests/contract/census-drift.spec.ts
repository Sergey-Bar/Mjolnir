/**
 * Census drift-lock (product-gap-remediation master plan P0.4, flag 4).
 *
 * The measured count used to ship three ways and drift: the site roadmap
 * said "74" while the README said "78" and the measurement census said
 * 78. docs/CERTIFICATION-POLICY.md §2 names the `doctor --json`
 * `measurement` block "the reproducible answer to how many rules are
 * measured" — this test makes that answer the ONLY answer a live
 * surface may state:
 *
 *   1. The census-sentinel surfaces (stamped by `npm run docs:counts`)
 *      must already equal the live census — a stale stamp fails here and
 *      is fixed mechanically by the generator (the generated-docs-drift
 *      CI job runs it and fails on any git diff too).
 *   2. ANY hand-typed claim of the census shapes ("NN of MM rules carry
 *      a false-positive rate", "MM rules, NN with …", "currently
 *      M/U/T, Q quarantine", …) in ANY live markdown surface must equal
 *      the census — sentinel or not — so the whole drift class fails CI
 *      instead of shipping.
 *
 * Historical snapshots stay marked as history and are deliberately NOT
 * swept: CHANGELOG.md records what an older release actually claimed
 * (same ruling as docs-consistency.spec.ts), docs/archive/ is a
 * superseded audit trail, and tests/corpus/verdicts/README.md opens
 * with a dated Status header ("2026-09-02 … 78 of 91") that pins what
 * that wave measured. Rewriting history to match today would falsify
 * the record, not fix it.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { RULES } from "../../src/rules/index.js";
import { measurementBlock } from "../../src/commands/doctor.js";
import { CENSUS_SURFACES, stampCensus } from "../../scripts/generate-counts.js";

const ROOT = join(import.meta.dirname, "..", "..");
const census = measurementBlock();

/**
 * The live hand-written surfaces swept for census-shaped claims. The
 * generated artifacts (docs/FP-AUDIT.md, docs/COUNT-LOCK.md,
 * docs/RULE-CAPABILITY-MATRIX.md, docs/machine-contract.md, docs/rules/)
 * are included on purpose: their numbers come from the verdict corpus
 * and the registry, so agreement with the census is a real cross-check,
 * not a tautology. History (CHANGELOG.md, docs/archive/,
 * tests/corpus/verdicts/README.md) is excluded — see the module comment.
 */
function liveSurfaces(): Array<{ name: string; text: string }> {
  const files: string[] = [];
  for (const f of readdirSync(ROOT)) {
    if (f.endsWith(".md") && f !== "CHANGELOG.md") files.push(f);
  }
  for (const f of readdirSync(join(ROOT, "docs"))) {
    if (f.endsWith(".md")) files.push(join("docs", f));
  }
  for (const dir of ["site/reference", "site/guide"]) {
    for (const f of readdirSync(join(ROOT, dir))) {
      if (f.endsWith(".md")) files.push(join(dir, f));
    }
  }
  return files.map((name) => {
    const raw = readFileSync(join(ROOT, name), "utf8");
    // Strip HTML comments (including the census sentinels themselves):
    // the sweep checks what a reader sees, and a sentinel boundary must
    // not split a claim phrase so far that its shape stops matching.
    return { name, text: raw.replace(/<!--[\s\S]*?-->/g, "") };
  });
}

/**
 * The claim shapes that state a census number, with the census field
 * each capture must equal. Shapes are deliberately tight — a loose
 * `\d+ of \d+` would flag every ratio in the repo; these anchor on the
 * exact census phrasing the surfaces use.
 */
type Claim = { numbers: number[]; fields: Array<keyof typeof census> };
const CLAIM_SHAPES: Array<{
  re: RegExp;
  read: (m: RegExpMatchArray) => Claim;
}> = [
  {
    // "78 of 99 rules carry a false-positive rate measured against …"
    re: /(\d+) of (\d+) rules carry a false-positive rate/g,
    read: (m) => ({
      numbers: [Number(m[1]), Number(m[2])],
      fields: ["measured", "total"],
    }),
  },
  {
    // "21 of 99 rules ship on an estimate"
    re: /(\d+) of (\d+) rules ship on an estimate/g,
    read: (m) => ({
      numbers: [Number(m[1]), Number(m[2])],
      fields: ["unmeasured", "total"],
    }),
  },
  {
    // "The other 21 ship on the author's estimate"
    re: /The other (\d+) ship on the author's estimate/g,
    read: (m) => ({ numbers: [Number(m[1])], fields: ["unmeasured"] }),
  },
  {
    // "99 rules, 78 with a false-positive rate measured against …"
    re: /(\d+) rules, (\d+) with a false-positive rate/g,
    read: (m) => ({
      numbers: [Number(m[1]), Number(m[2])],
      fields: ["total", "measured"],
    }),
  },
  {
    // "(currently 78/21/99, 43 quarantine)"
    re: /\(currently (\d+)\/(\d+)\/(\d+), (\d+) quarantine\)/g,
    read: (m) => ({
      numbers: m.slice(1, 5).map(Number),
      fields: ["measured", "unmeasured", "total", "quarantine"],
    }),
  },
  {
    // "## Coverage: 78/99 rules measured (79%) at n ≥ 10"
    re: /## Coverage: (\d+)\/(\d+) rules measured/g,
    read: (m) => ({
      numbers: [Number(m[1]), Number(m[2])],
      fields: ["measured", "total"],
    }),
  },
  {
    // "**99 rules** in four families — …"
    re: /(\d+) rules\**\s+in four families/g,
    read: (m) => ({ numbers: [Number(m[1])], fields: ["total"] }),
  },
];

describe("measurement census is the single source for the measured count", () => {
  it("the census total equals the live registry size (sanity)", () => {
    expect(census.total).toBe(RULES.length);
    expect(census.measured + census.unmeasured).toBe(census.total);
  });

  it("the census-sentinel surfaces already equal the live census (regenerate with npm run docs:counts)", () => {
    for (const rel of CENSUS_SURFACES) {
      const text = readFileSync(join(ROOT, rel), "utf8");
      const { changed, errors } = stampCensus(text, census);
      expect(errors, `${rel} carries a broken census sentinel`).toEqual([]);
      expect(
        changed,
        `${rel} states a stale census number — run \`npm run docs:counts\` ` +
          `and commit the result (the sentinel content is generated, the ` +
          `prose around it is hand-written)`,
      ).toBe(false);
    }
  });

  it("every census-shaped claim in every live surface equals the census", () => {
    const surfaces = liveSurfaces();
    let claims = 0;
    for (const { name, text } of surfaces) {
      for (const shape of CLAIM_SHAPES) {
        for (const m of text.matchAll(shape.re)) {
          claims++;
          const { numbers, fields } = shape.read(m);
          numbers.forEach((n, i) => {
            const field = fields[i];
            if (!field) return; // shape guarantee: numbers/fields same length
            expect(
              n,
              `${name} claims "${m[0]}" — the census field "${field}" ` +
                `is ${census[field]} per \`mjolnir doctor --json\` ` +
                `(docs/CERTIFICATION-POLICY.md §2: the census is the ` +
                `reproducible answer). Stamp it with sentinels and run ` +
                `\`npm run docs:counts\`, or fix the number`,
            ).toBe(census[field]);
          });
        }
      }
    }
    // The shapes must keep matching the real claims: if prose rewording
    // rots every regex above, this floor fails instead of the sweep
    // silently checking nothing (same discipline as the FP-AUDIT line
    // sanity in docs-consistency.spec.ts).
    expect(
      claims,
      "no census-shaped claims found — the claim regexes have rotted " +
        "and the sweep is checking nothing",
    ).toBeGreaterThanOrEqual(5);
  });
});
