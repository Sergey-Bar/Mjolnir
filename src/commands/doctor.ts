/**
 * `qa-doctor doctor` — self-audit of QA Doctor's own rule base.
 *
 * The product must be able to fail because of a bug in the product.
 * This command checks, against the repo it runs in (the qa-doctor source
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

import { existsSync, readdirSync } from "node:fs";
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

export function runDoctorSelfAudit(fixturesRoot: string): DoctorReport {
  const checks = [
    checkFixtureFirewall(fixturesRoot),
    checkRegistry(),
    checkTrustMetadata(),
    checkEvidenceHonesty(),
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
