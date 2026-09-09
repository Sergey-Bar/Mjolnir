/**
 * `mjolnir verify` — the agent-loop digest (product-gap-remediation
 * master plan P7, plan 1788853205786 — flag agent, decision 6).
 *
 * An agent fixes findings, then runs `mjolnir verify` against the
 * committed baseline (established once with `mjolnir baseline`). The
 * digest answers exactly the loop's questions, derived from the SAME
 * §15 comparison machinery as `mjolnir diff` (no second truth):
 *
 *   - RESOLVED — baseline findings no longer present, each with its
 *     lifecycle resolution (only VERIFIED-RESOLVED is a fix claim);
 *   - NEW — findings the fix introduced;
 *   - UNCHANGED — pre-existing debt, grouped by ruleId + location
 *     (the agent-loop key: an agent works by location, not message);
 *   - SCORE DELTA — before (baseline) → after (this scan).
 *
 * Exit semantics are the frozen contract: 0 clean · 1 new error
 * findings · 2 partial scan or no baseline (nothing to verify against
 * — the agent must first establish the before-state).
 */

import { diffAgainstBaseline } from "./baseline.js";
import type { BaselineFile } from "./baseline.js";
import type { Finding, ScanResult } from "../types.js";

export interface VerifyUnchangedGroup {
  ruleId: string;
  /** Locations (file:line) where the rule's debt still stands. */
  locations: string[];
}

export interface VerifyDigest {
  hasBaseline: boolean;
  baselineCapturedAt?: string;
  baselineCommit?: string;
  /**
   * Baseline findings no longer present. Baseline entries are narrowed
   * (no line — see BaselineFile), so the digest reports the resolution,
   * not a fabricated location: the resolution IS the actionable fact.
   */
  resolved: Array<{
    ruleId: string;
    file: string;
    resolution: string;
  }>;
  new: Array<{ ruleId: string; file: string; line: number; severity: string }>;
  unchanged: VerifyUnchangedGroup[];
  unchangedCount: number;
  scoreBefore: number | null;
  scoreAfter: number | null;
  scoreDelta: number | null;
}

export function buildVerifyDigest(
  result: ScanResult,
  baseline: BaselineFile | null,
): VerifyDigest {
  const diff = diffAgainstBaseline(result, baseline);
  const digest: VerifyDigest = {
    hasBaseline: diff.hasBaseline,
    ...(diff.baselineCapturedAt !== undefined
      ? { baselineCapturedAt: diff.baselineCapturedAt }
      : {}),
    ...(diff.baselineCommit !== undefined
      ? { baselineCommit: diff.baselineCommit }
      : {}),
    resolved: diff.resolvedFindings.map((f) => ({
      ruleId: f.ruleId,
      file: f.file,
      resolution: f.resolution.status,
    })),
    new: diff.newFindings.map((f) => ({
      ruleId: f.ruleId,
      file: f.file,
      line: f.line,
      severity: f.severity,
    })),
    unchanged: [],
    unchangedCount: diff.unchangedCount,
    scoreBefore: diff.baselineScore ?? null,
    scoreAfter: result.score ?? null,
    scoreDelta:
      diff.baselineScore !== undefined && result.score !== null
        ? result.score - diff.baselineScore
        : null,
  };

  // Group unchanged debt by ruleId + location (the agent's working key).
  // Baseline entries are narrowed (no line) — the location is recovered
  // from the HEAD finding that still carries the same §15 fingerprint
  // (unchanged means present in both, so the pairing is exact).
  if (diff.hasBaseline && baseline) {
    const byRule = new Map<string, VerifyUnchangedGroup>();
    const headByMessage = new Map<string, Finding>();
    for (const f of result.findings) headByMessage.set(f.message, f);
    for (const b of baseline.findings) {
      const head = headByMessage.get(b.message);
      if (!head || head.ruleId !== b.ruleId || head.file !== b.file) {
        continue; // resolved or key-rotated — not unchanged
      }
      let group = byRule.get(b.ruleId);
      if (!group) {
        group = { ruleId: b.ruleId, locations: [] };
        byRule.set(b.ruleId, group);
      }
      group.locations.push(`${head.file}:${head.line}`);
    }
    digest.unchanged = [...byRule.values()].map((g) => ({
      ruleId: g.ruleId,
      locations: g.locations.sort(),
    }));
  }
  return digest;
}

export function renderVerifyDigest(digest: VerifyDigest): string {
  if (!digest.hasBaseline) {
    return [
      "VERIFY — no baseline",
      "",
      "No committed baseline at .mjolnir/baseline.json — nothing to verify",
      "against. Establish the before-state once with `mjolnir baseline`,",
      "then re-run `mjolnir verify` after the fix.",
    ].join("\n");
  }

  const lines: string[] = [];
  lines.push("VERIFY — before/after digest");
  lines.push("");
  if (digest.scoreDelta !== null) {
    const dir =
      digest.scoreDelta > 0
        ? "improved"
        : digest.scoreDelta < 0
          ? "worse"
          : "unchanged";
    lines.push(
      `score: ${digest.scoreBefore} → ${digest.scoreAfter} (${dir}, Δ${digest.scoreDelta >= 0 ? "+" : ""}${digest.scoreDelta})`,
    );
  }
  lines.push(
    `${digest.resolved.length} resolved · ${digest.new.length} new · ${digest.unchangedCount} unchanged`,
  );
  lines.push("");

  if (digest.resolved.length > 0) {
    lines.push(
      "RESOLVED (per §15 lifecycle — only VERIFIED-RESOLVED is a fix claim):",
    );
    for (const r of digest.resolved) {
      lines.push(`  ${r.ruleId} ${r.file} — ${r.resolution}`);
    }
    lines.push("");
  }
  if (digest.new.length > 0) {
    lines.push("NEW (introduced by the change under verification):");
    for (const n of digest.new) {
      lines.push(`  ${n.ruleId} ${n.file}:${n.line} (${n.severity})`);
    }
    lines.push("");
  }
  if (digest.unchanged.length > 0) {
    lines.push("UNCHANGED (pre-existing debt — out of this fix's scope):");
    for (const g of digest.unchanged) {
      lines.push(`  ${g.ruleId} × ${g.locations.length}`);
      for (const loc of g.locations.slice(0, 5)) lines.push(`    ${loc}`);
      if (g.locations.length > 5)
        lines.push(`    … and ${g.locations.length - 5} more`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
