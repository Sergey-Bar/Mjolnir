/**
 * Scan arms that need real plugin/config fixtures: plugin rules with a
 * tier (tier map + quarantine cap), plugin load errors surfacing as
 * QA-PLUGIN-000 findings, files-scoped suppressions (glob semantics),
 * and the runScan config-warning hook.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runScan, runScanCommand, type ScanHooks } from "../src/cli.js";
import type { ScanResult } from "../src/types.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-cli-scan-arms-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writePlugin(name: string, body: string): void {
  const pluginDir = join(dir, name);
  mkdirSync(pluginDir, { recursive: true });
  writeFileSync(
    join(pluginDir, "package.json"),
    JSON.stringify({ name, main: "index.js" }),
  );
  writeFileSync(join(pluginDir, "index.js"), body);
}

const ACME_TIERED_RULE = `exports.rules = [{
  id: "QA-ACME-001",
  category: "QA-ACME",
  title: "Acme quarantine check",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  tier: "quarantine",
  run: (ctx) => [{
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    file: ctx.path,
    line: 1,
    column: 1,
    message: "acme violation",
    why: "why",
    fix: "fix",
    qaImpact: "HYGIENE",
  }],
}];`;

function scanJson(
  target = dir,
  extraArgs: string[] = [],
): {
  code: number;
  result: ScanResult & { analysisStatus: Record<string, unknown> };
  err: string[];
} {
  const out: string[] = [];
  const err: string[] = [];
  const code = runScanCommand([target, "--json", ...extraArgs], {
    out: (...p: unknown[]) => out.push(p.map(String).join(" ")),
    err: (...p: unknown[]) => err.push(p.map(String).join(" ")),
  });
  return {
    code,
    result: JSON.parse(out.join("\n")) as ScanResult & {
      analysisStatus: Record<string, unknown>;
    },
    err,
  };
}

describe("plugin tier enforcement", () => {
  it("caps quarantine-tier plugin findings to info/E0 even at severity error", () => {
    writePlugin("good-plugin", ACME_TIERED_RULE);
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ plugins: ["./good-plugin"] }),
    );
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "acme.spec.ts"),
      "it('a', () => { expect(1 + 1).toBe(2); });\n",
    );
    const { code, result } = scanJson();
    const acme = result.findings.find((f) => f.ruleId === "QA-ACME-001");
    expect(acme).toBeDefined();
    // Tier policy: quarantine findings can never gate CI.
    expect(acme?.severity).toBe("info");
    expect(acme?.evidenceLevel).toBe("E0");
    expect(code).toBe(0);
    expect(result.plugins).toEqual([{ name: "./good-plugin", rules: 1 }]);
  });

  it("surfaces unloadable plugins as QA-PLUGIN-000 findings", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ plugins: ["./missing-plugin"] }),
    );
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "a.spec.ts"),
      "it('a', () => { expect(1 + 1).toBe(2); });\n",
    );
    const { result } = scanJson();
    const pluginFinding = result.findings.find(
      (f) => f.ruleId === "QA-PLUGIN-000",
    );
    expect(pluginFinding).toBeDefined();
    expect(pluginFinding?.message).toContain("failed to load");
  });
});

describe("files-scoped suppressions", () => {
  it("suppresses only rule+glob matches and keeps other findings", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({
        ignore: [
          {
            ruleId: "QA-PW-101",
            files: ["e2e/**"],
            reason: "known flake under e2e",
            expires: "2099-01-01",
          },
          {
            ruleId: "QA-TEST-004",
            files: ["src/**"],
            reason: "different tree, must not match e2e findings",
            expires: "2099-01-01",
          },
        ],
      }),
    );
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "a.spec.ts"),
      [
        "import { test, expect } from '@playwright/test';",
        "test('one', async ({ page }) => {",
        "  await page.waitForTimeout(500);",
        "  await expect(page).toHaveURL('/a');",
        "});",
        "",
      ].join("\n"),
    );
    const { result } = scanJson();
    const ruleIds = result.findings.map((f) => f.ruleId);
    // QA-PW-101 under e2e/** is suppressed by rule+glob; QA-TEST-004 is
    // not (its files glob points at src/**), and it still surfaces.
    expect(ruleIds).not.toContain("QA-PW-101");
    expect(ruleIds).toContain("QA-TEST-004");
    expect(result.suppressionCount).toBe(2);
  });
});

describe("runScan config-warning hook", () => {
  it("delivers non-fatal config warnings to the hook", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ severityOverrides: { "QA-NOPE-001": "warning" } }),
    );
    mkdirSync(join(dir, "e2e"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "a.spec.ts"),
      "it('a', () => { expect(1 + 1).toBe(2); });\n",
    );
    const warnings: string[] = [];
    const hooks: ScanHooks = { onConfigWarning: (m) => warnings.push(m) };
    runScan(
      {
        target: dir,
        json: false,
        verbose: false,
        maxDurationMs: Number.POSITIVE_INFINITY,
        scopeChanged: false,
        format: "terminal",
      },
      hooks,
    );
    expect(warnings.join("\n")).toContain("names no registered rule");
  });
});
