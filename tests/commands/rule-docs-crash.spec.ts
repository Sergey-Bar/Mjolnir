/**
 * W1.2: a rule that crashes is never certified as a rule that stayed silent.
 *
 * The defect: `runRuleAgainstFixture` caught a rule THROW and returned `null`,
 * and the caller computed `fired: (findings?.length ?? 0) > 0`. A rule that
 * crashed on its own must-not-fire fixture therefore produced `fired: false`
 * — identical to a rule that correctly abstained — and the generated doc page
 * committed that to disk as:
 *
 *   "Verified against tests/fixtures/QA-X-001/must-not-fire/y.ts — a
 *    legitimate, similar-looking pattern this rule correctly leaves alone."
 *
 * That is a certification claim, and its only evidence is that the rule
 * produced no findings. "Produced no findings because it threw" is not
 * evidence of that. The same file's own docstring at the call site already
 * said the field degrades honestly per field, so the code contradicted its
 * stated contract.
 *
 * INCONCLUSIVE is the third status this repo's doctor model already defines
 * (`docs/CERTIFICATION-POLICY.md`): the check could not be proven, so it is
 * blocking. This spec pins all three outcomes to their rendering, and pins
 * the crash case to a source-level invariant so a future edit cannot quietly
 * turn the tri-state back into a boolean.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  collectRuleDocData,
  renderRuleDocMd,
  type CorpusBaseline,
} from "../../src/commands/rule-docs.js";
import { RULES } from "../../src/rules/index.js";
import type { QADoctorRule } from "../../src/rules/rule.js";

const FIXTURES_ROOT = join(
  import.meta.dirname,
  "..",
  "..",
  "tests",
  "fixtures",
);
const SOURCE = join(
  import.meta.dirname,
  "..",
  "..",
  "src",
  "commands",
  "rule-docs.ts",
);

const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) {
    rmSync(roots.pop() as string, { recursive: true, force: true });
  }
});

/** A fixtures root holding one rule's must-fire and must-not-fire fixtures. */
function fixturesFor(ruleId: string, mustNotFire: string | null): string {
  const root = mkdtempSync(join(tmpdir(), "mjolnir-ruledocs-"));
  roots.push(root);
  mkdirSync(join(root, ruleId, "must-fire"), { recursive: true });
  writeFileSync(
    join(root, ruleId, "must-fire", "bad.ts"),
    "it('a', () => { await page.click('#x'); });\n",
    "utf8",
  );
  mkdirSync(join(root, ruleId, "must-not-fire"), { recursive: true });
  if (mustNotFire !== null) {
    writeFileSync(
      join(root, ruleId, "must-not-fire", "clean.ts"),
      mustNotFire,
      "utf8",
    );
  }
  return root;
}

/** A real rule whose detector is replaced by the given behaviour. */
function ruleWith(run: QADoctorRule["run"]): QADoctorRule {
  const base = RULES[0];
  if (!base) throw new Error("expected at least one registered rule");
  return { ...base, id: "QA-TEST-001", run };
}

const finding = {
  message: "a real finding",
  why: "why",
  fix: "fix",
} as never;

