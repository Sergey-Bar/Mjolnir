/**
 * Generates docs/BLAST-RADIUS-AUDIT.md (product-gap master plan P6/R4 —
 * plan 1789009691197 R4): a machine-verified surface manifest of the
 * shipped package, so the blast radius of any future change is a
 * diffable fact instead of an essay.
 *
 * Every section is EXTRACTED from the tree at generation time:
 *  - the src/ file inventory with per-area LOC,
 *  - the internal import map (fan-in ranking — the modules a change can
 *    break downstream),
 *  - the external dependency allowlist every src import must belong to
 *    (containment: no sneaky runtime deps),
 *  - the adapter set, rules registry census, CLI flags, report formats,
 *    and the frozen exit-code contract.
 *
 * The boundary contract is machine-TESTED by
 * tests/contract/blast-radius.spec.ts: regenerate if the doc disagrees
 * with the tree; add to the allowlist only with a justification.
 *
 * Drift-locked: hand edits to the tables are futile.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { SCAN_ADAPTERS } from "../src/discovery/scan-adapters.js";
import { RULES, RETIRED_RULE_IDS } from "../src/rules/index.js";
import { MEASURED_FP } from "../src/rules/measured-fp.generated.js";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const SRC = join(ROOT, "src");
const OUT_PATH = join(ROOT, "docs", "BLAST-RADIUS-AUDIT.md");

interface SrcFile {
  rel: string;
  loc: number;
  imports: string[]; // normalized specifiers
}

/**
 * Import-specifier extraction with import-statement anchoring: the naive
 * `from "…"` scan catches prose and embedded-code fixtures ("imports
 * spec from the module" inside comments/strings) — the anchored form
 * only treats from-clauses at statement starts (after a newline,
 * preceded by import/export within 400 chars) as imports.
 */
export function extractImportSpecifiers(text: string): string[] {
  // Comments first: prose like "imports spec from the module" must never
  // reach the statement anchor (real False-match class, hit in practice).
  const clean = text
    .replace(/\/\*[^]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, "");
  const out: string[] = [];
  for (const m of clean.matchAll(
    /(?:^|\n)\s*(?:import|export)\s[^]{0,400}?from\s+"([^"]+)"/g,
  )) {
    out.push(m[1] ?? "");
  }
  return out;
}

function walkSrc(dir: string, acc: SrcFile[] = []): SrcFile[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      walkSrc(p, acc);
      continue;
    }
    if (!name.endsWith(".ts")) continue;
    const text = readFileSync(p, "utf8");
    acc.push({
      rel: relative(SRC, p).replaceAll("\\", "/"),
      loc: text.split("\n").length,
      imports: extractImportSpecifiers(text),
    });
  }
  return acc;
}

function toInternalSpecifier(file: SrcFile, spec: string): string | undefined {
  if (!spec.startsWith(".")) return undefined;
  const base = join(dirname(join(SRC, file.rel)), spec);
  const norm = relative(SRC, base).replaceAll("\\", "/");
  // Resolve the .js extension convention (ESM imports of .ts sources).
  return norm.endsWith(".js") ? norm.slice(0, -3) : norm;
}

export interface BlastRadiusManifest {
  totalFiles: number;
  totalLoc: number;
  areas: Array<{ area: string; files: number; loc: number }>;
  fanIn: Array<{ module: string; importers: number }>;
  externals: Array<{ dep: string; files: number }>;
  adapters: string[];
  ruleCensus: { total: number; retired: number; measured: number };
  flags: string[];
  formats: string[];
  exitCodes: string;
}

