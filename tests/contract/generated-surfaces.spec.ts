import { readFileSync, readdirSync } from "node:fs";
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
/**
 * DERIVED, not a fixed list of four — the comment above used to claim that
 * while iterating a hardcoded array, so a fifth workflow that regenerated
 * without asserting would have passed. It is discovered by reading the
 * workflows and asking which of them regenerate.
 */
function workflowsThatRegenerate(): string[] {
  const dir = join(ROOT, ".github", "workflows");
  return readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => `.github/workflows/${f}`)
    .filter((rel) => read(rel).includes("npm run docs:regen"))
    .sort();
}

const STALENESS_WORKFLOWS = workflowsThatRegenerate();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

/**
 * What each step of `npm run docs:regen` writes.
 *
 * Keyed by the step name so the test can compare against the ACTUAL chain in
 * package.json rather than against a hand-copied list of outputs. The previous
 * version listed outputs only, and omitted `docs:capability`'s two files — a
 * generator whose output nobody was watching, invisible precisely because the
 * assertion still passed.
 */
const REGEN_STEP_OUTPUTS: Record<string, string[]> = {
  "generate-rule-docs": ["docs/rules"],
  "generate-fp-audit-table": [
    "docs/COUNT-LOCK.md",
    "docs/FP-AUDIT.md",
    "src/rules/measured-fp.generated.ts",
  ],
  "docs:capability": [
    "docs/RULE-CAPABILITY-MATRIX.md",
    "docs/RULE-CAPABILITY-MATRIX.json",
  ],
  "docs:counts": [
    "README.md",
    "docs/README.md",
    "docs/CERTIFICATION-POLICY.md",
    "docs/MEASUREMENT-CLOSEOUT.md",
    "site/reference/roadmap.md",
  ],
  "docs:depth-adjudication": ["docs/DEPTH-ADJUDICATION.md"],
  "docs:machine-contract": ["docs/machine-contract.md"],
  "docs:core-readiness": ["docs/CORE-READINESS.md"],
  "brand:tokens": [
    "assets/brand/tokens.json",
    "site/.vitepress/theme/styles/vars.css",
    "docs/design/DESIGN-TOKENS.md",
  ],
  "golden:update": ["tests/golden"],
  "docs:hero": ["assets/readme"],
  "docs:architecture": ["assets/readme"],
  "docs:how-it-works": ["assets/readme"],
  "docs:demo": ["assets/readme"],
  "docs:readme-brand": ["assets/readme"],
  "detector-hashes:update": ["tests/corpus/detector-hashes.json"],
};

describe("the generated-staleness assertion has one implementation", () => {
  it("finds the workflows that regenerate, rather than trusting a list", () => {
    // If this is empty the next assertion below passes vacuously, so the
    // discovery itself is asserted: a rename or a move of `.github/workflows`
    // must not quietly reduce coverage to nothing.
    expect(STALENESS_WORKFLOWS.length).toBeGreaterThan(0);
  });

  it("every workflow that regenerates docs also asserts they are committed", () => {
    const offenders = STALENESS_WORKFLOWS.filter(
      (rel) => !read(rel).includes("docs:staleness"),
    );
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

  it("does not watch provenance-stamped artifacts it cannot judge", () => {
    // Their `baseSha` is meant to lag, and `git status` cannot tell a restamp
    // from real drift — so watching them here would FAIL on every regeneration
    // and catch nothing. `docs:provenance-drift` covers their content properly.
    // Re-adding one of these reintroduces a gate that is red constantly and
    // green when it matters, which is worse than not having it.
    const provenanceStamped = [
      "docs/capability-registry.json",
      "docs/v6-inventory.json",
      "docs/CI-MATRIX.json",
      "docs/DOMAIN-COVERAGE.json",
      "docs/FRAMEWORK-MATRIX.json",
      "docs/LANGUAGE-MATRIX.json",
      "docs/SURFACE-MATURITY.json",
    ];
    const watched = provenanceStamped.filter((p) =>
      GENERATED_SURFACES.includes(p),
    );
    expect(
      watched,
      "these carry a baseSha that is meant to lag; leave them to " +
        "docs:provenance-drift",
    ).toEqual([]);
  });

  it("covers every generator docs:regen runs, by name", () => {
    // The list is explicit so the script never has to run the generators, and
    // explicit means it can fall behind — the previous version of this list
    // omitted `docs:capability`'s two outputs entirely, which is exactly how an
    // explicit list rots while still passing.
    //
    // The guard against a NEW generator is the step list: every script
    // `docs:regen` invokes has to appear here, so adding a generator without
    // saying where it writes fails. Outputs are per-generator facts and are
    // spelled out.
    const pkg = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };
    const regen = pkg.scripts["docs:regen"];
    expect(
      regen,
      "package.json has no `docs:regen` script — the staleness gate watches " +
        "what that chain writes, so its absence is a failure, not a reason to " +
        "check nothing",
    ).toBeTypeOf("string");
    const regenSteps = (regen ?? "")
      .split("&&")
      .map((s) => s.trim().replace(/^npm run /, ""))
      .filter(Boolean);

    // Every step must be accounted for. `docs:regen` is one long `&&` chain.
    const unaccounted = regenSteps.filter((step) => !REGEN_STEP_OUTPUTS[step]);
    expect(
      unaccounted,
      "these run inside `docs:regen` but this test does not record what they " +
        "write — add them to REGEN_STEP_OUTPUTS, or the staleness script " +
        "cannot know what it is supposed to watch",
    ).toEqual([]);

    const required = Object.values(REGEN_STEP_OUTPUTS).flat();
    const missing = required.filter(
      (surface) => !GENERATED_SURFACES.includes(surface),
    );
    expect(
      missing,
      "docs:regen writes these but the staleness script does not watch them — " +
        "add each to GENERATED_SURFACES",
    ).toEqual([]);
  });

  it("records the outputs of every docs:regen step, including the easy misses", () => {
    // The step that was missing last time. Asserted separately because a
    // regression here is invisible: the assertion above only fails if the
    // whole step vanishes from the map.
    expect(REGEN_STEP_OUTPUTS["docs:capability"]).toContain(
      "docs/RULE-CAPABILITY-MATRIX.md",
    );
    expect(REGEN_STEP_OUTPUTS["docs:counts"]).toContain("docs/README.md");
  });
});
