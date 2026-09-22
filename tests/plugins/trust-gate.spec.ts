/**
 * Trust gate tests (audit-remediation-master-plan.md, locked decision C2).
 * Covers: pluginsGateOpen, renderGateNotice, and the security boundary
 * between declarative JSON rules and code-executing plugin sources.
 */

import { describe, expect, it } from "vitest";

import {
  pluginsGateOpen,
  renderGateNotice,
} from "../../src/plugins/trust-gate.js";

describe("pluginsGateOpen", () => {
  it("returns false when argsEnabled is undefined (default OFF)", () => {
    expect(pluginsGateOpen(undefined)).toBe(false);
  });

  it("returns false when argsEnabled is false", () => {
    expect(pluginsGateOpen(false)).toBe(false);
  });

  it("returns true when argsEnabled is true", () => {
    expect(pluginsGateOpen(true)).toBe(true);
  });

  it("returns true when MJOLNIR_ENABLE_PLUGINS=1 is set", () => {
    const original = process.env["MJOLNIR_ENABLE_PLUGINS"];
    process.env["MJOLNIR_ENABLE_PLUGINS"] = "1";
    expect(pluginsGateOpen(undefined)).toBe(true);
    // Restore.
    if (original === undefined) {
      delete process.env["MJOLNIR_ENABLE_PLUGINS"];
    } else {
      process.env["MJOLNIR_ENABLE_PLUGINS"] = original;
    }
  });

  it("returns false when MJOLNIR_ENABLE_PLUGINS is set to a non-1 value", () => {
    const original = process.env["MJOLNIR_ENABLE_PLUGINS"];
    process.env["MJOLNIR_ENABLE_PLUGINS"] = "0";
    expect(pluginsGateOpen(undefined)).toBe(false);
    if (original === undefined) {
      delete process.env["MJOLNIR_ENABLE_PLUGINS"];
    } else {
      process.env["MJOLNIR_ENABLE_PLUGINS"] = original;
    }
  });
});

describe("renderGateNotice", () => {
  it("renders the header line", () => {
    const notice = renderGateNotice([]);
    expect(notice).toContain(
      "mjolnir: plugin code execution is DISABLED (default)",
    );
  });

  it("lists npm plugin sources", () => {
    const notice = renderGateNotice([
      { kind: "plugin-package", name: "mjolnir-plugin-acme" },
    ]);
    expect(notice).toContain("npm plugin: mjolnir-plugin-acme");
    expect(notice).not.toContain("JS module");
  });

  it("lists JS module sources", () => {
    const notice = renderGateNotice([
      { kind: "js-module", name: "mjolnir-rules/custom.mjs" },
    ]);
    expect(notice).toContain("JS module:  mjolnir-rules/custom.mjs");
    expect(notice).not.toContain("npm plugin");
  });

  it("lists both kinds when mixed", () => {
    const notice = renderGateNotice([
      { kind: "plugin-package", name: "mjolnir-plugin-acme" },
      { kind: "js-module", name: "mjolnir-rules/custom.mjs" },
    ]);
    expect(notice).toContain("npm plugin: mjolnir-plugin-acme");
    expect(notice).toContain("JS module:  mjolnir-rules/custom.mjs");
  });

  it("includes the enabling instructions", () => {
    const notice = renderGateNotice([]);
    expect(notice).toContain("--enable-plugins");
    expect(notice).toContain("MJOLNIR_ENABLE_PLUGINS=1");
  });

  it("notes that declarative JSON manifests are unaffected", () => {
    const notice = renderGateNotice([]);
    expect(notice).toContain("mjolnir-rules/*.json");
    expect(notice).toContain("execute no code");
  });

  it("produces a single string with newlines separating sections", () => {
    const notice = renderGateNotice([
      { kind: "plugin-package", name: "test-pkg" },
    ]);
    const lines = notice.split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(lines[0]).toContain("DISABLED");
    expect(lines[1]).toContain("test-pkg");
    expect(lines[2]).toContain("--enable-plugins");
  });
});
