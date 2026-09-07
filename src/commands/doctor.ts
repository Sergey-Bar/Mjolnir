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
import { RULE_CATEGORIES } from "../types.js";
import { MEASURED_FP } from "../rules/measured-fp.generated.js";

/** Uniform error rendering for doctor details (Error or thrown-as-string). */
export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
import {
  declaredDetectorRevision,
  effectiveTier,
} from "../rules/measurement.js";
import { deriveEvidenceLevel } from "../types.js";
import { capForTier } from "../engine/tier-policy.js";
import { sectionHeader, plainContext } from "../reporter/ui.js";
import {
  computeDetectorHashes,
  loadManifest,
  type DetectorHashManifest,
} from "../engine/detector-hash.js";

const ui = plainContext();

/**
 * Check outcome status (certification-audit Phase 5, G2):
 *   - "pass"         — evaluated, no violations;
 *   - "fail"         — evaluated, violations found (blocking);
 *   - "inconclusive" — could NOT be evaluated (missing inputs, installed
 *     package, malformed manifest). Blocking, and rendered distinctly:
 *     an INCONCLUSIVE check never renders as PASS, in text or JSON.
 */
export type CheckStatus = "pass" | "fail" | "inconclusive";

export interface DoctorCheck {
  name: string;
  status: CheckStatus;
  /** Convenience mirror of `status === "pass"` (existing consumers). */
  ok: boolean;
  details: string[];
}

/** Builds the check record: `ok` is always the pass-mirror of `status`. */
function check(
  name: string,
  status: CheckStatus,
  details: string[],
): DoctorCheck {
  return { name, status, ok: status === "pass", details };
}

// Audit M3: the ID validator derives from the shared RULE_FAMILIES
// table (src/commands/rule-families.ts) — doctor and create-rule can
// never disagree about which families exist again.
import { RULE_ID_RE } from "./rule-families.js";

const VALID_ID = RULE_ID_RE;

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
  return check("fixture-firewall", ok ? "pass" : "fail", details);
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
  return check("registry-sanity", ok ? "pass" : "fail", details);
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
  return check(
    "trust-metadata",
    missing.length === 0 ? "pass" : "fail",
    missing.map((r) => `${r.id}: missing trust metadata`),
  );
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
  return check("evidence-honesty", ok ? "pass" : "fail", details);
}

export interface DoctorReport {
  checks: DoctorCheck[];
  healthy: boolean;
  /** The measurement census (Phase 4.3) — see measurementBlock(). */
  measurement: MeasurementBlock;
}

/**
 * Measurement census (Phase 4.3): measured = rules with a valid
 * MEASURED_FP entry; unmeasured = the rest; quarantine = measured rules
 * whose effective tier is quarantine. One function, used by the doctor
 * report AND the JSON contract — a single reproducible answer.
 */
export function measurementBlock(
  rules: readonly QADoctorRule[] = RULES,
): MeasurementBlock {
  const measured = rules.filter((r) => {
    const m = MEASURED_FP[r.id];
    return (
      m !== undefined && m.detectorRevision === declaredDetectorRevision(r)
    );
  });
  const quarantine = measured.filter(
    (r) => (r.tier ?? "core") === "quarantine",
  );
  return {
    measured: measured.length,
    unmeasured: rules.length - measured.length,
    total: rules.length,
    quarantine: quarantine.length,
  };
}

export interface MeasurementBlock {
  measured: number;
  unmeasured: number;
  total: number;
  quarantine: number;
}

/**
 * Law #3 ratchet (audit H-2): "Rules without a measured FP rate
 * (n ≥ 10) cannot ship in the core tier" — restated as an executable
 * cap instead of a decorative sentence. Verification Trust Evolution
 * Phase 1 (§11.2 Step 2/§11 exit gate) closed the hole in code: the
 * omitted-tier default is measurement-dependent and the registry
 * ratchet (tests/registry-ratchet.spec.ts) fails on ANY unmeasured
 * effective-core rule, so the only value this cap can take is 0.
 * Kept as an explicit constant so the law stays visible in the doctor
 * report rather than dissolving into a test file.
 */
export const MAX_UNMEASURED_CORE = 0;

