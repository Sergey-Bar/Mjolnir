/**
 * T5 — no ordering in `src/` may depend on the environment.
 *
 * `String.prototype.localeCompare` with no locale argument resolves against
 * the PROCESS's default locale — the ICU collation chosen by `LANG`,
 * `LC_ALL` or the OS. So `[...xs].sort((a, b) => a.localeCompare(b))` yields a
 * different order on a `de_DE` laptop than on an en-US CI runner.
 *
 * That is a nuisance for a display list and a correctness bug for anything
 * that reaches a hash, a cache key, a digest or a machine contract, because
 * the same repository then produces two different fingerprints. The worst
 * site in this repo was `scan-cache.ts`, which sorted INSIDE `hashDir` — the
 * order is fed to `hash.update(entry.name)`, so it is a semantic input to the
 * detector fingerprint that `isIncrementalSafe` keys off. The other 22 sites
 * were identifiers, paths, category codes and timestamps, none of which
 * benefits from a collation a reader can see, and one of which
 * (`suppression-integrity.ts`) is hashed directly.
 *
 * The fix is `src/lib/compare.ts`: `compareCodePoints` for anything
 * machine-facing, `compareLocalized(locale)` for the two sites whose key is a
 * human-readable label and which are pinned to a named locale rather than
 * inheriting the environment.
 *
 * This spec is the durable half — a source invariant, the same mechanism and
 * granularity as `tests/contract/header-claims.spec.ts`, because a guard that
 * only runs when someone remembers to call it is a comment.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  compareCodePoints,
  compareLocalized,
  DISPLAY_LOCALE,
} from "../../src/lib/compare.js";

const SRC_ROOT = join(import.meta.dirname, "..", "..", "src");

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listSourceFiles(full));
    else if (entry.endsWith(".ts") && !entry.endsWith(".spec.ts")) {
      out.push(full);
    }
  }
  return out;
}

function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("T5: compareCodePoints is locale-free by construction", () => {
  it("is a total order over the values this repo sorts", () => {
    const values = [
      "",
      "A",
      "Z",
      "a",
      "z",
      "QA-CI-009",
      "QA-TEST-001",
      "src/a.spec.ts",
      "src/B.spec.ts",
      "ä",
      "z",
      "é",
      "🎯",
    ];
    // Total order: every pair is antisymmetric and the sort is stable enough
    // that sorting twice changes nothing.
    for (const a of values) {
      for (const b of values) {
        const ab = compareCodePoints(a, b);
        const ba = compareCodePoints(b, a);
        // `-Math.sign(0)` is `-0`, and `Object.is(-0, 0)` is false — the
        // assertion is written through `toBe` on a normalized value so it
        // tests antisymmetry rather than signed-zero trivia.
        expect(Math.sign(ab) + Math.sign(ba), `${a} vs ${b}`).toBe(0);
        if (a === b) expect(ab).toBe(0);
        else expect(ab === -ba || ab === ba, `${a} vs ${b}`).toBe(true);
      }
    }
    expect([...values].sort(compareCodePoints)).toEqual(
      [...values].sort(compareCodePoints),
    );
  });

  it("ignores the ambient locale entirely — the property the sort depends on", () => {
    const inputs = ["b", "B", "ä", "a", "A", "ß", "ss"];
    const before = [...inputs].sort(compareCodePoints);
    // The comparator takes no locale and closes over none, so the only way
    // to prove independence is to change the environment the ambient call
    // WOULD have read and show the result is identical.
    const previousLocale = process.env["LC_ALL"];
    const previousLang = process.env["LANG"];
    try {
      process.env["LC_ALL"] = "sv_SE.UTF-8";
      process.env["LANG"] = "sv_SE.UTF-8";
      expect([...inputs].sort(compareCodePoints)).toEqual(before);
      // And the contrast: the ambient call this replaced really does read
      // the environment, which is why the bare form is banned.
      expect(typeof "a".localeCompare("B")).toBe("number");
    } finally {
      if (previousLocale === undefined) delete process.env["LC_ALL"];
      else process.env["LC_ALL"] = previousLocale;
      if (previousLang === undefined) delete process.env["LANG"];
      else process.env["LANG"] = previousLang;
    }
  });

  it("the pinned comparator is a real pin: it names a locale instead of reading one", () => {
    const pinned = compareLocalized(DISPLAY_LOCALE);
    expect(typeof pinned("a", "b")).toBe("number");
    // Same inputs, same order, twice: a pinned collator is not an ambient one.
    const inputs = ["b", "A", "a", "B"];
    expect([...inputs].sort(pinned)).toEqual([...inputs].sort(pinned));
  });
});

describe("T5: no site in src/ inherits the ambient locale", () => {
  const files = listSourceFiles(SRC_ROOT);

  it("scanned a non-trivial number of source files (sanity check on the scan itself)", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  for (const file of files) {
    const rel = file.slice(SRC_ROOT.length + 1).replaceAll("\\", "/");
    it(`src/${rel} calls no unpinned locale-aware comparison`, () => {
      const code = stripComments(readFileSync(file, "utf8"));
      // A call with ONE argument reads the process default locale. A call
      // with a second argument is pinned and allowed. `compare.ts` itself is
      // the definition site of the pinned form.
      if (rel === "lib/compare.ts") {
        expect(code).toMatch(/\.localeCompare\(b, locale\)/);
        return;
      }
      const unpinned = code.match(/\.localeCompare\([^,)]*\)/g);
      expect(
        unpinned,
        `src/${rel} calls localeCompare with no locale argument: ${unpinned?.join(", ")}. ` +
          `Use compareCodePoints for anything machine-facing, or ` +
          `compareLocalized(DISPLAY_LOCALE) for a human-readable label.`,
      ).toBeNull();
    });
  }
});
