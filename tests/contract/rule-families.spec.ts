/**
 * The one rule-family table is internally consistent, and every family in it
 * is a family the rules actually use.
 *
 * This file exists because the v6 carve removed `create-rule`, which was the
 * table's second consumer. The only importer left is `doctor.ts`, and it reads
 * `RULE_ID_RE` alone — so the table's own rows went from "exercised by the
 * scaffolder" to "executed once at module load and never checked". The
 * per-file coverage floor caught that, which is what it is for: the drop was
 * real, not an artefact of a test that stopped running.
 *
 * The properties below are the ones the table exists to guarantee. It was
 * written to stop `create-rule`'s `FAMILY_META`, the ID regex and doctor's
 * `VALID_ID` from drifting apart — CYP and SE scaffolded into QA-PW
 * categories, and the doctor accepted families the scaffolder rejected. With
 * the scaffolder gone, the remaining consumer cannot detect that drift on its
 * own: a family that stops matching a real rule directory would be accepted by
 * the doctor and named by nothing.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  RULE_FAMILIES,
  RULE_ID_RE,
  familyByToken,
} from "../../src/commands/rule-families.js";
import { RULES } from "../../src/rules/index.js";
import { KNOWN_RULE_IDS } from "../../src/engine/scan-pipeline.js";

const ROOT = join(import.meta.dirname, "..", "..");

describe("the rule-family table is internally consistent", () => {
  it("every token is unique, and every category is QA-<token>", () => {
    const tokens = RULE_FAMILIES.map((f) => f.token);
    expect(new Set(tokens).size, "duplicate tokens in RULE_FAMILIES").toBe(
      tokens.length,
    );
    // The convention every downstream consumer relies on: a rule's family
    // token and its category are the same name. When CYP reported under
    // QA-PW this was the assertion that would have caught it.
    for (const family of RULE_FAMILIES) {
      expect(
        family.category,
        `${family.token} declares category ${family.category}`,
      ).toBe(`QA-${family.token}`);
    }
  });

  it("every family that has rules has a source directory that exists", () => {
    // The table's `dir` is "the source directory under src/rules/". A family
    // WITH rules and WITHOUT a directory is a contradiction: the rules are
    // somewhere, the table says where, and it is wrong.
    //
    // A family with no rules is a different thing — WDIO, PPTR and APM
    // declare a framework the product recognises but has no detector for, and
    // their `dir` names a directory that does not exist because nothing has
    // been put in it. Asserting on those would make the test fail for
    // declaring a supported framework, which is not the same as shipping
    // something under it. The check is therefore driven by the REGISTRY, so
    // it cannot rot into a hand-kept list.
    const familiesWithRules = new Set(
      RULES.map((rule) => /^QA-([A-Z]+)-\d{3}$/.exec(rule.id)?.[1]),
    );
    let checked = 0;
    for (const family of RULE_FAMILIES) {
      if (!familiesWithRules.has(family.token)) continue;
      checked++;
      expect(
        existsSync(join(ROOT, "src", "rules", family.dir)),
        `${family.token} has ${[...RULES].filter((r) => r.id.startsWith(`QA-${family.token}-`)).length} rule(s) ` +
          `but points at src/rules/${family.dir}, which does not exist`,
      ).toBe(true);
    }
    // Every populated family was actually exercised — a loop that matched
    // nothing would pass the same way an empty file passes.
    expect(checked).toBeGreaterThan(0);
  });

  it("the ID regex accepts every family it is derived from", () => {
    for (const family of RULE_FAMILIES) {
      expect(
        RULE_ID_RE.test(`QA-${family.token}-001`),
        `RULE_ID_RE rejects its own ${family.token} family`,
      ).toBe(true);
    }
  });

  it("the ID regex rejects a family that is not in the table", () => {
    // The other direction. A regex that accepted everything would pass every
    // test above while accepting `QA-TT-999` — the exact id the anti-creep
    // spec uses as a synthetic rule, and one doctor's VALID_ID must refuse.
    for (const id of ["QA-TT-001", "QA-NOPE-001", "PW-001", "QA-PW-1"]) {
      expect(RULE_ID_RE.test(id), `RULE_ID_RE accepted ${id}`).toBe(false);
    }
  });
});

describe("the table and the registry agree", () => {
  it("every live rule's family token is in the table", () => {
    // The drift this table was built to prevent, restated against the
    // registry rather than against the scaffolder. A rule whose family is not
    // in the table produces an ID the doctor rejects — a rule that ships and
    // is then refused by the tool's own validator.
    for (const rule of RULES) {
      const [, token] = /^QA-([A-Z]+)-\d{3}$/.exec(rule.id) ?? [];
      expect(
        token,
        `${rule.id} does not parse as QA-<FAMILY>-NNN`,
      ).toBeDefined();
      if (token === undefined) continue;
      expect(
        familyByToken(token),
        `${rule.id} is in family ${token}, which is not in RULE_FAMILIES`,
      ).toBeDefined();
    }
  });

  it("every known rule ID is accepted by the regex the doctor validates with", () => {
    // KNOWN_RULE_IDS is what `mjolnir doctor` checks the registry against, so
    // the two must agree: a known ID the regex rejects is a doctor failure on
    // a correct registry.
    for (const id of KNOWN_RULE_IDS) {
      expect(
        RULE_ID_RE.test(id),
        `KNOWN_RULE_IDS contains ${id}, which RULE_ID_RE rejects`,
      ).toBe(true);
    }
  });
});

describe("familyByToken", () => {
  it("is case-insensitive, because a user types the family by hand", () => {
    expect(familyByToken("pw")?.token).toBe("PW");
    expect(familyByToken("PW")?.token).toBe("PW");
  });

  it("returns undefined for an unknown token rather than guessing", () => {
    expect(familyByToken("TT")).toBeUndefined();
  });
});
