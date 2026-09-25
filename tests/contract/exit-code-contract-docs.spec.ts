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

/** Phrasings that reinstate "an incomplete analysis is fine". */
const WITHDRAWN: ReadonlyArray<{ pattern: RegExp; why: string }> = [
  {
    pattern: /partial[^.\n|]{0,40}\(?never blocks\)?/i,
    why: "exit 2 is inconclusive, not a pass",
  },
  {
    pattern: /`2`[^.\n|]{0,40}partial[^.\n|]{0,30}advisory/i,
    why: "advisory suppresses findings, not an unfinished analysis",
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
  "README.br.md",
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
});
