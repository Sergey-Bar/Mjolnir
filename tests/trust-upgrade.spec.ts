/**
 * Trust upgrade wave — behavior-based sleep detection, selector risk
 * scoring, and the `qa-doctor doctor` self-audit command.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { hardSleep } from "../src/rules/test/qa-test-004-hard-sleep.js";
import {
  scoreLocatorRisk,
  classifyLocator,
} from "../src/playwright/selector-health.js";
import {
  checkRegistry,
  checkTrustMetadata,
  runDoctorSelfAudit,
} from "../src/commands/doctor.js";
import { RULES } from "../src/rules/index.js";
import { runDoctorCommand } from "../src/cli.js";

function scan(src: string) {
  return hardSleep.run({ path: "x.spec.ts", text: src });
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

describe("qa-doctor doctor self-audit", () => {
  it("registry sanity passes on the real registry", () => {
    const check = checkRegistry();
    expect(check.ok).toBe(true);
    expect(check.details).toHaveLength(0);
  });

  it("trust metadata check passes once every rule declares metadata", () => {
    const check = checkTrustMetadata();
    // Ratchet reached: full adoption — the check is now blocking.
    expect(check.details).toHaveLength(0);
    expect(check.ok).toBe(true);
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
});
