/**
 * P0-5 / Task 3.1 — the fixture quad is READ, in one place, by both resolvers.
 *
 * Two independent answers to "does this rule have a fixture quad" existed, one
 * in `capability-registry.ts` and one in `ecosystem-probe.ts`. The first was a
 * function whose body was `return false`; the second was a directory-size
 * proxy (four or more files in a fixture folder) that answered a different
 * question — how big is the fixture, not what does the rule do with it. Two
 * answers to one question is two truths, and fixing one without the other
 * leaves the census and the registry disagreeing about the same capability.
 *
 * The tests below assert the three things that make the shared answer real:
 * the legs are read from the filesystem, an incomplete quad is NOT a quad, and
 * the two resolvers agree — which is the property the split version could not
 * have had.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  QUAD_LEGS,
  capabilityQuadComplete,
  quadCensus,
  quadFor,
  ruleHasCompleteQuad,
} from "../../src/v6/fixture-quad-probe.js";
import { RULES } from "../../src/rules/index.js";

const scratch: string[] = [];

afterEach(() => {
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * A tree with the legs a rule can have.
 *
 * Built leg by leg rather than by copying a real fixture directory, because the
 * property under test is WHICH legs are read, and a realistic copy would let a
 * test pass for a reason that has nothing to do with the leg it names.
 */
function treeWith(legs: readonly string[]): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-quad-"));
  scratch.push(dir);
  for (const leg of legs) {
    if (leg === "MUST-FIRE") {
      mkdirSync(
        join(dir, "tests", "corpus", "positive-fixtures", "QA-TEST-001"),
        {
          recursive: true,
        },
      );
      writeFileSync(
        join(
          dir,
          "tests",
          "corpus",
          "positive-fixtures",
          "QA-TEST-001",
          "fixture.ts",
        ),
        "export const x = 1;\n",
        "utf8",
      );
    }
    if (leg === "MUST-NOT-FIRE") {
      mkdirSync(
        join(dir, "tests", "corpus", "negative-fixtures", "QA-TEST-001"),
        {
          recursive: true,
        },
      );
      writeFileSync(
        join(
          dir,
          "tests",
          "corpus",
          "negative-fixtures",
          "QA-TEST-001",
          "clean.ts",
        ),
        "export const y = 2;\n",
        "utf8",
      );
    }
    if (leg === "RECALL") {
      mkdirSync(join(dir, "tests", "corpus", "verdicts"), { recursive: true });
      writeFileSync(
        join(dir, "tests", "corpus", "verdicts", "QA-TEST-001.jsonl"),
        JSON.stringify({
          fixture: "positive-fixtures/QA-TEST-001",
          ruleId: "QA-TEST-001",
          verdict: "TP",
        }) + "\n",
        "utf8",
      );
    }
    if (leg === "PRECISION") {
      mkdirSync(join(dir, "tests", "corpus", "verdicts"), { recursive: true });
      writeFileSync(
        join(dir, "tests", "corpus", "verdicts", "QA-TEST-001-fp.jsonl"),
        JSON.stringify({
          fixture: "negative-fixtures/QA-TEST-001",
          ruleId: "QA-TEST-001",
          verdict: "TN",
        }) + "\n",
        "utf8",
      );
    }
  }
  return dir;
}

