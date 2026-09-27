#!/usr/bin/env tsx
/**
 * `npm run claims:prose` — the P4 prose claim lint.
 *
 * Finds public claims that §94 bans, or that Law 8 requires to be bound to
 * a capability, a maturity and a proof path.
 *
 * **This gate reports; it does not fail the build by itself.** A gate that
 * starts red across 27 documents and 101 rule pages, and can only be made
 * green by rewriting all of them in one change, gets disabled — and a
 * disabled honesty gate is worse than no gate. The enforcement half is
 * `claim:budget`, a ratchet: the count may not grow, and the budget may
 * not be raised without a dated, owned, expiring exception.
 *
 * `--strict` promotes every finding to a failure, for the day the ratchet
 * reaches zero. It exists so the finish line is executable rather than
 * aspirational.
 *
 * A bound claim carries an inline marker in its source document:
 *
 *     <!-- claim:rule-registry-census maturity=M2 proof=npm run docs:capability -->
 *
 * The marker is checkable: an unknown registry id, a maturity off the
 * `M0`–`M5` ladder (ADR 0001), or a missing proof command is an error,
 * because a binding that cannot be resolved is not a binding.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { prettify } from "../lib/prettify.js";
import { isMainModule } from "../lib/is-main-module.js";
import { ROOT } from "./inventory.js";
import {
  applyExemptions,
  extractBindings,
  isBound,
  listPublicFiles,
  scanSurfaces,
  type ClaimBinding,
  type ClaimCandidate,
} from "../../src/v6/claim-lint.js";
import { MATURITY_LEVELS } from "../../src/v6/maturity.js";

const REPORT_PATH = join(ROOT, "docs", "CLAIM-LINT-REPORT.json");
const REGISTRY_PATH = join(ROOT, "docs", "claim-registry.json");

export interface ProseClaimReport {
  schemaVersion: 1;
  artifact: "claim-lint-report";
  generatedBy: "npm run claims:prose";
  surfacesScanned: number;
  findings: ClaimCandidate[];
  bindings: readonly (ClaimBinding & { surface: string })[];
  byPattern: Record<string, number>;
  unboundTotal: number;
  unboundBySeverity: Record<string, number>;
}

export interface BindingProblem {
  surface: string;
  line: number;
  reason: string;
}

/** Every inline binding marker across the public surfaces, with its file. */
export function collectBindings(root: string): {
  bindings: Array<ClaimBinding & { surface: string }>;
  boundLines: Set<string>;
} {
  const bindings: Array<ClaimBinding & { surface: string }> = [];
  const boundLines = new Set<string>();
  for (const { file } of listPublicFiles(root)) {
    let text: string;
    try {
      text = readFileSync(join(root, file), "utf8");
    } catch {
      continue;
    }
    for (const binding of extractBindings(text)) {
      bindings.push({ ...binding, surface: file });
      boundLines.add(`${file}:${binding.line}`);
    }
  }
  return { bindings, boundLines };
}

function knownClaimIds(): { ids: Set<string>; problem: BindingProblem | null } {
  try {
    const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as {
      claims: Array<{ id: string }>;
    };
    return {
      ids: new Set(registry.claims.map((claim) => claim.id)),
      problem: null,
    };
  } catch {
    return {
      ids: new Set<string>(),
      problem: {
        surface: "docs/claim-registry.json",
        line: 0,
        reason: "claim registry is unreadable, so no claim id can be resolved",
      },
    };
  }
}

/** A binding that cannot be resolved is not a binding. */
export function validateBindings(
  bindings: readonly (ClaimBinding & { surface: string })[],
  knownIds: ReadonlySet<string>,
): BindingProblem[] {
  const problems: BindingProblem[] = [];
  for (const binding of bindings) {
    if (!knownIds.has(binding.registryId)) {
      problems.push({
        surface: binding.surface,
        line: binding.line,
        reason: `bound to registry id "${binding.registryId}", which does not exist in docs/claim-registry.json`,
      });
    }
    const onLadder = (MATURITY_LEVELS as readonly string[]).some((level) =>
      level.startsWith(binding.maturity),
    );
    if (!onLadder) {
      problems.push({
        surface: binding.surface,
        line: binding.line,
        reason: `maturity "${binding.maturity}" is not on the M0-M5 ladder (ADR 0001)`,
      });
    }
    if (binding.proofCommand.trim() === "") {
      problems.push({
        surface: binding.surface,
        line: binding.line,
        reason: "binding carries no proof command",
      });
    }
  }
  return problems;
}

function main(): void {
  const strict = process.argv.includes("--strict");
  const surfaces = listPublicFiles(ROOT);
  const { bindings, boundLines } = collectBindings(ROOT);
  const unbound = applyExemptions(
    scanSurfaces(ROOT).filter((candidate) => !isBound(candidate, boundLines)),
  );

  const byPattern: Record<string, number> = {};
  const unboundBySeverity: Record<string, number> = { BANNED: 0, BOUNDED: 0 };
  for (const finding of unbound) {
    byPattern[finding.patternId] = (byPattern[finding.patternId] ?? 0) + 1;
    unboundBySeverity[finding.severity] =
      (unboundBySeverity[finding.severity] ?? 0) + 1;
  }

  const registry = knownClaimIds();
  const problems = validateBindings(bindings, registry.ids);
  if (registry.problem !== null) problems.unshift(registry.problem);

  const report: ProseClaimReport = {
    schemaVersion: 1,
    artifact: "claim-lint-report",
    generatedBy: "npm run claims:prose",
    surfacesScanned: surfaces.length,
    findings: unbound,
    bindings,
    byPattern,
    unboundTotal: unbound.length,
    unboundBySeverity,
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
  void prettify(REPORT_PATH);

  const failing = strict && (unbound.length > 0 || problems.length > 0);
  console.log(
    JSON.stringify(
      {
        status: failing ? "FAIL" : "REPORT",
        gate: "claims:prose",
        surfacesScanned: surfaces.length,
        boundLines: boundLines.size,
        unbound: unbound.length,
        bySeverity: unboundBySeverity,
        byPattern,
        bindingProblems: problems,
        limit:
          "Pattern lint: it catches the claim shapes §94 names (counts, enumerations, completeness superlatives, download figures). It cannot catch a claim phrased in a shape nobody anticipated — that is the capability's nextLevelGap, not a footnote.",
      },
      null,
      2,
    ),
  );
  process.exit(failing ? 1 : 0);
}

if (isMainModule(import.meta.url)) {
  main();
}
