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
    // Procedural indexOf stripping — complete by construction (every
    // opener either closes, or its unterminated tail is kept), which the
    // regex form could not guarantee (CodeQL
    // js/incomplete-multi-character-sanitization).
    return { name, text: stripHtmlComments(raw) };
  });
}

/** Removes complete `<!-- … -->` comments; keeps unterminated tails. */
function stripHtmlComments(text: string): string {
  let out = "";
  let rest = text;
  for (;;) {
    const open = rest.indexOf("<!--");
    if (open === -1) return out + rest;
    const close = rest.indexOf("-->", open + 4);
    if (close === -1) return out + rest;
    out += rest.slice(0, open);
    rest = rest.slice(close + 3);
  }
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
  /**
   * True when no live surface currently uses this phrasing.
   *
   * A dormant shape is KEPT, not deleted. The one it guards is a phrasing a
   * surface used to use and may use again, and deleting the shape would
   * remove the only thing that would catch a wrong number if it returned —
   * which is precisely the failure this whole file exists to prevent (the V6
   * table's stale `74` survived because its shape did not exist yet). So a
   * dormant shape must declare itself, and the assertion below fails if a
   * shape starts matching again without its flag being cleared: that is
   * either good news (a surface came back) or a false positive (the regex is
   * too loose), and in both cases a human needs to look.
   */
  dormant?: { why: string };
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
    dormant: {
      why:
        "No live surface uses this phrasing. It was the README's inline " +
        "summary, which the census sentinel replaced; kept so a surface that " +
        "reverts to it is still checked.",
    },
  },
  {
    // "(currently 78/21/99, 43 quarantine)"
    re: /\(currently (\d+)\/(\d+)\/(\d+), (\d+) quarantine\)/g,
    read: (m) => ({
      numbers: m.slice(1, 5).map(Number),
      fields: ["measured", "unmeasured", "total", "quarantine"],
    }),
    dormant: {
      why:
        "No live surface uses this parenthetical. The same four numbers " +
        "are stated as a table row now, and that row has its own shape below.",
    },
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
  {
    // "| Rules with a valid measurement | 74 |" — the V6 state table.
    //
    // This row carried a stale 74 for two releases and no shape matched it,
    // which is how a "no stale numbers anywhere" spec missed a stale number
    // sitting in a table. The table is Markdown, so the row is matched whole
    // and the trailing `|` is required: without it, any prose line mentioning
    // the phrase would be read as a claim.
    //
    // The word "valid" is load-bearing and matches the census definition
    // (`hasValidMeasurement`, not "an entry exists in MEASURED_FP") — the
    // same distinction that made `check-rule-quality.ts` report 74 while every
    // other surface reported 73.
    re: /\|\s*Rules with a valid measurement\s*\|\s*(\d+)\s*\|/g,
    read: (m) => ({ numbers: [Number(m[1])], fields: ["measured"] }),
  },
  {
    // "| Rules with a valid measurement: 73" — the V6 state table written as
    // a label and a number rather than a Markdown row. Separate from the
    // table-row shape above because the two match different text, and a
    // single loose shape covering both would be one more thing to keep
    // honest; this one is dormant until a surface uses that phrasing.
    re: /Rules with a valid measurement[:\s*]{1,4}(\d+)/g,
    read: (m) => ({ numbers: [Number(m[1])], fields: ["measured"] }),
    dormant: {
      why:
        "The live V6 table states this as a Markdown row, which the " +
        "previous shape matches. Kept for a prose phrasing of the same claim.",
    },
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

    // And each shape must either be pulling its weight or say why it cannot.
    // A shape that matches nothing and does not say so is a shape that has
    // silently stopped checking — indistinguishable from a shape with nothing
    // to check, and the reason a stale `74` survived in the V6 table for two
    // releases: the sweep reported "all claims agree" while a live surface
    // contradicted the census, because no shape covered that row.
    const perShape = CLAIM_SHAPES.map((shape) => {
      let hits = 0;
      for (const { text } of surfaces) {
        hits += [...text.matchAll(shape.re)].length;
      }
      return hits;
    });
    const undeclared = CLAIM_SHAPES.filter(
      (shape, i) => perShape[i] === 0 && shape.dormant === undefined,
    ).map((shape) => shape.re.source);
    expect(
      undeclared,
      "these census claim shapes match nothing in any live surface and do " +
        "not declare themselves dormant — a shape that matches nothing is a " +
        "shape that stopped checking, and a shape that was silently deleted " +
        "is the same failure. Either the surface it guards came back (clear " +
        "the flag, or delete the shape if the phrasing is gone for good), or " +
        "add a `dormant` note saying what it is waiting for",
    ).toEqual([]);

    // The other direction: a shape flagged dormant that now MATCHES is either
    // good news or a false positive, and both need a human.
    const resurrected = CLAIM_SHAPES.filter(
      (shape, i) => (perShape[i] ?? 0) > 0 && shape.dormant !== undefined,
    ).map((shape) => shape.re.source);
    expect(
      resurrected,
      "these shapes are marked dormant but match a live surface again — " +
        "either a surface came back to that phrasing, or the regex is loose " +
        "enough to match something it should not. Clear the flag or tighten it",
    ).toEqual([]);
  });
});

