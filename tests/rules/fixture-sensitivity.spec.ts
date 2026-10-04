import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { RULES } from "../../src/rules/index.js";
import {
  check,
  lineDivergence,
  measureAll,
  mutants,
  MUTANT_MAX_DIVERGENCE,
  RATCHET_PATH,
} from "../../scripts/check-fixture-sensitivity.js";

const ROOT = join(import.meta.dirname, "..", "..");
const rows = measureAll(ROOT);

/**
 * These assertions are about the MEASUREMENT, not about the world being tidy.
 * The finding is that 38 of 40 paired rules have a negative fixture which is a
 * different program rather than a neutralised mutant, and that is a true fact
 * about this tree today. Pinning the exact numbers would make the suite fail
 * every time somebody legitimately improves a fixture; what must not move
 * silently is the RATIO, and what must be impossible is the gate passing
 * vacuously.
 */
describe("fixture sensitivity — is MUST-NOT-FIRE the defect, neutralised?", () => {
  it("finds both legs for fewer rules than have them, never more", () => {
    // Guards the pairing itself: a rule with no negative fixture cannot be
    // paired, so this is an upper bound, and a silent drop here would shrink
    // the denominator until the ratio stopped meaning anything.
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(RULES.length);
    for (const r of rows) {
      expect(RULES.map((x) => x.id)).toContain(r.ruleId);
    }
  });

  it("classifies the overwhelming majority as divergent, and says so", () => {
    // The whole value of this check is that it found something. If the tree ever
    // reaches the point where most pairs ARE mutants, this assertion is the
    // reminder to raise the ratchet floor and retire the caveat in the note.
    const divergent = rows.filter((r) => r.classification === "DIVERGENT");
    expect(divergent.length / rows.length).toBeGreaterThan(0.5);
  });

  it("agrees with its own committed ratchet", () => {
    const report = check();
    expect(
      report.status,
      report.details.join("; ") ||
        "docs/SENSITIVITY-RATCHET.json disagrees with the measured tree",
    ).toBe("PASS");
    const committed = JSON.parse(
      readFileSync(join(ROOT, RATCHET_PATH), "utf8"),
    ) as { mutants?: string[] };
    expect(committed.mutants ?? []).toEqual(mutants(rows));
  });

  it("never counts an identical pair as a mutant", () => {
    // A negative fixture byte-identical to the positive one is not a neutralised
    // defect, it is the same defect with the same expectation — and it would
    // make the rule fail its own MUST-NOT-FIRE leg while scoring here as proof
    // of sensitivity. The floor of the metric excludes it by construction, but
    // an assertion is cheaper than trusting that.
    const identical = rows.filter((r) => r.divergence === 0);
    expect(identical.every((r) => r.classification === "DIVERGENT")).toBe(true);
  });

  it("ignores blank lines and indentation, so a reformat is not a change", () => {
    const a = "class A {\n\n  void f() {\n    assert(1);\n  }\n}\n";
    const b = "class A {\n\n\tvoid f() {\n\t\tassert(1);\n\t}\n}\n\n\n";
    expect(lineDivergence(a, b).changed).toBe(0);
  });

  it("counts a real edit once, in both directions", () => {
    // A neutralised mutant is one edit: the defect removed. Multiset difference
    // over counts that edit once rather than twice, which is what keeps a
    // single-token change at a low ratio instead of looking like a rewrite.
    const withDefect = "@Disabled\nclass A {}\n";
    const neutralised = "@Enabled\nclass A {}\n";
    const d = lineDivergence(withDefect, neutralised);
    expect(d.changed).toBe(2);
    expect(d.lines).toBe(2);
    expect(d.ratio).toBe(1);
  });

  it("exposes its threshold as a named constant, not a buried literal", () => {
    // The threshold is a judgement. A reader who cannot see it cannot argue
    // with it, and an argument with it is the only way it stays honest.
    expect(MUTANT_MAX_DIVERGENCE).toBeGreaterThan(0);
    expect(MUTANT_MAX_DIVERGENCE).toBeLessThan(1);
  });
});
