/**
 * Cross-Rule Evidence Correlation Engine (INTEL-005).
 *
 * Produces correlation conclusions from a set of findings WITHOUT
 * modifying the findings themselves. Deterministic, pure functions.
 *
 * TI-009 enforcement: E1+E1+E1 ≠ E2.
 * Three weak-evidence findings cannot combine to produce strong evidence.
 * Only strong individual evidence (E2) or runtime corroboration can
 * elevate a conclusion to STRONG.
 */

import type { Finding, EvidenceLevel } from "../types.js";
import {
  compareCodePoints,
  compareLocalized,
  DISPLAY_LOCALE,
} from "../lib/compare.js";
import { findingFingerprint } from "./finding-identity.js";

export type CorrelationStrength = "NONE" | "SUPPORTING" | "STRONG";

export type ConclusionType =
  | "CONVERGENT" // multiple rules point to the same root cause
  | "CORROBORATED" // runtime evidence supports static finding
  | "CONTRADICTED" // runtime evidence contradicts static finding
  | "AMPLIFIED" // same file has multiple related findings
  | "INDEPENDENT"; // findings are unrelated

export interface CorrelationConclusion {
  conclusionType: ConclusionType;
  certainty: CorrelationStrength;
  corroboration: string;
  sourceCount: number;
  findingIds: string[];
}

const EVIDENCE_RANK: Record<EvidenceLevel, number> = {
  E0: 0,
  E1: 1,
  E2: 2,
};

function bestEvidence(findings: readonly Finding[]): EvidenceLevel {
  let best: EvidenceLevel = "E0";
  for (const f of findings) {
    const level = f.evidenceLevel ?? "E0";
    if (EVIDENCE_RANK[level] > EVIDENCE_RANK[best]) {
      best = level;
    }
  }
  return best;
}

function hasRuntimeCorroboration(findings: readonly Finding[]): boolean {
  return findings.some((f) => f.runtimeCorroboration !== undefined);
}

/**
 * Determine the correlation strength for a group of findings.
 *
 * TI-009: E1+E1+E1 ≠ E2. Multiple weak findings SUPPORT but never
 * STRONG. Only E2 or runtime corroboration yields STRONG.
 */
function correlationStrength(
  findings: readonly Finding[],
): CorrelationStrength {
  const best = bestEvidence(findings);
  const hasRuntime = hasRuntimeCorroboration(findings);

  if (hasRuntime) return "STRONG";
  if (best === "E2") return "STRONG";
  if (best === "E1" && findings.length > 1) return "SUPPORTING";
  if (best === "E1") return "SUPPORTING";
  return "NONE";
}

/**
 * Group findings by file to detect file-level convergence.
 */
function groupByFile(findings: readonly Finding[]): Map<string, Finding[]> {
  const groups = new Map<string, Finding[]>();
  for (const f of findings) {
    const list = groups.get(f.file) ?? [];
    list.push(f);
    groups.set(f.file, list);
  }
  return groups;
}

/**
 * Group findings by root cause, falling back to the FINDING FINGERPRINT.
 *
 * The fallback used to be `ruleId`, and that is the defect this fixes. Nothing
 * in the tree assigns `rootCauseId` — the machine contract reports it `null` on
 * every finding — so `ruleId` was the key for every group, and N independent
 * defects from one rule across N files were reported as
 *
 *   CONVERGENT — N findings share root cause QA-PW-002
 *
 * which is the precise inverse of what convergence means. Convergence is the
 * claim that several findings are ONE thing; the key that produced it said
 * only "these are the same rule". A fingerprint is ruleId + file + message, so
 * two `QA-PW-002` findings in different files are two keys, two groups of one,
 * and neither is reported.
 *
 * This is also why `findingId`/`rootCauseId`/`deduplicationGroup` are not
 * wired instead: they are the same idea, and an unwired field plus a fallback
 * would be two mechanisms for one claim. When a rule declares a real root
 * cause, `rootCauseId` still wins — the field is honoured the moment anything
 * populates it.
 */
function groupByRootCause(
  findings: readonly Finding[],
): Map<string, Finding[]> {
  const groups = new Map<string, Finding[]>();
  for (const f of findings) {
    const key = f.rootCauseId ?? findingFingerprint(f);
    const list = groups.get(key) ?? [];
    list.push(f);
    groups.set(key, list);
  }
  return groups;
}

/**
 * The identity a conclusion lists a finding under.
 *
 * `findingId` when something has populated it, else the fingerprint. Never
 * `ruleId`: the fallback used to collapse every finding from one rule onto one
 * id, so a three-finding CONVERGENT group listed the same id three times and
 * the `alreadyConvergent` set below could not tell the members apart.
 */
function conclusionId(f: Finding): string {
  return f.findingId ?? findingFingerprint(f);
}

/**
 * Correlate findings and produce conclusions WITHOUT modifying them.
 * Deterministic — same input always produces same output.
 */
export function correlateFindings(
  findings: readonly Finding[],
): CorrelationConclusion[] {
  const conclusions: CorrelationConclusion[] = [];

  const rootCauseGroups = groupByRootCause(findings);
  for (const [rootCause, group] of Array.from(rootCauseGroups.entries()).sort(
    // Pinned to "en": the root cause is a human-readable LABEL rendered as a
    // heading, so it should read naturally — but the same table has to come
    // out on a machine whose ambient locale is not English.
    (a, b) => compareLocalized(DISPLAY_LOCALE)(a[0], b[0]),
  )) {
    if (group.length < 2) continue;
    const findingIds = group.map(conclusionId);
    conclusions.push({
      conclusionType: "CONVERGENT",
      certainty: correlationStrength(group),
      corroboration: `${group.length} findings share root cause ${rootCause}`,
      sourceCount: group.length,
      findingIds,
    });
  }

  const fileGroups = groupByFile(findings);
  for (const [file, group] of Array.from(fileGroups.entries()).sort((a, b) =>
    compareCodePoints(a[0], b[0]),
  )) {
    if (group.length < 2) continue;
    const alreadyConvergent = new Set<string>();
    for (const c of conclusions) {
      if (c.conclusionType === "CONVERGENT") {
        for (const id of c.findingIds) alreadyConvergent.add(id);
      }
    }
    const novel = group.filter((f) => !alreadyConvergent.has(conclusionId(f)));
    if (novel.length < 2) continue;
    const findingIds = novel.map(conclusionId);
    conclusions.push({
      conclusionType: "AMPLIFIED",
      certainty: correlationStrength(novel),
      corroboration: `${novel.length} findings in ${file}`,
      sourceCount: novel.length,
      findingIds,
    });
  }

  const corroborated = findings.filter(
    (f) => f.runtimeCorroboration !== undefined,
  );
  if (corroborated.length > 0) {
    conclusions.push({
      conclusionType: "CORROBORATED",
      certainty: "STRONG",
      corroboration: `${corroborated.length} finding(s) with runtime corroboration`,
      sourceCount: corroborated.length,
      findingIds: corroborated.map(conclusionId),
    });
  }

  return conclusions;
}
