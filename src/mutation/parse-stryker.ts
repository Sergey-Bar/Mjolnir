/**
 * Stryker JSON report ingestion (product-gap-remediation master plan
 * P5, plan 1788853205786 — flag 6, decision 8).
 *
 * Shape (Stryker's `json` reporter, `mutation-report.json`, relevant
 * subset):
 * { schemaVersion, thresholds: { high, low },
 *   files: { "<path>": { source, mutants: [ { id, mutatorName,
 *     location: { start: { line, column }, end: { line, column } },
 *     status } ] } } }
 *
 * Coordinate convention: Stryker's Positions are 0-based lines and
 * columns (AST positions). The engine's finding positions are 1-based
 * lines — this parser normalizes +1 and records the convention here so
 * the derivation source is never folklore (see RULE-LIFECYCLE).
 *
 * Honesty rules:
 *  - only `Survived` mutants count as survived evidence. `NoCoverage`
 *    mutants are a DIFFERENT fact (never executed, not "tested and
 *    passed by nothing") — reported separately in the summary, never
 *    merged into the survived set;
 *  - `Killed` / `Timeout` mutants are the suite WORKING — the opposite
 *    of evidence for a finding;
 *  - a corrupt or shapeless report degrades to zero mutants (the
 *    caller reports "no mutation evidence"), never a crash.
 */

import type { MutationEvidenceSource, SurvivedMutant } from "./types.js";

const MAX_FILES = 5_000;
const MAX_MUTANTS_PER_FILE = 20_000;

interface StrykerPosition {
  line?: number;
  column?: number;
}

interface StrykerMutant {
  id?: string | number;
  mutatorName?: string;
  status?: string;
  location?: { start?: StrykerPosition; end?: StrykerPosition };
}

interface StrykerFile {
  mutants?: StrykerMutant[];
}

interface StrykerReport {
  files?: Record<string, StrykerFile>;
}

/** Sniff: does this parsed JSON look like a Stryker mutation report? */
export function looksLikeStrykerJson(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  return (
    typeof (json as StrykerReport).files === "object" &&
    (json as StrykerReport).files !== null
  );
}

export function parseStrykerJson(json: unknown): {
  tool: MutationEvidenceSource;
  survived: SurvivedMutant[];
  noCoverage: number;
  killed: number;
} {
  if (!json || typeof json !== "object") {
    return { tool: "stryker", survived: [], noCoverage: 0, killed: 0 };
  }
  const root = json as StrykerReport;
  const files = root.files;
  if (!files || typeof files !== "object") {
    return { tool: "stryker", survived: [], noCoverage: 0, killed: 0 };
  }
  const survived: SurvivedMutant[] = [];
  let noCoverage = 0;
  let killed = 0;

  const entries = Object.entries(files).slice(0, MAX_FILES);
  for (const [rawPath, file] of entries) {
    if (!file || typeof file !== "object") continue;
    const mutants = Array.isArray(file.mutants) ? file.mutants : [];
    // Stryker paths are repo-relative POSIX already; normalize any
    // Windows separators defensively (the engine's walker does the same).
    const path = rawPath.replaceAll("\\", "/");
    for (const m of mutants.slice(0, MAX_MUTANTS_PER_FILE)) {
      if (!m || typeof m !== "object") continue;
      if (m.status === "Survived") {
        const startLine = toOneBased(m.location?.start?.line);
        const endLine = toOneBased(m.location?.end?.line);
        if (startLine === undefined) continue; // unplaceable → summary only
        survived.push({
          file: path,
          mutator:
            typeof m.mutatorName === "string" ? m.mutatorName : "unknown",
          startLine,
          endLine:
            endLine !== undefined ? Math.max(startLine, endLine) : startLine,
        });
      } else if (m.status === "NoCoverage") {
        noCoverage++;
      } else if (m.status === "Killed" || m.status === "Timeout") {
        killed++;
      }
    }
  }
  return { tool: "stryker", survived, noCoverage, killed };
}

function toOneBased(line: number | undefined): number | undefined {
  // Stryker emits 0-based AST lines; a missing/negative line is
  // unplaceable. Normalize to the engine's 1-based convention.
  return typeof line === "number" && line >= 0 ? line + 1 : undefined;
}
