/**
 * "Lint the linter" — rule metadata completeness (Test Hardening Plan).
 *
 * Every registered rule carries metadata that becomes user-facing text
 * (title, why, fix) or a machine contract field (category, severity,
 * qaImpact). None of that is checked in bulk anywhere — individual rule
 * tests check their own fixture output, but nothing scans the whole
 * registry for the class of mistake that's easy to make when adding the
 * 40th rule by copy-pasting the 39th: a stray duplicate ID, an empty
 * `why`, a category string that doesn't match the declared type.
 */

import { describe, expect, it } from "vitest";
import { RULES } from "../../src/rules/index.js";
import { SEVERITY_ORDER, QA_IMPACT_LABELS } from "../../src/types.js";

const KNOWN_CATEGORIES = ["QA-TEST", "QA-TQUAL", "QA-PW", "QA-CI", "QA-PY"];
const QA_IMPACT_VALUES = Object.keys(QA_IMPACT_LABELS);

describe("rule registry hygiene", () => {
  it("no two rules share the same ID", () => {
    const seen = new Map<string, number>();
    for (const r of RULES) seen.set(r.id, (seen.get(r.id) ?? 0) + 1);
    const dupes = [...seen.entries()].filter(([, n]) => n > 1);
    expect(dupes, `duplicate rule IDs: ${JSON.stringify(dupes)}`).toEqual([]);
  });

  it("every rule ID follows the QA-<FAMILY>-<NNN> convention", () => {
    for (const r of RULES) {
      expect(r.id, r.id).toMatch(/^QA-[A-Z]+-\d{3}$/);
    }
  });

  it("every rule declares a category, and it's one of the known families", () => {
    for (const r of RULES) {
      expect(
        KNOWN_CATEGORIES,
        `${r.id} has category "${r.category}", not in ${KNOWN_CATEGORIES.join(", ")}`,
      ).toContain(r.category);
    }
  });

  it("every rule's severity is a valid, ordered severity", () => {
    for (const r of RULES) {
      expect(SEVERITY_ORDER as readonly string[]).toContain(r.severity);
    }
  });

  it("every rule's qaImpact is a valid, documented QA-impact value", () => {
    for (const r of RULES) {
      expect(
        QA_IMPACT_VALUES,
        `${r.id} has qaImpact "${r.qaImpact}", not one of ${QA_IMPACT_VALUES.join(", ")}`,
      ).toContain(r.qaImpact);
    }
  });

  it("every rule has a non-trivial title (not empty, not a placeholder)", () => {
    for (const r of RULES) {
      expect(r.title.length, `${r.id} title`).toBeGreaterThan(3);
      expect(
        r.title.toLowerCase(),
        `${r.id} title looks like a stub`,
      ).not.toMatch(/^(todo|tbd|fixme|placeholder|untitled)/);
    }
  });

  it("every fired finding has non-empty why/fix text (the user-facing payoff)", () => {
    // Run each rule against a synthetic input engineered to match common
    // trigger keywords for its family, so most rules actually fire and
    // we check the real finding text, not just that the function exists.
    const probes: Array<{ path: string; text: string }> = [
      {
        path: "probe.spec.ts",
        text:
          "describe('x', () => {\n" +
          "  it.only('y', () => { expect(true).toBe(true); });\n" +
          "  // it('z', () => {});\n" +
          "  page.waitForTimeout(3000);\n" +
          "  page.evaluate(() => { return 1; });\n" +
          "  page.$('.btn');\n" +
          "});\n",
      },
      {
        path: "probe_test.py",
        text:
          "def test_x():\n" +
          "    time.sleep(3)\n" +
          "    assert True\n" +
          "\n" +
          "def test_y():\n" +
          "    pass\n",
      },
      {
        path: ".github/workflows/probe.yml",
        text: "jobs:\n  a:\n    steps:\n      - run: exit 1 || true\n        continue-on-error: true\n",
      },
    ];

    let checked = 0;
    for (const r of RULES) {
      for (const probe of probes) {
        let findings;
        try {
          findings = r.run(probe);
        } catch {
          continue;
        }
        for (const f of findings) {
          checked++;
          expect(
            f.why?.length,
            `${r.id} why (on ${probe.path})`,
          ).toBeGreaterThan(0);
          expect(
            f.fix?.length,
            `${r.id} fix (on ${probe.path})`,
          ).toBeGreaterThan(0);
          expect(f.message?.length, `${r.id} message`).toBeGreaterThan(0);
        }
      }
    }
    // Sanity: the probes should actually have exercised a meaningful
    // slice of the registry, not silently matched nothing.
    expect(checked).toBeGreaterThan(10);
  });
});
