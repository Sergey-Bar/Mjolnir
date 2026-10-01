/**
 * The two facts about a rule's fixtures that were previously conflated, and
 * the set of rule pages that must exist.
 *
 * Two separate claims live here because they are two separate defects.
 *
 * **The `docs/rules/` set.** The generator writes a page per rule and never
 * prunes, so retired rules accumulate (101 files against 79 live rules and 22
 * retired ids). Retired pages are kept deliberately — they are the record of
 * what the tool used to claim — so the assertion is on the SET, not on the
 * count. A page for a rule that no longer exists and is not in the retirement
 * record is an orphan that will never be regenerated and never be reviewed.
 *
 * **The fixture columns.** `recallFixtures` counted the files in a rule's own
 * fixture directory and sat in a column headed "recall" next to a hardcoded
 * `UNCLASSIFIED` — an artifact counting its own input tree, in a field whose
 * name said it measured something else. The field is now
 * `positiveFixtureCount` and the assertion is that it equals what is on disk,
 * row by row, so a generator that stops reading the tree fails.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { RETIRED_RULE_IDS, RULES } from "../../src/rules/index.js";
import {
  capabilityQuadComplete,
  quadCensus,
  quadFor,
} from "../../src/v6/fixture-quad-probe.js";

const ROOT = join(import.meta.dirname, "..", "..");
const RULES_DOCS = join(ROOT, "docs", "rules");
const MATRIX = join(ROOT, "docs", "RULE-CAPABILITY-MATRIX.json");
const FIXTURE_FILE = /\.(?:ts|tsx|js|mjs|cjs|py|java|cs|ya?ml|json)$/;

function matrixRows(): Array<{
  id: string;
  recall: string;
  positiveFixtureCount: number;
  recallStatus: string;
}> {
  const parsed = JSON.parse(readFileSync(MATRIX, "utf8")) as {
    rules: Array<{
      id: string;
      recall: string;
      positiveFixtureCount: number;
      recallStatus: string;
    }>;
  };
  return parsed.rules;
}

function countFixtureFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) total += countFixtureFiles(path);
    else if (FIXTURE_FILE.test(entry.name)) total += 1;
  }
  return total;
}

describe("docs/rules/ is exactly the live rules plus the retirement record", () => {
  const live = RULES.map((rule) => rule.id);
  const retired = [...RETIRED_RULE_IDS];
  const expected = new Set([...live, ...retired]);

  /**
   * Rule pages only.
   *
   * `README.md` is the directory's index, not a rule — and excluding it is
   * itself asserted below, because a filter that silently drops a file is the
   * shape of thing this file exists to catch.
   */
  function rulePages(): string[] {
    return readdirSync(RULES_DOCS)
      .filter((name) => name.endsWith(".md") && name !== "README.md")
      .map((name) => name.replace(/\.md$/, ""));
  }

  it("the index the filter excludes is real and is not a rule page", () => {
    expect(existsSync(join(RULES_DOCS, "README.md"))).toBe(true);
    expect(live).not.toContain("README");
  });

  it("every live rule has a page", () => {
    const pages = new Set(rulePages());
    const missing = live.filter((id) => !pages.has(id));
    expect(missing, "live rules with no doc page").toEqual([]);
  });

  it("no page exists for a rule that is neither live nor retired", () => {
    // The orphan. The generator writes and never prunes, so a renamed or
    // deleted rule leaves a page nothing will ever regenerate — and nothing
    // will ever review. Retired pages are kept on purpose and named in
    // `RETIRED_RULE_IDS`; an unnamed page is neither.
    const orphans = rulePages().filter((id) => !expected.has(id));
    expect(
      orphans,
      "pages with no rule behind them — add the id to RETIRED_RULE_IDS if it was " +
        "deliberately retired, or delete the page",
    ).toEqual([]);
  });

  it("the count is the union, not a coincidence", () => {
    // Asserting the equality of the sets is the property; this asserts the
    // arithmetic behind it, so a failure says which side moved.
    expect(RULES.length + retired.length).toBe(expected.size);
    expect(rulePages().length).toBe(expected.size);
  });
});

