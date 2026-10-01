/**
 * The concept vocabulary's two invariants.
 *
 * `src/certification/concepts.ts` is GENERATED from the rule registry by
 * `scripts/generate-concepts.ts`, COMMITTED for review, and verified here. The
 * registry is the authority; the table is a claim about it. A generated file
 * nobody checks is a snapshot, and a snapshot of a rule registry is wrong the
 * moment someone adds a rule.
 *
 * Two directions, because both fail differently:
 *
 *   - every live rule is claimed by at least one concept. A rule in no
 *     concept is a failure mode the certification matrix cannot count, so it
 *     would be silently outside every denominator — and a denominator with a
 *     hole in it is the §5.3 problem in miniature.
 *   - every rule the table names exists. A fictional rule ID is a row that
 *     looks like evidence and cannot be re-attached to anything.
 *
 * The count is asserted as a FLOOR rather than an equality, for the same
 * reason the census sweep uses one: a vocabulary that has silently emptied
 * itself passes an exact match just as happily as one that has silently lost
 * every rule it used to cover.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CONCEPT_IDS,
  CONCEPTS,
  CONCEPTS_BY_RULE,
  conceptOf,
} from "../../src/certification/concepts.js";
import { RETIRED_RULE_IDS, RULES } from "../../src/rules/index.js";

const ROOT = resolve(import.meta.dirname, "..", "..");
const LIVE_RULE_IDS = new Set(
  RULES.map((r) => (r as unknown as { id: string }).id).sort(),
);

/** A vocabulary that has lost most of its rules is a bug, not a migration. */
const CONCEPT_FLOOR = 50;
const RULE_FLOOR = 70;

describe("the concept vocabulary covers the registry, and claims nothing else", () => {
  it("claims every live rule at least once", () => {
    const unclaimed = [...LIVE_RULE_IDS]
      .filter((id) => !CONCEPTS_BY_RULE.has(id))
      .sort();
    expect(
      unclaimed,
      "these live rules are in no concept, so the certification matrix " +
        "cannot count them — and a denominator with an uncounted member " +
        "reports a percentage that is higher than the truth",
    ).toEqual([]);
  });

  it("names no rule that does not exist", () => {
    const retired = new Set(RETIRED_RULE_IDS);
    const fictional: string[] = [];
    for (const concept of CONCEPT_IDS) {
      for (const rule of CONCEPTS[concept]?.rules ?? []) {
        if (LIVE_RULE_IDS.has(rule) || retired.has(rule)) continue;
        fictional.push(`${concept} -> ${rule}`);
      }
    }
    expect(
      fictional,
      "a concept names a rule the registry does not have and the retired " +
        "list does not either — a row that looks like evidence and cannot be " +
        "re-attached to anything",
    ).toEqual([]);
  });

  it("has not emptied itself", () => {
    // Floors, not equalities. A table that silently lost its contents is the
    // failure a floor catches and an equality accepts.
    expect(
      CONCEPT_IDS.length,
      "the concept vocabulary has collapsed — a certification surface with " +
        "no cells is a 100% surface by division",
    ).toBeGreaterThanOrEqual(CONCEPT_FLOOR);
    expect(LIVE_RULE_IDS.size).toBeGreaterThanOrEqual(RULE_FLOOR);
    const claimed = CONCEPTS_BY_RULE.size;
    expect(claimed).toBeGreaterThanOrEqual(RULE_FLOOR);
  });

  it("every concept has a title and at least one rule", () => {
    const empty: string[] = [];
    for (const concept of CONCEPT_IDS) {
      const entry = CONCEPTS[concept];
      if (entry === undefined) continue;
      if (entry.title.trim() === "" || entry.rules.length === 0) {
        empty.push(concept);
      }
    }
    expect(
      empty,
      "a concept with no title or no rules is a heading over nothing — the " +
        "same defect as an empty help section",
    ).toEqual([]);
  });

  it("conceptOf is consistent with the index", () => {
    for (const [rule, concepts] of CONCEPTS_BY_RULE) {
      const first = conceptOf(rule);
      expect(first, `${rule}'s first concept`).toBe(concepts[0]);
    }
    expect(conceptOf("QA-NOT-A-RULE")).toBeUndefined();
    // And a retired rule claims nothing, which is what §6.4's
    // `(oldRuleId, legacyArm)` re-attachment exists to handle.
    for (const retired of RETIRED_RULE_IDS) {
      expect(
        conceptOf(retired),
        `${retired} is retired but a live concept still claims it — a ` +
          "retired rule must not appear in a current denominator",
      ).toBeUndefined();
    }
  });

  it("the committed table still matches what the generator derives", () => {
    // The regeneration check. It compares FORMATTED text, not raw generator
    // output, because `npm run format` rewrites the committed file and a
    // byte-for-byte comparison against unformatted output fails on formatting
    // alone — which is how a drift check gets switched off.
    //
    // Same discipline as `docs:provenance-drift`: content only, formatting
    // excluded. The first version compared raw bytes and failed on a file
    // whose CONTENT was current.
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-concepts-"));
    try {
      const derived = join(dir, "concepts.ts");
      execFileSync(
        process.execPath,
        [
          join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
          "scripts/generate-concepts.ts",
          "--write",
          "--out",
          derived,
        ],
        { cwd: ROOT, encoding: "utf8" },
      );
      execFileSync(
        process.execPath,
        [
          join(ROOT, "node_modules", "prettier", "bin", "prettier.cjs"),
          "--write",
          derived,
        ],
        { cwd: ROOT, encoding: "utf8" },
      );
      expect(
        readFileSync(join(ROOT, "src", "certification", "concepts.ts"), "utf8"),
        "src/certification/concepts.ts is stale — regenerate it with " +
          "`npx tsx scripts/generate-concepts.ts --write` and review the " +
          "diff. A generated table nobody regenerates is a snapshot, and a " +
          "snapshot of a rule registry is wrong the moment someone adds a rule",
      ).toBe(readFileSync(derived, "utf8"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
