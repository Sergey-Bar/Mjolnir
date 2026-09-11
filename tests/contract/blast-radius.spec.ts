/**
 * Blast-radius boundary contract (product-gap master plan R4 — plan
 * 1789009691197): the machine-TESTABLE version of the surface manifest.
 * The committed docs/BLAST-RADIUS-AUDIT.md must equal a fresh render,
 * and the containment rules it documents must hold in the tree:
 *  - every external import in src/ belongs to the allowlist;
 *  - the adapters/flags/formats/exit-code surfaces match the doc;
 *  - only the frozen exit codes (0/1/2/10/20) are ever exited.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { SCAN_ADAPTERS } from "../../src/discovery/scan-adapters.js";
import { RULES, RETIRED_RULE_IDS } from "../../src/rules/index.js";
import { MEASURED_FP } from "../../src/rules/measured-fp.generated.js";
import {
  buildManifest,
  extractImportSpecifiers,
} from "../../scripts/generate-blast-radius.js";

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "src");
const AUDIT_PATH = join(ROOT, "docs", "BLAST-RADIUS-AUDIT.md");

const EXTERNAL_ALLOWLIST = new Set([
  "yaml",
  "ts-morph",
  "web-tree-sitter",
  "tree-sitter-wasms",
]);

const FROZEN_EXIT_CODES = new Set([0, 1, 2, 10, 20]);

const COMMITTED = readFileSync(AUDIT_PATH, "utf8");
const LIVE = await (async () => {
  const { renderForCommit } =
    await import("../../scripts/generate-blast-radius.js");
  return renderForCommit();
})();

function srcFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) srcFiles(p, acc);
    else if (name.endsWith(".ts")) acc.push(p);
  }
  return acc;
}

describe("docs/BLAST-RADIUS-AUDIT.md — the committed manifest matches the tree", () => {
  it("equals a fresh render (regenerate if this fails)", () => {
    expect(COMMITTED).toBe(LIVE);
  });
});

describe("containment: every external import in src/ is on the allowlist", () => {
  it("no sneaky runtime dependency may enter src/ without a allowlist entry", () => {
    const offenders: string[] = [];
    for (const p of srcFiles(SRC)) {
      const text = readFileSync(p, "utf8");
      for (const spec of extractImportSpecifiers(text)) {
        if (spec.startsWith(".")) continue;
        // Node builtins (node:fs, node:path, …) are platform contracts.
        if (spec.startsWith("node:")) continue;
        const dep = spec.split("/")[0] ?? spec;
        if (!EXTERNAL_ALLOWLIST.has(dep)) {
          offenders.push(`${relative(SRC, p)} imports "${spec}"`);
        }
      }
    }
    expect(
      offenders,
      `offenders must be added to the allowlist in generate-blast-radius.ts with a justification:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});

describe("boundary: the shipped surface is exactly what the manifest says", () => {
  it("the adapter registry matches the manifest", () => {
    const m = buildManifest();
    expect(m.adapters).toEqual(SCAN_ADAPTERS.map((a) => a.id));
  });

  it("every CLI flag the parser accepts appears in the manifest", () => {
    const cliText = readFileSync(join(SRC, "cli.ts"), "utf8");
    const m = buildManifest();
    for (const m2 of cliText.matchAll(/a === ("--[a-z-]+"|"-[a-z]")/g)) {
      expect(
        m.flags,
        `flag ${m2[1]} is parsed by the CLI but missing from the manifest`,
      ).toContain(m2[1] ?? "");
    }
  });

  it("the exit codes used in src/ are inside the frozen set (0/1/2/10/20)", () => {
    for (const p of srcFiles(SRC)) {
      const text = readFileSync(p, "utf8");
      for (const m of text.matchAll(/process\.exit\((\d+)\)/g)) {
        const code = Number(m[1]);
        expect(
          FROZEN_EXIT_CODES.has(code),
          `${relative(SRC, p)} exits ${code} — not in the frozen set`,
        ).toBe(true);
      }
    }
  });

  it("the registry census in the doc matches the live registry", () => {
    const m = buildManifest();
    expect(m.ruleCensus.total).toBe(RULES.length);
    expect(m.ruleCensus.retired).toBe(RETIRED_RULE_IDS.length);
    expect(m.ruleCensus.measured).toBe(Object.keys(MEASURED_FP).length);
  });
});
