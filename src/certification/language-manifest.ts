/**
 * The language capability manifest (plan V5-023).
 *
 * One record per language, each carrying a certification state drawn from the
 * single ladder in `./state-machine.ts` and the evidence that state rests on.
 * The admission gate checks the claim against the evidence on every read, so
 * a manifest cannot ship a state its own evidence does not support — the
 * "CERTIFIED with an empty corpus" case is refused at read time, not
 * discovered at release time.
 *
 * The manifest is DATA. Adding a language is adding a row, not editing a
 * union type in four places, and the language support claim in the README is
 * generated from it rather than maintained by hand.
 */

import {
  admit,
  detectRegression,
  isAtLeast,
  LANGUAGE_STATE_RANK,
  type CertificationEvidence,
  type CertificationState,
  type Regression,
} from "./state-machine.js";

export interface LanguageCapability {
  /** The inventory id, so the manifest speaks the same vocabulary (V5-024). */
  id: string;
  /** Human name, for the report. */
  displayName: string;
  /** The claimed state. */
  state: CertificationState;
  /** What the claim stands on. */
  evidence: CertificationEvidence;
  /** The surface the claim covers — a language is not certified wholesale. */
  capabilities: string[];
  /** Explicitly out of scope for this language, stated rather than implied. */
  notCertified: string[];
  /** The next concrete step to a stronger state. Absent = at the ceiling. */
  nextLevelGap?: string;
}

export const LANGUAGE_MANIFEST: readonly LanguageCapability[] = [
  {
    id: "typescript",
    displayName: "TypeScript / JavaScript",
    state: "CERTIFIED",
    capabilities: [
      "parse",
      "symbols",
      "imports",
      "calls",
      "test-discovery",
      "framework-discovery",
      "config-discovery",
      "source-location",
    ],
    notCertified: [
      "type-aware cross-file inference is heuristic, not a type checker",
      "no flow-sensitive analysis",
    ],
    evidence: {
      corpus: "corpus/v5-candidates.jsonl",
      sampleSize: 240,
      runner: "mjolnir-scan",
      verifiedBy: "false-green corpus + negative controls",
      source: "docs/M26-EXTERNAL-VALIDATION.json",
    },
  },
  {
    id: "java",
    displayName: "Java",
    state: "CANDIDATE",
    capabilities: ["parse", "symbols", "imports", "test-discovery"],
    notCertified: ["framework-discovery is config-file based only"],
    evidence: {
      corpus: "corpus/v5-candidates.jsonl",
      sampleSize: 24,
      runner: "mjolnir-scan",
      verifiedBy: "tree-sitter parse conformance",
    },
    nextLevelGap: "runner evidence on a JUnit cohort",
  },
  {
    id: "csharp",
    displayName: "C# / .NET",
    state: "CANDIDATE",
    capabilities: ["parse", "symbols", "imports", "test-discovery"],
    notCertified: ["xunit/nunit detection is file-name based"],
    evidence: {
      corpus: "corpus/v5-candidates.jsonl",
      sampleSize: 18,
      runner: "mjolnir-scan",
      verifiedBy: "tree-sitter parse conformance",
    },
    nextLevelGap: "runner evidence on an xunit cohort",
  },
  {
    id: "python",
    displayName: "Python",
    state: "MEASURED",
    capabilities: [
      "parse",
      "symbols",
      "imports",
      "test-discovery",
      "framework-discovery",
    ],
    notCertified: ["no runner evidence; pytest detection is import-based"],
    evidence: {
      corpus: "corpus/v5-candidates.jsonl",
      sampleSize: 40,
      runner: "mjolnir-scan",
      verifiedBy: "tree-sitter parse conformance",
    },
    nextLevelGap: "pytest runner evidence",
  },
] as const;

export interface ManifestFinding {
  id: string;
  kind: "UNSUPPORTED_CLAIM" | "PROJECTION_DRIFT" | "MISSING_EVIDENCE_FIELD";
  detail: string;
}

/**
 * Check every row against its own evidence.
 *
 * This is the gate the plan asks for: a language cannot declare a state its
 * evidence does not support, and the defect names the row so it can be fixed
 * rather than discovered.
 */
export function auditLanguageManifest(
  manifest: readonly LanguageCapability[] = LANGUAGE_MANIFEST,
): ManifestFinding[] {
  const findings: ManifestFinding[] = [];
  for (const entry of manifest) {
    const decision = admit(entry.state, entry.evidence);
    if (!decision.admitted) {
      findings.push({
        id: entry.id,
        kind: "UNSUPPORTED_CLAIM",
        detail: `${entry.state}: ${decision.defects.join("; ")}`,
      });
    }
    // A state stronger than the one declared is a projection error, not a
    // claim: the projection map decides what a string means.
    if (LANGUAGE_STATE_RANK[entry.state] === undefined) {
      findings.push({
        id: entry.id,
        kind: "PROJECTION_DRIFT",
        detail: `"${entry.state}" is not in the language-state projection`,
      });
    }
    if (entry.state !== decision.supportedState) {
      findings.push({
        id: entry.id,
        kind: "MISSING_EVIDENCE_FIELD",
        detail: `declares ${entry.state} but its evidence only supports ${decision.supportedState}`,
      });
    }
  }
  return findings;
}

/** Re-derive a row's admitted state from its evidence, ignoring the claim. */
export function rederive(entry: LanguageCapability): CertificationState {
  return admit(entry.state, entry.evidence).supportedState;
}

/**
 * Re-check the whole manifest against a PREVIOUS one and report regressions.
 *
 * A language that silently drops from CERTIFIED to CANDIDED leaves no trace
 * otherwise, and the first anyone hears of it is a user whose support
 * disappeared.
 */
export function findRegressions(
  previous: readonly LanguageCapability[],
  current: readonly LanguageCapability[] = LANGUAGE_MANIFEST,
): Regression[] {
  const before = new Map(previous.map((entry) => [entry.id, entry]));
  const regressions: Regression[] = [];
  for (const entry of current) {
    const was = before.get(entry.id);
    if (was === undefined) continue;
    const found = detectRegression({
      capability: entry.id,
      stored: was.state,
      rederived: entry.state,
      reason:
        entry.nextLevelGap ?? "state changed without a recorded next step",
    });
    if (found !== null) regressions.push(found);
  }
  return regressions;
}

/** Languages at or above a state, strongest first. */
export function languagesAtLeast(
  state: CertificationState,
  manifest: readonly LanguageCapability[] = LANGUAGE_MANIFEST,
): LanguageCapability[] {
  return manifest
    .filter((entry) => isAtLeast(entry.state, state))
    .sort((a, b) => b.state.localeCompare(a.state));
}

/**
 * The one-line support claim for a language, generated from the manifest.
 *
 * The README's language table is produced from this rather than written by
 * hand, so a state change cannot leave the documentation claiming something
 * the manifest does not.
 */
export function supportClaim(entry: LanguageCapability): string {
  const gaps = entry.nextLevelGap;
  const suffix =
    gaps === undefined ? "no recorded gap to the next state" : `next: ${gaps}`;
  return `${entry.displayName} — ${entry.state} (${entry.capabilities.length} capabilities; ${suffix})`;
}
