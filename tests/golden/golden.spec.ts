/**
 * Golden-repo regression test (Product-MVP §18.2, Sprint-Plan S4).
 *
 * The golden repo is a frozen synthetic repo under tests/golden/.
 * Expected findings are stored PER RULE ID (not just total score) so
 * adding a new rule doesn't break the gate — the expectations are
 * regenerated in the same PR that adds the rule, with an explicit diff.
 *
 * Bug-audit H4/G3: generation and verification share ONE scan code
 * path (harness.ts) — the committed lock can no longer be measured on
 * a different path than the one checking it — and a crashing rule is a
 * hard failure on both sides.
 *
 * Regenerate:  npm run golden:update   (writes golden-expected.json)
 * Verify:      npm test (this file)
 */

import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { scanGolden } from "./harness.js";

const HERE = import.meta.dirname;
const GOLDEN_ROOT = join(HERE, "repo");
const EXPECTED_PATH = join(HERE, "golden-expected.json");

interface ExpectedEntry {
  /** ruleId → count of findings in this file. */
  [file: string]: Record<string, number>;
}

describe("golden repo score lock", () => {
  it("expectations file exists (run GOLDEN_UPDATE=1 to create)", () => {
    expect(EXPECTED_PATH, "Run `npm run golden:update` once").toBeDefined();
    expect(scanGolden(GOLDEN_ROOT).expectations).toBeTruthy();
  });

  it("findings match locked expectations exactly", () => {
    const expected: ExpectedEntry = JSON.parse(
      readFileSync(EXPECTED_PATH, "utf8"),
    );
    const { expectations, crashed } = scanGolden(GOLDEN_ROOT);
    // Bug-audit G3: a crashing rule used to be swallowed on BOTH sides —
    // mutually consistent, therefore invisible. A crash is now a failure.
    expect(
      crashed,
      "no rule may crash while measuring the golden lock",
    ).toEqual([]);
    expect(expectations).toEqual(expected);
  });

  it("no rule crashes on the golden corpus", () => {
    const { crashed } = scanGolden(GOLDEN_ROOT);
    expect(crashed).toEqual([]);
  });

  it("the generator reproduces the committed expectations byte-for-byte (gen↔verify parity, H4)", async () => {
    // Both sides run through the same scanGolden() harness; this test
    // proves the whole generate pipeline (gen.ts main) still writes
    // exactly what the committed lock contains.
    const { main } = await import("./gen.js");
    const tmpPath = join(HERE, "parity-check.tmp.json");
    try {
      main(tmpPath);
      const regenerated = readFileSync(tmpPath, "utf8");
      const committed = readFileSync(EXPECTED_PATH, "utf8");
      expect(regenerated).toBe(committed);
    } finally {
      rmSync(tmpPath, { force: true });
    }
  });
});
