/**
 * Local plugin/rule contract (Verification Trust Evolution Plan §18 —
 * Local Extensibility).
 *
 * Folder-based custom rules: a workspace can carry a `mjolnir-rules/`
 * directory whose files load as rules with the SAME trust contract as
 * npm plugins — zero network, no node_modules resolution, loaded from
 * the workspace itself:
 *
 *   mjolnir-rules/
 *     my-rule.json      ← declarative: regex patterns, no code executed
 *     acme-suite.mjs    ← code module: exports `rules: QADoctorRule[]`
 *                         (same shape as an npm plugin's export)
 *
 * SECURITY MODEL — the npm-plugin model, tightened one notch: JSON rule
 * files execute NO code (the engine compiles the declared regexes);
 * JS modules execute with full Node privileges exactly like npm plugins
 * (loud, documented, the user's explicit choice — same posture as
 * ESLint local plugins).
 *
 * Trust contract (plan §18 — "plugin rules carry the same trust
 * metadata and measurement requirements"):
 *   - Rule IDs must use a NON-reserved prefix (core families rejected —
 *     spoofing protection identical to npm plugins, case-insensitive).
 *   - An external rule can NEVER ship in the core tier: core requires a
 *     measured FP rate from the committed corpus sidecar, and external
 *     rules are outside that registry by definition. A declared
 *     `tier: "core"` is clamped to `extended` with a load warning.
 *   - Load failures degrade honestly: warning entries, never a crash;
 *     exit codes stay frozen.
 *
 * Drift-check: the `mjolnir rules --md` catalog is generated from the
 * LOADED rules (core + external), so the catalog can never drift from
 * what actually ships — an edit to a local rule file changes the very
 * next catalog render (locked by tests/local-rules.spec.ts).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import type { QADoctorRule } from "../rules/rule.js";
import type { Severity } from "../types.js";

/** Core-owned ID prefixes an external rule may never claim (kept in
 * sync with src/plugins/load.ts — one spoofing-prevention law). */
export const RESERVED_PREFIXES = [
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
  "QA-PLUGIN",
] as const;

export const LOCAL_RULES_DIR = "mjolnir-rules";

export interface LoadedExternalRules {
  rules: QADoctorRule[];
  /** Human-readable problems; surfaced as scan warnings, never fatal. */
  errors: string[];
}

const ALLOWED_CATEGORIES = new Set(["QA-TEST", "QA-TQUAL", "QA-PW", "QA-CI"]);
const ALLOWED_APPLIES_TO = new Set([
  "test-files",
  "ci-workflows",
  "python",
  "java",
  "csharp",
]);
const ALLOWED_SEVERITIES = new Set(["error", "warning", "info"]);
const ALLOWED_QA_IMPACTS = new Set([
  "BLOCKS-RELEASE",
  "FLAKY-RISK",
  "FALSE-GREEN",
  "HYGIENE",
]);

/**
 * Discover + load external rules from `<root>/mjolnir-rules/`.
 * Missing directory → empty result (not an error — most workspaces
 * carry none).
 */
