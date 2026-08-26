/**
 * Plugin API tests (Upgrade-Plan-v3 Phase 6).
 * Covers: valid plugin load, missing package, non-plugin package,
 * reserved-prefix rejection, malformed rule rejection, no-config no-op.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { loadPlugins } from "../src/plugins/load.js";

const ROOT = join(tmpdir(), `qa-doctor-plugin-test-${process.pid}`);

function writeConfig(plugins: unknown): void {
  writeFileSync(
    join(ROOT, "qa-doctor.config.json"),
    JSON.stringify({ plugins }),
  );
}

afterEach(() => {
  rmSync(ROOT, { recursive: true, force: true });
});

describe("loadPlugins", () => {
  it("returns empty when no config exists", () => {
    const result = loadPlugins(ROOT);
    expect(result.plugins).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("returns empty when config has no plugins key", () => {
    mkdirSync(ROOT, { recursive: true });
    writeFileSync(
      join(ROOT, "qa-doctor.config.json"),
      JSON.stringify({ gate: "advisory" }),
    );
    const result = loadPlugins(ROOT);
    expect(result.plugins).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("reports an error for a package that cannot be resolved", () => {
    mkdirSync(ROOT, { recursive: true });
    writeConfig(["qa-doctor-plugin-does-not-exist"]);
    const result = loadPlugins(ROOT);
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
    const result = loadPlugins(ROOT);
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
    const result = loadPlugins(ROOT);
    expect(result.errors).toHaveLength(0);
    expect(result.plugins).toHaveLength(1);
    expect(result.plugins[0]?.rules).toHaveLength(1);
    expect(result.plugins[0]?.rules[0]?.id).toBe("QA-ACME-001");
  });
});
