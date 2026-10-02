/**
 * One glob dialect.
 *
 * This repository compiled globs twice, independently, and they disagreed. The
 * disagreement was not cosmetic: `suppression-integrity.ts` — the gate that
 * measures how much of the scan has been suppressed — reached into
 * `discovery/ignores.ts` for its compiler, while `scan-pipeline.ts` applied
 * suppressions through its own. Different dialects, so the gate could report a
 * suppressed ratio for a set that was never suppressed.
 *
 * `src/lib/glob.ts` is now the only compiler. These checks pin the dialect and
 * pin the two behaviours that were previously divergent.
 */

import { describe, expect, it } from "vitest";

import {
  anyDepthGlobRegExp,
  anchoredGlobRegExp,
  matchesAnyGlob,
  pathMatchesGlob,
} from "../../src/lib/glob.js";
import {
  detectExpiredSuppressions,
  detectMassSuppression,
} from "../../src/engine/suppression-integrity.js";

describe("the dialect", () => {
  it("* never crosses a segment boundary", () => {
    expect(pathMatchesGlob("e2e/a.spec.ts", "e2e/*.spec.ts")).toBe(true);
    expect(pathMatchesGlob("e2e/deep/a.spec.ts", "e2e/*.spec.ts")).toBe(false);
  });

  it("a ** segment matches zero or more whole segments", () => {
    const glob = "tests/**/a.spec.ts";
    // The empty case is the one the old split+join compiler dropped: it
    // compiled `**` to a form that demanded at least one segment, so this
    // suppression silently never applied to a file directly under tests/.
    expect(pathMatchesGlob("tests/a.spec.ts", glob)).toBe(true);
    expect(pathMatchesGlob("tests/x/a.spec.ts", glob)).toBe(true);
    expect(pathMatchesGlob("tests/x/y/a.spec.ts", glob)).toBe(true);
    expect(pathMatchesGlob("other/a.spec.ts", glob)).toBe(false);
  });

  it("a trailing ** covers everything inside the prefix, not the prefix itself", () => {
    expect(pathMatchesGlob("tests/a.spec.ts", "tests/**")).toBe(true);
    expect(pathMatchesGlob("tests/deep/a.spec.ts", "tests/**")).toBe(true);
    expect(pathMatchesGlob("tests", "tests/**")).toBe(false);
  });

  it("? is a literal, and both surfaces now say so", () => {
    // The disagreement. `ignores.ts` compiled `?` to `[^/]` (any one char);
    // `scan-pipeline.ts` escaped it to a literal `?`. The scan's dialect is the
    // authority because it is the one that actually suppressed things.
    expect(pathMatchesGlob("e2e/a?.spec.ts", "e2e/a?.spec.ts")).toBe(true);
    expect(pathMatchesGlob("e2e/ab.spec.ts", "e2e/a?.spec.ts")).toBe(false);
  });

  it("normalizes backslashes on BOTH sides", () => {
    // A Windows-authored suppression compiled to a literal-backslash regex that
    // could never match a finding.
    expect(pathMatchesGlob("e2e\\a.spec.ts", "e2e/a.spec.ts")).toBe(true);
    expect(pathMatchesGlob("e2e/a.spec.ts", "e2e\\a.spec.ts")).toBe(true);
  });

  it("escapes regex metacharacters in the literal parts", () => {
    expect(pathMatchesGlob("a+b.ts", "a+b.ts")).toBe(true);
    expect(pathMatchesGlob("axb.ts", "a+b.ts")).toBe(false);
    expect(pathMatchesGlob("a(b).ts", "a(b).ts")).toBe(true);
  });
});

describe("both anchorings come from the same compiler", () => {
  it("a bare name matches at any depth", () => {
    const re = anyDepthGlobRegExp("node_modules");
    expect(re.test("node_modules/x.ts")).toBe(true);
    expect(re.test("a/b/node_modules/x.ts")).toBe(true);
    expect(re.test("src/index.ts")).toBe(false);
  });

  it("a path pattern is anchored to the whole path", () => {
    const re = anchoredGlobRegExp("src/a.ts");
    expect(re.test("src/a.ts")).toBe(true);
    expect(re.test("lib/src/a.ts")).toBe(false);
  });
});

