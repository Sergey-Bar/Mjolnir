/**
 * npm plugin loader (Verification Trust Evolution Plan §18 —
 * Distribution).
 *
 * Loads Mjölnir rules from npm packages declared in
 * `mjolnir.config.json` → `plugins` array:
 *
 *   { "plugins": ["@acme/mjolnir-rules", "my-org-qa-rules"] }
 *
 * Security model:
 *   - Loaded via npm resolution (same as any dependency)
 *   - Only activated when --enable-plugins is passed OR
 *     MJOLNIR_ENABLE_PLUGINS=1 is set in the process env
 *   - Plugin rules carry the same trust metadata and
 *     measurement requirements as core rules
 *   - Core ID prefixes (QA-TEST, QA-TQUAL, QA-PW, QA-CI) are
 *     RESERVED — plugin rules MUST use non-reserved prefixes
 *   - Plugin rules CANNOT ship in core tier (no measured FP
 *     rate from the committed corpus sidecar)
 *   - Load failures degrade honestly: warnings, never crashes;
 *     exit codes stay frozen
 *
 * The loaded rules are merged into the rule registry and all
 * standard analysis applies (scoring, evidence levels, trust
 * tiers, machine contract).
 */

import { existsSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

import type { QADoctorRule } from "../rules/rule.js";
import type { RuleCategory } from "../types.js";

/** A declared npm plugin. */
export interface NpmPluginDeclaration {
  /** npm package name (e.g. "@acme/mjolnir-rules"). */
  name: string;
  /** Optional version specifier (default: "latest"). */
  version?: string;
  /** Optional entry point override (default: package main). */
  entry?: string;
}

export interface PluginLoadResult {
  rules: QADoctorRule[];
  errors: string[];
  warnings: string[];
  loadedPackages: string[];
  skippedPackages: string[];
}

const RESERVED_PREFIXES = [
  "QA-TEST",
  "QA-TQUAL",
  "QA-PW",
  "QA-CI",
  "QA-PY",
  "QA-ENV",
  "QA-JV",
  "QA-CS",
  "QA-CYP",
  "QA-SE",
  "QA-WDIO",
  "QA-PPTR",
  "QA-APM",
];

function isReserved(id: string): boolean {
  return RESERVED_PREFIXES.some((p) => id.startsWith(p));
}

/**
 * Validate a plugin rule ID. Must NOT use a reserved core prefix.
 * Returns error message, or null if valid.
 */
function validatePluginRuleId(id: string): string | null {
  if (!/^QA-[A-Z]+-\d{3}$/.test(id)) {
    return `plugin rule ${id} does not match QA-XXX-NNN format`;
  }
  if (isReserved(id)) {
    return `plugin rule ${id} uses a reserved core prefix — rejected (spoofing protection)`;
  }
  return null;
}

/**
 * Validate a loaded plugin rule against the plugin trust contract.
 * Returns error messages. Empty array = valid.
 */
function validatePluginRule(
  rule: Partial<QADoctorRule>,
  pluginName: string,
): string[] {
  const errors: string[] = [];

  const idError = validatePluginRuleId(rule.id ?? "");
  if (idError) {
    errors.push(`[${pluginName}] ${idError}`);
  }

  if (rule.tier === "core") {
    errors.push(
      `[${pluginName}] ${rule.id} declares tier "core" — clamped to "extended" (core requires a measured FP rate from the corpus sidecar; external rules are outside that registry).`,
    );
  }

  const validSeverities = new Set(["error", "warning", "info"]);
  if (rule.severity !== undefined && !validSeverities.has(rule.severity)) {
    errors.push(
      `[${pluginName}] ${rule.id} has invalid severity (need error|warning|info).`,
    );
  }

  const validCategories: RuleCategory[] = [
    "QA-TEST",
    "QA-TQUAL",
    "QA-PW",
    "QA-CI",
    "QA-PY",
    "QA-ENV",
    "QA-JV",
    "QA-CS",
    "QA-CYP",
    "QA-SE",
    "QA-WDIO",
    "QA-PPTR",
    "QA-APM",
  ];
  if (rule.category !== undefined && !validCategories.includes(rule.category)) {
    errors.push(`[${pluginName}] ${rule.id} has invalid category.`);
  }

  return errors;
}

/** Shape of an npm plugin module. */
interface NpmPluginModule {
  rules?: QADoctorRule[];
  default?: { rules?: QADoctorRule[] };
}

/**
 * Attempt to resolve an npm package to its entry point.
 * Returns null if the package cannot be resolved.
 */
function resolveNpmPackage(
  name: string,
  root: string,
  version: string | undefined,
): { path: string; spec: string } | null {
  // Use Node's module resolution via dynamic import.
  // This follows standard npm resolution from the project root.
  const specifier = version ? `${name}@${version}` : name;
  try {
    // Attempt to resolve via Node's package resolution.
    // We resolve from the workspace root so node_modules resolution works.
    const resolved = resolvePath(root, "node_modules", name);
    if (existsSync(resolved)) {
      return { path: resolved, spec: specifier };
    }
    // Also check from cwd (workspace may have nested node_modules)
    const fromCwd = resolvePath(process.cwd(), "node_modules", name);
    if (existsSync(fromCwd)) {
      return { path: fromCwd, spec: specifier };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Load npm plugins. Returns loaded rules and diagnostics.
 *
 * Called when `--enable-plugins` is passed OR `MJOLNIR_ENABLE_PLUGINS=1`.
 * Without activation, this function returns empty results —
 * no plugin code is ever loaded without explicit opt-in.
 */
export async function loadNpmPlugins(
  declarations: NpmPluginDeclaration[],
  root: string,
  _pluginsRoot: string = resolvePath(root, "node_modules"),
): Promise<PluginLoadResult> {
  const result: PluginLoadResult = {
    rules: [],
    errors: [],
    warnings: [],
    loadedPackages: [],
    skippedPackages: [],
  };

  if (declarations.length === 0) {
    return result;
  }

  // Check activation gate — plugins are NEVER loaded without explicit opt-in.
  const enabled =
    process.env.MJOLNIR_ENABLE_PLUGINS === "1" ||
    process.env.MJOLNIR_ENABLE_PLUGINS === "true";

  if (!enabled) {
    result.warnings.push(
      "plugins are disabled — re-run with --enable-plugins or set MJOLNIR_ENABLE_PLUGINS=1 to load them",
    );
    for (const d of declarations) {
      result.skippedPackages.push(d.name);
    }
    return result;
  }

  for (const decl of declarations) {
    const resolved = resolveNpmPackage(decl.name, root, decl.version);

    if (!resolved) {
      result.errors.push(
        `plugin ${decl.name}${decl.version ? "@" + decl.version : ""} — cannot resolve package (run npm install first)`,
      );
      continue;
    }

    try {
      const mod = (await import(resolved.path)) as NpmPluginModule;
      const exportedRules: unknown[] = Array.isArray(mod.rules)
        ? mod.rules
        : Array.isArray(mod.default?.rules)
          ? mod.default.rules
          : [];

      if (exportedRules.length === 0) {
        result.errors.push(
          `plugin ${decl.name} exports no \`rules\` array — not a Mjölnir plugin`,
        );
        continue;
      }

      let loadedCount = 0;
      for (const rule of exportedRules) {
        const r = rule as Partial<QADoctorRule>;
        const errors = validatePluginRule(r, decl.name);
        if (errors.length > 0) {
          result.errors.push(...errors);
          continue;
        }
        // Assign tier clamp
        if (r.tier === "core") {
          r.tier = "extended";
          result.warnings.push(
            `${decl.name}/${r.id}: tier clamped to "extended" (core requires measured FP rate)`,
          );
        }
        result.rules.push(r as QADoctorRule);
        loadedCount++;
      }

      result.loadedPackages.push(`${decl.name} (${loadedCount} rules)`);
    } catch (e) {
      result.errors.push(
        `plugin ${decl.name} failed to load: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return result;
}

/**
 * Generate a starter plugin scaffold for `mjolnir create-plugin`.
 * Returns the file contents as a map of path → content.
 */
export function generatePluginScaffold(
  name: string,
  prefix: string = "QA-COMM",
): Record<string, string> {
  const ruleId = `${prefix}-001`;
  return {
    "package.json": JSON.stringify(
      {
        name,
        version: "0.1.0",
        main: "index.js",
        mjolnirPlugin: true,
      },
      null,
      2,
    ),
    "index.js": [
      `"use strict";`,
      ``,
      `/**`,
      ` * ${name} — Mjölnir plugin rules`,
      ` *`,
      ` * Install: mjolnir config set plugins "[\\"${name}\\"]"`,
      ` * Enable:  mjolnir scan --enable-plugins`,
      ` */`,
      ``,
      `module.exports = {`,
      `  rules: [`,
      `    {`,
      `      id: "${ruleId}",`,
      `      title: "My first plugin rule",`,
      `      description: "Describe what this rule catches",`,
      `      category: "QA-TEST",`,
      `      severity: "warning",`,
      `      tier: "extended",`,
      `      confidence: "medium",`,
      `      findingType: "heuristic-risk",`,
      `      qaImpact: "HYGIENE",`,
      `      appliesTo: "test-files",`,
      `      languages: ["typescript"],`,
      `      falsePositiveRisk: "medium",`,
      `      autofix: false,`,
      `      detectionStrategy: "LEXICAL",`,
      `      detectionNotes: "plugin rule — describe detection method",`,
      `      run(ctx) {`,
      `        const findings = [];`,
      `        // TODO: add detection logic`,
      `        return findings;`,
      `      },`,
      `    },`,
      `  ],`,
      `};`,
      ``,
    ].join("\n"),
    "README.md": [
      `# ${name}`,
      ``,
      `Mjölnir plugin rules for ${name}.`,
      ``,
      `## Installation`,
      ``,
      `npm install ${name}`,
      ``,
      `## Configuration`,
      ``,
      `Add to mjolnir.config.json:`,
      ``,
      `{`,
      `  "plugins": ["${name}"]`,
      `}`,
      ``,
      `Then enable plugins:`,
      ``,
      `mjolnir scan --enable-plugins`,
      ``,
    ].join("\n"),
  };
}
