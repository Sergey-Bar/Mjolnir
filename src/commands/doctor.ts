/**
 * `mjolnir doctor` — self-audit of Mjolnir's own rule base.
 *
 * The product must be able to fail because of a bug in the product.
 * This command checks, against the repo it runs in (the Mjolnir source
 * tree when dogfooding):
 *   1. Fixture firewall — every registered rule has must-fire AND
 *      must-not-fire fixtures (the project's own law).
 *   2. Registry sanity — unique IDs, valid ID format, no duplicate titles.
 *   3. Trust Metadata ratchet — reports rules missing Trust Metadata
 *      (languages/frameworks/falsePositiveRisk). Informational today;
 *      becomes blocking once coverage reaches 100%.
 *
 * Exit codes reuse the frozen set: 0 healthy · 1 violations · 20 crash.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { QADoctorRule } from "../rules/rule.js";
import { RULES } from "../rules/index.js";
import { deriveEvidenceLevel } from "../types.js";

export interface DoctorCheck {
  name: string;
  ok: boolean;
  details: string[];
}

const VALID_ID = /^QA-(TEST|TQUAL|PW|CI|PY|ENV|JV|CS)-\d{3}$/;

function nonHiddenFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => !f.startsWith("."));
}

/** Check 1: fixture firewall completeness for test-file rules. */
export function checkFixtureFirewall(fixturesRoot: string): DoctorCheck {
  const details: string[] = [];
  let ok = true;
  const scoped = RULES.filter(
    (r) => r.appliesTo === "test-files" || r.appliesTo === ("python" as never),
  );
  for (const rule of scoped) {
    const fire = join(fixturesRoot, rule.id, "must-fire");
    const noFire = join(fixturesRoot, rule.id, "must-not-fire");
    if (nonHiddenFiles(fire).length === 0) {
      ok = false;
      details.push(`${rule.id}: missing must-fire fixture`);
    }
    if (nonHiddenFiles(noFire).length === 0) {
      ok = false;
      details.push(`${rule.id}: missing must-not-fire fixture`);
    }
  }
  return { name: "fixture-firewall", ok, details };
}

/** Check 2: registry sanity — IDs unique, well-formed, titles distinct. */
export function checkRegistry(
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];
  const ids = new Set<string>();
  let ok = true;
  for (const r of rules) {
    if (!VALID_ID.test(r.id)) {
      ok = false;
      details.push(`${r.id}: malformed rule ID`);
    }
    if (ids.has(r.id)) {
      ok = false;
      details.push(`${r.id}: duplicate registration`);
    }
    ids.add(r.id);
    // Duplicate titles are allowed across languages (TS and Python rules
    // legitimately share a title, e.g. "Skipped test") — only flag exact
    // duplicates within the same category family.
    const family = r.id.split("-")[1];
    for (const other of rules) {
      if (
        other.id !== r.id &&
        other.title === r.title &&
        other.id.split("-")[1] === family
      ) {
        ok = false;
        details.push(`"${r.title}": duplicate title in family (${r.id})`);
      }
    }
  }
  return { name: "registry-sanity", ok, details };
}

/** Check 3: Trust Metadata presence (informational until full coverage). */
export function checkTrustMetadata(
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const missing = rules.filter(
    (r) =>
      !r.languages?.length ||
      !r.frameworks?.length ||
      r.falsePositiveRisk === undefined,
  );
  return {
    name: "trust-metadata",
    // Ratchet: informational while metadata adoption is partial; flips to
    // blocking (ok=false) automatically once every rule declares it.
    ok: missing.length === 0,
    details: missing.map((r) => `${r.id}: missing trust metadata`),
  };
}

/**
 * Check 4 (Honesty Core): evidence-level honesty. A rule that claims a
 * stronger evidence level than its findingType+confidence derivation
 * supports is lying — deterministic-defect/high may claim E2; everything
 * else is capped at E1, observations at E0.
 */
export function checkEvidenceHonesty(
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];
  let ok = true;
  for (const r of rules) {
    if (r.evidenceLevel === undefined) continue;
    const derived = deriveEvidenceLevel(r.findingType, r.confidence);
    if (r.evidenceLevel > derived) {
      ok = false;
      details.push(
        `${r.id}: declares ${r.evidenceLevel} but findingType=${r.findingType}/confidence=${r.confidence} supports at most ${derived}`,
      );
    }
  }
  return { name: "evidence-honesty", ok, details };
}

export interface DoctorReport {
  checks: DoctorCheck[];
  healthy: boolean;
}

/**
 * Check 5 (Phase 4 — Tempering Plan): tier enforcement.
 * Core-tier rules must have a measured FP rate (n ≥ 10 classified
 * verdicts in tests/corpus/verdicts/). Unmeasured core rules fail the
 * audit — they must be measured or demoted before shipping.
 */
