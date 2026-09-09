/**
 * Trust upgrade wave — behavior-based sleep detection, selector risk
 * scoring, and the `mjolnir doctor` self-audit command.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { hardSleep } from "../../../src/rules/test/qa-test-004-hard-sleep.js";
import {
  scoreLocatorRisk,
  classifyLocator,
} from "../../../src/playwright/selector-health.js";
import {
  checkAntiCreep,
  checkEvidenceHonesty,
  checkQuarantineEnforcement,
  checkRegistry,
  checkTierEnforcement,
  checkTrustMetadata,
  CORE_CAP,
  renderDoctorReport,
  runDoctorSelfAudit,
} from "../../../src/commands/doctor.js";
import { RULES } from "../../../src/rules/index.js";
import type { QADoctorRule } from "../../../src/rules/rule.js";
import { runDoctorCommand } from "../../../src/cli.js";

function scan(src: string) {
  return hardSleep.run({ path: "x.spec.ts", text: src });
}

/** First registered rule, as a template for synthetic test rules below —
 * avoids a non-null assertion (banned by this repo's own eslint config)
 * on RULES[0]. */
function firstRule(): (typeof RULES)[number] {
  const r = RULES[0];
  if (!r) throw new Error("RULES is empty — cannot build a template rule");
  return r;
}

describe("QA-TEST-004 behavioral sleep shapes", () => {
  it("fires on awaited delay(5000) helper", () => {
    expect(scan(`await delay(5000);`).length).toBeGreaterThan(0);
  });

  it("fires on typed Promise<void> setTimeout shape", () => {
    const src = `await new Promise<void>((r) => setTimeout(r, 3000));`;
    expect(scan(src).length).toBeGreaterThan(0);
  });

  it("does not fire on short legitimate delay", () => {
    // Non-hard-sleep: no numeric-literal delay/sleep call in the file.
    expect(scan(`await page.getByRole('button').click();`)).toHaveLength(0);
  });

  it("still fires on classic waitForTimeout", () => {
    expect(scan(`await page.waitForTimeout(1000);`).length).toBeGreaterThan(0);
  });
});

describe("selector risk scoring", () => {
  it("scores data-testid at zero", () => {
    const line = `page.locator('[data-testid="checkout-button"]')`;
    expect(classifyLocator(line)).toBe("testid");
    expect(scoreLocatorRisk(line).score).toBe(0);
  });

  it("scores role-based locators at zero", () => {
    const line = `page.getByRole('button', { name: 'Pay' })`;
    expect(scoreLocatorRisk(line).score).toBe(0);
  });

  it("escalates nth-child CSS chains", () => {
    const line = `page.locator('div:nth-child(3) > span > button')`;
    const risk = scoreLocatorRisk(line);
    expect(risk.score).toBeGreaterThanOrEqual(80);
    expect(risk.reason).toContain("nth-child");
  });

  it("returns zero for non-locator lines", () => {
    expect(scoreLocatorRisk(`const x = 1;`).score).toBe(0);
  });
});