/**
 * Check 5 (Phase 4 — Tempering Plan, ratcheted per audit H-2):
 * tier enforcement. Core-tier rules must have a measured FP rate
 * (n ≥ 10 classified verdicts in tests/corpus/verdicts/) at a matching
 * detectorRevision (plan §07 — a stale measurement counts as
 * unmeasured). The number of unmeasured effective-core rules must stay
 * at or under MAX_UNMEASURED_CORE — exceeding the ratchet is a blocking
 * failure. Effective tier resolves measurement-dependently (plan §11.2
 * Step 2): an omitted tier counts as core only with a valid measurement.
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
  const byId = new Map(rules.map((r) => [r.id, r] as const));
  for (const [id, m] of Object.entries(MEASURED_FP)) {
    const rule = byId.get(id);
    // A stale measurement (revision mismatch, plan §07) does not count:
    // stale → provisional → re-measure.
    if (rule && m.detectorRevision === declaredDetectorRevision(rule)) {
      classifiedPerRule.set(id, m.n);
    }
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
          const entry = JSON.parse(line) as {
            verdict?: unknown;
            ruleId?: unknown;
          };
          if (entry.verdict === "TP" || entry.verdict === "FP") {
            live.set(
              entry.ruleId as string,
              (live.get(entry.ruleId as string) ?? 0) + 1,
            );
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

  const coreRules = rules.filter((r) => effectiveTier(r) === "core");
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
      ? `Ratchet (Law #3): ${unmeasured}/${total} core rules lack a measured FP rate — cap is ${MAX_UNMEASURED_CORE} (Phase 1 closed the unmeasured-core hole)`
      : `BLOCKING: ${unmeasured}/${total} core rules unmeasured — exceeds the Law #3 ratchet cap of ${MAX_UNMEASURED_CORE}`,
  );

  return check("tier-enforcement", ok ? "pass" : "fail", details);
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

  const coreRules = rules.filter((r) => effectiveTier(r) === "core");
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

  return check("anti-creep", ok ? "pass" : "fail", details);
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
  return check("quarantine-enforcement", ok ? "pass" : "fail", details);
}

/**
 * Check 8 (certification-audit Phase 2.5, plan G3 Layer A support):
 * fixture-integrity — deterministic structural census of the fixture
 * trees. Complements the fixture firewall (which proves must-fire /
 * must-not-fire PRESENCE per rule) with: orphaned fixture dirs (no
 * registered rule), empty dirs, and the Layer A typecheck allowlist
 * census. Blocking: an orphaned dir or an empty fixture dir means the
 * structural layer has silently drifted.
 */
export function checkFixtureIntegrity(
  fixturesRoot: string,
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];
  let ok = true;

  const registeredIds = new Set(rules.map((r) => r.id));

  // Census over the must-fire/must-not-fire tree.
  const fixtureRoots = [
    fixturesRoot,
    join(fixturesRoot, "..", "corpus", "positive-fixtures"),
  ];
  let fixtureFiles = 0;
  let fixtureDirs = 0;
  for (const root of fixtureRoots) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      fixtureDirs++;
      const ruleId = entry.name;
      if (!registeredIds.has(ruleId)) {
        ok = false;
        details.push(`orphaned fixture dir (no registered rule): ${ruleId}`);
        continue;
      }
      const sub = join(root, ruleId);
      for (const child of readdirSync(sub, { withFileTypes: true })) {
        if (child.isDirectory()) {
          const files = nonHiddenFiles(join(sub, child.name));
          fixtureFiles += files.length;
          if (files.length === 0) {
            ok = false;
            details.push(`empty fixture dir: ${ruleId}/${child.name}`);
          }
        } else if (!child.name.startsWith(".")) {
          // Loose files directly inside the rule dir (outside must-fire/
          // must-not-fire subdirs) still count as fixture material.
          fixtureFiles++;
        }
      }
    }
  }

  // Layer A allowlist census (informational summary; the allowlist itself
  // is mechanically guarded by scripts/typecheck-fixtures.ts + the gate
  // spec's snapshot lock).
  const allowlistPath = join(fixturesRoot, "typecheck-allowlist.json");
  if (existsSync(allowlistPath)) {
    try {
      const parsed = JSON.parse(readFileSync(allowlistPath, "utf8")) as {
        entries?: unknown[];
      };
      if (Array.isArray(parsed.entries)) {
        details.push(
          `Layer A typecheck allowlist: ${parsed.entries.length} justified entr(ies)`,
        );
      } else {
        ok = false;
        details.push("typecheck-allowlist.json entries is not an array");
      }
    } catch {
      ok = false;
      details.push("typecheck-allowlist.json is unreadable/malformed");
    }
  }

  details.unshift(
    `fixture trees: ${fixtureDirs} rule dirs, ${fixtureFiles} fixture files — orphaned dirs and empty dirs are blocking`,
  );
  return check("fixture-integrity", ok ? "pass" : "fail", details);
}

