/**
 * Registry ratchets — Verification Trust Evolution Plan §11.2 Step 2 and
 * §20 (continuous CI ratchets, enforced in code, not docs).
 *
 * §20.3: `tier === "core"` (effective) ⇒ a valid `MEASURED_FP` entry with
 * a matching `detectorRevision`. Unmeasured-in-effective-core is a hard
 * fail — the D3 policy hole closes here, mechanically.
 *
 * §20.1 evidence-state monotonicity:
 *   (a) an existing unmeasured rule may never become MORE unmeasured
 *       (trivially held while unmeasured means "no valid measurement";
 *       the tracked direction is tier: an unmeasured rule may never be
 *       promoted INTO effective core),
 *   (b) a new unmeasured rule may never be promoted to core,
 *   (c) the measured ratio of the pre-existing registry set must improve
 *       monotonically across releases, except behind a machine-detectable
 *       `MEASUREMENT-EXCEPTION` release marker in CHANGELOG.md.
 *
 * §20.5: a detectorRevision mismatch ⇒ stale measurement ⇒ provisional.
 * §20.6 recall floor: a core rule must fire somewhere in the corpus — a
 * "perfectly silent" rule is unvalidated, not perfect (corpus-baseline
 * data via tests/corpus/baseline/*.json count locks).
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { RETIRED_RULE_IDS, RULES } from "../src/rules/index.js";
import { MEASURED_FP } from "../src/rules/measured-fp.generated.js";
import { capForTier } from "../src/engine/tier-policy.js";
import {
  declaredDetectorRevision,
  effectiveTier,
  hasStaleMeasurement,
  hasValidMeasurement,
  isProvisional,
  ruleStatus,
} from "../src/rules/measurement.js";

const ROOT = join(import.meta.dirname, "..");
const BASELINE_DIR = join(ROOT, "tests", "corpus", "baseline");
const CHANGELOG = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
/** Version whose baseline the monotonicity ratchet compares against. */
const PREEXISTING_SET_MARKER = "0.5.0";

describe("registry ratchet: no unmeasured rule in effective core (§20.3, plan §11.2)", () => {
  it("every effective-core rule has a valid MEASURED_FP entry at a matching detectorRevision", () => {
    const offenders: string[] = [];
    for (const rule of RULES) {
      if (effectiveTier(rule) !== "core") continue;
      const m = MEASURED_FP[rule.id];
      if (!m) {
        offenders.push(`${rule.id}: effective core, no measurement`);
        continue;
      }
      if (m.detectorRevision !== declaredDetectorRevision(rule)) {
        offenders.push(
          `${rule.id}: measurement detectorRevision=${m.detectorRevision} ` +
            `but rule declares ${declaredDetectorRevision(rule)} (stale → provisional)`,
        );
      }
      if (m.fpRate > 0.1) {
        offenders.push(
          `${rule.id}: effective core with measured FP ${(m.fpRate * 100).toFixed(0)}% (> 10% ceiling)`,
        );
      }
      if (m.n < 10) {
        offenders.push(`${rule.id}: effective core with n=${m.n} (< 10)`);
      }
    }
    expect(
      offenders,
      `unmeasured/stale/over-FP rules in effective core (D3 policy hole reopened):\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("every measured entry's revision matches the rule's declared revision (§20.5)", () => {
    const byId = new Map(RULES.map((r) => [r.id, r]));
    for (const [id, m] of Object.entries(MEASURED_FP)) {
      const rule = byId.get(id);
      expect(rule, `${id} measured but absent from the registry`).toBeDefined();
      if (!rule) continue;
      expect(
        m.detectorRevision,
        `${id}: MEASURED_FP revision must equal the rule's declared detectorRevision (default 1); bump the rule, re-measure, or update the sidecar — never let a measurement silently cross an implementation change`,
      ).toBe(declaredDetectorRevision(rule));
    }
  });

  it("stale measurements are detectable and never display as measured (§07)", () => {
    // Synthetic double-check of the stale path: a rule whose declared
    // revision diverges from its measurement must be flagged stale and
    // must fail the core ratchet above. QA-PW-002 (measured, revision 1)
    // acts as the live fixture: overriding its declared revision makes
    // hasValidMeasurement false and hasStaleMeasurement true. §07:
    // stale → provisional → re-measure — the display must not claim a
    // measured status for a measurement that belongs to an older
    // detector implementation.
    const rule = RULES.find((r) => r.id === "QA-PW-002");
    expect(rule).toBeDefined();
    if (!rule) return;
    expect(hasValidMeasurement(rule)).toBe(true);
    expect(hasStaleMeasurement(rule)).toBe(false);
    const drifted: typeof rule = { ...rule, detectorRevision: 2 };
    expect(hasValidMeasurement(drifted)).toBe(false);
    expect(hasStaleMeasurement(drifted)).toBe(true);
    expect(ruleStatus(drifted)).toBe("PROVISIONAL");
    // And the core ratchet would fail for the drifted state — the path
    // Regex → AST → "old measurement says Core" → Core is blocked.
    expect(effectiveTier(drifted)).toBe("core");
  });
});

