/**
 * Config file support (Sprint-Plan W7, Product-MVP §27 + GAP-F).
 * Zero-config preserved: config presence never changes detection
 * semantics — only severity, scope, and gating.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Severity } from "../types.js";

export interface IgnoreEntry {
  ruleId: string;
  files?: string[];
  reason: string;
  /** ISO date; defaults to 90 days from creation (S11). */
  expires?: string;
}

export interface QADoctorConfig {
  gate?: "advisory" | "error" | "warning";
  severityOverrides?: Record<string, Severity>;
  ignore?: IgnoreEntry[];
}

const CONFIG_NAMES = ["qa-doctor.config.json", ".qa-doctor.json"] as const;

export function loadConfig(root: string): {
  config: QADoctorConfig;
  path: string | null;
} {
  for (const name of CONFIG_NAMES) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    try {
      const parsed = JSON.parse(readFileSync(p, "utf8")) as QADoctorConfig;
      validate(parsed);
      return { config: parsed, path: p };
    } catch (err) {
      throw new Error(
        `Invalid qa-doctor config at ${p}: ${err instanceof Error ? err.message : String(err)}`,
        { cause: err },
      );
    }
  }
  return { config: {}, path: null };
}

function validate(cfg: QADoctorConfig): void {
  if (cfg.gate && !["advisory", "error", "warning"].includes(cfg.gate)) {
    throw new Error(`gate must be advisory|error|warning, got "${cfg.gate}"`);
  }
  for (const ign of cfg.ignore ?? []) {
    if (!ign.ruleId) throw new Error("ignore entries require ruleId");
    if (!ign.reason)
      throw new Error(`ignore for ${ign.ruleId} requires a "reason" (§27)`);
  }
}

/** Default expiry: 90 days when unspecified (score-gaming counter, S11). */
export function isSuppressionActive(
  ign: IgnoreEntry,
  now = new Date(),
): boolean {
  if (!ign.expires) return true; // created without expiry → 90d default is applied at write time by `ignore` command
  return new Date(ign.expires) > now;
}

export function applySeverityOverrides(
  findings: Array<{ ruleId: string; severity: Severity }>,
  cfg: QADoctorConfig,
): void {
  const overrides = cfg.severityOverrides ?? {};
  for (const f of findings) {
    const override = overrides[f.ruleId];
    if (override) f.severity = override;
  }
}