/**
 * Check 9 (certification-audit Phase 3.3, G4/D8v2 — HARD-BLOCKING):
 * revision-integrity. The manifest tests/corpus/detector-hashes.json
 * attests each rule's source identity (logicHash = sha256 of the rule's
 * metadata ‖ its defining module's token stream) against the declared
 * detectorRevision:
 *   check A — current logicHash ≠ manifest logicHash → FAIL ("bump +
 *             re-measure + regen, or regen with stated behavior-neutrality");
 *   check B — declared revision ≠ manifest revision → FAIL (stale manifest);
 *   manifest missing/unreadable, or the source tree unavailable (the
 *             installed-package case) → the check CANNOT be evaluated
 *             honestly → reported as INCONCLUSIVE and ok=false — a
 *             certification-critical INCONCLUSIVE never renders as pass
 *             (G2); Phase 5's status migration carries the same rule.
 *
 * Where the check runs: the doctor self-audits THIS repo, so `repoRoot`
 * must be the Mjölnir checkout (src/ present). On an installed package
 * the src tree does not exist → honest INCONCLUSIVE, same as above.
 */
export function checkRevisionIntegrity(
  repoRoot: string,
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];
  const manifestPath = join(
    repoRoot,
    "tests",
    "corpus",
    "detector-hashes.json",
  );
  const rulesDir = join(repoRoot, "src", "rules");

  if (!existsSync(manifestPath)) {
    return check("revision-integrity", "inconclusive", [
      "INCONCLUSIVE: tests/corpus/detector-hashes.json is missing — run `npm run detector-hashes:update` (certification-critical: an unevaluable check never renders as pass)",
    ]);
  }
  if (!existsSync(rulesDir)) {
    return check("revision-integrity", "inconclusive", [
      "INCONCLUSIVE: src/rules is not present (installed package) — detector source identity cannot be verified here",
    ]);
  }

  let manifest: DetectorHashManifest;
  try {
    manifest = loadManifest(manifestPath);
  } catch {
    return check("revision-integrity", "inconclusive", [
      "INCONCLUSIVE: tests/corpus/detector-hashes.json is unreadable/malformed — regenerate with `npm run detector-hashes:update`",
    ]);
  }

  let current: DetectorHashManifest;
  try {
    current = computeDetectorHashes(rules, rulesDir);
  } catch (e) {
    return check("revision-integrity", "inconclusive", [
      `INCONCLUSIVE: detector hash computation failed — ${errorText(e)}`,
    ]);
  }

  const failures: string[] = [];
  for (const rule of rules) {
    const attested = manifest[rule.id];
    if (!attested) {
      failures.push(
        `${rule.id}: not attested in the manifest (stale manifest — regenerate)`,
      );
      continue;
    }
    if (attested.logicHash !== current[rule.id]?.logicHash) {
      failures.push(
        `${rule.id}: source identity changed since manifest attestation — ` +
          `bump detectorRevision + re-measure + regen, or regen with stated behavior-neutrality (G4)`,
      );
    }
    if (attested.detectorRevision !== declaredDetectorRevision(rule)) {
      failures.push(
        `${rule.id}: manifest revision ${attested.detectorRevision} ≠ declared ${declaredDetectorRevision(rule)} (stale manifest — regenerate)`,
      );
    }
  }
  for (const id of Object.keys(manifest)) {
    if (!rules.some((r) => r.id === id)) {
      failures.push(`${id}: attested in the manifest but not in the registry`);
    }
  }

  if (failures.length > 0) {
    details.push(...failures);
    return check("revision-integrity", "fail", details);
  }
  details.push(
    `${rules.length} rules attested: source identity and declared revision match the manifest (check A + check B, G4)`,
  );
  return check("revision-integrity", "pass", details);
}

/**
 * Check 8 (certification-audit Phase 1.4, D6 — HARD-BLOCKING):
 * category-integrity. Every registry rule's category must be a member of
 * the closed RULE_CATEGORIES set (compile-time exhaustive via the D6
 * derivation, so this check is the runtime backstop for values arriving
 * from external rule sources), and no two rules may collide on an id.
 * Registry ids are already unique-checked by registry-sanity; this check
 * owns the category dimension.
 */
