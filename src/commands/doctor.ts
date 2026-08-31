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
import { MEASURED_FP } from "../rules/measured-fp.generated.js";
import { deriveEvidenceLevel } from "../types.js";
import { capForTier } from "../engine/tier-policy.js";

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
 * Law #3 ratchet (audit H-2): "Rules without a measured FP rate
 * (n ≥ 10) cannot ship in the core tier" — restated as an executable
 * cap instead of a decorative sentence. LOWER THIS VALUE each release
 * as more core rules are corpus-measured; `doctor` fails the moment
 * the shipped registry exceeds it, so the count can rise but never.
 */
export const MAX_UNMEASURED_CORE = 47;

/**
 * Check 5 (Phase 4 — Tempering Plan, ratcheted per audit H-2):
 * tier enforcement. Core-tier rules must have a measured FP rate
 * (n ≥ 10 classified verdicts in tests/corpus/verdicts/). The number of
 * unmeasured core rules must stay at or under MAX_UNMEASURED_CORE —
 * exceeding the ratchet is a blocking failure.
 */
export function checkTierEnforcement(
  verdictsDir: string,
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];

  // Classified-verdict count per rule. The shipped src/rules/
  // measured-fp.generated.ts is the source of truth (baked in because
  // tests/corpus/verdicts/ is not packed). When running from a checkout
  // whose verdicts have grown since the last `fp-audit:generate`, prefer
  // the live directory so `doctor` reflects the newer classification.
  const classifiedPerRule = new Map<string, number>();
  for (const [id, m] of Object.entries(MEASURED_FP)) {
    classifiedPerRule.set(id, m.n);
  }
  try {
    const live = new Map<string, number>();
    const files = readdirSync(verdictsDir).filter((f) => f.endsWith(".jsonl"));
    for (const f of files) {
      const lines = readFileSync(join(verdictsDir, f), "utf8")
        .split("\n")
        .filter((l) => l.trim().length > 0);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.verdict === "TP" || entry.verdict === "FP") {
            live.set(entry.ruleId, (live.get(entry.ruleId) ?? 0) + 1);
          }
        } catch {
          // skip malformed
        }
      }
    }
    if (live.size > 0) {
      for (const [id, n] of live) classifiedPerRule.set(id, n);
    }
  } catch {
    // verdicts dir absent (installed package) — fall back to MEASURED_FP.
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

  // Ratchet (audit H-2): the law is now an executable cap. Exceeding
  // MAX_UNMEASURED_CORE fails the audit; lowering the constant each
  // release walks the registry toward a fully measured core tier.
  const unmeasured = details.length;
  const total = coreRules.length;
  const ok = unmeasured <= MAX_UNMEASURED_CORE;

  details.unshift(
    ok
      ? `Ratchet (Law #3): ${unmeasured}/${total} core rules lack a measured FP rate — cap is ${MAX_UNMEASURED_CORE}, lowered each release`
      : `BLOCKING: ${unmeasured}/${total} core rules unmeasured — exceeds the Law #3 ratchet cap of ${MAX_UNMEASURED_CORE}`,
  );

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

/**
 * Check 7 (audit H-1): quarantine enforcement. The tier policy must cap
 * every quarantine rule to severity=info, evidence=E0 — the only way a
 * quarantine rule could ever gate CI is a broken or bypassed policy, so
 * the audit asserts the cap per rule and fails loudly if it moved.
 */
export function checkQuarantineEnforcement(
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];
  let ok = true;
  const quarantine = rules.filter((r) => r.tier === "quarantine");
  for (const r of quarantine) {
    const cap = capForTier(r.tier);
    if (!cap || cap.severity !== "info" || cap.evidenceLevel !== "E0") {
      ok = false;
      details.push(
        `${r.id}: quarantine cap is not severity=info/evidence=E0 — an unproven rule could gate CI`,
      );
    }
  }
  details.unshift(
    `${quarantine.length} quarantine rules capped to severity=info, evidence=E0 — no quarantine rule may emit error`,
  );
  return { name: "quarantine-enforcement", ok, details };
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
    checkQuarantineEnforcement(),
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
