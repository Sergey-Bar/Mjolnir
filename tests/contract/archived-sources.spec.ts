/**
 * The archived second sources of truth stay archived, and the pointer at each
 * old path still resolves.
 *
 * A move is a one-time edit. What a move does not do is stop somebody
 * re-creating the file at the root, or stop the pointer rotting into a
 * dangling link — and either of those puts a document nobody reads back at
 * the path a reader will find first, which is the defect the move fixed.
 *
 * `GAP-V6-007` / `-008`: `PRODUCT-ENHANCEMENT-ANALYSIS.md` and
 * `QA/FINAL-RELEASE/` were release-certification documents that no gate read,
 * at the paths a reader finds first. They are the only record of what was
 * believed and why it turned out to be wrong, so they are kept — under
 * `docs/archive/`, with a header that says so.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");

const ARCHIVED = [
  {
    oldPath: "PRODUCT-ENHANCEMENT-ANALYSIS.md",
    archive: "docs/archive/PRODUCT-ENHANCEMENT-ANALYSIS.md",
    gap: "GAP-V6-007",
  },
  {
    oldPath: "QA/FINAL-RELEASE",
    archive: "docs/archive/QA-FINAL-RELEASE",
    gap: "GAP-V6-008",
  },
];

function contentSize(path: string): number {
  const stats = statSync(path);
  if (!stats.isDirectory()) return stats.size;
  return readdirSync(path).length;
}

describe("the ungated second sources of truth stay archived", () => {
  for (const { archive, gap } of ARCHIVED) {
    it(`${gap}: ${archive} exists and the record is intact`, () => {
      const archived = join(ROOT, archive);
      expect(existsSync(archived), `${archive} is missing`).toBe(true);
      // A moved directory must not be empty: the whole point of keeping it is
      // that it is the record of what was believed and why it was wrong, and an
      // empty one is a tombstone.
      expect(
        contentSize(archived),
        `${archive} is empty — a superseded record with no content is a tombstone`,
      ).toBeGreaterThan(0);
    });
  }

  it("the pointer left at the old path names the archive and disclaims itself", () => {
    // The file stays because `CHANGELOG.md` and `docs/CLAIM-LINT-REPORT.json`
    // cite the old path, and a dangling citation is what `npm run script:paths`
    // refuses. A pointer that does not resolve is the same defect in a new
    // place, and a pointer that does not disclaim itself is a worse second
    // source of truth than the file it replaced.
    const pointer = join(ROOT, "PRODUCT-ENHANCEMENT-ANALYSIS.md");
    expect(existsSync(pointer), "the old path has no pointer").toBe(true);
    const text = readFileSync(pointer, "utf8");
    expect(text).toContain("docs/archive/PRODUCT-ENHANCEMENT-ANALYSIS.md");
    expect(text).toMatch(/not a current claim/i);
  });

  it("the archived file is the original text, not a rewritten summary", () => {
    // Asserted because the tempting wrong move is to "tidy" the archived copy
    // into a summary. The record is valuable precisely because it is what was
    // written, including the parts that turned out to be wrong.
    const text = readFileSync(
      join(ROOT, "docs", "archive", "PRODUCT-ENHANCEMENT-ANALYSIS.md"),
      "utf8",
    );
    expect(text.length).toBeGreaterThan(10_000);
    expect(text).not.toMatch(/not a current claim/i);
  });
});
