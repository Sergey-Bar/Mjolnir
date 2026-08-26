/**
 * Plugin API (Upgrade-Plan-v3 Phase 6, tier-2 item #1).
 *
 * SECURITY MODEL — decided explicitly per the plan's critical item #2:
 * A plugin is an npm package the USER installs themselves. There is NO
 * sandbox. Plugin code executes with full Node privileges against the
 * scanned source tree, exactly like any other devDependency. This is the
 * same trust model as ESLint/Vitest plugins — loud, documented, and the
 * user's explicit choice. Sandboxing (isolated-vm etc.) was evaluated and
 * rejected for v1: it breaks the zero-native-deps portability guarantee.
 *
 * Contract:
 * - Plugins are declared in qa-doctor.config.json under "plugins":
 *   ["qa-doctor-plugin-acme", ...] or [{ "package": "...", "prefix": "ACME" }]
 * - Each package must export `rules: QADoctorRule[]` (same shape as core).
 * - Rule IDs MUST use a plugin-specific prefix (e.g. QA-ACME-001) — core
 *   prefixes (QA-TEST/TQUAL/PW/CI/PY/ENV) are rejected to prevent spoofing.
 * - Load failures degrade honestly: a warning finding-style entry, never
 *   a crash; exit codes stay frozen.
 */

import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { QADoctorRule } from "../rules/rule.js";

/** Core-owned ID prefixes a plugin may never claim. Kept in sync with
 * every shipped adapter family — a plugin spoofing a core-looking ID
 * would silently inherit core trust. */
const RESERVED_PREFIXES = [
  "QA-TEST",
  "QA-TQUAL",
  "QA-PW",
  "QA-CI",
  "QA-PY",
  "QA-ENV",
  "QA-JV",
  "QA-CS",
  "QA-PLUGIN",
] as const;

export interface LoadedPlugin {
  name: string;
  rules: QADoctorRule[];
  warnings: string[];
}

export interface PluginLoadResult {
  plugins: LoadedPlugin[];
  /** Human-readable problems; surfaced as scan warnings, never fatal. */
  errors: string[];
}

interface PluginDecl {
  package: string;
  prefix?: string | undefined;
}

function parseDecls(raw: unknown): PluginDecl[] {
  if (!Array.isArray(raw)) return [];
  const decls: PluginDecl[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      decls.push({ package: entry });
    } else if (
      entry !== null &&
      typeof entry === "object" &&
      typeof (entry as Record<string, unknown>)["package"] === "string"
    ) {
      const obj = entry as Record<string, unknown>;
      decls.push({
        package: obj["package"] as string,
        prefix:
          typeof obj["prefix"] === "string"
            ? (obj["prefix"] as string)
            : undefined,
      });
    }
  }
  return decls;
}

export function loadPlugins(root: string): PluginLoadResult {
  const result: PluginLoadResult = { plugins: [], errors: [] };
  const cfgPath = join(root, "qa-doctor.config.json");
  if (!existsSync(cfgPath)) return result;

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(readFileSync(cfgPath, "utf8")) as Record<string, unknown>;
  } catch {
    // Malformed config is handled by the config loader with fail-fast;
    // here we just don't load plugins.
    return result;
  }

  const decls = parseDecls(raw["plugins"]);
  if (decls.length === 0) return result;

  const require = createRequire(join(root, "package.json"));

  for (const decl of decls) {
    let mod: unknown;
    try {
      mod = require(decl.package);
    } catch (err) {
      result.errors.push(
        `plugin "${decl.package}" failed to load: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      continue;
    }

    const rules = (mod as { rules?: unknown })?.rules;
    if (!Array.isArray(rules)) {
      result.errors.push(
        `plugin "${decl.package}" exports no \`rules\` array — not a qa-doctor plugin.`,
      );
      continue;
    }

    const accepted: QADoctorRule[] = [];
    for (const rule of rules) {
      const r = rule as Partial<QADoctorRule>;
      if (typeof r.id !== "string" || typeof r.run !== "function") {
        result.errors.push(
          `plugin "${decl.package}" contains a malformed rule (missing id/run) — skipped.`,
        );
        continue;
      }
      if (RESERVED_PREFIXES.some((p) => r.id?.startsWith(p))) {
        result.errors.push(
          `plugin "${decl.package}" rule ${r.id} uses a reserved core prefix — rejected. Use your own family (e.g. QA-<PLUGIN>-001).`,
        );
        continue;
      }
      accepted.push(rule as QADoctorRule);
    }

    result.plugins.push({ name: decl.package, rules: accepted, warnings: [] });
  }
  return result;
}
