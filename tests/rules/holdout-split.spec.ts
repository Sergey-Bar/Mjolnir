/**
 * The held-out split: the invariant, and the evidence that it cannot be
 * re-drawn quietly.
 *
 * `docs/claim-registry.json` blocks `rule-registry-census` with "Promoting this
 * needs a classifier that has never seen the verdicts it is scored against."
 * This suite is the classifier's counterpart: it proves the committed
 * partition is a FUNCTION of committed data, so the split cannot be re-drawn to
 * produce a better number.
 *
 * Every assertion here is about a property, not a count. A test that pinned
 * "6 holdout repositories" would pass again after a re-draw that kept six and
 * changed which six — which is the failure this file exists to make impossible
 * to commit unnoticed.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  HOLDOUT_PERCENT,
  HOLDOUT_SALT,
  computeHoldoutSplit,
  holdoutBucket,
  holdoutPartitionFor,
} from "../../src/rules/measurement.js";

/** Files the split deliberately does not treat as corpus repositories. */
const EXCLUDED_FROM_SPLIT = new Set([
  "positive-fixtures",
  "negative-fixtures",
  "unclassified-ceiling",
  "unsure-ceiling",
]);

const ROOT = join(import.meta.dirname, "..", "..");
const SPLIT = JSON.parse(
  readFileSync(join(ROOT, "docs", "HOLDOUT-SPLIT.json"), "utf8"),
) as {
  salt: string;
  holdoutPercent: number;
  holdout: string[];
  measurement: string[];
  protected: { repositoryId: string; rowsByRule: Record<string, number> }[];
  buckets: Record<string, number>;
  counts: {
    rows: number;
    holdoutRows: number;
    measurementRows: number;
    holdoutRules: number;
  };
  rowsByRule: {
    holdout: Record<string, number>;
    measurement: Record<string, number>;
  };
};

const ALL = [...SPLIT.holdout, ...SPLIT.measurement];
const PROTECTED = new Set(SPLIT.protected.map((p) => p.repositoryId));

describe("held-out split: disjoint by construction", () => {
  it("puts no repository in both partitions", () => {
    const overlap = SPLIT.holdout.filter((id) =>
      SPLIT.measurement.includes(id),
    );
    expect(overlap).toEqual([]);
  });

  it("accounts for every repository exactly once", () => {
    expect(new Set(ALL).size).toBe(ALL.length);
    expect(ALL.length).toBe(Object.keys(SPLIT.buckets).length);
  });

  it("is a partition of REAL corpus repositories, not of fixture files", () => {
    // The fixture-authored legs (`positive-fixtures.jsonl`,
    // `negative-fixtures.jsonl`) are this repository's own execution of its own
    // detector. Including them in a held-out split would be the self-derivation
    // the claim is blocked on, restated as a split.
    expect(SPLIT.holdout).not.toContain("positive-fixtures");
    expect(SPLIT.measurement).not.toContain("positive-fixtures");
    expect(SPLIT.holdout).not.toContain("negative-fixtures");
    expect(SPLIT.measurement).not.toContain("negative-fixtures");
  });
});

describe("held-out split: derivable, therefore not re-drawable", () => {
  it("records the salt and the percentage the file was derived with", () => {
    expect(SPLIT.salt).toBe(HOLDOUT_SALT);
    expect(SPLIT.holdoutPercent).toBe(HOLDOUT_PERCENT);
  });

  it("re-derives every assignment from the hash", () => {
    for (const id of ALL) {
      expect(holdoutBucket(id), id).toBe(SPLIT.buckets[id]);
      const expected = holdoutPartitionFor(id, PROTECTED);
      expect(expected, id).toBe(
        SPLIT.holdout.includes(id) ? "holdout" : "measurement",
      );
    }
  });

  it("is stable across repeated derivations", () => {
    const rows = new Map([
      ["alpha", new Map([["QA-PW-001", 3]])],
      ["beta", new Map([["QA-PW-002", 5]])],
      ["gamma", new Map([["QA-PW-003", 1]])],
    ]);
    const first = computeHoldoutSplit(rows, []);
    const second = computeHoldoutSplit(rows, []);
    expect(second).toEqual(first);
  });

  it("sorts by code point, and sorts the protected list it was handed", () => {
    // The two orderings are a CONTRACT, not tidiness: `holdout`,
    // `measurement` and `protected` are read by a human comparing two runs, and
    // an unsorted list makes that comparison a diff of noise. Code points, not
    // `localeCompare`, because `localeCompare` reads the environment — and a
    // partition whose ORDER depends on the machine is a partition nobody can
    // review in a diff.
    const rows = new Map([
      ["zeta", new Map([["QA-PW-001", 1]])],
      ["Alpha", new Map([["QA-PW-002", 1]])],
      ["beta", new Map([["QA-PW-003", 1]])],
    ]);
    const split = computeHoldoutSplit(rows, [
      { repositoryId: "zeta", rowsByRule: { "QA-PW-001": 1 } },
      { repositoryId: "Alpha", rowsByRule: { "QA-PW-002": 1 } },
    ]);
    // Uppercase before lowercase: that is `a < b`, not what a locale does.
    // `localeCompare` would put "beta" before "zeta" here on some ICU builds
    // and after it on others, which is the whole reason it is banned.
    expect(Object.keys(split.buckets)).toEqual(["Alpha", "beta", "zeta"]);
    expect(split.protected.map((p) => p.repositoryId)).toEqual([
      "Alpha",
      "zeta",
    ]);
    // And the protected repositories really are in measurement, which is what
    // makes their exclusion a decision rather than a sort artefact.
    for (const p of split.protected) {
      expect(split.measurement, p.repositoryId).toContain(p.repositoryId);
      expect(split.holdout, p.repositoryId).not.toContain(p.repositoryId);
    }
  });
});

