/**
 * Boundary-law + non-goal guard tests (remediation plan §9 R10 /
 * growth roadmap WI-25; strategic blueprint §9.1, §24, §28, §36).
 *
 * Preparation-only release — these locks guard the laws a 2.0 breaking
 * change must never violate, and the WI-25 acceptance law that nothing
 * enters 2.0 without ratification:
 *
 *  - Module boundary law (blueprint §9.1, Contract D/J): no finding,
 *    verdict, score, evidence, or resolution semantic is computed in
 *    commands/, reporters/, or mcp/. Structurally: the canonical layers
 *    (engine, forensics, adapters, rules) never import upward into
 *    commands/ or the transports, and the MCP transport never imports
 *    detection machinery (rules, adapters) — it maps 1:1 onto canonical
 *    verbs (the pipeline → contract → runtime evidence → agent transport
 *    order is never reversed).
 *  - Zero-network contract: the core imports no network surface (the
 *    release-trust check reused here as a structural invariant).
 *  - Non-goals (growth roadmap §36/§19): no telemetry, no cloud, no
 *    hosted backend — pinned by the dependency list and the absence of
 *    telemetry surface in src/.
 *  - Breaking-set discipline (WI-25): the 2.0 inventory exists, every
 *    entry carries a Decision line, and NOTHING is implemented — this
 *    release ships preparation, not breaks.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { checkZeroNetworkImports } from "../../src/commands/release-trust.js";

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "src");

/** All .ts files under a directory, recursively, repo-relative. */
function tsFilesUnder(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith(".ts")) out.push(full);
    }
  };
  walk(dir);
  return out;
}

function rel(p: string): string {
  return p
    .slice(ROOT.length + 1)
    .split("\\")
    .join("/");
}

describe("module boundary law (blueprint §9.1 — never reversed)", () => {
  // The canonical layers compute the semantics. Upward imports (into the
  // presentation surfaces or the transports) would let semantics leak
  // into consumers — the exact drift Contract D forbids.
  const canonicalLayers = ["engine", "forensics", "adapters", "rules"];

  it("canonical layers never import commands/, mcp/, or the CLI", () => {
    const violations: string[] = [];
    for (const layer of canonicalLayers) {
      const dir = join(SRC, layer);
      if (!existsSync(dir)) continue; // a layer that has not shipped yet
      for (const file of tsFilesUnder(dir)) {
        const text = readFileSync(file, "utf8");
        if (
          /from "\.\.\/(?:\.\.\/)*(?:commands|mcp)\//.test(text) ||
          /from "\.\.\/(?:\.\.\/)*cli(?:\.js)?"/.test(text)
        ) {
          violations.push(rel(file));
        }
      }
    }
    expect(violations, violations.join(", ")).toEqual([]);
  });

  it("the MCP transport imports no detection machinery (rules, adapters)", () => {
    const violations: string[] = [];
    for (const file of tsFilesUnder(join(SRC, "mcp"))) {
      const text = readFileSync(file, "utf8");
      if (/from "\.\.\/(?:\.\.\/)*(?:rules|adapters)\//.test(text)) {
        violations.push(rel(file));
      }
    }
    expect(violations, violations.join(", ")).toEqual([]);
  });

  it("the MCP transport rides the canonical machine contract (not a second one)", () => {
    // Pure-transport law (blueprint §21): the MCP tool surface derives
    // its payload from the canonical projection built by the engine.
    const server = readFileSync(join(SRC, "mcp", "server.ts"), "utf8");
    expect(server).toContain('from "../engine/machine-contract.js"');
    expect(server).toContain('from "../cli.js"');
  });
});

describe("zero-network + non-goal guards (§36 locked)", () => {
  it("the zero-network core still imports no network surface", () => {
    const check = checkZeroNetworkImports(ROOT);
    expect(check.determination).toBe("PASS");
  });

  it("package.json carries no telemetry / cloud / hosted-backend dependency", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
    };
    const banned = [
      "posthog",
      "amplitude",
      "mixpanel",
      "segment",
      "@sentry",
      "datadog",
      "firebase",
      "supabase",
      "analytics-node",
      // hosted-backend frameworks (§36: no hosted backend, no server)
      "express",
      "fastify",
      "hono",
      "koa",
      "next",
    ];
    const deps = Object.keys(pkg.dependencies ?? {});
    const hits = deps.filter((d) =>
      banned.some((b) => d === b || d.startsWith(`${b}/`)),
    );
    expect(hits, "banned dependencies present").toEqual([]);
  });

  it("src/ reads no telemetry configuration (telemetry is a non-goal, not a flag)", () => {
    const violations: string[] = [];
    for (const file of tsFilesUnder(SRC)) {
      const text = readFileSync(file, "utf8");
      if (/MJOLNIR_TELEMETRY|trackEvent|telemetryClient/.test(text)) {
        violations.push(rel(file));
      }
    }
    expect(violations, violations.join(", ")).toEqual([]);
  });
});

describe("breaking-set discipline (WI-25 — preparation only)", () => {
  const breakingSetPath = join(ROOT, "docs", "2.0-BREAKING-SET.md");
  const migrationPath = join(ROOT, "docs", "MIGRATION-2.0-DRAFT.md");

  it("the breaking-set inventory exists and every entry carries a Decision", () => {
    expect(existsSync(breakingSetPath)).toBe(true);
    const doc = readFileSync(breakingSetPath, "utf8");
    const entries = [...doc.matchAll(/^### (BS-\d+)/gm)].map((m) => m[1]);
    expect(entries.length).toBeGreaterThanOrEqual(2);
    for (const entry of entries) {
      const start = doc.indexOf(`### ${entry}`);
      const body = doc.slice(start);
      expect(body, `${entry} lacks a Decision line`).toMatch(
        /^- \*\*Status\*\*: .+/m,
      );
    }
  });

  it("nothing from the breaking set is implemented in this release", () => {
    const doc = readFileSync(breakingSetPath, "utf8");
    expect(doc).toContain("Not implemented");
    expect(doc).not.toContain("implemented in 2.0.0");
  });

  it("the migration guide draft covers both breaking-set entries", () => {
    expect(existsSync(migrationPath)).toBe(true);
    const draft = readFileSync(migrationPath, "utf8");
    expect(draft).toContain("BS-1");
    expect(draft).toContain("BS-2");
    expect(draft).toContain("DRAFT");
  });
});
