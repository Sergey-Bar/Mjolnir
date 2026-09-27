/**
 * The capability matrix must be derived from the tree, not from constants.
 *
 * `recall` was the literal string `"UNCLASSIFIED"` on all 79 rows. A constant
 * carrying no information is worse than a missing field: it reads as
 * "classified as unknown" when it means "nobody wrote this", and a row can
 * never move off it. 6.0 replaces it with three fields — the value (still
 * unmeasured), the must-fire fixture count read from
 * `tests/corpus/positive-fixtures/<id>/`, and whether that directory exists.
 *
 * That is the PRECONDITION for measuring recall, not the measurement. A recall
 * number needs each rule run over its fixtures and the misses counted, which
 * is a corpus run; deriving `0.85` from the existence of a directory would be
 * fabricating the exact evidence this release exists to remove.
 *
 * These assertions therefore check two things: the row is derived, and the
 * derived values match what is on disk right now. Neither requires running a
 * rule.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { RETIRED_RULE_IDS } from "../../src/rules/index.js";

const ROOT = join(import.meta.dirname, "..", "..");
const POSITIVE = join(ROOT, "tests", "corpus", "positive-fixtures");
const FIXTURE_FILE = /\.(?:ts|tsx|js|mjs|cjs|py|java|cs|ya?ml|json)$/;

interface Row {
  id: string;
  category: string;
  recall: string;
  recallFixtures: number;
  recallStatus: string;
  knownLimitations: string;
}

function matrix(): Row[] {
  return (
    JSON.parse(
      readFileSync(join(ROOT, "docs", "RULE-CAPABILITY-MATRIX.json"), "utf8"),
    ) as { rules: Row[] }
  ).rules;
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

describe("recall is a derived field, not a constant", () => {
  it("every row carries the three recall fields", () => {
    for (const row of matrix()) {
      expect(row.recall, row.id).toBeDefined();
      expect(typeof row.recallFixtures, row.id).toBe("number");
      expect(
        ["must-fire-fixtures-present", "no-must-fire-fixture-directory"],
        `${row.id} has recallStatus ${row.recallStatus}`,
      ).toContain(row.recallStatus);
    }
  });

  it("recallFixtures matches the directory on disk, row by row", () => {
    // The anti-constant assertion. If `recallFixtures` were hardcoded, one
    // rule differing from the rest would be enough to catch it.
    for (const row of matrix()) {
      const dir = join(POSITIVE, row.id);
      const onDisk = countFixtureFiles(dir);
      expect(row.recallFixtures, `${row.id} on disk has ${onDisk}`).toBe(
        onDisk,
      );
      expect(row.recallStatus, row.id).toBe(
        existsSync(dir)
          ? "must-fire-fixtures-present"
          : "no-must-fire-fixture-directory",
      );
    }
  });

  it("the two recall fields agree with each other", () => {
    for (const row of matrix()) {
      if (row.recallStatus === "must-fire-fixtures-present") {
        expect(
          row.recallFixtures,
          `${row.id} claims fixtures present but counts none`,
        ).toBeGreaterThan(0);
      } else {
        expect(row.recallFixtures, row.id).toBe(0);
      }
    }
  });

  it("no row claims a recall number while reporting no evidence", () => {
    // A number with no must-fire set is the fabrication this column must not
    // contain. `recall` is a string field precisely so "0.85" cannot be
    // written without a schema change and a decision.
    for (const row of matrix()) {
      expect(typeof row.recall, row.id).toBe("string");
      expect(Number.isNaN(Number(row.recall)), row.id).toBe(true);
    }
  });
});

describe("the fixture corpus and the matrix describe the same rules", () => {
  it("every must-fire fixture directory names a LIVE rule", () => {
    // The first version of this assertion failed on `QA-PW-145`, and the
    // failure was the assertion's fault, not the tree's: `QA-PW-145` is in
    // `RETIRED_RULE_IDS` ("absence of optional a11y coverage is not a
    // defect, n=20"), and `src/rules/index.ts` states that retired fixtures
    // are "preserved in-tree as historical artifacts". So a retired rule's
    // fixture directory is doing exactly what the registry says it does.
    //
    // Asserted precisely: a directory for a retired id is allowed and is
    // NOT counted as recall evidence; a directory for an id that is neither
    // live nor retired is an inconsistency, because nothing in the tree
    // explains it.
    const known = new Set(matrix().map((row) => row.id));
    const retired = new Set<string>(RETIRED_RULE_IDS);
    const unexplained: string[] = [];
    for (const entry of readdirSync(POSITIVE, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".")) continue; // the shared .github corpus
      if (!/^QA-[A-Z]+-\d{3}$/.test(entry.name)) continue;
      if (known.has(entry.name) || retired.has(entry.name)) continue;
      unexplained.push(entry.name);
    }
    expect(
      unexplained,
      `fixture directories for rule ids that are neither live nor retired: ${unexplained.join(", ")}`,
    ).toEqual([]);
  });

  it("a retired rule's preserved fixtures are not counted as live evidence", () => {
    // The other half of the contract above: preserved history must not leak
    // into the measured columns. A retired rule that still has a fixture
    // directory must not acquire a `recallFixtures` count, because a count is
    // a claim about the future.
    const retiredWithFixtures = [...RETIRED_RULE_IDS].filter((id) =>
      existsSync(join(POSITIVE, id)),
    );
    expect(
      retiredWithFixtures.length,
      "no retired rule has fixtures — update this assertion if that changed",
    ).toBeGreaterThan(0);
    for (const row of matrix()) {
      expect(retiredWithFixtures, row.id).not.toContain(row.id);
    }
  });

  it("the matrix is newer than the fixture corpus it describes", () => {
    // A cheap staleness check for the same class of defect the census-drift
    // spec guards elsewhere: a fixture added without re-running the generator
    // leaves `recallFixtures` stale, and nothing else would notice.
    const matrixTime = statSync(
      join(ROOT, "docs", "RULE-CAPABILITY-MATRIX.json"),
    ).mtimeMs;
    let newestFixture = 0;
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else newestFixture = Math.max(newestFixture, statSync(path).mtimeMs);
      }
    };
    walk(POSITIVE);
    expect(
      matrixTime,
      "a fixture changed after the matrix was generated — run `npm run docs:capability`",
    ).toBeGreaterThanOrEqual(newestFixture);
  });
});
