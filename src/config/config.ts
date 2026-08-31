/**
 * Config file support (Sprint-Plan W7, Product-MVP §27 + GAP-F).
 * Zero-config preserved: config presence never changes detection
 * semantics — only severity, scope, and gating.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SEVERITY_ORDER, type Severity } from "../types.js";

export interface IgnoreEntry {
  ruleId: string;
  files?: string[];
  reason: string;
  /** ISO date; defaults to 90 days from creation (S11). */
  expires?: string;
}

export interface QADoctorConfig {
  gate?: "advisory" | "error" | "warning";
  /** Path globs to skip during discovery (see DEFAULT_IGNORES dialect). */
  exclude?: string[];
  severityOverrides?: Record<string, Severity>;
  ignore?: IgnoreEntry[];
}

const CONFIG_NAMES = ["mjolnir.config.json", ".mjolnir.json"] as const;

/**
 * Distinguished from other load failures so the CLI can exit 10 (usage)
 * instead of 20 (internal): a typo in the user's config is a user error
 * with a fixable message, not a tool malfunction (bug-audit M4).
 */
export class ConfigValidationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ConfigValidationError";
  }
}

export function loadConfig(
  root: string,
  options: { knownRuleIds?: ReadonlySet<string> } = {},
): {
  config: QADoctorConfig;
  path: string | null;
  /** Non-fatal notes (e.g. unknown rule IDs in severityOverrides). */
  warnings: string[];
} {
  for (const name of CONFIG_NAMES) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    try {
      const parsed = JSON.parse(readFileSync(p, "utf8")) as QADoctorConfig;
      const warnings = validate(parsed, options.knownRuleIds);
      return { config: parsed, path: p, warnings };
    } catch (err) {
      // JSON.parse throws SyntaxError and readFileSync throws Error — the
      // message is always readable; the cast documents that invariant.
      const msg = (err as Error).message;
      throw new ConfigValidationError(
        `Invalid mjolnir config at ${p}: ${msg}`,
        {
          cause: err,
        },
      );
    }
  }
  return { config: {}, path: null, warnings: [] };
}

function validate(
  cfg: QADoctorConfig,
  knownRuleIds?: ReadonlySet<string>,
): string[] {
  const warnings: string[] = [];
  if (cfg.gate && !["advisory", "error", "warning"].includes(cfg.gate)) {
    throw new Error(`gate must be advisory|error|warning, got "${cfg.gate}"`);
  }
  // Bug-audit M4: a typo here ("eror") used to flow through
  // applySeverityOverrides → DEDUCTIONS[bad] = undefined → NaN score AND
  // silently un-gate the rule (exitForFindings never matched the bogus
  // severity). Values are validated at the gate; unknown RULE IDs stay
  // allowed (plugins, forward refs) but warn.
  for (const [ruleId, severity] of Object.entries(
    cfg.severityOverrides ?? {},
  )) {
    if (!(SEVERITY_ORDER as readonly string[]).includes(severity)) {
      throw new Error(
        `severityOverrides["${ruleId}"] must be one of ${SEVERITY_ORDER.join("|")}, got "${String(severity)}"`,
      );
    }
    if (knownRuleIds && !knownRuleIds.has(ruleId)) {
      warnings.push(
        `warning: severityOverrides["${ruleId}"] names no registered rule (typo? plugin rule?) — the entry is kept but currently matches nothing.`,
      );
    }
  }
  for (const ign of cfg.ignore ?? []) {
    if (!ign.ruleId) throw new Error("ignore entries require ruleId");
    if (!ign.reason)
      throw new Error(`ignore for ${ign.ruleId} requires a "reason" (§27)`);
    // Bug-audit QA-2026-08-30 QA-5: `new Date(garbage)` is NaN, and NaN
    // comparisons are always false — an unparseable `expires` silently
    // degraded to "expired" (or to active, depending on the comparison
    // direction) with no signal. Reject it at load time with a fixable
    // message instead.
    if (
      ign.expires !== undefined &&
      Number.isNaN(new Date(ign.expires).getTime())
    ) {
      throw new Error(
        `ignore for ${ign.ruleId}: "expires" must be an ISO date, got "${ign.expires}"`,
      );
    }
  }
  // Bug-audit QA-2026-08-30 QA-4: `exclude` was never validated, so
  // `exclude: [1, {}, null]` flowed into pattern compilation and crashed
  // with a TypeError (exit 20 — "tool malfunction") instead of a fixable
  // usage error. A user's config typo is exit 10 (M4 convention).
  if (cfg.exclude !== undefined) {
    if (!Array.isArray(cfg.exclude)) {
      throw new Error(
        `exclude must be an array of strings, got ${typeof cfg.exclude}`,
      );
    }
    for (const p of cfg.exclude) {
      if (typeof p !== "string") {
        throw new Error(
          `exclude entries must be strings, got ${typeof p} (${JSON.stringify(p)})`,
        );
      }
    }
  }
  return warnings;
}

/** Default expiry: 90 days when unspecified (score-gaming counter, S11). */
/** Default expiry window when no `expires` is set (S11, README §Configuration). */
export const SUPPRESSION_DEFAULT_DAYS = 90;

/**
 * Bug-audit QA-2026-08-30 QA-6: the 90-day policy in the README was only
 * applied at WRITE time by the `ignore` command — a hand-written entry
 * without `expires` stayed active forever, silently bypassing the
 * documented window. When the caller supplies an anchor (the config
 * file's mtime, threaded through loadSuppressions), the default is
 * enforced here: a no-expiry entry is active only while the anchor is
 * within the window. Without an anchor the entry stays active — the
 * predicate cannot invent a creation date — and the suppressions report
 * labels the entry accordingly.
 */
export function isSuppressionActive(
  ign: IgnoreEntry,
  now = new Date(),
  anchor?: Date,
): boolean {
  if (!ign.expires) {
    if (!anchor) return true;
    return (
      now.getTime() - anchor.getTime() < SUPPRESSION_DEFAULT_DAYS * 86_400_000
    );
  }
  return new Date(ign.expires) > now;
}

export function applySeverityOverrides(
  findings: Array<{ ruleId: string; severity: Severity }>,
  cfg: QADoctorConfig,
): void {
  const overrides = cfg.severityOverrides ?? {};
  for (const f of findings) {
    const override = overrides[f.ruleId];
    // Defense in depth (M4): validate() rejects invalid values at load
    // time, but a programmatically-built config must not be able to NaN
    // the score or bypass gating either.
    if (override && (SEVERITY_ORDER as readonly string[]).includes(override)) {
      f.severity = override;
    }
  }
}