describe("mjolnir doctor self-audit", () => {
  it("registry sanity passes on the real registry", () => {
    const check = checkRegistry();
    expect(check.ok).toBe(true);
    expect(check.details).toHaveLength(0);
  });

  it("registry sanity flags a malformed rule ID", () => {
    const bad: (typeof RULES)[number] = {
      ...firstRule(),
      id: "NOT-A-VALID-ID",
    };
    const check = checkRegistry([bad]);
    expect(check.ok).toBe(false);
    expect(check.details[0]).toContain("malformed rule ID");
  });

  it("registry sanity flags a duplicate ID registration", () => {
    const r = firstRule();
    const check = checkRegistry([r, r]);
    expect(check.ok).toBe(false);
    expect(
      check.details.some((d) => d.includes("duplicate registration")),
    ).toBe(true);
  });

  it("registry sanity flags a duplicate title within the same ID family", () => {
    const a = { ...firstRule(), id: "QA-TEST-901", title: "Same Title" };
    const b = { ...firstRule(), id: "QA-TEST-902", title: "Same Title" };
    const check = checkRegistry([a, b]);
    expect(check.ok).toBe(false);
    expect(check.details.some((d) => d.includes("duplicate title"))).toBe(true);
  });

  it("P8 depth adjudication: flags a LEXICAL rule without strategyJustification", () => {
    const lexical: (typeof RULES)[number] = { ...firstRule() };
    delete (lexical as { strategyJustification?: unknown })
      .strategyJustification;
    const check = checkRegistry([lexical]);
    expect(check.ok).toBe(false);
    expect(
      check.details.some((d) => d.includes("LEXICAL strategy without")),
    ).toBe(true);
  });

  it("P8 depth adjudication: flags an out-of-set reason code", () => {
    const bad: (typeof RULES)[number] = {
      ...firstRule(),
      strategyJustification: {
        reasonCode: "because-i-said-so" as never,
        detail: "a real derivation citing the detector's actual shape",
      },
    };
    const check = checkRegistry([bad]);
    expect(check.ok).toBe(false);
    expect(
      check.details.some((d) => d.includes("outside the closed set")),
    ).toBe(true);
  });

  it("P8 depth adjudication: flags boilerplate detail (< 20 chars)", () => {
    const bad: (typeof RULES)[number] = {
      ...firstRule(),
      strategyJustification: { reasonCode: "exact-key-match", detail: "short" },
    };
    const check = checkRegistry([bad]);
    expect(check.ok).toBe(false);
    expect(check.details.some((d) => d.includes("boilerplate"))).toBe(true);
  });

  it("P8 depth adjudication: a valid record passes; non-LEXICAL needs none", () => {
    const good: (typeof RULES)[number] = {
      ...firstRule(),
      strategyJustification: {
        reasonCode: "exact-key-match",
        detail: "the detector matches the runner's exact API tokens",
      },
    };
    expect(checkRegistry([good]).ok).toBe(true);
    // Non-LEXICAL: destructure so exactOptionalPropertyTypes never sees
    // an explicit `undefined` for an optional field.
    const { strategyJustification: _omit, ...deeper } = {
      ...firstRule(),
      detectionStrategy: "AST" as const,
    };
    void _omit;
    expect(checkRegistry([deeper]).ok).toBe(true);
  });

  it("trust metadata check passes once every rule declares metadata", () => {
    const check = checkTrustMetadata();
    // Ratchet reached: full adoption — the check is now blocking.
    expect(check.details).toHaveLength(0);
    expect(check.ok).toBe(true);
  });

  it("trust metadata check flags a rule missing languages/frameworks/falsePositiveRisk", () => {
    const incomplete: (typeof RULES)[number] = { ...firstRule() };
    delete (incomplete as { languages?: string[] }).languages;
    const check = checkTrustMetadata([incomplete]);
    expect(check.ok).toBe(false);
    expect(check.details[0]).toContain("missing trust metadata");
  });

  it("detects a rule with missing fixtures", () => {
    const dir = mkdtempSync(join(tmpdir(), "qad-doctor-"));
    const report = runDoctorSelfAudit(join(dir, "fixtures"));
    const firewall = report.checks.find((c) => c.name === "fixture-firewall");
    if (!firewall) throw new Error("fixture-firewall check missing");
    expect(firewall.ok).toBe(false);
    expect(firewall.details.some((d) => d.includes("must-fire"))).toBe(true);
  });

  it("passes fully when every scoped rule has both fixture dirs", () => {
    const dir = mkdtempSync(join(tmpdir(), "qad-doctor-ok-"));
    const fixturesRoot = join(dir, "fixtures");
    for (const r of RULES) {
      if (r.appliesTo !== "test-files" && r.appliesTo !== "python") continue;
      mkdirSync(join(fixturesRoot, r.id, "must-fire"), { recursive: true });
      mkdirSync(join(fixturesRoot, r.id, "must-not-fire"), { recursive: true });
      writeFileSync(join(fixturesRoot, r.id, "must-fire", "a.ts"), "x");
      writeFileSync(join(fixturesRoot, r.id, "must-not-fire", "a.ts"), "x");
    }
    const report = runDoctorSelfAudit(fixturesRoot);
    const firewallOk = report.checks.find((c) => c.name === "fixture-firewall");
    if (!firewallOk) throw new Error("fixture-firewall check missing");
    expect(firewallOk.ok).toBe(true);
  });

  it("CLI exits 10-free: usage on missing fixtures dir → exit 2", () => {
    const code = runDoctorCommand(["/nonexistent-repo"], {
      out: () => {},
      err: () => {},
    });
    expect(code).toBe(2);
  });

  it("evidence-honesty check passes on the real registry (no rule overclaims)", () => {
    const check = checkEvidenceHonesty();
    expect(check.ok).toBe(true);
    expect(check.details).toHaveLength(0);
  });

  it("evidence-honesty check flags a rule declaring a stronger level than it can support", () => {
    const overclaiming: (typeof RULES)[number] = {
      ...firstRule(),
      id: "QA-TEST-999",
      findingType: "observation", // derivation caps this at E0
      confidence: "high",
      evidenceLevel: "E2", // claims far more than an observation supports
    };
    const check = checkEvidenceHonesty([overclaiming]);
    expect(check.ok).toBe(false);
    expect(check.details[0]).toContain("QA-TEST-999");
    expect(check.details[0]).toContain("supports at most E0");
  });

  it("evidence-honesty check ignores rules that declare no override", () => {
    const noOverride: (typeof RULES)[number] = {
      ...firstRule(),
      id: "QA-TEST-998",
    };
    delete (noOverride as { evidenceLevel?: string }).evidenceLevel;
    const check = checkEvidenceHonesty([noOverride]);
    expect(check.ok).toBe(true);
    expect(check.details).toHaveLength(0);
  });

  it("renderDoctorReport renders a healthy report", () => {
    const text = renderDoctorReport({
      checks: [
        { name: "registry-sanity", status: "pass", ok: true, details: [] },
      ],
      healthy: true,
      measurement: { measured: 0, unmeasured: 0, total: 0, quarantine: 0 },
    });
    expect(text).toContain(`✓ registry-sanity`);
    expect(text).toContain("WORTHY");
  });

  it("renderDoctorReport renders violations, truncating past 20 details", () => {
    const details = Array.from({ length: 25 }, (_, i) => `problem #${i}`);
    const text = renderDoctorReport({
      checks: [
        { name: "fixture-firewall", status: "fail", ok: false, details },
      ],
      healthy: false,
      measurement: { measured: 0, unmeasured: 0, total: 0, quarantine: 0 },
    });
    expect(text).toContain(`✗ fixture-firewall`);
    expect(text).toContain("problem #0");
    expect(text).toContain("problem #19");
    expect(text).not.toContain("problem #20");
    expect(text).toContain("… and 5 more");
    expect(text).toContain("VIOLATIONS FOUND");
  });

  it("renderDoctorReport renders INCONCLUSIVE distinctly from fail (G2)", () => {
    const text = renderDoctorReport({
      checks: [
        {
          name: "revision-integrity",
          status: "inconclusive",
          ok: false,
          details: ["INCONCLUSIVE: manifest missing"],
        },
      ],
      healthy: false,
      measurement: { measured: 0, unmeasured: 0, total: 0, quarantine: 0 },
    });
    expect(text).toContain("? INCONCLUSIVE revision-integrity");
    expect(text).not.toContain("✗ revision-integrity");
    expect(text).toContain("VIOLATIONS FOUND");
  });
});

