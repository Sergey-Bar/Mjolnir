import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  GENERATED_SURFACES,
  isGenerated,
} from "../../scripts/check-generated-clean.mjs";

const ROOT = join(import.meta.dirname, "..", "..");

/**
 * The four workflows that used to each carry their own copy of the staleness
 * assertion. They were not equivalent: `ci.yml` checked the whole tree plus
 * untracked files, the other three ran `git diff --exit-code -- docs/` and
 * therefore could not see an untracked generated file at all.
 *
 * Extracting one script is only half the fix. The other half is this file: a
 * copy that nobody re-compares is a copy that drifts, and the drift is
 * invisible because all four still pass while meaning different things.
 */
const STALENESS_WORKFLOWS = [
  ".github/workflows/ci.yml",
  ".github/workflows/corpus-audit.yml",
  ".github/workflows/release.yml",
  ".github/workflows/stable-release.yml",
];

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("the generated-staleness assertion has one implementation", () => {
  it("every workflow that regenerates docs also asserts they are committed", () => {
    // Not a fixed list of four: derived from what the workflows actually do,
    // so adding a fifth workflow that regenerates without asserting fails here
    // rather than shipping the same hole a fifth time.
    const offenders: string[] = [];
    for (const rel of STALENESS_WORKFLOWS) {
      const text = read(rel);
      if (
        text.includes("npm run docs:regen") &&
        !text.includes("docs:staleness")
      ) {
        offenders.push(rel);
      }
    }
    expect(
      offenders,
      "these workflows regenerate generated docs but never assert the " +
        "committed artifacts match — add `npm run docs:staleness` after the " +
        "regen step",
    ).toEqual([]);
  });

  it("no workflow keeps a private copy of the assertion", () => {
    // `git diff --exit-code -- docs/` on its own is the weak form: proven
    // blind to untracked files. It may accompany the script (it also catches
    // a generator that escaped the declared output map) but never replace it.
    const unguarded: string[] = [];
    for (const rel of STALENESS_WORKFLOWS) {
      const text = read(rel);
      const hasScript = text.includes("docs:staleness");
      const hasInline = /git diff --exit-code -- docs\//.test(text);
      if (hasInline && !hasScript) unguarded.push(rel);
    }
    expect(unguarded).toEqual([]);
  });

  it("the script is read-only, so it can never cost a tree its evidence", () => {
    // The unreleased adjudication records under tests/corpus/verdicts/ are the
    // reason this check is allowed to run on a dirty working tree at all. A
    // write-mode staleness check would be able to destroy them.
    const source = read("scripts/check-generated-clean.mjs");
    for (const mutating of ["writeFileSync", "rmSync", "cpSync", "execSync"]) {
      expect(
        source.includes(mutating),
        `${mutating} appears in the staleness script; it must only read`,
      ).toBe(false);
    }
  });
});

describe("the declared generated surface", () => {
  it("never covers the hand-adjudicated verdict corpus", () => {
    // If a generator is ever pointed at these, it would overwrite the record
    // of who judged which corpus rows. The exclusion is the point.
    expect(isGenerated("tests/corpus/verdicts/keycloak-keycloak.jsonl")).toBe(
      false,
    );
    expect(isGenerated("tests/corpus/verdicts/retracted.jsonl")).toBe(false);
    expect(
      isGenerated("tests/corpus/verdicts/proposed/jv-101-final.json"),
    ).toBe(false);
    // The detector hash beside them IS generated, and the boundary has to be
    // the directory's siblings, not the directory.
    expect(isGenerated("tests/corpus/detector-hashes.json")).toBe(true);
  });

  it("matches a directory prefix rather than a substring", () => {
    // `docs/rules` must cover `docs/rules/QA-PW-001.md` and must NOT cover a
    // hand-written sibling whose name merely starts with the same letters.
    expect(isGenerated("docs/rules/QA-PW-001.md")).toBe(true);
    expect(isGenerated("docs/rules-extra-notes.md")).toBe(false);
    expect(isGenerated("docs/rules")).toBe(true);
  });

  it("covers every generator docs:regen runs, by name", () => {
    // The list is explicit so the script never has to run the generators, and
    // explicit means it can fall behind. These are the outputs each regen step
    // declares; a new generator that writes somewhere unlisted fails here.
    const required = [
      "docs/rules", // generate-rule-docs
      "docs/COUNT-LOCK.md", // generate-fp-audit-table
      "docs/FP-AUDIT.md", // generate-fp-audit-table
      "src/rules/measured-fp.generated.ts", // generate-fp-audit-table
      "docs/DEPTH-ADJUDICATION.md", // docs:depth-adjudication
      "docs/machine-contract.md", // docs:machine-contract
      "docs/CORE-READINESS.md", // docs:core-readiness
      "assets/brand/tokens.json", // brand:tokens
      "site/.vitepress/theme/styles/vars.css", // brand:tokens
      "docs/design/DESIGN-TOKENS.md", // brand:tokens
      "tests/golden", // golden:update
      "assets/readme", // docs:hero / architecture / how-it-works / demo
      "tests/corpus/detector-hashes.json", // detector-hashes:update
      "README.md", // docs:counts
      "docs/CERTIFICATION-POLICY.md", // docs:counts
      "docs/MEASUREMENT-CLOSEOUT.md", // docs:counts
      "site/reference/roadmap.md", // docs:counts
    ];
    const missing = required.filter(
      (surface) => !GENERATED_SURFACES.includes(surface),
    );
    expect(
      missing,
      "docs:regen writes these but the staleness script does not watch them — " +
        "add each to GENERATED_SURFACES",
    ).toEqual([]);
  });
});