describe("the quad is four legs, and all four are read from the tree", () => {
  it("an empty tree satisfies nothing", () => {
    const report = quadFor("QA-TEST-001", treeWith([]));
    expect(report.present).toEqual([]);
    expect(report.missing).toEqual([...QUAD_LEGS]);
    expect(report.complete).toBe(false);
  });

  it("each leg is added by the artifact that supplies it", () => {
    // One leg at a time, so a test cannot pass because a tree happened to
    // contain every leg while the one under test was read wrong.
    for (const leg of QUAD_LEGS) {
      const report = quadFor("QA-TEST-001", treeWith([leg]));
      expect(report.present, leg).toEqual([leg]);
      expect(report.complete, leg).toBe(false);
    }
  });

  it("three legs are not four", () => {
    const report = quadFor(
      "QA-TEST-001",
      treeWith(["MUST-FIRE", "MUST-NOT-FIRE", "RECALL"]),
    );
    expect(report.present).toHaveLength(3);
    expect(report.complete).toBe(false);
    expect(report.missing).toEqual(["PRECISION"]);
  });

  it("all four is the only complete state", () => {
    const report = quadFor("QA-TEST-001", treeWith(QUAD_LEGS));
    expect(report.complete).toBe(true);
    expect(ruleHasCompleteQuad("QA-TEST-001", treeWith(QUAD_LEGS))).toBe(true);
  });

  it("a false positive on the negative fixture withholds PRECISION", () => {
    // The leg that makes the negative fixture worth having: silence has to be
    // CHECKED, not assumed. A rule that fires on a clean fixture has not
    // demonstrated precision, whatever its other three legs say.
    const dir = treeWith(["MUST-FIRE", "MUST-NOT-FIRE", "RECALL"]);
    writeFileSync(
      join(dir, "tests", "corpus", "verdicts", "QA-TEST-001-fp.jsonl"),
      JSON.stringify({
        fixture: "negative-fixtures/QA-TEST-001",
        ruleId: "QA-TEST-001",
        verdict: "FP",
      }) + "\n",
      "utf8",
    );
    const report = quadFor("QA-TEST-001", dir);
    expect(report.present).not.toContain("PRECISION");
    expect(report.complete).toBe(false);
  });

  it("an empty fixture directory is not a fixture", () => {
    // `existsSync(dir)` alone would call an empty folder a leg; the census's
    // old proxy made exactly that mistake at directory granularity.
    const dir = treeWith([]);
    mkdirSync(
      join(dir, "tests", "corpus", "positive-fixtures", "QA-TEST-001"),
      {
        recursive: true,
      },
    );
    expect(quadFor("QA-TEST-001", dir).present).not.toContain("MUST-FIRE");
  });

  it("an unreadable tree is a failure, not a pass", () => {
    // A path that does not exist is the shape of a fresh clone without a
    // corpus, and it must read as "no legs", never as "all legs".
    const report = quadFor(
      "QA-TEST-001",
      join(tmpdir(), "mjolnir-quad-absent-xyz"),
    );
    expect(report.complete).toBe(false);
    expect(report.present).toEqual([]);
  });
});

describe("the capability basis is `some`, and it says so", () => {
  it("one complete rule out of many is enough, and the ratio is published", () => {
    const dir = treeWith(QUAD_LEGS);
    // `QA-TEST-001` has all four; `QA-TEST-002` has none. `some` is the basis
    // BOTH resolvers use, and it is named in one place because the first
    // version had the census side on `every`: the registry then advertised M3
    // through one rule while the census called the same capability unverified,
    // and with `maturity` sourced from the census that surfaces as a spurious
    // OVER_CLAIMED_MATURITY — the exact split this module was extracted to end.
    expect(capabilityQuadComplete(["QA-TEST-001"], dir)).toBe(true);
    expect(capabilityQuadComplete(["QA-TEST-002", "QA-TEST-001"], dir)).toBe(
      true,
    );
    expect(capabilityQuadComplete(["QA-TEST-002"], dir)).toBe(false);
  });

  it("an empty rule list is false, not vacuously true", () => {
    // The shape of defect the whole file is about: absence read as a pass.
    expect(capabilityQuadComplete([], treeWith(QUAD_LEGS))).toBe(false);
  });
});

describe("the shipped tree is measured, not assumed", () => {
  it("the census covers every live rule and names what is missing", () => {
    const census = quadCensus(process.cwd());
    expect(census).toHaveLength(RULES.length);
    // A rule with a complete quad must not also be listed as missing a leg —
    // the two lists are computed from one pass and disagreeing would mean one
    // of them is stale.
    for (const row of census) {
      expect(
        row.present.filter((leg) => row.missing.includes(leg)),
        row.ruleId,
      ).toEqual([]);
    }
  });

  it("a fixture directory is no longer the answer", () => {
    // The census's old proxy accepted any fixture directory holding four or
    // more files. QA-CS-102 has one file and a real negative, so under the
    // proxy it had no quad at all; under the real legs it has three of four.
    // The assertion is that the report names the missing leg — a directory
    // count could never do that.
    const report = quadFor("QA-CS-102", process.cwd());
    expect(report.present).toContain("MUST-FIRE");
    expect(report.missing.length).toBeGreaterThan(0);
  });
});
