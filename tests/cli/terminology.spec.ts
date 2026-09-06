/**
 * Canonical vocabulary — source-side sweep (Product-Experience Master
 * Plan Phase 2).
 *
 * docs/TERMINOLOGY.md defines the product's words and the anti-
 * vocabulary; tests/contract/docs-consistency.spec.ts enforces it on
 * the doc/site surfaces. This spec enforces it on the CLI's own
 * user-visible strings: every quoted literal in src/commands/ and
 * src/reporter/ is checked against the forbidden terms, so wording
 * drift ("issues found", "trust score") fails CI before it can reach
 * a terminal, a PR comment or a golden-locked fixture.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");

/** All double/single-quoted string literals in a TS source file. */
function stringLiterals(source: string): string[] {
  const literals: string[] = [];
  for (const m of source.matchAll(/"([^"\\\n]*)"/g)) literals.push(m[1] ?? "");
  for (const m of source.matchAll(/'([^'\\\n]*)'/g)) literals.push(m[1] ?? "");
  return literals;
}

function commandSources(): Array<[string, string]> {
  const files: Array<[string, string]> = [];
  for (const dir of ["src/commands", "src/reporter"]) {
    for (const f of readdirSync(join(ROOT, dir)).filter((f) =>
      f.endsWith(".ts"),
    )) {
      files.push([`${dir}/${f}`, readFileSync(join(ROOT, dir, f), "utf8")]);
    }
  }
  return files;
}

describe("user-visible CLI strings use the canonical vocabulary", () => {
  it("finds source files to check (sanity)", () => {
    expect(commandSources().length).toBeGreaterThan(10);
  });

  it.each(commandSources().map(([name, src]) => [name, src]))(
    "%s: no spec-era synonyms in string literals",
    (name, src) => {
      const offenders = stringLiterals(src).filter((s) =>
        /\btrust\s+score\b|\bbug\s+score\b/i.test(s),
      );
      expect(
        offenders,
        `${name} renders a spec-era synonym — the canonical terms live ` +
          `in docs/TERMINOLOGY.md`,
      ).toEqual([]);
    },
  );

  it.each(commandSources().map(([name, src]) => [name, src]))(
    "%s: findings are never called issues in string literals",
    (name, src) => {
      // The finding-vocabulary senses only; tracker senses (GitHub
      // issue URLs, "open an issue") are legitimate.
      const findingSense =
        /\b(?:no\s+|zero\s+|new\s+)?issues?\s+(?:found|in|with|were|was|remain|reported|detected|introduced|resolved)\b/i;
      const offenders = stringLiterals(src).filter((s) => findingSense.test(s));
      expect(
        offenders,
        `${name} calls findings "issues" — call them findings ` +
          `(docs/TERMINOLOGY.md anti-vocabulary)`,
      ).toEqual([]);
    },
  );
});
