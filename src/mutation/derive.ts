/**
 * Mutation evidence derivation (product-gap-remediation master plan P5,
 * plan 1788853205786 — flag 6, decision 8).
 *
 * The plan's contract, verbatim: matching findings gain
 * `mutationEvidence` provenance and E1→E2 **by derivation** (L3:
 * derived, never claimed).
 *
 * Why E1→E2 is DERIVATION, not upgrade (Law: derive, never claim):
 * an E1 finding's evidence was already pattern evidence; a survived
 * mutant near it does not add a second, independent proof — it removes
 * the main EXCUSE for the pattern ("the suite would catch it if it
 * mattered"). The derivation is: the mutation score shows the suite
 * does not constrain this code, so the pattern-level confidence rises
 * to what a deterministic check on the same surface would carry. The
 * trust ladder stays honest: the trustLevel does NOT jump to L3+ (that
 * would claim a real run ran this code — nothing ran), only the
 * evidence level consolidates. Documented in RULE-LIFECYCLE + the
 * machine-contract docs.
 *
 * Matching (prefer claiming less):
 *  - line granularity: the finding's line falls inside the mutant's
 *    [startLine, endLine] span in the same file (Stryker);
 *  - file granularity: same file only (mutmut, unplaceable spans).
 */

import type { Finding } from "../types.js";
import type {
  MutationEvidence,
  MutationReport,
  SurvivedMutant,
} from "./types.js";

export interface MutationStampStats {
  /** Findings that gained mutationEvidence. */
  stamped: number;
  /** Findings whose evidence level consolidated E1 → E2 by derivation. */
  derived: number;
}

/**
 * Stamp mutation evidence onto findings (mutates in place, the same
 * contract as stampEvidenceLevels). Returns the stamp stats.
 */
export function stampMutationEvidence(
  findings: Finding[],
  report: MutationReport,
): MutationStampStats {
  const byFile = new Map<string, SurvivedMutant[]>();
  for (const m of report.survived) {
    const list = byFile.get(m.file) ?? [];
    list.push(m);
    byFile.set(m.file, list);
  }

  let stamped = 0;
  let derived = 0;
  for (const f of findings) {
    const mutants = byFile.get(f.file);
    if (!mutants || mutants.length === 0) continue;

    let matched: SurvivedMutant[] = [];
    let granularity: MutationEvidence["granularity"] = "file";
    if (f.line !== undefined) {
      const lineLevel = mutants.filter(
        (m) =>
          f.line !== undefined && f.line >= m.startLine && f.line <= m.endLine,
      );
      if (lineLevel.length > 0) {
        matched = lineLevel;
        granularity = "line";
      }
    }
    if (matched.length === 0) {
      // File-level fallback: the same prefer-claiming-less rule as the
      // runtime corroboration — a weaker claim beats a fabricated one.
      matched = mutants;
      granularity = "file";
    }

    f.mutationEvidence = {
      source: report.tool,
      matchedMutants: matched.length,
      mutators: [...new Set(matched.map((m) => m.mutator))].sort(),
      granularity,
    };
    stamped++;
    if (f.evidenceLevel === "E1") {
      f.evidenceLevel = "E2";
      derived++;
    }
  }
  return { stamped, derived };
}

/**
 * Survived-mutant leaderboard: most-mutated files first. The summary's
 * honesty headline: files here are code the suite demonstrably does not
 * constrain — regardless of what any static tool found.
 */
export function survivedLeaderboard(
  report: MutationReport,
  top = 25,
): Array<{ file: string; survived: number; mutators: string[] }> {
  const byFile = new Map<string, SurvivedMutant[]>();
  for (const m of report.survived) {
    const list = byFile.get(m.file) ?? [];
    list.push(m);
    byFile.set(m.file, list);
  }
  return [...byFile.entries()]
    .map(([file, mutants]) => ({
      file,
      survived: mutants.length,
      mutators: [...new Set(mutants.map((m) => m.mutator))].sort(),
    }))
    .sort((a, b) => b.survived - a.survived)
    .slice(0, top);
}

export function renderMutationSummary(report: MutationReport): string {
  const lines: string[] = [];
  lines.push(`MUTATION EVIDENCE — ${report.tool}`);
  lines.push("");
  lines.push(
    `${report.survived.length} survived · ${report.killed} killed · ${report.noCoverage} no-coverage`,
  );
  lines.push("");
  const top = survivedLeaderboard(report);
  if (top.length === 0) {
    lines.push("No survived mutants — every executed mutant was killed.");
    lines.push("");
    lines.push(
      "Interpretation: the suite constrains the code the mutation run reached. This is evidence about THOSE mutants only — untested surfaces are the no-coverage column, and no-coverage is not survived.",
    );
    return lines.join("\n");
  }
  lines.push("Files the suite does not constrain (most survived first):");
  lines.push("");
  for (const row of top) {
    lines.push(`  ${row.survived}× ${row.file} [${row.mutators.join(", ")}]`);
  }
  lines.push("");
  lines.push(
    "A survived mutant is not a bug — it is code the suite would not notice changing. Findings near these lines were consolidated E1→E2 by derivation (see docs/RULE-LIFECYCLE.md).",
  );
  return lines.join("\n");
}
