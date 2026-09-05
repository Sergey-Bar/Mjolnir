/**
 * M2 acceptance tests — audit-remediation-master-plan.md.
 *
 *  - audit-C2: the plugin trust gate. npm plugins and JS-module rule
 *    sources execute ONLY behind --enable-plugins / MJOLNIR_ENABLE_PLUGINS=1
 *    (default OFF). JSON manifests load without the gate (no code by
 *    design). Gate-closed skips are reported loudly on stderr.
 *  - audit-S2: ignore/glob pattern caps reject oversized/hostile patterns.
 *  - audit-S7: ignore[].files must be string[]; unknown config keys warn;
 *    baseline schemaVersion is checked.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadPlugins } from "../../src/plugins/load.js";
import { loadLocalRules } from "../../src/plugins/local-rules.js";
import {
  pluginsGateOpen,
  renderGateNotice,
} from "../../src/plugins/trust-gate.js";
import { isReservedPrefix } from "../../src/plugins/reserved-prefixes.js";
import { runScanCommand } from "../../src/cli.js";
import {
  createMatcherFromPatterns,
  LIMITS,
} from "../../src/discovery/ignores.js";
import { loadConfig } from "../../src/config/config.js";
import { loadBaseline, saveBaseline } from "../../src/commands/baseline.js";
import type { ScanResult } from "../../src/types.js";

const createdDirs: string[] = [];
afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
  delete process.env["MJOLNIR_ENABLE_PLUGINS"];
});

function tmpRepo(label: string): string {
  const d = mkdtempSync(join(tmpdir(), `mjolnir-m2-${label}-`));
  createdDirs.push(d);
  return d;
}

function capture() {
  const out: string[] = [];
  const errLines: string[] = [];
  return {
    io: {
      out: (...parts: unknown[]) => out.push(parts.map(String).join(" ")),
      err: (...parts: unknown[]) => errLines.push(parts.map(String).join(" ")),
    },
    text: () => out.join("\n"),
    errText: () => errLines.join("\n"),
  };
}

describe("audit-C2: plugin trust gate — npm plugins", () => {
  it("a declared plugin is NOT loaded when the gate is closed (code never runs)", () => {
    const dir = tmpRepo("c2-npm");
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ plugins: ["mjolnir-plugin-hostile"] }),
    );
    const result = loadPlugins(dir, false);
    // No plugin loaded, no require attempted, source reported as skipped.
    expect(result.plugins).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(result.skipped).toEqual(["mjolnir-plugin-hostile"]);
  });

  it("gate open (flag) attempts the declared plugin and reports a load error for a missing package", () => {
    const dir = tmpRepo("c2-npm-open");
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ plugins: ["mjolnir-plugin-does-not-exist"] }),
    );
    const result = loadPlugins(dir, true);
    expect(result.plugins).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    // The require WAS attempted (gate open) — the missing package is a
    // load error, not a silent skip.
    expect(result.errors.join(" ")).toContain("failed to load");
  });

  it("gate closed (env var unset) never attempts the load", () => {
    const dir = tmpRepo("c2-npm-closed");
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ plugins: ["mjolnir-plugin-does-not-exist"] }),
    );
    const result = loadPlugins(dir, false);
    // The same missing package produces NO load error when the gate is
    // closed — the loader never reached require().
    expect(result.errors).toHaveLength(0);
    expect(result.skipped).toEqual(["mjolnir-plugin-does-not-exist"]);
  });

  it("gate selection: flag wins, env var applies process-wide, default closed", () => {
    expect(pluginsGateOpen(undefined)).toBe(false);
    expect(pluginsGateOpen(false)).toBe(false);
    expect(pluginsGateOpen(true)).toBe(true);
    process.env["MJOLNIR_ENABLE_PLUGINS"] = "1";
    expect(pluginsGateOpen(undefined)).toBe(true);
    expect(pluginsGateOpen(false)).toBe(true);
  });

  it("a scan of a plugin-declaring repo without the gate prints the notice on stderr and exits honestly", async () => {
    const dir = tmpRepo("c2-scan");
    mkdirSync(join(dir, "test"), { recursive: true });
    writeFileSync(
      join(dir, "test", "a.spec.ts"),
      "import { describe, expect, it } from 'vitest';\n" +
        "describe('d', () => { it('w', () => { expect(1).toBe(1); }); });\n",
    );
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ plugins: ["mjolnir-plugin-hostile"] }),
    );
    const cap = capture();
    const code = await runScanCommand([dir, "--json"], cap.io);
    expect(cap.errText()).toContain("plugin code execution is DISABLED");
    expect(cap.errText()).toContain("mjolnir-plugin-hostile");
    expect(code).toBe(0);
  });
});

describe("audit-C2: plugin trust gate — JS modules vs JSON manifests", () => {
  it("a JS module in mjolnir-rules/ is NOT imported when the gate is closed", async () => {
    const dir = tmpRepo("c2-js");
    mkdirSync(join(dir, "mjolnir-rules"), { recursive: true });
    // If this module were imported, its top-level throw would surface as
    // a load error — the gate must prevent the import from ever happening.
    writeFileSync(
      join(dir, "mjolnir-rules", "hostile.mjs"),
      "throw new Error('MODULE EXECUTED — gate failed');\n",
    );
    const result = await loadLocalRules(dir, false);
    expect(result.rules).toHaveLength(0);
    expect(result.errors.join("\n")).not.toContain("MODULE EXECUTED");
    expect(result.skipped).toEqual(["mjolnir-rules/hostile.mjs"]);
  });

  it("the same JS module IS loaded when the gate is open (and its rules accepted)", async () => {
    const dir = tmpRepo("c2-js-open");
    mkdirSync(join(dir, "mjolnir-rules"), { recursive: true });
    writeFileSync(
      join(dir, "mjolnir-rules", "ok.mjs"),
      "export const rules = [{ id: 'QA-ACME-001', category: 'QA-TEST', title: 't', severity: 'info', confidence: 'medium', findingType: 'heuristic-risk', qaImpact: 'HYGIENE', appliesTo: 'test-files', run: () => [] }];\n",
    );
    const result = await loadLocalRules(dir, true);
    expect(result.skipped).toHaveLength(0);
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0]?.id).toBe("QA-ACME-001");
  });

  it("a JSON manifest loads WITHOUT the gate (declarative-safe by design)", async () => {
    const dir = tmpRepo("c2-json");
    mkdirSync(join(dir, "mjolnir-rules"), { recursive: true });
    writeFileSync(
      join(dir, "mjolnir-rules", "acme.json"),
      JSON.stringify({
        id: "QA-ACME-002",
        category: "QA-TEST",
        severity: "warning",
        appliesTo: "test-files",
        qaImpact: "HYGIENE",
        patterns: ["acmeLegacyCall\\("],
        title: "legacy call",
        message: "legacy call",
      }),
    );
    const result = await loadLocalRules(dir, false);
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0]?.id).toBe("QA-ACME-002");
    expect(result.skipped).toHaveLength(0);
  });

  it("the gate notice names the skipped sources and the enabling instructions", () => {
    const notice = renderGateNotice([
      { kind: "plugin-package", name: "mjolnir-plugin-x" },
      { kind: "js-module", name: "mjolnir-rules/x.mjs" },
    ]);
    expect(notice).toContain("--enable-plugins");
    expect(notice).toContain("MJOLNIR_ENABLE_PLUGINS=1");
    expect(notice).toContain("mjolnir-plugin-x");
    expect(notice).toContain("mjolnir-rules/x.mjs");
    expect(notice).toContain("no code");
  });
});

describe("audit-C2: shared reserved-prefix law", () => {
  it("both loaders reject QA-CYP and QA-SE spoofing (drift gap closed)", async () => {
    expect(isReservedPrefix("QA-CYP-001")).toBe(true);
    expect(isReservedPrefix("qa-cyp-001")).toBe(true);
    expect(isReservedPrefix("QA-SE-9")).toBe(true);
    expect(isReservedPrefix("QA-ACME-001")).toBe(false);
    const dir = tmpRepo("c2-prefix");
    mkdirSync(join(dir, "mjolnir-rules"), { recursive: true });
    writeFileSync(
      join(dir, "mjolnir-rules", "spoof.json"),
      JSON.stringify({
        id: "QA-CYP-999",
        category: "QA-TEST",
        severity: "info",
        appliesTo: "test-files",
        qaImpact: "HYGIENE",
        patterns: ["x"],
      }),
    );
    const result = await loadLocalRules(dir, true);
    expect(result.rules).toHaveLength(0);
    expect(result.errors.join(" ")).toContain("reserved core prefix");
  });

  it("JS-module rules pass the same field validators as JSON rules", async () => {
    const dir = tmpRepo("c2-validate");
    mkdirSync(join(dir, "mjolnir-rules"), { recursive: true });
    writeFileSync(
      join(dir, "mjolnir-rules", "bad.mjs"),
      "export const rules = [{ id: 'QA-ACME-003', run: () => [], severity: 'catastrophic', category: 'QA-TEST', appliesTo: 'test-files' }];\n",
    );
    const result = await loadLocalRules(dir, true);
    expect(result.rules).toHaveLength(0);
    expect(result.errors.join(" ")).toContain('invalid "severity"');
  });
});

describe("audit-S2: pattern caps", () => {
  it("an ignore pattern over the length cap is rejected at compile", () => {
    const longPattern = `${"a".repeat(LIMITS.maxPatternLength)}*`;
    const matcher = createMatcherFromPatterns([longPattern]);
    expect(matcher.isIgnored("aaaa")).toBe(false);
  });

  it("a wildcard-bomb pattern over the wildcard cap is rejected", () => {
    const bomb = Array.from(
      { length: LIMITS.maxPatternWildcards + 2 },
      () => "*",
    ).join("a");
    const matcher = createMatcherFromPatterns([bomb]);
    expect(matcher.isIgnored("aaaa")).toBe(false);
  });

  it("`**/` compiles to the segment-aware form (gitignore semantics hold)", () => {
    const matcher = createMatcherFromPatterns(["**/secret.spec.ts"]);
    expect(matcher.isIgnored("secret.spec.ts")).toBe(true);
    expect(matcher.isIgnored("a/b/secret.spec.ts")).toBe(true);
    expect(matcher.isIgnored("a/secret.spec.ts.other")).toBe(false);
  });
});

describe("audit-S7: config validation", () => {
  it("ignore[].files with non-string entries is a ConfigValidationError (exit 10)", () => {
    const dir = tmpRepo("s7-files");
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({
        ignore: [{ ruleId: "QA-PW-101", reason: "r", files: [1, 2] }],
      }),
    );
    expect(() => loadConfig(dir)).toThrow(/files.*must be.*strings/);
  });

  it("unknown top-level config keys emit warnings, not silence", () => {
    const dir = tmpRepo("s7-keys");
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ severities: { "QA-PW-101": "error" } }),
    );
    const { warnings } = loadConfig(dir);
    expect(warnings.join(" ")).toContain("unknown top-level key");
  });
});

describe("audit-S7: baseline schemaVersion gate", () => {
  const sampleResult = {
    schemaVersion: 1,
    partial: false,
    score: 100,
    frameworks: [],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: [],
    testFileCount: 1,
    testDeclarationCount: 1,
    rawDeductions: 0,
    suppressionCount: 0,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1,
      rulesCrashed: 0,
    },
  } as unknown as ScanResult;

  it("a future schemaVersion degrades to no baseline with a warning", () => {
    const dir = tmpRepo("s7-baseline");
    saveBaseline(sampleResult, "unknown", join(dir, "b.json"));
    const raw = {
      ...(JSON.parse(readFileSyncSync(join(dir, "b.json"), "utf8")) as object),
      schemaVersion: 2,
    };
    writeFileSync(join(dir, "b.json"), JSON.stringify(raw));
    const warnings: string[] = [];
    expect(
      loadBaseline(join(dir, "b.json"), (w) => warnings.push(w)),
    ).toBeNull();
    expect(warnings.join(" ")).toContain(`schemaVersion ${String(2)}`);
  });

  it("a missing schemaVersion (legacy) is tolerated with a warning", () => {
    const dir = tmpRepo("s7-baseline-legacy");
    saveBaseline(sampleResult, "unknown", join(dir, "b.json"));
    const raw = JSON.parse(
      readFileSyncSync(join(dir, "b.json"), "utf8"),
    ) as Record<string, unknown>;
    delete raw["schemaVersion"];
    writeFileSync(join(dir, "b.json"), JSON.stringify(raw));
    const warnings: string[] = [];
    expect(
      loadBaseline(join(dir, "b.json"), (w) => warnings.push(w)),
    ).not.toBeNull();
    expect(warnings.join(" ")).toContain("no schemaVersion");
  });
});

import { readFileSync as readFileSyncSync } from "node:fs";