describe("suppression integrity measures what the scan suppressed", () => {
  it("agrees with the scan's dialect on a ? pattern", () => {
    // The disagreement ran the other way from what one might guess. `?` was a
    // WILDCARD in the gate's dialect and a LITERAL in the scan's, so a
    // suppression the scan never honoured was counted by the gate: the ratio
    // reported findings that were still on screen as suppressed. The
    // assertion is agreement, not a specific count — the gate must never claim
    // more suppressed than the scan actually suppressed.
    const suppression = {
      ruleId: "QA-PW-002",
      files: ["e2e/a?.spec.ts"],
      reason: "r",
    };
    for (const file of ["e2e/ab.spec.ts", "e2e/a?.spec.ts"]) {
      const result = detectMassSuppression(
        [suppression],
        [{ ruleId: "QA-PW-002", file }],
      );
      const scanWouldSuppress = pathMatchesGlob(file, "e2e/a?.spec.ts");
      expect(result.suppressedCount === 1).toBe(scanWouldSuppress);
    }
  });

  it("agrees with the scan's dialect on a ** pattern", () => {
    const suppression = {
      ruleId: "QA-PW-002",
      files: ["tests/**/a.spec.ts"],
      reason: "r",
    };
    for (const file of [
      "tests/a.spec.ts",
      "tests/x/a.spec.ts",
      "tests/x/y/a.spec.ts",
      "other/a.spec.ts",
    ]) {
      const result = detectMassSuppression(
        [suppression],
        [{ ruleId: "QA-PW-002", file }],
      );
      expect(result.suppressedCount === 1).toBe(
        pathMatchesGlob(file, "tests/**/a.spec.ts"),
      );
    }
  });

  it("still does not count a finding from a different rule", () => {
    const result = detectMassSuppression(
      [{ ruleId: "QA-PW-002", files: ["e2e/**"], reason: "r" }],
      [{ ruleId: "QA-SE-010", file: "e2e/a.spec.ts" }],
    );
    expect(result.suppressedCount).toBe(0);
  });

  it("treats exactly-at-threshold as mass suppression and documents the boundary", () => {
    // 2 of 4 is exactly 0.5. `>=` was already the code; what was missing was
    // that the boundary was nowhere stated, so the threshold read as "above
    // 50%" when it is "at or above".
    const result = detectMassSuppression(
      [{ ruleId: "QA-PW-002", reason: "r" }],
      [
        { ruleId: "QA-PW-002", file: "a.ts" },
        { ruleId: "QA-PW-002", file: "b.ts" },
        { ruleId: "QA-SE-010", file: "c.ts" },
        { ruleId: "QA-SE-010", file: "d.ts" },
      ],
    );
    expect(result.ratio).toBe(0.5);
    expect(result.isMassSuppression).toBe(true);
  });
});

describe("an unparseable expiry is not perpetual", () => {
  const now = new Date("2026-06-01T00:00:00Z");

  it("flags a suppression whose expiry cannot be parsed", () => {
    const expired = detectExpiredSuppressions(
      [{ ruleId: "QA-PW-002", reason: "r", expires: "2026-13-45" }],
      now,
    );
    // `new Date("2026-13-45").getTime()` is NaN and every comparison against
    // NaN is false, so this returned [] — a suppression with a typo in its
    // date that would suppress findings forever.
    expect(expired).toHaveLength(1);
  });

  it("flags garbage that is not a date at all", () => {
    expect(
      detectExpiredSuppressions(
        [{ ruleId: "QA-PW-002", reason: "r", expires: "tomorrow-ish" }],
        now,
      ),
    ).toHaveLength(1);
  });

  it("still expires a real past date and spares a real future one", () => {
    expect(
      detectExpiredSuppressions(
        [{ ruleId: "R", reason: "r", expires: "2026-01-01" }],
        now,
      ),
    ).toHaveLength(1);
    expect(
      detectExpiredSuppressions(
        [{ ruleId: "R", reason: "r", expires: "2027-01-01" }],
        now,
      ),
    ).toHaveLength(0);
  });

  it("leaves an absent expires alone — that is a deliberate decision", () => {
    expect(
      detectExpiredSuppressions([{ ruleId: "R", reason: "r" }], now),
    ).toHaveLength(0);
  });
});

describe("matchesAnyGlob does not depend on declaration order", () => {
  it("gives the same answer either way round", () => {
    const globs = ["e2e/**", "**/*.spec.ts", "lib/**"];
    expect(matchesAnyGlob("e2e/a.spec.ts", globs)).toBe(
      matchesAnyGlob("e2e/a.spec.ts", [...globs].reverse()),
    );
  });
});