export async function loadLocalRules(
  root: string,
): Promise<LoadedExternalRules> {
  const result: LoadedExternalRules = { rules: [], errors: [] };
  const dir = join(root, LOCAL_RULES_DIR);
  if (!existsSync(dir)) return result;

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch (err) {
    result.errors.push(
      `external rules directory "${LOCAL_RULES_DIR}/" could not be read: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return result;
  }

  for (const entry of entries.sort()) {
    const path = join(dir, entry);
    if (entry.endsWith(".json")) {
      loadJsonRule(path, result);
    } else if (entry.endsWith(".mjs") || entry.endsWith(".js")) {
      await loadModuleRules(path, result);
    }
    // Other extensions (README, .ts sources needing a build step) are
    // ignored — silent, because a folder may carry docs next to rules.
  }
  return result;
}

function loadJsonRule(path: string, result: LoadedExternalRules): void {
  const name = `${LOCAL_RULES_DIR}/${path.split(/[\\/]/).pop()}`;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    result.errors.push(
      `external rule "${name}" is not valid JSON: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return;
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    result.errors.push(`external rule "${name}" must be a JSON object.`);
    return;
  }
  const decl = raw as Record<string, unknown>;
  const id = decl["id"];
  if (typeof id !== "string" || id.length === 0) {
    result.errors.push(`external rule "${name}" is missing "id" — skipped.`);
    return;
  }
  if (RESERVED_PREFIXES.some((p) => id.toUpperCase().startsWith(p))) {
    result.errors.push(
      `external rule ${id} uses a reserved core prefix — rejected. Use your own family (e.g. QA-<YOURTEAM>-001).`,
    );
    return;
  }
  const patterns = decl["patterns"];
  if (
    !Array.isArray(patterns) ||
    patterns.length === 0 ||
    !patterns.every((p) => typeof p === "string" && p.length > 0)
  ) {
    result.errors.push(
      `external rule ${id} must declare a non-empty "patterns" array of regex source strings.`,
    );
    return;
  }
  let regexes: RegExp[];
  try {
    regexes = patterns.map((p) => new RegExp(p as string, "g"));
  } catch (err) {
    result.errors.push(
      `external rule ${id} declares an invalid regex: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return;
  }
  const severity = decl["severity"];
  const category = decl["category"];
  const appliesTo = decl["appliesTo"];
  const qaImpact = decl["qaImpact"];
  if (typeof severity !== "string" || !ALLOWED_SEVERITIES.has(severity)) {
    result.errors.push(
      `external rule ${id} declares an invalid "severity" (need error|warning|info).`,
    );
    return;
  }
  if (typeof category !== "string" || !ALLOWED_CATEGORIES.has(category)) {
    result.errors.push(
      `external rule ${id} declares an invalid "category" (need one of ${[...ALLOWED_CATEGORIES].join("|")}).`,
    );
    return;
  }
  if (typeof appliesTo !== "string" || !ALLOWED_APPLIES_TO.has(appliesTo)) {
    result.errors.push(
      `external rule ${id} declares an invalid "appliesTo" (need one of ${[...ALLOWED_APPLIES_TO].join("|")}).`,
    );
    return;
  }
  if (typeof qaImpact !== "string" || !ALLOWED_QA_IMPACTS.has(qaImpact)) {
    result.errors.push(`external rule ${id} declares an invalid "qaImpact".`);
    return;
  }

  const title = typeof decl["title"] === "string" ? decl["title"] : id;
  const message = typeof decl["message"] === "string" ? decl["message"] : title;
  const why =
    typeof decl["why"] === "string"
      ? decl["why"]
      : "Declared by a workspace-local external rule.";
  const fix =
    typeof decl["fix"] === "string"
      ? decl["fix"]
      : "Review the matched code against the rule's intent.";
  const confidence =
    decl["confidence"] === "high" || decl["confidence"] === "low"
      ? (decl["confidence"] as "high" | "low")
      : ("medium" as const);

  const languages =
    Array.isArray(decl["languages"]) &&
    decl["languages"].every((l) => typeof l === "string")
      ? (decl["languages"] as string[])
      : undefined;
  const frameworks =
    Array.isArray(decl["frameworks"]) &&
    decl["frameworks"].every((l) => typeof l === "string")
      ? (decl["frameworks"] as string[])
      : undefined;

  result.rules.push({
    id,
    category: category as "QA-TEST",
    title,
    severity: severity as Severity,
    confidence,
    findingType: "heuristic-risk",
    qaImpact: qaImpact as "HYGIENE",
    appliesTo: appliesTo as "test-files",
    ...(languages !== undefined ? { languages } : {}),
    ...(frameworks !== undefined ? { frameworks } : {}),
    falsePositiveRisk:
      decl["falsePositiveRisk"] === "low" ||
      decl["falsePositiveRisk"] === "high"
        ? decl["falsePositiveRisk"]
        : "medium",
    autofix: false,
    detectionStrategy: "LEXICAL",
    detectionNotes: `external rule (${name}) — declarative regex patterns, no code executed`,
    // §18: external rules ship UNMEASURED (they are outside the
    // committed corpus sidecar) — born provisional-quarantine.
    tier: "quarantine",
    detectorRevision: 1,
    run(ctx) {
      // RAW text: external patterns commonly target string-literal
      // content (URLs, codes, phrases) which the code-only view blanks.
      // The contract is documented in the module header — declarative
      // patterns run against the file as written.
      const view = ctx.text;
      const findings: Array<
        Omit<import("../types.js").Finding, "ruleId" | "category">
      > = [];
      for (const re of regexes) {
        const run = new RegExp(re.source, "g");
        let m: RegExpExecArray | null;
        while ((m = run.exec(view)) !== null) {
          findings.push({
            severity: severity as Severity,
            confidence,
            findingType: "heuristic-risk",
            qaImpact: qaImpact as "HYGIENE",
            file: ctx.path,
            line: 1 + view.slice(0, m.index).split("\n").length - 1,
            column: m.index - (view.lastIndexOf("\n", m.index - 1) + 1) + 1,
            message,
            why,
            fix,
          });
        }
      }
      return findings;
    },
  });
}

async function loadModuleRules(
  path: string,
  result: LoadedExternalRules,
): Promise<void> {
  const name = `${LOCAL_RULES_DIR}/${path.split(/[\\/]/).pop()}`;
  let mod: unknown;
  try {
    mod = await import(pathToFileURL(path).href);
  } catch (err) {
    result.errors.push(
      `external rule module "${name}" failed to load: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return;
  }
  const rules = (mod as { rules?: unknown })?.rules;
  if (!Array.isArray(rules)) {
    result.errors.push(
      `external rule module "${name}" exports no \`rules\` array — not a mjolnir external rule.`,
    );
    return;
  }
  for (const rule of rules) {
    const r = rule as Partial<QADoctorRule>;
    if (typeof r.id !== "string" || typeof r.run !== "function") {
      result.errors.push(
        `external rule module "${name}" contains a malformed rule (missing id/run) — skipped.`,
      );
      continue;
    }
    const ruleId: string = r.id;
    if (RESERVED_PREFIXES.some((p) => ruleId.toUpperCase().startsWith(p))) {
      result.errors.push(
        `external rule module "${name}" rule ${ruleId} uses a reserved core prefix — rejected. Use your own family.`,
      );
      continue;
    }
    if ((r as { tier?: unknown }).tier === "core") {
      // §18 measurement requirement: core requires a measured FP rate
      // from the committed corpus sidecar — external rules cannot have
      // one. Clamp + warn; the rule runs extended.
      result.errors.push(
        `external rule ${r.id} declares tier "core" — clamped to "extended" (core requires a measured FP rate from the corpus sidecar; external rules are outside that registry).`,
      );
      (rule as { tier?: unknown }).tier = "extended";
    }
    result.rules.push(rule as QADoctorRule);
  }
}