/**
 * The second version-shaped claim: a git REF a reader will copy.
 *
 * The census sweep above covers counts. This covers the other number a
 * surface can state that a reader acts on — `uses: Sergey-Bar/Mjolnir@vN`.
 * It existed as a defect for a long time and nothing caught it, for three
 * reasons that are each worth naming:
 *
 *   1. `check-version-surface.ts` binds the surfaces to the package VERSION.
 *      The Action's major TAG is a different artifact, moved by
 *      `.github/workflows/action-tags.yml` only after a stable release.
 *   2. The translation sync (`scripts/readme-release-status.mjs`, since
 *      deleted with the twenty-two READMEs it fed) propagated a HARDCODED `@v3`
 *      into all of them on every run, so the wrong number was not a typo that
 *      would decay — it was being re-written on purpose.
 *   3. A syntactically valid ref that does not resolve fails silently for the
 *      reader and loudly nowhere in this repository.
 *
 * The major a surface may name is `major(publishedStable)`, because the tag
 * workflow derives the major from the release it follows.
 */
const ACTION_TAG = /Sergey-Bar\/Mjolnir@v(\d+)/gu;

/** The published stable, read once and typed — an `any` here would make the
 *  comparison below tautological, which is the defect this sweep exists for. */
const PUBLISHED_STABLE: string = (
  JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    publishedStable: string;
  }
).publishedStable;

describe("Action tag claims name the published major", () => {
  it("reads the published stable major, and it is a positive integer", () => {
    expect(PUBLISHED_STABLE).toMatch(/^\d+\.\d+\.\d+$/u);
  });

  it("every live surface pinning a major tag pins the published one", () => {
    const major = PUBLISHED_STABLE.split(".")[0];
    const surfaces = liveSurfaces();
    let seen = 0;
    for (const { name, text } of surfaces) {
      for (const m of text.matchAll(ACTION_TAG)) {
        seen++;
        expect(
          m[1],
          `${name} pins \`${m[0]}\`, but the published stable is ${PUBLISHED_STABLE} and ` +
            `the action major tag follows the release, so only ` +
            `\`Sergey-Bar/Mjolnir@v${major}\` resolves. A pin to a tag the ` +
            "repository no longer moves is a 404 the reader finds and no gate " +
            "here would have found for them",
        ).toBe(major);
      }
    }
    // Same discipline as the census floor above: a sweep that matches nothing
    // is indistinguishable from a sweep that has stopped working. The floor
    // is deliberately low — the point is that the shape is live, not that
    // every language repeats the snippet.
    expect(
      seen,
      "no surface pins a Sergey-Bar/Mjolnir@vN tag — the shape has rotted and " +
        "this sweep is checking nothing",
    ).toBeGreaterThanOrEqual(3);
  });
});
