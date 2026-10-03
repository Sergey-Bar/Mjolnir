/**
 * `scripts/verdict-context.mjs` exists to make the remaining 28 unclassified
 * verdict rows CLASSIFIABLE, and these assertions pin the three properties
 * that make it safe to rely on.
 *
 * The immutability is the whole stake. `tests/corpus/verdicts/README.md`
 * makes a committed verdict permanent, so a tool that filled rows in bulk
 * would eventually be wrong about one of them and the error would be
 * unfixable. The tool therefore prints and never writes, and it resolves
 * code at the corpus's PINNED commit rather than at `main` — a verdict about
 * today's `main` is a verdict about different code.
 *
 * These are structural assertions on the source, not behavioural ones that
 * would need the network: the test suite must not depend on reaching GitHub.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const SCRIPT = join(ROOT, "scripts", "verdict-context.mjs");
const source = readFileSync(SCRIPT, "utf8");

describe("the verdict-context tool", () => {
  it("cannot write a verdict", () => {
    // The single most important property. If this regresses, the tool starts
    // committing immutable judgments it did not make.
    expect(source).not.toMatch(
      /writeFileSync|appendFileSync|createWriteStream/,
    );
    expect(source).not.toMatch(
      /\bfetch\([^)]*method:\s*["'](?:POST|PUT|PATCH)/,
    );
  });

  it("resolves code at the corpus's pinned ref, never at a branch name", () => {
    // A verdict about `main` is a verdict about whatever main is today.
    expect(source).toContain("raw.githubusercontent.com");
    // The ref is a hex SHA taken from the committed registry, and it is
    // interpolated where the URL is built — so the URL is
    // owner/repo/<sha>/<path> by construction.
    expect(source).toContain("{m[1]}/${m[2]}/${ref}/");
    // …and the registry is read from the file that declares the SHAs, as
    // text, so running this tool does not scan the repositories.
    expect(source).toContain("tests/corpus/audit.ts");
    expect(source).toContain("readFileSync(CORPUS_FILE");
    // The ref pattern is a HEX SHA, not a branch name — the property that
    // makes the URL above point at a fixed commit.
    expect(source).toContain("[0-9a-f]{7,40}");
  });

  it("exits non-zero when the corpus registry yields no entries", () => {
    // A tool that silently reports "0 unclassified rows" when it actually
    // parsed nothing is worse than no tool: it says the work is done.
    expect(source).toContain("no corpus entries parsed");
    expect(source).toMatch(/process\.exit\(2\)/);
  });

  it("reports a row it cannot display, rather than omitting it", () => {
    expect(source).toContain("could not be shown");
    expect(source).toContain("a blank row is cheaper than a wrong one");
  });

  it("is reachable as an npm script", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["corpus:verdict-context"]).toBe(
      "node scripts/verdict-context.mjs",
    );
  });
});

describe("the unclassified verdict backlog", () => {
  it("is either empty or exactly the figure the ceiling records", () => {
    // The count this file asserted was 28, and it existed so the number could
    // not go quietly stale in either direction. All 28 were classified on
    // 2026-09-28 against the code at each corpus's pinned commit, so the
    // assertion flipped rather than being deleted — a removed assertion is how a
    // backlog quietly refills.
    //
    // What the classification bought is larger than the number: three of the
    // four rules involved were QUARANTINED and one of them, QA-PY-007, had
    // never been measured at all. It now measures 75% false positives at n=12.
    //
    // Then 2026-10-02 opened a reviewed backlog of its own: 23 rows for
    // QA-PW-117 and QA-JV-101, sampled by `npm run corpus:sample --
    // --core-candidates --core-target QA-PW-117 --core-target QA-JV-101` and
    // recorded in `unclassified-ceiling.json` with the arithmetic in its note.
    // A verdict is a human judgement with the code in front of it
    // (`tests/corpus/verdicts/README.md`), so those rows stay blank until a
    // person fills them in.
    //
    // Which makes "is the backlog zero" the wrong question here, because the
    // answer is 23 for as long as the work takes and the assertion would be red
    // for the entire time. The question that has an answer is whether every
    // pending row has been EXPLICITLY RECORDED, and that is two-sided:
    //
    //   - greater than the recorded figure means the backlog grew without review,
    //     which is the defect this arm exists to catch;
    //   - less than it, but not zero, means classification is half done and the
    //     commit captures a state nobody agreed to.
    //
    // `generate-fp-audit-table` enforces the same ceiling per FILE, so a second
    // file's first row cannot hide inside a generous total. That is why the
    // assertion here is on the total and the generator's is on the parts.
    const dir = join(ROOT, "tests", "corpus", "verdicts");
    let blank = 0;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".jsonl"))) {
      for (const line of readFileSync(join(dir, file), "utf8")
        .split("\n")
        .filter(Boolean)) {
        const row = JSON.parse(line) as { verdict?: string };
        if (row.verdict === "" || row.verdict === undefined) blank += 1;
      }
    }
    const ceiling = JSON.parse(
      readFileSync(join(dir, "unclassified-ceiling.json"), "utf8"),
    ) as { total: number };

    expect(
      blank,
      `unclassified verdict rows (ceiling records ${ceiling.total}): run ` +
        "npm run corpus:verdict-context to see the code behind them. Either " +
        "classify them, or record the new figure in unclassified-ceiling.json " +
        "with the arithmetic that produced it",
    ).toBe(ceiling.total);
  });
});
