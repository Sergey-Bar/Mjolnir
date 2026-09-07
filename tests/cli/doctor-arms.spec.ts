/**
 * Phase 1 coverage: commands/doctor.ts residual arms — evidence-honesty
 * pass case, verdict-fallback path, anti-creep overflow rendering, and
 * the quarantine-cap audit's loud failure (via a deliberately broken cap
 * injected through the tier-policy mock — if capForTier ever drifts from
 * severity=info/E0, doctor must fail loudly).
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/engine/tier-policy.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/engine/tier-policy.js")>();
  return {
    ...actual,
    capForTier: vi.fn((tier?: string) =>
      tier === "quarantine"
        ? { severity: "error" as const, evidenceLevel: "E2" as const }
        : actual.capForTier(tier as never),
    ),
  };
});

import {
  checkAntiCreep,
  checkEvidenceHonesty,
  checkFixtureIntegrity,
  checkQuarantineEnforcement,
  checkTierEnforcement,
} from "../../src/commands/doctor.js";
import type { QADoctorRule } from "../../src/rules/rule.js";

function minimalRule(overrides: Partial<QADoctorRule>): QADoctorRule {
  return {
    id: "QA-TEST-900",
    category: "QA-TEST",
    title: "Probe rule",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    appliesTo: "test-files",
    run: () => [],
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("checkEvidenceHonesty", () => {
  it("passes a rule whose declared evidence matches the derivation", () => {
    const honest = minimalRule({
      id: "QA-TEST-901",
      evidenceLevel: "E2",
      findingType: "deterministic-defect",
      confidence: "high",
    });
    const result = checkEvidenceHonesty([honest]);
    expect(result.ok).toBe(true);
    expect(result.details).toEqual([]);
  });
});

describe("checkTierEnforcement", () => {
  it("falls back to the shipped MEASURED_FP when live verdicts yield nothing", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-doctor-verdicts-"));
    try {
      // A .jsonl with only malformed lines: the live reader stays empty,
      // so the ratchet must fall back to the baked-in baseline.
      writeFileSync(join(dir, "verdicts.jsonl"), "{ not json\n\n[]\n");
      const result = checkTierEnforcement(dir);
      expect(result.name).toBe("tier-enforcement");
      expect(result.details[0]).toContain("Ratchet (Law #3)");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("checkAntiCreep", () => {
  it("lists overflow rules without the 'and N more' line when overflow is small", () => {
    const rules: QADoctorRule[] = [];
    for (let i = 0; i < 66; i++) {
      rules.push(
        // Explicit core: an omitted tier resolves measurement-dependently
        // (plan §11.2 Step 2) and these probe rules carry no measurement.
        minimalRule({
          id: `QA-TEST-${String(800 + i).padStart(3, "0")}`,
          tier: "core",
        }),
      );
    }
    const result = checkAntiCreep(rules);
    expect(result.ok).toBe(false);
    const text = result.details.join("\n");
    expect(text).toContain("exceeds cap of 65");
    expect(text).toContain("overflow: QA-TEST-865");
    expect(text).not.toContain("… and");
  });
});

describe("checkQuarantineEnforcement", () => {
  it("fails loudly when the quarantine cap drifts from info/E0", () => {
    const quarantine = minimalRule({
      id: "QA-TEST-902",
      tier: "quarantine",
    });
    const result = checkQuarantineEnforcement([quarantine]);
    expect(result.ok).toBe(false);
    expect(result.details.join("\n")).toContain("could gate CI");
  });
});

describe("checkFixtureIntegrity (certification-audit Phase 2.5)", () => {
  function makeFixturesTree(): string {
    return mkdtempSync(join(tmpdir(), "mjolnir-doctor-fxint-"));
  }

  it("passes a healthy tree with registered rule dirs and populated fire/no-fire fixtures", () => {
    const root = makeFixturesTree();
    try {
      const fixtures = join(root, "fixtures");
      const rules = [
        minimalRule({ id: "QA-TEST-910" }),
        minimalRule({ id: "QA-TEST-911" }),
      ];
      for (const rule of rules) {
        for (const kind of ["must-fire", "must-not-fire"]) {
          mkdirSync(join(fixtures, rule.id, kind), { recursive: true });
          writeFileSync(
            join(fixtures, rule.id, kind, "a.spec.ts"),
            "it('a', () => {});\n",
          );
        }
      }
      const result = checkFixtureIntegrity(fixtures, rules);
      expect(result.ok).toBe(true);
      expect(result.details.join("\n")).not.toContain("orphaned fixture dir");
      expect(result.details.join("\n")).not.toContain("empty fixture dir");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("FAILS on an empty must-not-fire dir (the QA-PW-124 deletion class)", () => {
    const root = makeFixturesTree();
    try {
      const fixtures = join(root, "fixtures");
      const rules = [minimalRule({ id: "QA-TEST-912" })];
      mkdirSync(join(fixtures, "QA-TEST-912", "must-fire"), {
        recursive: true,
      });
      writeFileSync(
        join(fixtures, "QA-TEST-912", "must-fire", "a.spec.ts"),
        "it('a', () => {});\n",
      );
      mkdirSync(join(fixtures, "QA-TEST-912", "must-not-fire"), {
        recursive: true,
      });
      // left empty — the firewall alone would catch this too, but the
      // integrity census must NOT stay green when the firewall is bypassed.
      const result = checkFixtureIntegrity(fixtures, rules);
      expect(result.ok).toBe(false);
      expect(result.details.join("\n")).toContain(
        "empty fixture dir: QA-TEST-912/must-not-fire",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("FAILS on an orphaned fixture dir with no registered rule", () => {
    const root = makeFixturesTree();
    try {
      const fixtures = join(root, "fixtures");
      mkdirSync(join(fixtures, "QA-GHOST-999", "must-fire"), {
        recursive: true,
      });
      writeFileSync(join(fixtures, "QA-GHOST-999", "must-fire", "a.ts"), "x\n");
      const result = checkFixtureIntegrity(fixtures, [
        minimalRule({ id: "QA-TEST-913" }),
      ]);
      expect(result.ok).toBe(false);
      expect(result.details.join("\n")).toContain(
        "orphaned fixture dir (no registered rule): QA-GHOST-999",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("ignores hidden dirs (.github in harvested corpus trees) and reports the allowlist census", () => {
    const root = makeFixturesTree();
    try {
      const fixtures = join(root, "fixtures");
      mkdirSync(join(fixtures, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(fixtures, ".github", "workflows", "ci.yml"),
        "on: push\n",
      );
      writeFileSync(
        join(fixtures, "typecheck-allowlist.json"),
        JSON.stringify({
          entries: [{ path: "x", reason: "justified entry here" }],
        }),
      );
      const result = checkFixtureIntegrity(fixtures, []);
      expect(result.ok).toBe(true);
      expect(result.details.join("\n")).toContain("allowlist: 1 justified");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("counts loose files directly inside a rule dir (no empty-dir false positive)", () => {
    const root = makeFixturesTree();
    try {
      const fixtures = join(root, "fixtures");
      const rules = [minimalRule({ id: "QA-TEST-914" })];
      mkdirSync(join(fixtures, "QA-TEST-914", "must-fire"), {
        recursive: true,
      });
      writeFileSync(join(fixtures, "QA-TEST-914", "must-fire", "a.ts"), "x\n");
      // A loose top-level file inside the rule dir is counted, not flagged.
      writeFileSync(join(fixtures, "QA-TEST-914", "README.md"), "notes\n");
      const result = checkFixtureIntegrity(fixtures, rules);
      expect(result.ok).toBe(true);
      expect(result.details[0]).toContain("2 fixture files");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("FAILS when the allowlist exists but its entries field is not an array", () => {
    const root = makeFixturesTree();
    try {
      const fixtures = join(root, "fixtures");
      mkdirSync(fixtures, { recursive: true });
      writeFileSync(
        join(fixtures, "typecheck-allowlist.json"),
        JSON.stringify({ entries: "not-an-array" }),
      );
      const result = checkFixtureIntegrity(fixtures, []);
      expect(result.ok).toBe(false);
      expect(result.details.join("\n")).toContain("entries is not an array");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("FAILS when the allowlist is unreadable/malformed JSON", () => {
    const root = makeFixturesTree();
    try {
      const fixtures = join(root, "fixtures");
      mkdirSync(fixtures, { recursive: true });
      writeFileSync(join(fixtures, "typecheck-allowlist.json"), "{ not json");
      const result = checkFixtureIntegrity(fixtures, []);
      expect(result.ok).toBe(false);
      expect(result.details.join("\n")).toContain("unreadable/malformed");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