export function buildManifest(): BlastRadiusManifest {
  const files = walkSrc(SRC);
  const totalLoc = files.reduce((s, f) => s + f.loc, 0);

  const areaMap = new Map<string, { files: number; loc: number }>();
  const fanInMap = new Map<string, Set<string>>();
  const extMap = new Map<string, number>();

  for (const f of files) {
    const area = f.rel.includes("/") ? (f.rel.split("/")[0] ?? "?") : "(root)";
    const cur = areaMap.get(area) ?? { files: 0, loc: 0 };
    cur.files++;
    cur.loc += f.loc;
    areaMap.set(area, cur);

    for (const spec of f.imports) {
      const internal = toInternalSpecifier(f, spec);
      if (internal !== undefined) {
        if (internal.startsWith("..")) continue; // outside src (tests/scripts)
        const set = fanInMap.get(internal) ?? new Set<string>();
        set.add(f.rel);
        fanInMap.set(internal, set);
      } else {
        const dep = spec.split("/")[0] ?? spec;
        extMap.set(dep, (extMap.get(dep) ?? 0) + 1);
      }
    }
  }

  const cliText = readFileSync(join(SRC, "cli.ts"), "utf8");
  const flags = [
    ...new Set(
      [...cliText.matchAll(/a === ("--[a-z-]+"|"-[a-z]")/g)].map(
        (m) => m[1] ?? "",
      ),
    ),
  ].sort();
  const formats = [
    ...new Set(
      [...cliText.matchAll(/fmt === "([a-z]+)"/g)].map((m) => m[1] ?? ""),
    ),
  ]
    .concat("terminal")
    .sort();

  return {
    totalFiles: files.length,
    totalLoc,
    areas: [...areaMap.entries()]
      .map(([area, v]) => ({ area, ...v }))
      .sort((a, b) => b.loc - a.loc),
    fanIn: [...fanInMap.entries()]
      .map(([module, set]) => ({ module, importers: set.size }))
      .sort((a, b) => b.importers - a.importers)
      .slice(0, 15),
    externals: [...extMap.entries()]
      .map(([dep, n]) => ({ dep, files: n }))
      .sort((a, b) => b.files - a.files),
    adapters: SCAN_ADAPTERS.map((a) => a.id),
    ruleCensus: {
      total: RULES.length,
      retired: RETIRED_RULE_IDS.length,
      measured: Object.keys(MEASURED_FP).length,
    },
    flags,
    formats,
    exitCodes:
      "0 clean · 1 findings at/above gate · 2 partial (never blocks) · 10 usage error · 20 internal error (frozen, docs/VERSIONING.md)",
  };
}

export function renderAudit(m: BlastRadiusManifest): string {
  const lines: string[] = [];
  lines.push("# Blast Radius Audit — machine-verified surface manifest");
  lines.push("");
  lines.push(
    "Generated by `scripts/generate-blast-radius.ts` (`npm run docs:blast-radius`);",
    "drift-locked by tests/contract/blast-radius.spec.ts. Every table below is",
    "EXTRACTED from the tree — hand edits are futile. The containment rule the",
    "contract enforces: **every external import in src/ must belong to the",
    "allowlist**, and the shipped surface (adapters, rules, flags, formats, exit",
    "codes) must match this document exactly.",
    "",
  );

  lines.push(`## Inventory: ${m.totalFiles} files, ${m.totalLoc} LOC`);
  lines.push("");
  lines.push("| Area | Files | LOC |");
  lines.push("| --- | --- | --- |");
  for (const a of m.areas) {
    lines.push(`| src/${a.area} | ${a.files} | ${a.loc} |`);
  }
  lines.push("");

  lines.push("## Internal fan-in — top 15 (change-blast candidates)");
  lines.push("");
  lines.push("| Module | Importers |");
  lines.push("| --- | --- |");
  for (const f of m.fanIn) {
    lines.push(`| src/${f.module} | ${f.importers} |`);
  }
  lines.push("");

  lines.push("## External dependency allowlist (containment)");
  lines.push("");
  lines.push("| Dependency | Files importing it |");
  lines.push("| --- | --- |");
  for (const e of m.externals) {
    lines.push(`| ${e.dep} | ${e.files} |`);
  }
  lines.push("");

  lines.push("## Shipped surface");
  lines.push("");
  lines.push(
    `- **Adapters** (${m.adapters.length}): ${m.adapters.join(", ")}`,
    `- **Rules registry**: ${m.ruleCensus.total} live, ${m.ruleCensus.retired} retired, ${m.ruleCensus.measured} measured`,
    `- **CLI flags**: ${m.flags.join(" ")}`,
    `- **Report formats**: ${m.formats.join(", ")}`,
    `- **Exit codes** (frozen): ${m.exitCodes}`,
    "",
  );
  return lines.join("\n");
}

/**
 * The commit-format renderer: prettier runs over the generated markdown
 * so the committed file, the drift-lock's fresh render, and `prettier
 * --check` all agree byte-for-byte (the docs tree is prettier-gated).
 */
export async function renderForCommit(): Promise<string> {
  const prettier = await import("prettier");
  return prettier.format(renderAudit(buildManifest()), { parser: "markdown" });
}

if (process.argv[1]?.endsWith("generate-blast-radius.ts")) {
  renderForCommit()
    .then((md) => {
      writeFileSync(OUT_PATH, md);
      console.log("Wrote docs/BLAST-RADIUS-AUDIT.md");
    })
    .catch((err) => {
      console.error(err);
      process.exit(20);
    });
}
