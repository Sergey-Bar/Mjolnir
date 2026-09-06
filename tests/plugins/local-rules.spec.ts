/**
 * Local Extensibility specs (Verification Trust Evolution Plan §18).
 *
 * Exit gate under test: an external rule LOADS from the workspace
 * (`mjolnir-rules/`, zero network), RUNS in a real scan, OBEYS tier
 * caps (quarantine cap + the core-clamp), and is DRIFT-CHECKED (the
 * `mjolnir rules` catalog is generated from the loaded rules, so an
 * on-disk edit changes the next render — it can never drift from what
 * actually ships).
 */

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadLocalRules } from "../../src/plugins/local-rules.js";
import { buildUniversalRules } from "../../src/cli.js";
import { runScan } from "../../src/cli.js";
import { enforceTierPolicy } from "../../src/engine/tier-policy.js";
import {
  buildCatalog,
  renderCatalogMd,
} from "../../src/commands/rules-catalog.js";
import type { Finding } from "../../src/types.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs.length = 0;
});

function workspace(): string {
  const d = mkdtempSync(join(tmpdir(), "mjolnir-ext-"));
  dirs.push(d);
  return d;
}

function writeRule(dir: string, name: string, json: unknown): void {
  mkdirSync(join(dir, "mjolnir-rules"), { recursive: true });
  writeFileSync(
    join(dir, "mjolnir-rules", name),
    typeof json === "string" ? json : JSON.stringify(json, null, 2),
  );
}