describe("mjolnir doctor — anti-creep and tier-enforcement checks", () => {
  const fakeRule = (id: string, tier?: "core" | "extended"): QADoctorRule =>
    ({
      id,
      title: id,
      category: "QA-TEST",
      severity: "warning",
      confidence: "medium",
      findingType: "heuristic-risk",
      qaImpact: "HYGIENE",
      appliesTo: "test-files",
      autofix: false,
      ...(tier ? { tier } : {}),
      run: () => [],
    }) as unknown as QADoctorRule;

  it("checkAntiCreep passes when core rule count is within CORE_CAP", () => {
    const rules = Array.from({ length: CORE_CAP }, (_, i) =>
      // Explicit core: omitted tiers resolve measurement-dependently
      // (plan §11.2 Step 2) and these synthetic rules carry no measurement.
      fakeRule(`QA-TEST-${100 + i}`, "core"),
    );
    const check = checkAntiCreep(rules);
    expect(check.ok).toBe(true);
    expect(check.details.join(" ")).toContain(`${CORE_CAP}/${CORE_CAP}`);
  });

  it("checkAntiCreep fails and lists overflow when core exceeds the cap", () => {
    const rules = Array.from({ length: CORE_CAP + 8 }, (_, i) =>
      fakeRule(`QA-TEST-${100 + i}`, "core"),
    );
    const check = checkAntiCreep(rules);
    expect(check.ok).toBe(false);
    expect(check.details.join(" ")).toContain("exceeds cap");
    expect(check.details.some((d) => d.includes("overflow:"))).toBe(true);
    expect(check.details.some((d) => d.includes("and 3 more"))).toBe(true);
  });

  it("checkTierEnforcement passes while the unmeasured core count stays within the Law #3 ratchet", () => {
    // Live verdicts exist (the committed corpus) — evaluation proceeds.
    const check = checkTierEnforcement(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "..",
        "..",
        "corpus",
        "verdicts",
      ),
    );
    expect(check.ok).toBe(true);
    expect(check.status).toBe("pass");
    expect(check.details.join(" ")).toMatch(/Ratchet \(Law #3\)/);
  });

  it("checkTierEnforcement is INCONCLUSIVE when live verdicts are unavailable (L4 ruling, 2026-09-08)", () => {
    // The owner's L4 ruling: no live verdicts → no live evidence → the
    // check cannot be evaluated → INCONCLUSIVE (blocking, G2/22). The
    // silent fallback to MEASURED_FP (a historical artifact) was the
    // pre-ruling behavior and is forbidden: MEASURED_FP may not quietly
    // stand in for evidence that is simply not present.
    const check = checkTierEnforcement("/definitely/not/a/real/dir");
    expect(check.ok).toBe(false);
    expect(check.status).toBe("inconclusive");
    expect(check.details.join(" ")).toContain("INCONCLUSIVE");
    expect(check.details.join(" ")).toContain("does not substitute");
  });

  it("checkQuarantineEnforcement caps every shipped quarantine rule to info/E0", () => {
    const check = checkQuarantineEnforcement();
    expect(check.ok).toBe(true);
    expect(check.details.join(" ")).toMatch(
      /no quarantine rule may emit error/,
    );
  });

  it("checkQuarantineEnforcement reports the cap for a quarantine-only registry", () => {
    const quarantine: QADoctorRule = {
      ...firstRule(),
      id: "QA-TEST-997",
      tier: "quarantine",
    };
    const check = checkQuarantineEnforcement([quarantine]);
    expect(check.ok).toBe(true);
    expect(check.details[0]).toContain("1 quarantine rules capped");
  });

  it("checkTierEnforcement fails when any effective-core rule is unmeasured (Phase 1 ratchet: cap is 0)", () => {
    // The Phase 1 ratchet lowered MAX_UNMEASURED_CORE to 0 — one
    // unmeasured effective-core rule is already a blocking failure.
    // The rule must declare core explicitly: an omitted tier would
    // resolve to extended (unmeasured) and never count as core.
    // Live verdicts: an EMPTY corpus dir (exists, zero rows) — evidence
    // exists and says "not measured", so this is an honest FAIL (n=0),
    // not INCONCLUSIVE.
    const empty = mkdtempSync(join(tmpdir(), "mjolnir-tier-empty-"));
    mkdirSync(join(empty, "verdicts"), { recursive: true });
    const rules = [fakeRule("QA-TEST-700", "core")];
    const check = checkTierEnforcement(join(empty, "verdicts"), rules);
    expect(check.ok).toBe(false);
    expect(check.details.join(" ")).toMatch(/exceeds the Law #3 ratchet cap/);
  });

  it("checkTierEnforcement is INCONCLUSIVE when the live verdicts path is unreadable (present but invalid)", () => {
    // L4 ruling, per-failure-type: the evidence EXISTS but cannot be
    // read (a file passed as a directory) → INCONCLUSIVE, never pass.
    const probe = mkdtempSync(join(tmpdir(), "mjolnir-tier-file-"));
    const asFile = join(probe, "not-a-dir");
    writeFileSync(asFile, "not a directory\n");
    const check = checkTierEnforcement(asFile, [
      fakeRule("QA-TEST-702", "core"),
    ]);
    expect(check.ok).toBe(false);
    expect(check.status).toBe("inconclusive");
    expect(check.details.join(" ")).toContain("unreadable");
  });

  it("checkTierEnforcement ignores unmeasured rules that omit their tier (they are provisional-extended, not core)", () => {
    // Plan §11.2 Step 2: the measurement-dependent default means an
    // unmeasured rule without a declared tier is extended (PROVISIONAL),
    // so it never trips the core ratchet. Live corpus exists (committed)
    // so evaluation proceeds.
    const rules = [fakeRule("QA-TEST-701")];
    const check = checkTierEnforcement(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "..",
        "..",
        "corpus",
        "verdicts",
      ),
      rules,
    );
    expect(check.ok).toBe(true);
  });
});