export function checkCategoryIntegrity(
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];
  const known: readonly string[] = RULE_CATEGORIES;
  const unknown = rules.filter((r) => !known.includes(r.category));
  for (const r of unknown) {
    details.push(
      `${r.id}: category "${r.category}" is not in RULE_CATEGORIES — registries may not invent categories (D6)`,
    );
  }
  const byCategory = new Map<string, number>();
  for (const r of rules) {
    byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1);
  }
  return check("category-integrity", unknown.length === 0 ? "pass" : "fail", [
    `${byCategory.size} categories in use across ${rules.length} rules (closed set: ${RULE_CATEGORIES.length})`,
    ...details,
  ]);
}

/**
 * Check 10 (certification-audit Phase 4.1, D7 — HARD-BLOCKING):
 * measurement-consistency. Three invariants over the measurement surface:
 *   (1) every MEASURED_FP entry's `n` equals the LIVE classified verdict
 *       count (TP+FP rows in tests/corpus/verdicts/*.jsonl) — a snapshot
 *       that drifted from the corpus is a lie about evidence;
 *   (2) MEASURED_FP's detectorRevision equals the sidecar's
 *       (tests/corpus/detector-revisions.json) — a measurement taken
 *       against a different detector revision than attested is stale;
 *   (3) every sidecar entry maps to a registered rule.
 * Mismatch → FAIL (certification-critical).
 */
export function checkMeasurementConsistency(
  verdictsDir: string,
  sidecarPath: string,
  rules: readonly QADoctorRule[] = RULES,
): DoctorCheck {
  const details: string[] = [];
  const failures: string[] = [];

  const registered = new Map(rules.map((r) => [r.id, r] as const));

  // Live classified verdict counts (TP + FP) per rule id.
  const liveCounts = new Map<string, number>();
  if (existsSync(verdictsDir)) {
    for (const f of readdirSync(verdictsDir)) {
      if (!f.endsWith(".jsonl")) continue;
      const lines = readFileSync(join(verdictsDir, f), "utf8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        let row: { ruleId?: string; verdict?: string };
        try {
          row = JSON.parse(trimmed) as { ruleId?: string; verdict?: string };
        } catch {
          failures.push(`${f}: unparseable verdict row (corpus integrity)`);
          continue;
        }
        if (row.ruleId === undefined) continue;
        if (row.verdict === "TP" || row.verdict === "FP") {
          liveCounts.set(row.ruleId, (liveCounts.get(row.ruleId) ?? 0) + 1);
        }
      }
    }
  } else {
    return check("measurement-consistency", "inconclusive", [
      "INCONCLUSIVE: verdicts directory missing — measurement consistency cannot be evaluated (certification-critical: never renders as pass)",
    ]);
  }

  let sidecar: Record<string, { detectorRevision?: number }> = {};
  if (existsSync(sidecarPath)) {
    try {
      sidecar = JSON.parse(readFileSync(sidecarPath, "utf8")) as Record<
        string,
        { detectorRevision?: number }
      >;
    } catch (e) {
      failures.push(
        `sidecar unreadable/malformed: ${errorText(e)} — regenerate the measurement artifacts`,
      );
    }
  } else {
    // No sidecar at all: only MEASURED_FP entries with declared revision
    // 1 can be consistent (the declared-revision default). Anything else
    // is unverifiable → inconclusive (honesty over assertion).
    const needsSidecar = Object.keys(MEASURED_FP).filter(
      (id) => MEASURED_FP[id]?.detectorRevision !== 1,
    );
    if (needsSidecar.length > 0) {
      return check("measurement-consistency", "inconclusive", [
        `INCONCLUSIVE: sidecar tests/corpus/detector-revisions.json missing but ${needsSidecar.length} measured rule(s) declare revisions — cannot verify measurement freshness`,
      ]);
    }
  }

  for (const [id, m] of Object.entries(MEASURED_FP)) {
    // Invariant 2: sidecar revision agreement.
    const side = sidecar[id];
    if (side !== undefined && side.detectorRevision !== undefined) {
      if (side.detectorRevision !== m.detectorRevision) {
        failures.push(
          `${id}: MEASURED_FP revision ${m.detectorRevision} ≠ sidecar ${side.detectorRevision} — the measurement is stale (§07: re-measure or bump)`,
        );
      }
    }
    // Invariant 1: live verdict count equals the recorded n.
    const live = liveCounts.get(id);
    if (live !== undefined && live !== m.n) {
      failures.push(
        `${id}: MEASURED_FP.n=${m.n} but the live corpus has ${live} classified verdict(s) — regenerate (npm run fp-audit:generate)`,
      );
    }
    if (live === undefined && m.n > 0) {
      failures.push(
        `${id}: MEASURED_FP.n=${m.n} but no classified verdicts exist in the live corpus`,
      );
    }
  }

  // Invariant 3: sidecar entries map to registered rules.
  for (const id of Object.keys(sidecar)) {
    if (!registered.has(id)) {
      failures.push(
        `${id}: sidecar entry for an unregistered rule — remove it from tests/corpus/detector-revisions.json`,
      );
    }
  }

  if (failures.length > 0) {
    details.push(...failures);
    return check("measurement-consistency", "fail", details);
  }
  const block = measurementBlock(rules);
  details.push(
    `${block.measured} measured / ${block.unmeasured} unmeasured / ${block.total} total (${block.quarantine} quarantine) — MEASURED_FP, live verdicts and sidecar revisions agree`,
  );
  return check("measurement-consistency", "pass", details);
}

