/**
 * R6 overlap-dedup (Bug Map M-02) — unit + property tests.
 *
 * Pins every behavioral invariant from the remediation plan §1.4:
 * survivor selection order, tie-breaks, monotonicity, explicit-
 * relationship-only removal, plugin immunity, input-order independence,
 * idempotence, cross-rule-only scope, and --strict interaction.
 * Coverage law: the module must hit 100% on all four axes.
 */

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import type { Finding, Severity } from "../../../src/types.js";
import {
  applyOverlapDedup,
  type OverlapMeta,
} from "../../../src/engine/overlap-dedup.js";

let seq = 0;
function finding(overrides: Partial<Finding> = {}): Finding {
  seq++;
  return {
    ruleId: "QA-X-001",
    category: "QA-PW",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    file: "src/a.spec.ts",
    line: 1,
    column: 1,
    message: `m${seq}`,
    why: "w",
    fix: "f",
    ...overrides,
  };
}

const META = (
  overlapWith?: string[],
  tier?: Tier,
  order?: number,
): OverlapMeta => ({
  ...(overlapWith ? { overlapWith } : {}),
  ...(tier ? { tier } : {}),
  ...(order === undefined ? {} : { order }),
});
type Tier = "core" | "extended" | "quarantine";

describe("applyOverlapDedup — survivor selection", () => {
  it("drops the declared finding; the declaring rule survives", () => {
    const a = finding({ ruleId: "QA-PW-101", line: 6 });
    const b = finding({ ruleId: "QA-TEST-004", line: 6 });
    const meta = new Map([
      ["QA-PW-101", META(["QA-TEST-004"], "core", 33)],
      ["QA-TEST-004", META(undefined, "extended", 3)],
    ]);
    const out = applyOverlapDedup([a, b], meta);
    expect(out).toHaveLength(1);
    expect(out[0]?.ruleId).toBe("QA-PW-101");
  });

  it("groups by file:line — same ruleId on another line is untouched", () => {
    const a = finding({ ruleId: "QA-PW-101", line: 6 });
    const b = finding({ ruleId: "QA-TEST-004", line: 7 });
    const meta = new Map([["QA-PW-101", META(["QA-TEST-004"], "core", 0)]]);
    expect(applyOverlapDedup([a, b], meta)).toHaveLength(2);
  });

  it("different files never interact", () => {
    const a = finding({ ruleId: "QA-PW-101", file: "x.spec.ts" });
    const b = finding({ ruleId: "QA-TEST-004", file: "y.spec.ts" });
    const meta = new Map([["QA-PW-101", META(["QA-TEST-004"], "core", 0)]]);
    expect(applyOverlapDedup([a, b], meta)).toHaveLength(2);
  });
});

