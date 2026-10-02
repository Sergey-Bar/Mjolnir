/**
 * The exit-code contract, stated once and enforced everywhere (V5-002).
 *
 * `docs/VERSIONING.md` used to document exit `2` as "partial scan (never
 * blocks)", and `docs/TERMINOLOGY.md`, `site/reference/exit-codes.md`,
 * `site/reference/cli.md` and the generated blast-radius audit all repeated
 * it. That single sentence is what licensed every pipeline to treat an
 * incomplete analysis as a green one.
 *
 * Withdrawn wording in a user-facing document is worse than a wrong exit code:
 * the wrong code fails visibly, the sentence teaches the workaround. So the
 * withdrawn phrasing is now a hard failure, in any surface, rather than a
 * review convention.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");

/**
 * Phrasings that reinstate "an incomplete analysis is fine".
 *
 * The character class stops at `|` and a newline because a table row is the
 * unit being read — a match must not run out of one cell into the next. It
 * deliberately does NOT stop at `.`: the first version of this gate excluded
 * the period too, and that is precisely how `README.md`'s exit-code table
 * shipped the withdrawn sentence for a whole release —
 *
 *   | `2` | Partial scan (time budget hit, unreadable files). Never blocks. |
 *
 * reads as two sentences inside one cell, so excluding `.` made the sentence
 * invisible to the one gate written to catch it. A period ends a sentence; it
 * does not end a claim.
 */
const WITHDRAWN: ReadonlyArray<{ pattern: RegExp; why: string }> = [
  {
    pattern: /partial[^|\n]{0,60}\(?never blocks\)?/i,
    why: "exit 2 is inconclusive, not a pass",
  },
  {
    pattern: /`2`[^|\n]{0,60}partial[^|\n]{0,30}advisory/i,
    why: "advisory suppresses findings, not an unfinished analysis",
  },
  // The same claim without the withdrawn adjective: a table cell that simply
  // promises a partial scan cannot block is the defect, whatever it calls it.
  {
    pattern:
      /`2`[^|\n]{0,60}(?:inconclusive|partial)[^|\n]{0,60}(?:never block|does not block|won'?t block|non-block)/i,
    why: "exit 2 is inconclusive, not a pass",
  },
];

/** Surfaces that describe the exit contract to a human. */
const DOC_SURFACES = [
  "docs/VERSIONING.md",
  "docs/TERMINOLOGY.md",
  "docs/BLAST-RADIUS-AUDIT.md",
  "docs/machine-contract.md",
  "site/reference/exit-codes.md",
  "site/reference/cli.md",
  "site/guide/ci.md",
  "README.md",
];

describe("the exit-code contract is stated the same way everywhere", () => {
  it("no surface reinstates the withdrawn 'partial never blocks' wording", () => {
    const offenders: string[] = [];
    for (const path of DOC_SURFACES) {
      const text = readFileSync(join(ROOT, path), "utf8");
      for (const { pattern, why } of WITHDRAWN) {
        const match = text.match(pattern);
        if (match) offenders.push(`${path}: "${match[0]}" — ${why}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("no source comment reinstates it either", () => {
    const offenders: string[] = [];
    for (const path of globSync("src/**/*.ts", { cwd: ROOT })) {
      const text = readFileSync(join(ROOT, path), "utf8");
      for (const { pattern, why } of WITHDRAWN) {
        const match = text.match(pattern);
        if (match) offenders.push(`${path}: "${match[0]}" — ${why}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("the canonical doc states that a CI step should fail on 2", () => {
    const versioning = readFileSync(join(ROOT, "docs/VERSIONING.md"), "utf8");
    expect(versioning).toMatch(/Exit code 2 is not a pass/);
    expect(versioning).toMatch(/\*\*fail\*\*/);
    // The numbers must not drift while the semantics were being corrected.
    for (const code of ["`0`", "`1`", "`2`", "`10`", "`20`"]) {
      expect(versioning, code).toContain(code);
    }
  });

  it("the site reference and the canonical doc agree", () => {
    const site = readFileSync(
      join(ROOT, "site/reference/exit-codes.md"),
      "utf8",
    );
    expect(site).toMatch(/Treat as failure/);
    expect(site).toMatch(/no flag turns an incomplete run into\s+exit `0`/i);
  });

  it("every surface that publishes an exit table says `2` fails, not just the canonical doc", () => {
    // The withdrawn wording is only half the risk: a surface can be
    // perfectly silent about `2` and still read as a pass by omission. The
    // README is the most-read exit table in the repository, so its `2` row
    // has to carry the verdict, not just the state.
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    const row = readme.split("\n").find((l) => /^\|\s*`2`\s*\|/.test(l));
    expect(
      row,
      "README.md no longer publishes an exit table row for `2`",
    ).toBeDefined();
    if (row === undefined) return;
    expect(
      row,
      "README.md's exit-2 row does not say a CI step fails — the law in " +
        "docs/VERSIONING.md says `2` is inconclusive and a gate must fail on it",
    ).toMatch(/fail/i);
    expect(
      row,
      "README.md's exit-2 row no longer names the inconclusive state",
    ).toMatch(/inconclusive/i);
  });
});