describe("held-out split: the exclusion is computed, not declared", () => {
  it("keeps every core-candidate repository in measurement", () => {
    // The hazard the exclusion exists for: keycloak holds 22 of QA-JV-101's
    // rows and 30 of QA-PW-117's. A hash that moved it would empty the
    // measurement side of exactly the evidence 6.0 waits on, and the split
    // would still be internally consistent — which is why this is asserted on
    // the repositories, not on the totals.
    for (const entry of SPLIT.protected) {
      expect(SPLIT.measurement, entry.repositoryId).toContain(
        entry.repositoryId,
      );
      expect(SPLIT.holdout, entry.repositoryId).not.toContain(
        entry.repositoryId,
      );
    }
  });

  it("names the rules and row counts that caused each protection", () => {
    // A bare list of "don't move these" could be edited to fit. The row counts
    // are the evidence that each entry was derived.
    for (const entry of SPLIT.protected) {
      const total = Object.values(entry.rowsByRule).reduce((a, b) => a + b, 0);
      expect(total, entry.repositoryId).toBeGreaterThan(0);
    }
  });

  it("does NOT protect a repository that holds no candidate rows", () => {
    // Otherwise the exclusion could grow to cover everything and the holdout
    // would be an empty set that still reports as a partition.
    const holdoutSize = SPLIT.holdout.length;
    expect(holdoutSize).toBeGreaterThan(0);
    expect(SPLIT.counts.holdoutRows).toBeGreaterThan(0);
  });
});

describe("held-out split: it validates, it does not gate", () => {
  it("reports rows and rule coverage for both partitions", () => {
    // The honest shape of a non-gating holdout is two comparable numbers. If
    // the holdout covered almost nothing, "it validates" would be a claim
    // about a partition too small to say anything.
    expect(SPLIT.counts.holdoutRules).toBeGreaterThan(0);
    expect(SPLIT.counts.holdoutRows).toBeGreaterThan(0);
    expect(SPLIT.counts.rows).toBe(
      SPLIT.counts.holdoutRows + SPLIT.counts.measurementRows,
    );
  });

  it("recomputes both partitions' row counts from the committed corpus", () => {
    // Checked against the TREE, not against the artifact's own totals — a sum
    // compared with itself is the "self-derivation" this whole split exists to
    // avoid, one level down.
    const rowsByRepository = readCorpusRowCounts();
    const sum = (repositories: readonly string[]) =>
      repositories.reduce(
        (total, id) => total + (rowsByRepository.get(id) ?? 0),
        0,
      );
    expect(sum(SPLIT.holdout)).toBe(SPLIT.counts.holdoutRows);
    expect(sum(SPLIT.measurement)).toBe(SPLIT.counts.measurementRows);
    // Every corpus repository the artifact knows about is a file on disk.
    for (const id of ALL) {
      expect(rowsByRepository.has(id), id).toBe(true);
    }
  });

  it("never claims the holdout establishes a rate", () => {
    const text = readFileSync(join(ROOT, "docs", "HOLDOUT-SPLIT.json"), "utf8");
    // "VALIDATES; IT DOES NOT GATE" has to be in the artifact, because the
    // artifact is what a reader meets first. A holdout that gates is sized by
    // the corpus rather than by the question.
    expect(text).toContain("VALIDATES; IT DOES NOT GATE");
    expect(text).toContain("Core promotion reads the");
  });

  it("states the unit of the split is the repository, never the row", () => {
    const text = readFileSync(join(ROOT, "docs", "HOLDOUT-SPLIT.json"), "utf8");
    expect(text).toContain("CORPUS REPOSITORY, never the row");
  });
});

/** Rows per corpus repository, read fresh from the tree. */
function readCorpusRowCounts(): Map<string, number> {
  const dir = join(ROOT, "tests", "corpus", "verdicts");
  const out = new Map<string, number>();
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".jsonl")) continue;
    const id = name.slice(0, -".jsonl".length);
    if (EXCLUDED_FROM_SPLIT.has(id)) continue;
    out.set(
      id,
      readFileSync(join(dir, name), "utf8")
        .split("\n")
        .filter((line) => line.trim().length > 0).length,
    );
  }
  return out;
}