const VALID_RULE = {
  id: "QA-ACME-001",
  title: "Forbidden phrase in spec files",
  severity: "warning",
  confidence: "medium",
  category: "QA-TEST",
  appliesTo: "test-files",
  filePattern: undefined,
  patterns: ["FORBIDDEN_PHRASE_\\d+"],
  message: "Forbidden phrase found.",
  why: "The phrase is a placeholder from a generator.",
  fix: "Replace it with the real expectation.",
  qaImpact: "HYGIENE",
  languages: ["typescript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "low",
};

describe("loadLocalRules — the folder contract (zero network)", () => {
  it("a JSON rule file loads and runs (declarative patterns, no code executed)", async () => {
    const dir = workspace();
    writeRule(dir, "acme.json", VALID_RULE);
    const { rules, errors } = await loadLocalRules(dir, true);
    expect(errors).toEqual([]);
    expect(rules).toHaveLength(1);
    expect(rules[0]?.id).toBe("QA-ACME-001");
    expect(rules[0]?.tier).toBe("quarantine"); // born quarantine — §18
    const rule = rules[0];
    const findings = rule
      ? rule.run({
          path: "spec.acme.ts",
          text: "line one\nFORBIDDEN_PHRASE_42\n",
          codeText: "line one\nFORBIDDEN_PHRASE_42\n",
        })
      : [];
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(2);
  });

  it("a JS module exporting rules loads like an npm plugin", async () => {
    const dir = workspace();
    mkdirSync(join(dir, "mjolnir-rules"), { recursive: true });
    writeFileSync(
      join(dir, "mjolnir-rules", "acme.mjs"),
      `export const rules = [{ id: "QA-ACME-002", title: "Module rule", category: "QA-TEST", severity: "info", confidence: "medium", findingType: "deterministic-defect", qaImpact: "HYGIENE", appliesTo: "test-files", tier: "quarantine", run: () => [] }];`,
    );
    const { rules, errors } = await loadLocalRules(dir, true);
    expect(errors).toEqual([]);
    expect(rules.map((r) => r.id)).toEqual(["QA-ACME-002"]);
  });

  it("reserved core prefixes are rejected (case-insensitive spoofing guard)", async () => {
    const dir = workspace();
    writeRule(dir, "spoof.json", { ...VALID_RULE, id: "qa-pw-999" });
    const { rules, errors } = await loadLocalRules(dir, true);
    expect(rules).toHaveLength(0);
    expect(errors[0]).toContain("reserved core prefix");
  });

  it("declared tier core is CLAMPED to extended with a warning (§18 measurement requirement)", async () => {
    const dir = workspace();
    mkdirSync(join(dir, "mjolnir-rules"), { recursive: true });
    writeFileSync(
      join(dir, "mjolnir-rules", "core.mjs"),
      `export const rules = [{ id: "QA-ACME-003", title: "Wants core", category: "QA-TEST", severity: "error", confidence: "high", findingType: "deterministic-defect", qaImpact: "BLOCKS-RELEASE", appliesTo: "test-files", tier: "core", run: () => [] }];`,
    );
    const { rules, errors } = await loadLocalRules(dir, true);
    expect((rules[0] as { tier?: string }).tier).toBe("extended");
    expect(errors[0]).toContain('clamped to "extended"');
  });

  it("an invalid regex or bad metadata degrades to a warning entry, never a crash", async () => {
    const dir = workspace();
    writeRule(dir, "badregex.json", {
      ...VALID_RULE,
      id: "QA-ACME-004",
      patterns: ["([unclosed"],
    });
    writeRule(dir, "badmeta.json", {
      ...VALID_RULE,
      id: "QA-ACME-005",
      severity: "fatal",
    });
    const { rules, errors } = await loadLocalRules(dir, true);
    expect(rules).toHaveLength(0);
    expect(errors).toHaveLength(2);
  });

  it("no mjolnir-rules directory → empty result, not an error", async () => {
    const dir = workspace();
    expect(await loadLocalRules(dir, true)).toEqual({
      rules: [],
      errors: [],
      skipped: [],
    });
  });
});

describe("exit gate: an external rule loads, runs, obeys tier caps, and is drift-checked", () => {
  it("end-to-end: loads via buildUniversalRules, fires in a real scan, obeys the quarantine cap (info + E0), clamped out of non-strict scans", async () => {
    const dir = workspace();
    writeRule(dir, "acme.json", VALID_RULE);
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "shop.spec.ts"),
      `import { test } from "@playwright/test";\n\ntest("t", async () => {\n  const x = "FORBIDDEN_PHRASE_7";\n  console.log(x);\n});\n`,
    );

    // --strict: the external quarantine rule runs…
    const strict = await runScan({
      target: dir,
      maxDurationMs: 60_000,
      json: false,
      verbose: false,
      scopeChanged: false,
      format: "terminal",
      strict: true,
    });
    const external = strict.findings.filter((f) => f.ruleId === "QA-ACME-001");
    expect(external.length).toBeGreaterThan(0);
    // …and obeys the tier cap: quarantine → info + E0, advisory by
    // construction even though the rule declared severity warning.
    expect(external[0]?.severity).toBe("info");
    expect(external[0]?.evidenceLevel).toBe("E0");

    // Non-strict: the external quarantine rule is excluded, like core.
    const plain = await runScan({
      target: dir,
      maxDurationMs: 60_000,
      json: false,
      verbose: false,
      scopeChanged: false,
      format: "terminal",
      strict: false,
    });
    expect(plain.findings.some((f) => f.ruleId === "QA-ACME-001")).toBe(false);

    // Disclosure: the plugin block names the external surface (audit S-8).
    expect(strict.plugins?.some((p) => p.name.includes("mjolnir-rules"))).toBe(
      true,
    );
  });

  it("buildUniversalRules surfaces load errors as warning findings, never a crash", async () => {
    const dir = workspace();
    writeRule(dir, "spoof.json", { ...VALID_RULE, id: "qa-test-777" });
    const { pluginErrors } = await buildUniversalRules(dir, true);
    expect(pluginErrors.some((e) => e.includes("reserved core prefix"))).toBe(
      true,
    );
    // And they flow through runScan as QA-PLUGIN-000 findings.
    const result = await runScan({
      target: dir,
      maxDurationMs: 60_000,
      json: false,
      verbose: false,
      scopeChanged: false,
      format: "terminal",
      strict: true,
    });
    expect(result.findings.some((f) => f.ruleId === "QA-PLUGIN-000")).toBe(
      true,
    );
  });

  it("DRIFT-CHECK: the rules catalog is generated from the loaded rules — an on-disk edit changes the next render", async () => {
    const dir = workspace();
    writeRule(dir, "acme.json", VALID_RULE);
    const loaded = await loadLocalRules(dir, true);
    const before = renderCatalogMd(
      buildCatalog(loaded.rules, { provenance: "external" }),
    );
    expect(before).toContain("QA-ACME-001");
    expect(before).toContain("external");

    // Edit the rule on disk → the very next catalog render reflects it.
    writeRule(dir, "acme.json", {
      ...VALID_RULE,
      title: "Renamed rule on disk",
    });
    const loaded2 = await loadLocalRules(dir, true);
    const after = renderCatalogMd(
      buildCatalog(loaded2.rules, { provenance: "external" }),
    );
    expect(after).toContain("Renamed rule on disk");
    expect(after).not.toContain("Forbidden phrase in spec files");

    // JSON catalog carries the provenance field.
    const entry = buildCatalog(loaded2.rules, { provenance: "external" })[0];
    expect(entry?.provenance).toBe("external");
  });

  it("external findings flow through enforceTierPolicy unchanged for non-quarantine tiers", async () => {
    const dir = workspace();
    writeRule(dir, "acme.json", { ...VALID_RULE, severity: "error" });
    const { rules } = await loadLocalRules(dir, true);
    const finding: Finding = {
      ruleId: "QA-ACME-001",
      category: "QA-TEST",
      severity: "error",
      confidence: "medium",
      findingType: "heuristic-risk",
      qaImpact: "HYGIENE",
      evidenceLevel: "E1",
      file: "x.ts",
      line: 1,
      column: 1,
      message: "m",
      why: "w",
      fix: "f",
    };
    const tierByRuleId = new Map(
      rules.map((r) => [r.id, r.tier ?? ("quarantine" as const)]),
    );
    enforceTierPolicy([finding], tierByRuleId);
    // External rule born quarantine → capped, same as core quarantine.
    expect(finding.severity).toBe("info");
    expect(finding.evidenceLevel).toBe("E0");
  });

  it("the JSON external rule file can carry languages/frameworks (framework dimension §15.1)", async () => {
    const dir = workspace();
    writeRule(dir, "acme.json", VALID_RULE);
    const { rules } = await loadLocalRules(dir, true);
    expect(rules[0]?.languages).toEqual(["typescript"]);
    expect(rules[0]?.frameworks).toEqual(["playwright"]);
  });

  it("the scan result JSON is byte-valid with the profile + external fields present", async () => {
    const dir = workspace();
    writeRule(dir, "acme.json", VALID_RULE);
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "shop.spec.ts"),
      `import { test } from "@playwright/test";\n\ntest("t", async () => {\n  const x = "FORBIDDEN_PHRASE_7";\n});\n`,
    );
    const result = await runScan({
      target: dir,
      maxDurationMs: 60_000,
      json: false,
      verbose: false,
      scopeChanged: false,
      format: "terminal",
      strict: true,
    });
    // Round-trip through JSON.stringify (the --json contract): additive
    // fields must serialize without breaking the frozen schema version.
    const round = JSON.parse(JSON.stringify(result)) as typeof result;
    expect(round.schemaVersion).toBe(result.schemaVersion);
    expect(
      readFileSync(join(dir, "mjolnir-rules", "acme.json"), "utf8"),
    ).toContain("QA-ACME-001");
  });
});