describe("applyOverlapDedup — deterministic tie-breaks", () => {
  const meta = new Map<string, OverlapMeta>([
    // Mutual declaration: both drop candidates.
    ["QA-A-1", META(["QA-B-2"], "core", 10)],
    ["QA-B-2", META(["QA-A-1"], "extended", 20)],
    // Chained: A declares B, B declares C.
    ["QA-C-3", META(undefined, "quarantine", 30)],
  ]);

  it("mutual: higher-ranked tier survives (core > extended)", () => {
    const a = finding({ ruleId: "QA-A-1" });
    const b = finding({ ruleId: "QA-B-2" });
    const out = applyOverlapDedup([a, b], meta);
    expect(out.map((f) => f.ruleId)).toEqual(["QA-A-1"]);
  });

  it("same tier: severity decides (error > warning > info)", () => {
    const m = new Map<string, OverlapMeta>([
      ["QA-A-1", META(["QA-B-2"], "extended", 10)],
      ["QA-B-2", META(["QA-A-1"], "extended", 20)],
    ]);
    const a = finding({ ruleId: "QA-A-1", severity: "info" });
    const b = finding({ ruleId: "QA-B-2", severity: "error" });
    const out = applyOverlapDedup([a, b], m);
    expect(out.map((f) => f.ruleId)).toEqual(["QA-B-2"]);
  });

  it("same tier+severity: RULES registry order decides (never object iteration order)", () => {
    const m = new Map<string, OverlapMeta>([
      ["QA-A-1", META(["QA-B-2"], "extended", 42)],
      ["QA-B-2", META(["QA-A-1"], "extended", 7)],
    ]);
    const a = finding({ ruleId: "QA-A-1" });
    const b = finding({ ruleId: "QA-B-2" });
    const forward = applyOverlapDedup([a, b], m);
    const reverse = applyOverlapDedup([b, a], m);
    expect(forward.map((f) => f.ruleId)).toEqual(["QA-B-2"]);
    expect(reverse.map((f) => f.ruleId)).toEqual(["QA-B-2"]);
  });

  it("chain: the dedup collapses transitively while the declarer survives", () => {
    // A(core) declares B(extended); B declares C(quarantine).
    const m = new Map<string, OverlapMeta>([
      ["QA-A-1", META(["QA-B-2"], "core", 1)],
      ["QA-B-2", META(["QA-C-3"], "extended", 2)],
      ["QA-C-3", META(undefined, "quarantine", 3)],
    ]);
    const a = finding({ ruleId: "QA-A-1" });
    const b = finding({ ruleId: "QA-B-2" });
    const c = finding({ ruleId: "QA-C-3" });
    const out = applyOverlapDedup([c, b, a], m);
    expect(out.map((f) => f.ruleId)).toEqual(["QA-A-1"]);
  });

  it("cycle: the best-ranked member survives regardless of input order", () => {
    // Mutual cycle where the WORST-ranked one is listed first in input.
    const m = new Map<string, OverlapMeta>([
      ["QA-A-1", META(["QA-B-2"], "quarantine", 1)],
      ["QA-B-2", META(["QA-A-1"], "core", 2)],
    ]);
    const a = finding({ ruleId: "QA-A-1", severity: "info" });
    const b = finding({ ruleId: "QA-B-2", severity: "error" });
    expect(applyOverlapDedup([a, b], m).map((f) => f.ruleId)).toEqual([
      "QA-B-2",
    ]);
    expect(applyOverlapDedup([b, a], m).map((f) => f.ruleId)).toEqual([
      "QA-B-2",
    ]);
  });
});