describe("W1.2: the three fixture outcomes are distinct and each renders truthfully", () => {
  it("a rule that fires is FIRED and the page says the firewall is violated", () => {
    const root = fixturesFor(
      "QA-TEST-001",
      "it('a', () => { expect(1).toBe(1); });\n",
    );
    const data = collectRuleDocData(
      ruleWith(() => [finding]),
      root,
      [],
    );
    expect(data.mustNotFire.outcome).toBe("FIRED");
    const md = renderRuleDocMd(data);
    expect(md).toContain("currently DOES fire");
    expect(md).not.toContain("correctly leaves alone");
  });

  it("a rule that runs and abstains is DID_NOT_FIRE and the page certifies it", () => {
    const root = fixturesFor(
      "QA-TEST-001",
      "it('a', () => { expect(1).toBe(1); });\n",
    );
    const data = collectRuleDocData(
      ruleWith(() => []),
      root,
      [],
    );
    expect(data.mustNotFire.outcome).toBe("DID_NOT_FIRE");
    const md = renderRuleDocMd(data);
    expect(md).toContain("correctly leaves alone");
    expect(md).not.toContain("INCONCLUSIVE");
  });

  it("a rule that THROWS is INCONCLUSIVE and the page never certifies it", () => {
    const root = fixturesFor(
      "QA-TEST-001",
      "it('a', () => { expect(1).toBe(1); });\n",
    );
    const data = collectRuleDocData(
      ruleWith(() => {
        throw new Error("boom");
      }),
      root,
      [],
    );
    // The core of the task: not fired: false, not "no findings".
    expect(data.mustNotFire.outcome).toBe("INCONCLUSIVE");
    const md = renderRuleDocMd(data);
    expect(md).toContain("INCONCLUSIVE");
    expect(md).not.toContain("correctly leaves alone");
    // And it must not read as the other failure either: a crashed rule is not
    // a firewall violation, and reporting it as one trains a reader to
    // ignore the section.
    expect(md).not.toContain("currently DOES fire");
  });

  it("an unreadable must-not-fire fixture is INCONCLUSIVE, not a pass", () => {
    const root = fixturesFor("QA-TEST-001", null);
    // A subdirectory passes the file listing but cannot be read as text.
    mkdirSync(join(root, "QA-TEST-001", "must-not-fire", "sub"), {
      recursive: true,
    });
    const data = collectRuleDocData(
      ruleWith(() => []),
      root,
      [],
    );
    expect(data.mustNotFire.outcome).toBe("INCONCLUSIVE");
    expect(renderRuleDocMd(data)).toContain("INCONCLUSIVE");
  });

  it("a missing must-not-fire fixture on disk is not a claim at all", () => {
    // Distinct from INCONCLUSIVE: there was nothing to run, so the page says
    // so rather than claiming the check was inconclusive. Inventing a failure
    // where no check was attempted is its own kind of dishonesty.
    const root = fixturesFor("QA-TEST-001", null);
    rmSync(join(root, "QA-TEST-001", "must-not-fire"), {
      recursive: true,
      force: true,
    });
    const data = collectRuleDocData(
      ruleWith(() => []),
      root,
      [],
    );
    expect(data.mustNotFire.fixturePath).toBeUndefined();
    const md = renderRuleDocMd(data);
    expect(md).toContain("No must-not-fire fixture on disk");
    expect(md).not.toContain("INCONCLUSIVE");
  });
});

describe("W1.2: the boolean cannot come back", () => {
  it("mustNotFire carries an outcome, not a fired flag", () => {
    // A source invariant, because the failure mode is a type change: making
    // the field optional again, or re-deriving a boolean from the findings
    // list, would typecheck cleanly and silently restore the false green.
    const source = readFileSync(SOURCE, "utf8");
    expect(source).toMatch(
      /mustNotFire: \{ fixturePath\?: string; outcome: FixtureOutcome \}/,
    );
    expect(source).not.toMatch(/mustNotFire[^\n]*\bfired\b/);
  });

  it("the doc generator never collapses null findings into a pass", () => {
    // The exact expression the defect lived in. Asserting on it by shape is
    // what makes the next refactor of collectRuleDocData answerable.
    const source = readFileSync(SOURCE, "utf8");
    expect(source).not.toMatch(/\(findings\?\.length \?\? 0\) > 0/);
  });

  it("every registered rule's committed page is a DID_NOT_FIRE claim, and the registry agrees", () => {
    // The whole-registry sweep, so the invariant is not proved on one stub. A
    // rule whose own fixture crashes would land here as INCONCLUSIVE and fail,
    // which is the point: the doc generator would then be publishing a
    // certified verdict for a detector that does not run.
    const inconclusive: string[] = [];
    for (const rule of RULES) {
      const data = collectRuleDocData(
        rule,
        FIXTURES_ROOT,
        [] as CorpusBaseline[],
      );
      if (data.mustNotFire.outcome === "INCONCLUSIVE")
        inconclusive.push(rule.id);
    }
    expect(
      inconclusive,
      "these rules did not run against their own must-not-fire fixture, so " +
        "their doc pages cannot claim a verified abstention",
    ).toEqual([]);
  });
});
