/**
 * T6 invariant — no verdict path under `src/config/**` may hard-code its clock.
 *
 * The gap this closes: several functions in `src/config/` and `src/engine/`
 * return a VERDICT that depends on the current instant — is this suppression
 * active, has this one expired, is this run governance-clean. The right shape
 * is already established: `computeSuppressionGovernanceGate`
 * (`suppression-governance.ts:51`) takes `now: Date = new Date()` and threads
 * it to both of its `isSuppressionActive` calls. The wrong shape is a call
 * site that supplies its own `new Date()`, which makes the verdict untestable
 * at a boundary and unreproducible after the fact.
 *
 * `loadSuppressions` was the last site still doing the wrong thing, and it is
 * the one a reader is most likely to trust as a statement about the present.
 *
 * The rule enforced here: every `new Date()` in those files must be a PARAMETER
 * DEFAULT (`now: Date = new Date()`), never an argument at a call site. A
 * default is safe while every caller threads the clock; an inline clock is
 * never safe, because the reader of the report cannot see it.
 *
 * This is the same source-invariant mechanism as
 * `tests/contract/header-claims.spec.ts` and
 * `tests/contract/deterministic-ordering.spec.ts`, for the same reason: a
 * guard that only runs when someone remembers to call it is a comment.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const SRC_ROOT = join(ROOT, "src");

/** The verdict paths. Each returns a decision about the present instant. */
const VERDICT_FILES = [
  "config/config.ts",
  "config/suppressions.ts",
  "engine/suppression-governance.ts",
  "engine/suppression-integrity.ts",
];

/**
 * Repo-relative path in the same form VERDICT_FILES is written in.
 *
 * VERDICT_FILES uses forward slashes because that is how the paths are written
 * in the repository. `path.join` produces whatever the host platform uses, so
 * the two have to be reconciled or the comparison silently never matches.
 *
 * The split matches either separator rather than reading `path.sep`, so the
 * function behaves identically on every host and can be asserted directly. A
 * normaliser that is itself platform-dependent is how this bug happened.
 */
function repoRelative(absolute: string): string {
  return absolute
    .slice(SRC_ROOT.length + 1)
    .split(/[\\/]/)
    .join("/");
}

function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("T6: a verdict path never supplies its own clock", () => {
  it("every file audited is still where this invariant expects it", () => {
    // A guard that silently stops guarding because a file was renamed is
    // worse than no guard, so the file list itself is asserted.
    for (const rel of VERDICT_FILES) {
      expect(
        () => statSync(join(SRC_ROOT, rel)),
        `src/${rel} is missing — the deterministic-clock invariant no longer covers it`,
      ).not.toThrow();
    }
  });

  for (const rel of VERDICT_FILES) {
    it(`src/${rel} uses new Date() only as a parameter default`, () => {
      const code = stripComments(readFileSync(join(SRC_ROOT, rel), "utf8"));
      // Every occurrence must be the right-hand side of a default, i.e.
      // preceded by `= ` in a parameter list. An occurrence inside a call
      // argument — `isSuppressionActive(ign, new Date())` — has no `=`
      // between the call's `(` and the constructor.
      const occurrences = [...code.matchAll(/new Date\(\)/g)];
      for (const occurrence of occurrences) {
        const before = code.slice(
          Math.max(0, occurrence.index - 40),
          occurrence.index,
        );
        expect(
          /=\s*$/.test(before),
          `src/${rel} calls new Date() at a call site (…${before.replace(/\s+/g, " ").slice(-40)}new Date()). Thread a \`now: Date\` parameter through instead — a verdict that reads the clock invisibly cannot be tested at a boundary.`,
        ).toBe(true);
      }
    });
  }

  it("the parametrised seams exist, so the invariant is not satisfied by removing the clock", () => {
    // The other failure mode: someone deletes `new Date()` entirely, the
    // audit goes green, and the verdict silently becomes permanent. Each
    // entry point must still declare a default, which is what makes the
    // default-vs-inline distinction above meaningful.
    const config = readFileSync(join(SRC_ROOT, "config/config.ts"), "utf8");
    const suppressions = readFileSync(
      join(SRC_ROOT, "config/suppressions.ts"),
      "utf8",
    );
    const governance = readFileSync(
      join(SRC_ROOT, "engine/suppression-governance.ts"),
      "utf8",
    );
    expect(config).toMatch(/now: Date = new Date\(\)/);
    expect(suppressions).toMatch(/now: Date = new Date\(\)/);
    expect(governance).toMatch(/now: Date = new Date\(\)/);
  });

  it("recognises an already-audited path on every platform", () => {
    // The regression. The sweep compared a platform-normalised relative path
    // against VERDICT_FILES rewritten with hardcoded backslashes, so on Linux
    // and macOS nothing ever matched and every file in src/config looked
    // unaudited — including config.ts, which is in the list. The test passed on
    // Windows and failed everywhere else, which is the worst possible shape for
    // a gate: green on the machine that wrote it.
    for (const rel of VERDICT_FILES) {
      expect(repoRelative(join(SRC_ROOT, rel))).toBe(rel);
    }
  });

  it("normalises both separator styles, so the sweep is host-independent", () => {
    // Asserted on both separator styles regardless of host, because the
    // original defect was a normaliser that only understood one of them. The
    // separator is written literally rather than read from path.sep so that
    // both branches are exercised on every machine.
    for (const separator of ["/", "\\"]) {
      expect(
        repoRelative(`${SRC_ROOT}${separator}config${separator}config.ts`),
      ).toBe("config/config.ts");
    }
  });

  it("src/config/** contains no other file that reads the clock inline", () => {
    // The directory-level sweep, so a new config module cannot join the
    // verdict set without being considered. `listSourceFiles` keeps this
    // honest as the tree grows.
    function list(dir: string): string[] {
      return readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) return list(full);
        return entry.endsWith(".ts") && !entry.endsWith(".spec.ts")
          ? [full]
          : [];
      });
    }
    const audited = new Set(VERDICT_FILES);
    for (const file of list(join(SRC_ROOT, "config"))) {
      const rel = repoRelative(file);
      if (audited.has(rel)) continue;
      const code = stripComments(readFileSync(file, "utf8"));
      expect(
        code.includes("new Date()"),
        `src/${rel} reads the clock but is not in VERDICT_FILES — add it to the list, or prove it is not a verdict path`,
      ).toBe(false);
    }
  });
});