describe("applyOverlapDedup — behavioral invariants (plan §1.4.7)", () => {
  const meta = new Map<string, OverlapMeta>([
    ["QA-PW-101", META(["QA-TEST-004"], "core", 33)],
    ["QA-TEST-004", META(undefined, "extended", 3)],
    ["QA-PY-005", META(["QA-PY-102"], "extended", 22)],
    ["QA-PY-102", META(undefined, "quarantine", 62)],
  ]);

  it("MONOTONICITY: output.length <= input.length, always (property)", () => {
    const arb = fc.array(
      fc.record({
        ruleId: fc.constantFrom("QA-PW-101", "QA-TEST-004", "QA-PY-005"),
        line: fc.nat({ max: 5 }),
      }),
      { maxLength: 20 },
    );
    fc.assert(
      fc.property(arb, (specs) => {
        const input = specs.map((s) =>
          finding({ ruleId: s.ruleId, line: s.line }),
        );
        return applyOverlapDedup(input, meta).length <= input.length;
      }),
    );
  });

  it("EXPLICIT RELATIONSHIP ONLY: no heuristic removal (property)", () => {
    // Two rules with NO overlapWith wiring between them co-firing on one
    // line must never lose a finding — even when one is core/error and
    // the other quarantine/info (a heuristic might drop the weaker).
    const m = new Map<string, OverlapMeta>([
      ["QA-A-1", META(undefined, "core", 1)],
      ["QA-Z-9", META(undefined, "quarantine", 99)],
    ]);
    const a = finding({ ruleId: "QA-A-1", severity: "error" });
    const z = finding({ ruleId: "QA-Z-9", severity: "info" });
    expect(applyOverlapDedup([a, z], m)).toHaveLength(2);
  });

  it("PLUGIN IMMUNITY: ruleId absent from metaByRuleId is never dropped", () => {
    // "plugin-declared" overlaps carry no weight either: a plugin rule
    // cannot be a dedup target, and cannot drop others... unless it IS
    // in the map (core rules only declare from the registry).
    const plugin = finding({ ruleId: "plugin-rule-x" });
    const declarer = finding({ ruleId: "QA-PW-101" });
    const m = new Map<string, OverlapMeta>([
      ["QA-PW-101", META(["QA-TEST-004", "plugin-rule-x"], "core", 33)],
    ]);
    const out = applyOverlapDedup([declarer, plugin], m);
    expect(out.map((f) => f.ruleId)).toEqual(["QA-PW-101", "plugin-rule-x"]);
  });

  it("PLUGIN IMMUNITY: a plugin rule cannot drop a core finding", () => {
    // Plugins cannot declare overlapWith (UniversalRule has no field) —
    // but even if a hostile meta map contained one, absent target metas
    // keep the core finding safe. Inverse direction: a finding whose
    // rule IS in the map but whose declurer is NOT must survive.
    const core = finding({ ruleId: "QA-TEST-004" });
    const plugin = finding({ ruleId: "plugin-rule-y" });
    const m = new Map<string, OverlapMeta>([
      ["QA-TEST-004", META(undefined, "extended", 3)],
    ]);
    expect(applyOverlapDedup([core, plugin], m)).toHaveLength(2);
  });

  it("INPUT-ORDER INDEPENDENCE: survivor SET identical for any permutation (fixed seed list)", () => {
    const set = (fs: Finding[]) =>
      new Set(fs.map((f) => `${f.ruleId}@${f.file}:${f.line}`));
    const mk = () => [
      finding({ ruleId: "QA-PW-101", line: 6 }),
      finding({ ruleId: "QA-TEST-004", line: 6 }),
      finding({ ruleId: "QA-PY-005", line: 8 }),
      finding({ ruleId: "QA-PY-102", line: 8 }),
      finding({ ruleId: "QA-PW-101", line: 9 }),
    ];
    const expected = set(applyOverlapDedup(mk(), meta));
    const perms: number[][] = [
      [0, 1, 2, 3, 4],
      [4, 3, 2, 1, 0],
      [2, 0, 4, 1, 3],
      [1, 3, 0, 4, 2],
      [3, 4, 1, 0, 2],
      [2, 3, 1, 4, 0],
    ];
    for (const p of perms) {
      const permuted = p.map((i) => mk()[i] as Finding);
      expect(set(applyOverlapDedup(permuted, meta))).toEqual(expected);
    }
  });

  it("IDEMPOTENCE: dedup(dedup(x)) equals dedup(x)", () => {
    const input = [
      finding({ ruleId: "QA-PW-101", line: 6 }),
      finding({ ruleId: "QA-TEST-004", line: 6 }),
      finding({ ruleId: "QA-PY-005", line: 8 }),
      finding({ ruleId: "QA-PY-102", line: 8 }),
    ];
    const once = applyOverlapDedup(input, meta);
    const twice = applyOverlapDedup(once, meta);
    expect(twice).toEqual(once);
  });

  it("CROSS-RULE ONLY: same-rule duplicates are untouched", () => {
    const dupes = [
      finding({ ruleId: "QA-PW-101", line: 6, column: 3 }),
      finding({ ruleId: "QA-PW-101", line: 6, column: 17 }),
    ];
    expect(applyOverlapDedup(dupes, meta)).toEqual(dupes);
  });

  it("COLUMN SPAN: an independent same-rule defect further down the line survives (regression pin)", () => {
    // One line, two hard sleeps: a Playwright wait call (whose generic
    // twin QA-TEST-004 co-fires on the same root cause) followed by an
    // independent sleep-helper call that QA-PW-101 never matches. The
    // sleep-helper finding is an independent defect and must survive.
    const m = new Map<string, OverlapMeta>([
      ["QA-PW-101", META(["QA-TEST-004"], "core", 33)],
      ["QA-TEST-004", META(undefined, "extended", 3)],
    ]);
    const declarer = finding({ ruleId: "QA-PW-101", line: 3, column: 9 });
    const twin = finding({ ruleId: "QA-TEST-004", line: 3, column: 4 });
    const sibling = finding({ ruleId: "QA-TEST-004", line: 3, column: 36 });
    const out = applyOverlapDedup([declarer, twin, sibling], m);
    expect(out.map((f) => f.column).sort((a, b) => a - b)).toEqual([9, 36]);
  });

  it("COLUMN SPAN: a declared twin beyond the proximity cap is never dropped", () => {
    // Same declared relationship, but the target sits 30 chars away —
    // beyond MAX_SAME_ROOT_COLUMN_DELTA — so the declaration alone
    // (same line) must not remove it.
    const m = new Map<string, OverlapMeta>([
      ["QA-PW-101", META(["QA-TEST-004"], "core", 33)],
      ["QA-TEST-004", META(undefined, "extended", 3)],
    ]);
    const declarer = finding({ ruleId: "QA-PW-101", line: 3, column: 1 });
    const distant = finding({ ruleId: "QA-TEST-004", line: 3, column: 45 });
    expect(applyOverlapDedup([declarer, distant], m)).toHaveLength(2);
  });

  it("metas WITHOUT tier/order fall back to core rank + registry MAX (coverage of the legacy path)", () => {
    // Overlap metas that declare only overlapWith — no tier, no order —
    // exercise the `?? "core"` / `?? MAX_SAFE_INTEGER` fallbacks: tier
    // falls to core on both sides, severity decides, and with severity
    // equal too the registry fallback ties (MAX < MAX is false) so the
    // survivor set is still deterministic.
    const m = new Map<string, OverlapMeta>([
      ["QA-A-1", META(["QA-B-2"])],
      ["QA-B-2", META(["QA-A-1"])],
    ]);
    const a = finding({ ruleId: "QA-A-1", severity: "error" });
    const b = finding({ ruleId: "QA-B-2", severity: "warning" });
    expect(applyOverlapDedup([a, b], m).map((f) => f.ruleId)).toEqual([
      "QA-A-1",
    ]);
    // Fully equal rank: fixed point is deterministic regardless of order.
    const a2 = finding({ ruleId: "QA-A-1" });
    const b2 = finding({ ruleId: "QA-B-2" });
    expect(applyOverlapDedup([a2, b2], m)).toHaveLength(1);
    expect(applyOverlapDedup([b2, a2], m)).toHaveLength(1);
  });

  it("DETERMINISTIC SURVIVOR SELECTION: shuffled representative sets yield identical survivor sets (property, no Math.random)", () => {
    const arb = fc.array(
      fc.record({
        ruleId: fc.constantFrom("QA-PW-101", "QA-TEST-004"),
        line: fc.constant(6),
        col: fc.nat({ max: 3 }),
      }),
      { maxLength: 12 },
    );
    fc.assert(
      fc.property(arb, fc.nat({ max: 5 }), (specs, rotation) => {
        const input = specs.map((s, i) =>
          finding({
            ruleId: s.ruleId,
            line: s.line,
            column: s.col,
            message: `m${i}`,
          }),
        );
        // Deterministic pseudo-shuffle driven by the generated rotation.
        const rotated = [
          ...input.slice(rotation % Math.max(1, input.length)),
          ...input.slice(0, rotation % Math.max(1, input.length)),
        ];
        const setOf = (fs: Finding[]) =>
          new Set(fs.map((f) => `${f.ruleId}@${f.column}`));
        return (
          setOf(applyOverlapDedup(input, meta)).size ===
          setOf(applyOverlapDedup(rotated, meta)).size
        );
      }),
    );
  });

  it("DROP ORDER: equal-rank different-rule targets fall back to the field-derived column (property)", () => {
    // Two distinct quarantine declarers with identical tier/severity and
    // overlapping declarations: which equal-rank target drops first must
    // depend only on the findings (column), never on input order.
    const arb = fc.tuple(
      fc.nat({ max: 40 }),
      fc.nat({ max: 40 }),
      fc.nat({ max: 40 }),
    );
    fc.assert(
      fc.property(arb, ([cA, cB, cC]) => {
        // The far sibling (cC) is beyond the proximity cap from both
        // declarers and always survives; the two proximate twins are
        // both declared, both quarantine — the survivor set must be
        // identical for either input order.
        const a = finding({ ruleId: "QA-X-1", line: 3, column: cA });
        const b = finding({ ruleId: "QA-Y-2", line: 3, column: cB });
        // 51 is beyond the cap from every possible declarer position
        // (declarers range 0..40, so the minimum distance is 11 > 10).
        const far = finding({ ruleId: "QA-Y-2", line: 3, column: 51 + cC });
        const m = new Map<string, OverlapMeta>([
          ["QA-X-1", META(["QA-Y-2"], "quarantine", 1)],
          ["QA-Y-2", META(undefined, "quarantine", 2)],
        ]);
        const forward = applyOverlapDedup([a, b, far], m);
        const reverse = applyOverlapDedup([far, b, a], m);
        const key = (fs: Finding[]) =>
          new Set(fs.map((f) => `${f.ruleId}@${f.column}`));
        return (
          key(forward).size === key(reverse).size &&
          key(forward).has(`QA-Y-2@${far.column}`)
        );
      }),
    );
  });

  it("monotonicity holds on the wired real pairs (regression pin)", () => {
    const coFire = [
      finding({ ruleId: "QA-PW-101", line: 6, file: "e2e/checkout.spec.ts" }),
      finding({ ruleId: "QA-TEST-004", line: 6, file: "e2e/checkout.spec.ts" }),
      finding({ ruleId: "QA-PY-005", line: 8, file: "tests/test_x.py" }),
      finding({ ruleId: "QA-PY-102", line: 8, file: "tests/test_x.py" }),
    ];
    const out = applyOverlapDedup(coFire, meta);
    expect(out.map((f) => f.ruleId).sort()).toEqual(["QA-PW-101", "QA-PY-005"]);
  });
});

