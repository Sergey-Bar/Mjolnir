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

import { execFileSync } from "node:child_process";
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
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect(pkg.scripts["corpus:verdict-context"]).toBe(
      "node scripts/verdict-context.mjs",
    );
  });
});

describe("the unclassified verdict backlog", () => {
  it("is the size the PR declares, so the claim cannot silently go stale", () => {
    // A count, asserted. "28 unclassified rows" is a claim the release
    // description makes; if it is closed, this fails and the number has to
    // be updated in the same commit rather than quietly becoming wrong.
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
    expect(blank).toBe(28);
  });
});