describe("registry ratchet: evidence-state monotonicity (§20.1)", () => {
  it("(b) no unmeasured rule sits in effective core (new or old)", () => {
    // (b) restated mechanically: the only way an unmeasured rule enters
    // the registry is provisional (extended) or quarantine; core requires
    // evidence. Covered exactly by the §20.3 test above — this duplicate
    // assertion exists so the (a)/(b)/(c) triple is visible as a unit.
    for (const rule of RULES) {
      if (effectiveTier(rule) === "core") {
        expect(hasValidMeasurement(rule), rule.id).toBe(true);
      }
    }
  });

  it("(c) the measured ratio improves monotonically vs the 0.5.0 baseline, or a MEASUREMENT-EXCEPTION marker exists", () => {
    // The pre-existing registry set at 0.5.0 measured 42/91. The ratchet
    // floor is that ratio; it only moves up unless the release carries
    // the machine-detectable exception marker (plan §03.3/§20.1c).
    const baseline = { measured: 42, total: 91 };
    const measured = RULES.filter((r) => hasValidMeasurement(r)).length;
    const total = RULES.length;
    const ratioNow = measured / total;
    const ratioFloor = baseline.measured / baseline.total;
    const exceptionMarker =
      /MEASUREMENT-EXCEPTION/.test(CHANGELOG) ||
      process.env.MEASUREMENT_EXCEPTION === "1";
    if (ratioNow < ratioFloor) {
      expect(
        exceptionMarker,
        `measured ratio regressed (${measured}/${total} < ${baseline.measured}/${baseline.total}) ` +
          `without a MEASUREMENT-EXCEPTION marker in CHANGELOG.md (plan §20.1c). ` +
          `Either restore the measurements or add the marker with a written justification.`,
      ).toBe(true);
    }
    void PREEXISTING_SET_MARKER;
  });

  it("(a) the unmeasured count never grows beyond the Phase 1 ceiling", () => {
    // (a) an existing unmeasured rule may never become more unmeasured —
    // unmeasured is binary, so the tracked quantity is the registry's
    // unmeasured count. Phase 1's exit gate drives it ≤ 20; until that
    // work completes, it may never exceed today's 49.
    const unmeasured = RULES.filter((r) => !hasValidMeasurement(r)).length;
    expect(unmeasured).toBeLessThanOrEqual(49);
  });
});

describe("registry ratchet: quarantine integrity (§11.2 Step 2 display contract)", () => {
  it("PROVISIONAL is a display status, never a tier value", () => {
    for (const rule of RULES) {
      if (rule.tier !== undefined) {
        expect(["core", "extended", "quarantine"]).toContain(rule.tier);
      }
      // Omitted tier is legitimate (§11.2 Step 2); it must resolve to
      // extended for every unmeasured rule — never to core.
      if (rule.tier === undefined) {
        expect(effectiveTier(rule), rule.id).toBe(
          hasValidMeasurement(rule) ? "core" : "extended",
        );
      }
      if (isProvisional(rule)) {
        expect(hasValidMeasurement(rule), rule.id).toBe(false);
      }
    }
  });

  it("every quarantine rule is capped by tier-policy at scan time (cap exists, severity untouched in metadata)", () => {
    // The cap is applied to FINDINGS by enforceTierPolicy (severity=info,
    // E0) — quarantine rules declare their natural severity and the
    // pipeline demotes. Assert the cap mapping exists for every declared
    // quarantine rule and that no other tier is capped.
    const byId = new Map(RULES.map((r) => [r.id, r]));
    for (const rule of RULES) {
      expect(
        (capForTier(rule.tier) !== null) === (rule.tier === "quarantine"),
        rule.id,
      ).toBe(true);
    }
    // Plugins may declare tiers too; the map lookup contract is the same.
    expect(capForTier(undefined)).toBeNull();
    expect(byId.size).toBe(RULES.length);
  });
});

describe("registry ratchet: recall floor (§20.6)", () => {
  it("every effective-core rule actually fires somewhere in the corpus baselines", () => {
    // A core rule that never fires on any real corpus repo is unvalidated,
    // not perfect. The count-lock baselines record per-repo per-rule fire
    // counts from real runScan runs.
    const firesSomewhere = new Set<string>();
    if (existsSync(BASELINE_DIR)) {
      for (const f of readdirSync(BASELINE_DIR).filter((n) =>
        n.endsWith(".json"),
      )) {
        const baseline = JSON.parse(
          readFileSync(join(BASELINE_DIR, f), "utf8"),
        ) as { countsByRule?: Record<string, number> };
        for (const [ruleId, count] of Object.entries(
          baseline.countsByRule ?? {},
        )) {
          if (count > 0) firesSomewhere.add(ruleId);
        }
      }
    }
    const silentCore = RULES.filter(
      (r) => effectiveTier(r) === "core" && !firesSomewhere.has(r.id),
    ).map((r) => r.id);
    expect(
      silentCore,
      "effective-core rules that fire nowhere in the corpus (recall floor §20.6)",
    ).toEqual([]);
  });
});

describe("frozen contracts", () => {
  it("RETIRED_RULE_IDS never overlaps the active registry", () => {
    const active = new Set(RULES.map((r) => r.id));
    for (const id of RETIRED_RULE_IDS) expect(active.has(id)).toBe(false);
  });
});
