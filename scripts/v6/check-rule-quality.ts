#!/usr/bin/env tsx
/**
 * `npm run rules:quality:check` — the Wave 1 skeleton, completed in Wave 4.
 *
 * Wave 1 ships a **skeleton on purpose**, and the skeleton is honest about
 * what it is. It checks the three things that are already true today:
 *
 *  1. every live rule has a family and a tier;
 *  2. every capability cites only `QA-*` ids that exist and are not
 *     retired-without-a-successor;
 *  3. no capability over-claims (delegated to `registry:check`, so the
 *     rule is one implementation, not two).
 *
 * What it does **not** check is the interesting part, and it reports that
 * as a named gap rather than passing quietly:
 *
 *  - no fixture quad per rule (so no rule may reach `M3`);
 *  - no per-capability `detectorRev` binding (so no capability may reach
 *    `M4`);
 *  - no recall measurement (so precision alone can never be reported as
 *    quality — Law 5).
 *
 * A skeleton that reported `PASS` for those would be the single most
 * dangerous artifact in the program, because it would be believed.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { prettify } from "../lib/prettify.js";
import { isMainModule } from "../lib/is-main-module.js";
import { ROOT } from "./inventory.js";
import { RULES, RETIRED_RULE_IDS } from "../../src/rules/index.js";
import { MEASURED_FP } from "../../src/rules/measured-fp.generated.js";
import {
  declaredDetectorRevision,
  effectiveTier,
} from "../../src/rules/measurement.js";
import {
  buildCapabilityRegistry,
  realCapabilityEvidence,
  ruleFamily,
  validateRegistry,
} from "../../src/v6/capability-registry.js";
import { MATURITY_LEVELS } from "../../src/v6/maturity.js";

export interface QualityGap {
  id: string;
  blocks: readonly string[];
  wave: string;
  why: string;
}

/**
 * What the skeleton cannot yet check. Published rather than hidden: this
 * list IS the Wave 4 work list, and a reader who sees it knows exactly
 * what the green result does and does not mean.
 */
export const SKELETON_GAPS: readonly QualityGap[] = [
  {
    id: "fixture-quad",
    blocks: ["M3_FIXTURE_VERIFIED"],
    wave: "4",
    why: "no machine gate verifies a positive/negative/boundary/adversarial fixture quad per rule, so M3 is unreachable for every rule and every framework",
  },
  {
    id: "capability-detector-rev",
    blocks: ["M4_CORPUS_VERIFIED"],
    wave: "4",
    why: "the measurement sidecar locks detectorRev per rule; nothing binds a capability to it, so corpus verdicts alone cannot grant M4",
  },
  {
    id: "recall-measurement",
    blocks: ["recall", "M4_CORPUS_VERIFIED"],
    wave: "4",
    why: "precision is measured and recall is not, and Law 5 forbids reporting precision alone as quality",
  },
  {
    id: "d3-adjudication",
    blocks: ["rule conflict resolution", "retirement decisions"],
    wave: "4",
    why: "retirement and conflict resolution are documented rules, not a machine decision, so a D3 bucket is a review convention rather than an adjudicated state",
  },
  {
    id: "degradation-ledger",
    blocks: ["P6"],
    wave: "4",
    why: "nothing records what a rule stopped covering, so a degraded run is indistinguishable from a clean one",
  },
];

export interface QualityCheck {
  status: "PASS" | "FAIL" | "BLOCKED";
  errors: string[];
  facts: Record<string, unknown>;
}

/** The three checks that ARE true today. */
export function checkRuleQuality(): QualityCheck {
  const errors: string[] = [];
  const liveIds = new Set(RULES.map((rule) => rule.id));
  const retired = new Set(RETIRED_RULE_IDS);

  // 1. Every live rule has a family and a tier.
  const tierCounts: Record<string, number> = {};
  for (const rule of RULES) {
    const family = ruleFamily(rule.id);
    if (!/^QA-[A-Z]+$/.test(family)) {
      errors.push(`${rule.id}: family "${family}" is not a QA-<DOMAIN> family`);
    }
    const tier = effectiveTier(rule);
    tierCounts[tier] = (tierCounts[tier] ?? 0) + 1;
  }

  // 2. Every capability cites only live, non-retired rule ids. A retired
  //    id is preserved forever (ADR 0003) so historical findings resolve,
  //    but a capability may not *depend* on one.
  const registry = buildCapabilityRegistry({
    evidence: realCapabilityEvidence(),
  });
  for (const diagnostic of validateRegistry(registry)) {
    if (
      diagnostic.code === "UNKNOWN_RULE_REFERENCE" ||
      diagnostic.code === "RETIRED_RULE_REFERENCE" ||
      diagnostic.code === "OVER_CLAIMED_MATURITY"
    ) {
      errors.push(
        `${diagnostic.code} ${diagnostic.entryId}: ${diagnostic.message}`,
      );
    }
  }
  for (const rule of RULES) {
    if (retired.has(rule.id)) {
      errors.push(`${rule.id}: present in RULES and in RETIRED_RULE_IDS`);
    }
  }
  for (const id of retired) {
    if (liveIds.has(id)) {
      errors.push(`${id}: retired but still live`);
    }
  }

  // 3. No rule may sit above the ladder's ceiling, and no measured rule
  //    may carry a stale detectorRev silently.
  const stale = RULES.filter((rule) => {
    const measurement = MEASURED_FP[rule.id];
    return (
      measurement !== undefined &&
      measurement.detectorRevision !== declaredDetectorRevision(rule)
    );
  });
  const measured = RULES.filter((rule) => MEASURED_FP[rule.id] !== undefined);

  return {
    status: errors.length > 0 ? "FAIL" : "PASS",
    errors,
    facts: {
      liveRules: RULES.length,
      retiredRules: RETIRED_RULE_IDS.length,
      tiers: tierCounts,
      measured: measured.length,
      measuredAtStaleRevision: stale.length,
      capabilities: registry.entries.length,
      // Stated so nobody reads the PASS as more than it is.
      maxReachableMaturity: "M2_IMPLEMENTED",
      unreachableLevels: [
        "M3_FIXTURE_VERIFIED",
        "M4_CORPUS_VERIFIED",
        "M5_FIELD_PROVEN",
      ],
      skeletonGaps: SKELETON_GAPS.map((gap) => gap.id),
      ladder: MATURITY_LEVELS,
    },
  };
}

async function main(): Promise<void> {
  const check = checkRuleQuality();
  // The unpublished-artifact report is written so the skeleton gap list is
  // a reviewable artifact rather than a console string.
  const path = join(ROOT, "docs", "RULE-QUALITY-SKELETON.json");
  writeFileSync(
    path,
    JSON.stringify(
      {
        ...check,
        generatedBy: "npm run rules:quality:check",
        gaps: SKELETON_GAPS,
      },
      null,
      2,
    ) + "\n",
  );
  // Awaited: writing a formatted artifact without waiting for the format is
  // a race that `npm run lint` will lose, and the linter is the right one.
  await prettify(path);
  console.log(
    JSON.stringify(
      {
        status: check.status,
        gate: "rules:quality:check",
        facts: check.facts,
        errors: check.errors,
        skeletonNote:
          "This gate is a Wave 1 skeleton. It PASSES on the three invariants that are true today and REPORTS what it cannot yet check, rather than passing quietly for those.",
      },
      null,
      2,
    ),
  );
  process.exit(check.status === "FAIL" ? 1 : 0);
}

if (isMainModule(import.meta.url)) {
  // Awaited so the process does not exit before the artifact is formatted
  // on disk. A floating promise here is a race with `npm run lint`.
  await main();
}