export function runDoctorSelfAudit(fixturesRoot: string): DoctorReport {
  const verdictsDir = join(fixturesRoot, "..", "corpus", "verdicts");
  const repoRoot = join(fixturesRoot, "..", "..");
  const checks = [
    checkFixtureFirewall(fixturesRoot),
    checkRegistry(),
    checkTrustMetadata(),
    checkEvidenceHonesty(),
    checkTierEnforcement(verdictsDir),
    checkAntiCreep(),
    checkQuarantineEnforcement(),
    checkCategoryIntegrity(),
    checkFixtureIntegrity(fixturesRoot),
    checkRevisionIntegrity(repoRoot),
    checkMeasurementConsistency(
      verdictsDir,
      join(repoRoot, "tests", "corpus", "detector-revisions.json"),
    ),
  ];
  return {
    checks,
    healthy: checks.every((c) => c.status === "pass"),
    measurement: measurementBlock(),
  };
}

export function renderDoctorReport(report: DoctorReport): string {
  const lines: string[] = ["", sectionHeader("MJÖLNIR — SELF-AUDIT", ui), ""];
  for (const c of report.checks) {
    const mark =
      c.status === "pass" ? "✓" : c.status === "fail" ? "✗" : "? INCONCLUSIVE";
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

/** Versioned JSON schema name for `doctor --json` (G5). */
export const DOCTOR_REPORT_SCHEMA = "mjolnir.doctor-report@1";

export interface DoctorReportJson {
  schema: typeof DOCTOR_REPORT_SCHEMA;
  healthy: boolean;
  /** Counts by status (pass/fail/inconclusive) — machine-summarizable. */
  summary: { pass: number; fail: number; inconclusive: number };
  checks: Array<{
    name: string;
    status: CheckStatus;
    ok: boolean;
    details: string[];
  }>;
  /**
   * THE single reproducible answer to "how many rules are measured"
   * (certification-audit Phase 4.3): derived from the live registry +
   * MEASURED_FP at report time, not from a hand-authored snapshot.
   */
  measurement: MeasurementBlock;
}

/**
 * Serializes the doctor report to the machine-readable contract (Phase 5,
 * G5): versioned `schema` field, stable key order (constructed once, here),
 * details limited exactly like the text render, paths already POSIX-relative
 * (the checks build them that way), and byte-identical across two runs on
 * the same tree — the CI certification job re-runs the command twice and
 * diffs, so any nondeterminism fails there.
 */
export function doctorReportJson(
  report: DoctorReport,
  opts: { maxDetails?: number } = {},
): DoctorReportJson {
  const maxDetails = opts.maxDetails ?? 20;
  const summary = { pass: 0, fail: 0, inconclusive: 0 };
  const checks = report.checks.map((c) => {
    summary[c.status]++;
    return {
      name: c.name,
      status: c.status,
      ok: c.ok,
      details:
        c.details.length > maxDetails
          ? [
              ...c.details.slice(0, maxDetails),
              `… and ${c.details.length - maxDetails} more`,
            ]
          : c.details,
    };
  });
  return {
    schema: DOCTOR_REPORT_SCHEMA,
    healthy: report.healthy,
    summary,
    checks,
    measurement: report.measurement,
  };
}