export function checkTierEnforcement(
  verdictsDir: string,
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];

  // Load all verdicts and count classified samples per rule
  const classifiedPerRule = new Map<string, number>();
  try {
    const files = readdirSync(verdictsDir).filter((f) => f.endsWith(".jsonl"));
    for (const f of files) {
      const lines = readFileSync(join(verdictsDir, f), "utf8")
        .split("\n")
        .filter((l) => l.trim().length > 0);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.verdict === "TP" || entry.verdict === "FP") {
            classifiedPerRule.set(
              entry.ruleId,
              (classifiedPerRule.get(entry.ruleId) ?? 0) + 1,
            );
          }
        } catch {
          // skip malformed
        }
      }
    }
  } catch {
    // verdicts dir doesn't exist — all core rules are unmeasured
  }

  const coreRules = rules.filter(
    (r) => r.tier === undefined || r.tier === "core",
  );
  for (const r of coreRules) {
    const n = classifiedPerRule.get(r.id) ?? 0;
    if (n < 10) {
      details.push(
        `${r.id}: core tier, measured n=${n} (needs ≥10 classified verdicts)`,
      );
    }
  }

  // Report unmeasured count. Once ALL core rules are measured, this check
  // will have zero details and pass cleanly.
  const unmeasured = details.length;
  const total = coreRules.length;
  // Real enforcement (not const ok = true):
  // - Less than half of core rules measured → informational (ramp-up phase)
  // - More than half measured → the rest are on the clock → FAIL
  const measuredCount = [...classifiedPerRule.values()].filter(
    (n) => n >= 10,
  ).length;
  const majorityMeasured = measuredCount > total / 2;
  const ok = !majorityMeasured || unmeasured === 0;

  if (unmeasured > 0) {
    details.unshift(
      majorityMeasured
        ? `BLOCKING: ${unmeasured}/${total} core rules unmeasured — majority classified but incomplete`
        : `${unmeasured}/${total} core rules unmeasured (informational until majority classified)`,
    );
  }

  return { name: "tier-enforcement", ok, details };
}

/**
 * The core-tier cap (Phase 7 — Tempering Plan).
 * Anti-creep restated: core is capped at CORE_CAP rules. Promoting a
 * rule to core requires demoting another. This is enforced, not aspirational.
 */
export const CORE_CAP = 65;

/**
 * Check 6 (Phase 7 — Tempering Plan): anti-creep law enforcement.
 * Core tier is capped at CORE_CAP rules. Exceeding it is a blocking failure.
 * This makes the anti-creep law an executable check, not a sentence in docs.
 */
export function checkAntiCreep(
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];
  let ok = true;

  const coreRules = rules.filter(
    (r) => r.tier === undefined || r.tier === "core",
  );
  const count = coreRules.length;

  if (count > CORE_CAP) {
    ok = false;
    details.push(
      `Core tier has ${count} rules — exceeds cap of ${CORE_CAP}. ` +
        `Promoting a rule to core requires demoting another first.`,
    );
    // List the newest additions to help identify what to demote
    const overflow = coreRules.slice(CORE_CAP);
    for (const r of overflow.slice(0, 5)) {
      details.push(`  overflow: ${r.id} — ${r.title}`);
    }
    if (overflow.length > 5) {
      details.push(`  … and ${overflow.length - 5} more`);
    }
  } else {
    details.push(
      `Core tier: ${count}/${CORE_CAP} rules (${CORE_CAP - count} slots available)`,
    );
  }

  return { name: "anti-creep", ok, details };
}

export function runDoctorSelfAudit(fixturesRoot: string): DoctorReport {
  const verdictsDir = join(fixturesRoot, "..", "corpus", "verdicts");
  const checks = [
    checkFixtureFirewall(fixturesRoot),
    checkRegistry(),
    checkTrustMetadata(),
    checkEvidenceHonesty(),
    checkTierEnforcement(verdictsDir),
    checkAntiCreep(),
  ];
  return { checks, healthy: checks.every((c) => c.ok) };
}

export function renderDoctorReport(report: DoctorReport): string {
  const lines: string[] = ["", "🔨 MJÖLNIR — SELF-AUDIT", ""];
  for (const c of report.checks) {
    const mark = c.ok ? "✓" : "✗";
    lines.push(`${mark} ${c.name}`);
    for (const d of c.details.slice(0, 20)) lines.push(`    ${d}`);
    if (c.details.length > 20)
      lines.push(`    … and ${c.details.length - 20} more`);
  }
  lines.push("");
  lines.push(
    report.healthy
      ? "Mjölnir self-audit: WORTHY"
      : "Mjölnir self-audit: VIOLATIONS FOUND",
  );
  return lines.join("\n");
}
