/**
 * The deprecation cycle is executable (docs/VERSIONING.md §"Deprecation
 * cycle").
 *
 * The law is three steps and every one of them has been skipped before:
 *
 *   1. Minor release N — the old name still works and WARNS, naming its
 *      replacement.
 *   2. At least one subsequent minor ships with the warning still present.
 *   3. Major N+1 — the old name is gone.
 *
 * Steps 1 and 2 are what a lone maintainer forgets: the rename ships, the
 * flag is deleted in the same commit, and the two warnings a user was
 * promised never existed. So the list of deprecated spellings is DATA here,
 * not prose, and this test walks it — one entry per frozen-surface rename,
 * each asserting the three steps are individually observable.
 *
 * Adding a deprecation means adding a row to `DEPRECATED_FLAGS`. Deleting a
 * flag means deleting its row, and the CHANGELOG assertion below is what
 * makes step 3 a release decision rather than a quiet edit.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { parseArgs } from "../../src/cli.js";
import type { CliArgs } from "../../src/engine/scan-pipeline.js";

const ROOT = join(import.meta.dirname, "..", "..");

interface Deprecation {
  /** The old spelling. */
  flag: string;
  /** What the user should type instead. */
  replacement: string;
  /** Why the name was wrong. Shown in the warning's context, not asserted. */
  reason: string;
}

/**
 * Every deprecated frozen surface, in one list.
 *
 * `--strict` → `--include-warn` (6.0): the old name promised enforcement the
 * flag never had. A quarantined detector is advisory BY DESIGN (decision
 * D-2), so a user reaching for "strict" was asking for something the tool
 * would not give them, and the flag's real behaviour — include the WARN tier
 * — is what the new name says.
 */
const DEPRECATED_FLAGS: readonly Deprecation[] = [
  {
    flag: "--strict",
    replacement: "--include-warn",
    reason: "it never gated anything; the new name says what it includes",
  },
];

describe("every deprecated flag keeps working and says so", () => {
  it.each(DEPRECATED_FLAGS)(
    "$flag still parses and does what $replacement does",
    ({ flag, replacement }) => {
      const oldArgs = parseArgs([flag]);
      const newArgs = parseArgs([replacement]);
      // Same behaviour, not merely "accepted": the internal effect has to be
      // identical, or the deprecation is a behaviour change wearing a warning.
      const strip = (a: CliArgs) => {
        const { deprecatedFlags: _drop, ...rest } = a;
        return rest;
      };
      expect(
        oldArgs,
        `${flag} no longer parses — a frozen-surface removal without the cycle`,
      ).not.toBeNull();
      expect(newArgs).not.toBeNull();
      if (oldArgs === null || newArgs === null) return;
      expect(strip(oldArgs)).toEqual(strip(newArgs));
    },
  );

  it.each(DEPRECATED_FLAGS)(
    "$flag reports the deprecation with its replacement",
    ({ flag, replacement }) => {
      const parsed = parseArgs([flag]);
      const notices = parsed?.deprecatedFlags ?? [];
      const notice = notices.find((d) => d.flag === flag);
      expect(
        notice,
        `${flag} parses silently — step 1 of the cycle is a warning that names ` +
          `${replacement}, and a silent rename is indistinguishable from a removal`,
      ).toBeDefined();
      expect(notice?.replacement).toBe(replacement);
    },
  );

  it.each(DEPRECATED_FLAGS)(
    "$replacement itself never warns (it is the replacement)",
    ({ replacement }) => {
      const parsed = parseArgs([replacement]);
      expect(parsed?.deprecatedFlags ?? []).toEqual([]);
    },
  );
});

describe("the changelog records every deprecation", () => {
  const changelog = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");

  /**
   * Every `### Deprecated…` sub-section, with its body.
   *
   * Scoped to the sub-section rather than to the release section on purpose.
   * A release that deprecated one flag and added a feature in the same entry is
   * the normal case, and a gate that read "does this release mention
   * Deprecated?" would be satisfied by a release that deprecated something
   * else — which is the check passing on the wrong fact.
   */
  function deprecatedEntries(): string[] {
    const out: string[] = [];
    const re = /^### .*[Dd]eprecated.*$/gm;
    for (const m of changelog.matchAll(re)) {
      const rest = changelog.slice(m.index + m[0].length);
      const next = rest.search(/^#{2,3} /m);
      // The heading counts as part of the entry: a deprecation is allowed to
      // name its replacement in its own title (`### Deprecated: --strict →
      // --include-warn`), and requiring it in the prose instead would be a
      // formatting rule dressed as a correctness one.
      out.push(m[0] + (next === -1 ? rest : rest.slice(0, next)));
    }
    return out;
  }

  it.each(DEPRECATED_FLAGS)(
    "$flag's replacement $replacement is named in a Deprecated CHANGELOG entry",
    ({ flag, replacement }) => {
      // Step 1's other half: the release record has to name the replacement,
      // so a user upgrading one minor at a time can find out what changed
      // without reading stderr on a run that happened to use the old name.
      const entries = deprecatedEntries();
      expect(
        entries.length,
        "no `### Deprecated` CHANGELOG sub-section while " +
          `${flag} → ${replacement} is still shipping — step 1 of the cycle ` +
          "is a recorded deprecation, not just a runtime warning",
      ).toBeGreaterThan(0);
      expect(
        entries.some((s) => s.includes(replacement)),
        `no Deprecated CHANGELOG sub-section names ${replacement}`,
      ).toBe(true);
    },
  );

  it("the shipped deprecation list is not empty (an empty list means the test is dead code)", () => {
    expect(DEPRECATED_FLAGS.length).toBeGreaterThan(0);
  });
});