describe("the fixture columns say what they observe", () => {
  it("the count column equals the directory on disk, row by row", () => {
    const rows = matrixRows();
    // The fixture must not be vacuous: a matrix with no rules would make this
    // loop a no-op and the test green for the wrong reason.
    expect(rows.length).toBe(RULES.length);
    for (const row of rows) {
      const dir = join(ROOT, "tests", "corpus", "positive-fixtures", row.id);
      expect(
        row.positiveFixtureCount,
        `${row.id} on disk has ${countFixtureFiles(dir)}`,
      ).toBe(countFixtureFiles(dir));
    }
  });

  it("recall is never a number", () => {
    // A directory listing is not a measurement. The first version had a
    // `recallFixtures` count sitting beside this column, and a reader had no
    // way to tell which of the two was the claim.
    for (const row of matrixRows()) {
      expect(row.recall, row.id).toBe("UNCLASSIFIED");
      expect(typeof row.recallStatus, row.id).toBe("string");
    }
  });

  it("no column is named after the measurement it does not make", () => {
    // A field called "recall fixtures" reads as evidence ABOUT recall. If one
    // reappears under that name, this is what notices.
    const keys = Object.keys(
      (JSON.parse(readFileSync(MATRIX, "utf8")) as { rules: object[] })
        .rules[0] ?? {},
    );
    expect(
      keys.filter((k) => /recall/i.test(k) && /count|fixture/i.test(k)),
    ).toEqual([]);
  });
});

describe("the quad is measured, and its work list is a list", () => {
  it("every live rule has a quad report naming what is missing", () => {
    const reports = RULES.map((rule) => quadFor(rule.id, ROOT));
    expect(reports).toHaveLength(RULES.length);
    for (const report of reports) {
      // A rule with a complete quad must not also be listed as missing a
      // leg — both lists come from one pass, so disagreeing would mean one is
      // stale.
      expect(
        report.present.filter((leg) => report.missing.includes(leg)),
        report.ruleId,
      ).toEqual([]);
    }
  });

  it("rules with a complete quad are MEASURED, and any are named", () => {
    // 6.1 raised this from zero: `npm run check-fixture-quad --verdicts` executes the
    // scanner over every rule's own fixture and records what it did, so 19 rules
    // now hold all four legs. The first version of this test asserted the count
    // was 0 and was asserting a fact about the world rather than about the
    // code; it failed the day the evidence arrived, which is the right failure
    // and the wrong assertion.
    //
    // What is asserted is the SHAPE: every rule's quad is measured, and the
    // ones that are complete can be named. A test that pins a number here
    // re-freezes the very claim the ratchet exists to move.
    const complete = RULES.filter((rule) => quadFor(rule.id, ROOT).complete);
    const census = quadCensus(ROOT);
    expect(census).toHaveLength(RULES.length);
    expect(
      census.filter((report) => report.complete).length,
      "the census and a per-rule recount disagree — one of them is reading a " +
        "different tree",
    ).toBe(complete.length);
    for (const rule of complete) {
      const report = quadFor(rule.id, ROOT);
      expect(report.missing, rule.id).toEqual([]);
    }
  });

  it("a complete quad means executed verdicts, not a ticked box", () => {
    // Two kinds of provenance, and the difference matters:
    //
    //   - a row in `tests/corpus/verdicts/<repo>.jsonl` — a verdict on REAL
    //     third-party code. The strongest evidence available.
    //   - a row in `tests/corpus/verdicts/quad/<ruleId>.jsonl` — generated by
    //     EXECUTING the scanner over the rule's own fixture. It proves the rule
    //     is wired and directional; it does NOT prove the false-positive rate
    //     on real code, which is `MEASURED_FP`'s separate axis.
    //
    // What both share is that a person did not type "true". The first version
    // of this test required a `quad/` file for every rule with RECALL, which
    // would have failed a rule whose recall came from the real corpus — the
    // better evidence treated as missing.
    const quadFile = (ruleId: string): string =>
      join(ROOT, "tests", "corpus", "verdicts", "quad", `${ruleId}.jsonl`);
    for (const rule of RULES) {
      if (!quadFor(rule.id, ROOT).complete) continue;
      const file = quadFile(rule.id);
      // No per-rule file means its recall came from the corpus, which is
      // allowed and is checked by the census-drift sweep.
      if (!existsSync(file)) continue;
      const rows = readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as { verdict: string; note: string });
      expect(
        rows.every((row) => row.note.includes("executed:")),
        `${rule.id} has a quad verdict that does not name the run that produced it`,
      ).toBe(true);
    }
  });

  it("the capability basis is `some`, and it is the shared helper", () => {
    // A capability with rules but no complete quad is not verified, and an
    // EMPTY rule list is not vacuously verified — the direction that would
    // read absence as a pass.
    expect(capabilityQuadComplete([])).toBe(false);
    expect(capabilityQuadComplete([RULES[0]?.id ?? ""])).toBe(false);
  });
});
