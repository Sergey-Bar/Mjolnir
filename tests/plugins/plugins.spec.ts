/**
 * Plugin API tests (Upgrade-Plan-v3 Phase 6).
 * Covers: valid plugin load, missing package, non-plugin package,
 * reserved-prefix rejection, malformed rule rejection, no-config no-op.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { loadPlugins } from "../../src/plugins/load.js";

const ROOT = join(tmpdir(), `qa-doctor-plugin-test-${process.pid}`);

function writeConfig(plugins: unknown): void {
  writeFileSync(join(ROOT, "mjolnir.config.json"), JSON.stringify({ plugins }));
}

afterEach(() => {
  rmSync(ROOT, { recursive: true, force: true });
});

describe("loadPlugins", () => {
  it("returns empty when no config exists", () => {
    const result = loadPlugins(ROOT, true);
    expect(result.plugins).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("returns empty when config has no plugins key", () => {
    mkdirSync(ROOT, { recursive: true });
    writeFileSync(
      join(ROOT, "mjolnir.config.json"),
      JSON.stringify({ gate: "advisory" }),
    );
    const result = loadPlugins(ROOT, true);
    expect(result.plugins).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("reports an error for a package that cannot be resolved", () => {
    mkdirSync(ROOT, { recursive: true });
    writeConfig(["qa-doctor-plugin-does-not-exist"]);
    const result = loadPlugins(ROOT, true);
    expect(result.plugins).toHaveLength(0);
    expect(result.errors[0]).toContain("failed to load");
  });

  it("rejects a plugin claiming a reserved core prefix", () => {
    mkdirSync(ROOT, { recursive: true });
    // Simulate a resolvable module via a local relative path.
    const pluginDir = join(ROOT, "bad-plugin");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, "package.json"),
      JSON.stringify({ name: "bad-plugin", main: "index.js" }),
    );
    writeFileSync(
      join(pluginDir, "index.js"),
      `exports.rules = [{ id: "QA-PW-999", run: () => [] }];`,
    );
    writeConfig(["./bad-plugin"]);
    const result = loadPlugins(ROOT, true);
    expect(result.plugins).toHaveLength(1);
    expect(result.plugins[0]?.rules).toHaveLength(0);
    expect(result.errors[0]).toContain("reserved core prefix");
  });

  it("accepts a well-formed plugin with its own prefix", () => {
    mkdirSync(ROOT, { recursive: true });
    const pluginDir = join(ROOT, "good-plugin");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, "package.json"),
      JSON.stringify({ name: "good-plugin", main: "index.js" }),
    );
    writeFileSync(
      join(pluginDir, "index.js"),
      `exports.rules = [{
        id: "QA-ACME-001",
        category: "QA-ACME",
        title: "Acme check",
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "HYGIENE",
        appliesTo: "test-files",
        run: () => [],
      }];`,
    );
    writeConfig(["./good-plugin"]);
    const result = loadPlugins(ROOT, true);
    expect(result.errors).toHaveLength(0);
    expect(result.plugins).toHaveLength(1);
    expect(result.plugins[0]?.rules).toHaveLength(1);
    expect(result.plugins[0]?.rules[0]?.id).toBe("QA-ACME-001");
  });

  it("degrades to no-op instead of throwing on malformed config JSON", () => {
    mkdirSync(ROOT, { recursive: true });
    writeFileSync(join(ROOT, "mjolnir.config.json"), "{ this is not json");
    expect(() => loadPlugins(ROOT)).not.toThrow();
    const result = loadPlugins(ROOT, true);
    expect(result.plugins).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts the object-form declaration ({ package, prefix })", () => {
    mkdirSync(ROOT, { recursive: true });
    const pluginDir = join(ROOT, "object-form-plugin");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, "package.json"),
      JSON.stringify({ name: "object-form-plugin", main: "index.js" }),
    );
    writeFileSync(
      join(pluginDir, "index.js"),
      `exports.rules = [{
        id: "QA-OBJ-001",
        category: "QA-OBJ",
        title: "Object-form check",
        severity: "info",
        confidence: "medium",
        findingType: "observation",
        qaImpact: "HYGIENE",
        appliesTo: "test-files",
        run: () => [],
      }];`,
    );
    writeConfig([{ package: "./object-form-plugin", prefix: "QA-OBJ" }]);
    const result = loadPlugins(ROOT, true);
    expect(result.errors).toHaveLength(0);
    expect(result.plugins).toHaveLength(1);
    expect(result.plugins[0]?.rules[0]?.id).toBe("QA-OBJ-001");
  });

  it("rejects rules that ignore the user-declared prefix (bug-audit L12)", () => {
    // The declared prefix used to be dead metadata: a plugin declaring
    // prefix "ACME" while exporting QA-OTHER-001 rules was accepted.
    mkdirSync(ROOT, { recursive: true });
    const pluginDir = join(ROOT, "mismatched-prefix-plugin");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, "package.json"),
      JSON.stringify({ name: "mismatched-prefix-plugin", main: "index.js" }),
    );
    writeFileSync(
      join(pluginDir, "index.js"),
      `exports.rules = [{
        id: "QA-OTHER-001",
        category: "QA-OTHER",
        title: "Mismatched check",
        severity: "info",
        confidence: "medium",
        findingType: "observation",
        qaImpact: "HYGIENE",
        appliesTo: "test-files",
        run: () => [],
      }];`,
    );
    writeConfig([{ package: "./mismatched-prefix-plugin", prefix: "ACME" }]);
    const result = loadPlugins(ROOT, true);
    // The plugin object is still listed (convention: degrade honestly),
    // but the offending rule is rejected with a named error.
    expect(result.plugins[0]?.rules).toHaveLength(0);
    expect(result.errors.join("\n")).toContain("declared prefix");
    expect(result.errors.join("\n")).toContain("QA-ACME-");
  });

  it("accepts rules that honor the declared prefix (bug-audit L12 — positive control)", () => {
    mkdirSync(ROOT, { recursive: true });
    const pluginDir = join(ROOT, "matching-prefix-plugin");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, "package.json"),
      JSON.stringify({ name: "matching-prefix-plugin", main: "index.js" }),
    );
    writeFileSync(
      join(pluginDir, "index.js"),
      `exports.rules = [{
        id: "QA-ACME-001",
        category: "QA-ACME",
        title: "Matched check",
        severity: "info",
        confidence: "medium",
        findingType: "observation",
        qaImpact: "HYGIENE",
        appliesTo: "test-files",
        run: () => [],
      }];`,
    );
    writeConfig([{ package: "./matching-prefix-plugin", prefix: "ACME" }]);
    const result = loadPlugins(ROOT, true);
    expect(result.errors).toHaveLength(0);
    expect(result.plugins).toHaveLength(1);
  });

  it("ignores array entries that are neither strings nor {package} objects", () => {
    mkdirSync(ROOT, { recursive: true });
    writeConfig([42, null, { notPackage: "x" }, true]);
    const result = loadPlugins(ROOT, true);
    expect(result.plugins).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("ignores a non-array plugins value entirely", () => {
    mkdirSync(ROOT, { recursive: true });
    writeConfig("not-an-array");
    const result = loadPlugins(ROOT, true);
    expect(result.plugins).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("reports an error when the resolved module exports no rules array", () => {
    mkdirSync(ROOT, { recursive: true });
    const pluginDir = join(ROOT, "no-rules-plugin");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, "package.json"),
      JSON.stringify({ name: "no-rules-plugin", main: "index.js" }),
    );
    writeFileSync(join(pluginDir, "index.js"), `exports.notRules = [];`);
    writeConfig(["./no-rules-plugin"]);
    const result = loadPlugins(ROOT, true);
    expect(result.plugins).toHaveLength(0);
    expect(result.errors[0]).toContain("exports no `rules` array");
  });

  it("skips a malformed rule (missing id or run) but keeps the well-formed ones", () => {
    mkdirSync(ROOT, { recursive: true });
    const pluginDir = join(ROOT, "mixed-plugin");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, "package.json"),
      JSON.stringify({ name: "mixed-plugin", main: "index.js" }),
    );
    writeFileSync(
      join(pluginDir, "index.js"),
      `exports.rules = [
        { id: "QA-MIX-001", category: "QA-MIX", title: "ok", severity: "info", confidence: "medium", findingType: "observation", qaImpact: "HYGIENE", appliesTo: "test-files", run: () => [] },
        { category: "QA-MIX", title: "no id" },
        { id: "QA-MIX-002", title: "no run function" },
      ];`,
    );
    writeConfig(["./mixed-plugin"]);
    const result = loadPlugins(ROOT, true);
    expect(result.plugins).toHaveLength(1);
    expect(result.plugins[0]?.rules).toHaveLength(1);
    expect(result.plugins[0]?.rules[0]?.id).toBe("QA-MIX-001");
    expect(
      result.errors.filter((e) => e.includes("malformed rule")),
    ).toHaveLength(2);
  });
});