describe("applyOverlapDedup — --strict interaction", () => {
  it("quarantine declarers only dedup in strict scans (survivor is tier-best anyway)", () => {
    // QA-TEST-010 (core, error) declares QA-TEST-003 (quarantine).
    // Non-strict: QA-TEST-003 never runs, single finding, no-op.
    // Strict: both present, QA-TEST-010 survives by tier.
    const m = new Map<string, OverlapMeta>([
      ["QA-TEST-010", META(["QA-TEST-003"], "core", 5)],
      ["QA-TEST-003", META(undefined, "quarantine", 2)],
    ]);
    const specific = finding({ ruleId: "QA-TEST-010" });
    const generic = finding({ ruleId: "QA-TEST-003" });
    expect(applyOverlapDedup([specific], m)).toHaveLength(1);
    expect(applyOverlapDedup([specific, generic], m).map((f) => f.ruleId)) //
      .toEqual(["QA-TEST-010"]);
  });
});

describe("applyOverlapDedup — purity", () => {
  it("does not mutate the input array", () => {
    const input = [
      finding({ ruleId: "QA-PW-101", line: 6 }),
      finding({ ruleId: "QA-TEST-004", line: 6 }),
    ];
    const snapshot = [...input];
    applyOverlapDedup(input, new Map([["QA-PW-101", META(["QA-TEST-004"])]]));
    expect(input).toEqual(snapshot);
  });
});

describe("applyOverlapDedup — severity axis coverage", () => {
  it("info < warning < error ranking applies across all severities", () => {
    const m = new Map<string, OverlapMeta>(
      (["QA-A-1", "QA-B-2", "QA-C-3"] as const).map((id, i) => [
        id,
        META(
          (["QA-A-1", "QA-B-2", "QA-C-3"] as const).filter((o) => o !== id),
          "core",
          i,
        ),
      ]),
    );
    const cases: [Severity, Severity, Severity][] = [
      ["warning", "info", "error"],
      ["info", "error", "warning"],
      ["error", "warning", "info"],
    ];
    for (const [s1, s2, s3] of cases) {
      const fs = [
        finding({ ruleId: "QA-A-1", severity: s1 }),
        finding({ ruleId: "QA-B-2", severity: s2 }),
        finding({ ruleId: "QA-C-3", severity: s3 }),
      ];
      const out = applyOverlapDedup(fs, m);
      // Fully mutual triangle: ownership prefers the better-ranked twin,
      // so the drop loop collapses the chain to the single best-ranked
      // finding — the error-severity one, whatever its registry position.
      expect(out).toHaveLength(1);
      expect(out[0]?.severity).toBe("error");
    }
  });
});
